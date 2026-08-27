import pytest

from service_appointment.integration import *


def base_slots(**overrides):
    slots = {
        "service_category": "HAIRDRESSER",
        "provider": "provider-1",
        "location": "12207",
        "date": "2026-09-01",
        "time": "10:00",
        "time_window": ("09:00", "12:00"),
        "customer_name": "Synthetic Customer",
        "service_type": "haircut",
        "preferences": "morning",
    }
    slots.update(overrides)
    return slots


def approved_record(**slot_overrides):
    record = AppointmentRecord("appt-1", base_slots(**slot_overrides))
    transition(record, AppointmentStatus.SEARCHING)
    transition(record, AppointmentStatus.AVAILABILITY_FOUND)
    transition(record, AppointmentStatus.AWAITING_APPROVAL)
    transition(record, AppointmentStatus.APPROVED)
    return record


class Adapter:
    method = BookingMethod.API

    def __init__(self, mode="confirmed"):
        self.mode = mode
        self.book_calls = 0
        self.status_calls = 0
        self.cancel_calls = 0
        self.reschedule_calls = 0

    def book(self, record, idempotency_key):
        self.book_calls += 1
        if self.mode == "timeout":
            raise TimeoutError("synthetic timeout")
        if self.mode == "failed":
            return ProviderBookingResult("failed", reason="synthetic failure")
        if self.mode == "unknown":
            return ProviderBookingResult("unknown")
        return ProviderBookingResult("confirmed", "booking-1", {"fixture": True})

    def get_booking_status(self, record, idempotency_key):
        self.status_calls += 1
        if self.mode == "timeout":
            return ProviderBookingResult("confirmed", "booking-after-timeout")
        if self.mode == "unknown":
            return ProviderBookingResult("unknown")
        return ProviderBookingResult("confirmed", "booking-1")

    def cancel(self, record):
        self.cancel_calls += 1
        return ProviderBookingResult("cancelled", record.provider_booking_id)

    def reschedule(self, record, changes):
        self.reschedule_calls += 1
        return ProviderBookingResult("rescheduled", record.provider_booking_id)


def test_a1_hairdresser_one_turn():
    slots = merge_slots({}, base_slots())
    assert required_missing(slots, AppointmentIntent.BOOK) == ()


def test_a2_hairdresser_multi_turn():
    state = merge_slots({}, {"service_category": "HAIRDRESSER", "location": "12207"})
    state = merge_slots(state, {"date": "2026-09-01"})
    state = merge_slots(state, {"time_window": ("09:00", "12:00")})
    assert state == {
        "service_category": "HAIRDRESSER",
        "location": "12207",
        "date": "2026-09-01",
        "time_window": ("09:00", "12:00"),
    }


def test_a3_location_correction_only_overwrites_location():
    before = base_slots()
    after = merge_slots(before, {"location": "12205"})
    assert after["location"] == "12205"
    assert after["service_category"] == before["service_category"]
    assert after["date"] == before["date"]


def test_a4_date_correction_only_overwrites_date():
    after = merge_slots(base_slots(), {"date": "2026-09-02"})
    assert after["date"] == "2026-09-02" and after["location"] == "12207"


def test_a5_time_correction_only_overwrites_time():
    after = merge_slots(base_slots(), {"time": "11:00"})
    assert after["time"] == "11:00" and after["date"] == "2026-09-01"


def test_a6_provider_correction_only_overwrites_provider():
    after = merge_slots(base_slots(), {"provider": "provider-2"})
    assert after["provider"] == "provider-2" and after["service_type"] == "haircut"


def test_null_and_empty_never_delete_existing_state():
    after = merge_slots(base_slots(), {"location": None, "date": "", "preferences": []})
    assert after["location"] == "12207"
    assert after["date"] == "2026-09-01"
    assert after["preferences"] == "morning"


def test_a7_missing_slot():
    missing = required_missing({"service_category": "HAIRDRESSER", "location": "12207"}, AppointmentIntent.AVAILABILITY)
    assert missing == ("date",)


def test_a8_no_reask():
    state = {"service_category": "HAIRDRESSER", "location": "12207", "date": "2026-09-01"}
    assert next_questions(state, AppointmentIntent.AVAILABILITY) == ()


def test_a9_availability_found_is_not_confirmed():
    record = AppointmentRecord("appt-1", base_slots())
    transition(record, AppointmentStatus.SEARCHING)
    transition(record, AppointmentStatus.AVAILABILITY_FOUND)
    assert record.status == AppointmentStatus.AVAILABILITY_FOUND
    assert record.status != AppointmentStatus.CONFIRMED


def test_a10_approval_and_approved_are_not_confirmed():
    record = approved_record()
    assert record.status == AppointmentStatus.APPROVED
    assert record.status != AppointmentStatus.CONFIRMED
    assert approval_for(AppointmentIntent.BOOK).required


def test_a11_booking_confirmation():
    record = approved_record()
    adapter = Adapter()
    result = BookingCoordinator().book(record, adapter)
    assert result.status == "confirmed"
    assert record.status == AppointmentStatus.CONFIRMED
    assert record.provider_booking_id == "booking-1"


def test_a12_provider_failure():
    record = approved_record()
    result = BookingCoordinator().book(record, Adapter("failed"))
    assert result.status == "failed"
    assert record.status == AppointmentStatus.FAILED


def test_a13_timeout_is_confirmation_pending_not_failed_or_retried():
    record = approved_record()
    adapter = Adapter("timeout")
    coordinator = BookingCoordinator()
    result = coordinator.book(record, adapter)
    assert result.status == "confirmation_pending"
    assert record.status == AppointmentStatus.CONFIRMATION_PENDING
    assert adapter.book_calls == 1


def test_a14_retry_reconciles_unknown_provider_outcome_without_second_book():
    record = approved_record()
    adapter = Adapter("timeout")
    coordinator = BookingCoordinator()
    coordinator.book(record, adapter)
    result = coordinator.book(record, adapter)
    assert result.status == "confirmed"
    assert adapter.book_calls == 1
    assert adapter.status_calls == 1
    assert record.status == AppointmentStatus.CONFIRMED


def test_a15_duplicate_prevention_returns_cached_confirmation():
    record = approved_record()
    adapter = Adapter()
    coordinator = BookingCoordinator()
    first = coordinator.book(record, adapter)
    second = coordinator.book(record, adapter)
    assert first == second
    assert adapter.book_calls == 1


def test_unknown_provider_status_never_blindly_rebooks():
    record = approved_record()
    adapter = Adapter("unknown")
    coordinator = BookingCoordinator()
    coordinator.book(record, adapter)
    assert record.status == AppointmentStatus.UNKNOWN
    coordinator.book(record, adapter)
    assert adapter.book_calls == 1
    assert adapter.status_calls == 1


def test_a16_cancellation():
    record = approved_record()
    adapter = Adapter()
    BookingCoordinator().book(record, adapter)
    begin_cancel(record)
    result = adapter.cancel(record)
    apply_cancel_result(record, result)
    assert record.status == AppointmentStatus.CANCELLED


def test_a17_reschedule():
    record = approved_record()
    adapter = Adapter()
    BookingCoordinator().book(record, adapter)
    begin_reschedule(record)
    assert record.status == AppointmentStatus.RESCHEDULE_PENDING
    apply_reschedule_result(record, adapter.reschedule(record, {"date": "2026-09-02"}))
    assert record.status == AppointmentStatus.RESCHEDULED


def test_a18_paid_service_guard():
    decision = approval_for(AppointmentIntent.BOOK, paid=True)
    assert decision.required and decision.level == ApprovalLevel.EXPLICIT


def test_financial_commitment_has_higher_trust():
    decision = approval_for(AppointmentIntent.BOOK, financial_commitment=True)
    assert decision.required and decision.level == ApprovalLevel.HIGH_TRUST


def test_a19_medical_guard():
    assert not medical_guard("HEALTH_APPOINTMENT", authenticated=False, privacy_ok=True)
    assert not medical_guard("HEALTH_APPOINTMENT", authenticated=True, privacy_ok=False)
    assert medical_guard("HEALTH_APPOINTMENT", authenticated=True, privacy_ok=True)
    assert approval_for(AppointmentIntent.BOOK, service_category="HEALTH_APPOINTMENT").level == ApprovalLevel.AUTH_PRIVACY


def test_a20_authority_guard():
    assert not authority_guard("AUTHORITY", authenticated=True, authorized=False)
    assert authority_guard("AUTHORITY", authenticated=True, authorized=True)
    assert approval_for(AppointmentIntent.BOOK, service_category="AUTHORITY").level == ApprovalLevel.AUTH_PRIVACY


def test_a21_email_adapter_contract_is_non_executing():
    contract = email_request_contract(AppointmentRecord("a", base_slots()), {"provider_id": "provider-1", "email": "fixture@example.test"})
    assert contract["contract"] == "appointment.email_request.v1"
    assert contract["appointment_id"] == "a"
    assert contract["execute"] is False


def test_a22_voice_adapter_contract_is_non_executing():
    contract = voice_request_contract(AppointmentRecord("a", base_slots()), {"provider_id": "provider-1", "phone": "+490000000"})
    assert contract["contract"] == "appointment.outbound_call_request.v1"
    assert contract["purpose"] == "appointment"
    assert contract["execute"] is False


def test_a23_reminder_contract():
    record = approved_record()
    BookingCoordinator().book(record, Adapter())
    contract = reminder_contract(record, lead_minutes=30)
    assert contract["appointment_id"] == "appt-1"
    assert contract["lead_minutes"] == 30
    assert contract["execute"] is False


def test_reminder_rejects_unconfirmed_appointment():
    with pytest.raises(ValueError):
        reminder_contract(AppointmentRecord("a", base_slots()))


@pytest.mark.parametrize("operation", ["create_event", "update_event", "cancel_event"])
def test_a24_calendar_contract(operation):
    contract = calendar_contract(AppointmentRecord("a", base_slots()), operation)
    assert contract["appointment_id"] == "a"
    assert contract["operation"] == operation
    assert contract["execute"] is False


def test_a25_human_handoff():
    contract = human_handoff_contract(AppointmentRecord("a", base_slots()), "provider_has_no_supported_route")
    assert contract["contract"] == "appointment.human_handoff.v1"
    assert contract["execute"] is False


@pytest.mark.parametrize(
    "provider,expected",
    [
        ({"appointment_methods": ["api"]}, BookingMethod.API),
        ({"booking_url": "https://example.test"}, BookingMethod.WEB),
        ({"email": "fixture@example.test"}, BookingMethod.EMAIL),
        ({"phone": "+490000000"}, BookingMethod.PHONE),
        ({}, BookingMethod.HUMAN),
    ],
)
def test_booking_method_selection(provider, expected):
    assert choose_booking_method(provider) == expected


@pytest.mark.parametrize(
    "category",
    ["HAIRDRESSER", "CAR_REPAIR", "HANDYMAN", "OTHER", "HEALTH_APPOINTMENT", "AUTHORITY"],
)
def test_required_service_categories_can_be_represented(category):
    state = merge_slots({}, {"service_category": category, "location": "12207"})
    assert state["service_category"] == category


def test_search_and_availability_do_not_require_approval():
    assert approval_for(AppointmentIntent.SEARCH).level == ApprovalLevel.NONE
    assert approval_for(AppointmentIntent.AVAILABILITY).level == ApprovalLevel.NONE


def test_booking_requires_approval_and_booking_state_is_not_confirmation():
    record = approved_record()
    transition(record, AppointmentStatus.BOOKING)
    assert record.status == AppointmentStatus.BOOKING
    assert record.status != AppointmentStatus.CONFIRMED


def test_invalid_state_transition_is_rejected():
    with pytest.raises(ValueError):
        transition(AppointmentRecord("a"), AppointmentStatus.CONFIRMED)


def test_contracts_contain_no_customer_payment_credentials():
    record = AppointmentRecord("a", base_slots())
    contracts = [
        email_request_contract(record, {"email": "fixture@example.test"}),
        voice_request_contract(record, {"phone": "+490000000"}),
        human_handoff_contract(record, "fixture"),
    ]
    for contract in contracts:
        assert "card" not in contract
        assert "payment" not in contract
        assert contract["execute"] is False
