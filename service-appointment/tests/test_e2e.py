from service_appointment.integration import *


class SyntheticProviderAdapter:
    method = BookingMethod.API

    def __init__(self):
        self.book_calls = 0

    def book(self, record, idempotency_key):
        self.book_calls += 1
        assert idempotency_key.startswith(f"appointment:{record.appointment_id}:book:")
        return ProviderBookingResult(
            "confirmed",
            provider_booking_id="synthetic-provider-booking-1",
            confirmation={"source": "synthetic_fixture", "confirmed": True},
        )

    def get_booking_status(self, record, idempotency_key):
        return ProviderBookingResult("confirmed", "synthetic-provider-booking-1")

    def cancel(self, record):
        return ProviderBookingResult("cancelled", record.provider_booking_id)

    def reschedule(self, record, changes):
        return ProviderBookingResult("rescheduled", record.provider_booking_id)


def test_synthetic_customer_to_confirmed_followup_e2e():
    # Turn 1: customer supplies category and location.
    state = merge_slots({}, {"service_category": "HAIRDRESSER", "location": "12207"})
    assert next_questions(state, AppointmentIntent.AVAILABILITY) == ("date",)

    # Turn 2 + 3: previous state remains; only new fields are added.
    state = merge_slots(state, {"date": "2026-09-01"})
    state = merge_slots(state, {"time_window": ("09:00", "12:00")})
    assert next_questions(state, AppointmentIntent.AVAILABILITY) == ()

    # Deterministic provider discovery / route selection.
    provider = {
        "provider_id": "synthetic-hairdresser-1",
        "appointment_methods": ["api"],
        "booking_url": "https://example.test/book",
    }
    assert choose_booking_method(provider) == BookingMethod.API
    state = merge_slots(
        state,
        {
            "provider": provider["provider_id"],
            "time": "10:00",
            "service_type": "haircut",
            "customer_name": "Synthetic Customer",
            "booking_method": "api",
        },
    )

    # Availability is a distinct state and cannot be represented as confirmation.
    record = AppointmentRecord("synthetic-appt-1", state)
    transition(record, AppointmentStatus.SEARCHING)
    transition(record, AppointmentStatus.AVAILABILITY_FOUND)
    assert record.status != AppointmentStatus.CONFIRMED

    # Binding booking requires approval.
    approval = approval_for(AppointmentIntent.BOOK, service_category=state["service_category"])
    assert approval.required
    transition(record, AppointmentStatus.AWAITING_APPROVAL)
    transition(record, AppointmentStatus.APPROVED)
    assert record.status != AppointmentStatus.CONFIRMED

    # Provider confirmation is the only point at which the appointment becomes confirmed.
    adapter = SyntheticProviderAdapter()
    coordinator = BookingCoordinator()
    result = coordinator.book(record, adapter)
    assert result.status == "confirmed"
    assert record.status == AppointmentStatus.CONFIRMED
    assert record.provider_booking_id == "synthetic-provider-booking-1"

    # A duplicate execution returns the original result and never creates a second booking.
    duplicate = coordinator.book(record, adapter)
    assert duplicate == result
    assert adapter.book_calls == 1

    # Follow-up contracts are emitted only after confirmation and are non-executing in isolation.
    reminder = reminder_contract(record, lead_minutes=60)
    calendar = calendar_contract(record, "create_event")
    assert reminder["appointment_id"] == record.appointment_id
    assert calendar["appointment_id"] == record.appointment_id
    assert reminder["execute"] is False
    assert calendar["execute"] is False
