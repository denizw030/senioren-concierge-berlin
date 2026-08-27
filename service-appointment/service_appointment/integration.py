from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Protocol


SLOT_FIELDS = (
    "service_category",
    "provider",
    "location",
    "date",
    "time",
    "time_window",
    "customer_name",
    "party_count",
    "service_type",
    "preferences",
    "notes",
    "booking_method",
    "contact_method",
)


class AppointmentIntent(str, Enum):
    SEARCH = "search"
    AVAILABILITY = "availability"
    PREPARE = "prepare"
    BOOK = "book"
    RESCHEDULE = "reschedule"
    CANCEL = "cancel"
    STATUS = "status"


class AppointmentStatus(str, Enum):
    DRAFT = "draft"
    SEARCHING = "searching"
    AVAILABILITY_FOUND = "availability_found"
    AWAITING_APPROVAL = "awaiting_approval"
    APPROVED = "approved"
    BOOKING = "booking"
    CONFIRMATION_PENDING = "confirmation_pending"
    UNKNOWN = "unknown"
    CONFIRMED = "confirmed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    RESCHEDULE_PENDING = "reschedule_pending"
    RESCHEDULED = "rescheduled"


class BookingMethod(str, Enum):
    API = "api"
    WEB = "web"
    EMAIL = "email"
    PHONE = "phone"
    HUMAN = "human"


class ApprovalLevel(str, Enum):
    NONE = "none"
    STANDARD = "standard"
    EXPLICIT = "explicit"
    HIGH_TRUST = "high_trust"
    AUTH_PRIVACY = "auth_privacy"


@dataclass(frozen=True)
class ApprovalDecision:
    level: ApprovalLevel
    required: bool
    reason: str


@dataclass
class AppointmentRecord:
    appointment_id: str
    slots: dict[str, Any] = field(default_factory=dict)
    status: AppointmentStatus = AppointmentStatus.DRAFT
    provider_booking_id: str | None = None
    idempotency_key: str | None = None
    last_error: str | None = None


@dataclass(frozen=True)
class ProviderBookingResult:
    status: str
    provider_booking_id: str | None = None
    confirmation: dict[str, Any] = field(default_factory=dict)
    reason: str | None = None


class BookingAdapter(Protocol):
    method: BookingMethod

    def book(self, record: AppointmentRecord, idempotency_key: str) -> ProviderBookingResult: ...
    def get_booking_status(self, record: AppointmentRecord, idempotency_key: str) -> ProviderBookingResult: ...
    def cancel(self, record: AppointmentRecord) -> ProviderBookingResult: ...
    def reschedule(self, record: AppointmentRecord, changes: dict[str, Any]) -> ProviderBookingResult: ...


_ALLOWED_TRANSITIONS: dict[AppointmentStatus, frozenset[AppointmentStatus]] = {
    AppointmentStatus.DRAFT: frozenset({AppointmentStatus.SEARCHING, AppointmentStatus.FAILED}),
    AppointmentStatus.SEARCHING: frozenset({AppointmentStatus.AVAILABILITY_FOUND, AppointmentStatus.DRAFT, AppointmentStatus.FAILED}),
    AppointmentStatus.AVAILABILITY_FOUND: frozenset({AppointmentStatus.AWAITING_APPROVAL, AppointmentStatus.SEARCHING, AppointmentStatus.DRAFT, AppointmentStatus.FAILED}),
    AppointmentStatus.AWAITING_APPROVAL: frozenset({AppointmentStatus.APPROVED, AppointmentStatus.CANCELLED, AppointmentStatus.DRAFT, AppointmentStatus.FAILED}),
    AppointmentStatus.APPROVED: frozenset({AppointmentStatus.BOOKING, AppointmentStatus.CANCELLED, AppointmentStatus.FAILED}),
    AppointmentStatus.BOOKING: frozenset({AppointmentStatus.CONFIRMED, AppointmentStatus.CONFIRMATION_PENDING, AppointmentStatus.UNKNOWN, AppointmentStatus.FAILED}),
    AppointmentStatus.CONFIRMATION_PENDING: frozenset({AppointmentStatus.CONFIRMED, AppointmentStatus.UNKNOWN, AppointmentStatus.FAILED}),
    AppointmentStatus.UNKNOWN: frozenset({AppointmentStatus.CONFIRMED, AppointmentStatus.FAILED}),
    AppointmentStatus.CONFIRMED: frozenset({AppointmentStatus.CANCELLED, AppointmentStatus.RESCHEDULE_PENDING}),
    AppointmentStatus.RESCHEDULE_PENDING: frozenset({AppointmentStatus.RESCHEDULED, AppointmentStatus.CONFIRMATION_PENDING, AppointmentStatus.UNKNOWN, AppointmentStatus.FAILED}),
    AppointmentStatus.RESCHEDULED: frozenset({AppointmentStatus.RESCHEDULE_PENDING, AppointmentStatus.CANCELLED}),
    AppointmentStatus.FAILED: frozenset({AppointmentStatus.DRAFT, AppointmentStatus.SEARCHING}),
    AppointmentStatus.CANCELLED: frozenset(),
}


def transition(record: AppointmentRecord, target: AppointmentStatus) -> AppointmentRecord:
    if target == record.status:
        return record
    if target not in _ALLOWED_TRANSITIONS[record.status]:
        raise ValueError(f"invalid appointment transition: {record.status.value} -> {target.value}")
    record.status = target
    return record


def _meaningful(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str) and not value.strip():
        return False
    if isinstance(value, (list, tuple, set, dict)) and not value:
        return False
    return True


def merge_slots(previous: dict[str, Any] | None, incoming: dict[str, Any] | None) -> dict[str, Any]:
    merged = {k: v for k, v in (previous or {}).items() if k in SLOT_FIELDS and _meaningful(v)}
    for key, value in (incoming or {}).items():
        if key in SLOT_FIELDS and _meaningful(value):
            merged[key] = value
    return merged


def required_missing(slots: dict[str, Any], intent: AppointmentIntent) -> tuple[str, ...]:
    required = {
        AppointmentIntent.SEARCH: ("service_category", "location"),
        AppointmentIntent.AVAILABILITY: ("service_category", "location", "date"),
        AppointmentIntent.PREPARE: ("service_category", "provider", "date", "service_type"),
        AppointmentIntent.BOOK: ("service_category", "provider", "date", "service_type", "customer_name"),
        AppointmentIntent.RESCHEDULE: ("provider", "date"),
        AppointmentIntent.CANCEL: ("provider",),
        AppointmentIntent.STATUS: tuple(),
    }[intent]
    return tuple(key for key in required if not _meaningful(slots.get(key)))


def next_questions(slots: dict[str, Any], intent: AppointmentIntent) -> tuple[str, ...]:
    """Return only genuinely missing fields; known slots are never re-asked."""
    return required_missing(slots, intent)


def approval_for(
    intent: AppointmentIntent,
    *,
    paid: bool = False,
    financial_commitment: bool = False,
    service_category: str = "",
) -> ApprovalDecision:
    category = str(service_category).upper()
    if category in {"HEALTH_APPOINTMENT", "MEDICAL", "DOCTOR", "AUTHORITY", "BEHOERDE", "BEHÖRDE"}:
        return ApprovalDecision(ApprovalLevel.AUTH_PRIVACY, True, "sensitive_service_auth_privacy")
    if financial_commitment:
        return ApprovalDecision(ApprovalLevel.HIGH_TRUST, True, "financial_commitment")
    if paid:
        return ApprovalDecision(ApprovalLevel.EXPLICIT, True, "paid_action")
    if intent in {AppointmentIntent.BOOK, AppointmentIntent.RESCHEDULE, AppointmentIntent.CANCEL}:
        return ApprovalDecision(ApprovalLevel.STANDARD, True, "binding_appointment_action")
    return ApprovalDecision(ApprovalLevel.NONE, False, "non_binding_action")


def medical_guard(service_category: str, *, authenticated: bool, privacy_ok: bool) -> bool:
    category = str(service_category).upper()
    if category not in {"HEALTH_APPOINTMENT", "MEDICAL", "DOCTOR"}:
        return True
    return authenticated and privacy_ok


def authority_guard(service_category: str, *, authenticated: bool, authorized: bool) -> bool:
    category = str(service_category).upper()
    if category not in {"AUTHORITY", "BEHOERDE", "BEHÖRDE"}:
        return True
    return authenticated and authorized


def choose_booking_method(provider: dict[str, Any]) -> BookingMethod:
    methods = {str(x).lower() for x in provider.get("appointment_methods", ())}
    if "api" in methods:
        return BookingMethod.API
    if provider.get("booking_url") or "web" in methods:
        return BookingMethod.WEB
    if provider.get("email") or "email" in methods:
        return BookingMethod.EMAIL
    if provider.get("phone") or "phone" in methods:
        return BookingMethod.PHONE
    return BookingMethod.HUMAN


def idempotency_key(appointment_id: str, operation: str, revision: str = "1") -> str:
    return f"appointment:{appointment_id}:{operation}:{revision}"


class BookingCoordinator:
    """Fail-closed booking coordinator. Unknown provider outcomes are reconciled, never blindly retried."""

    def __init__(self) -> None:
        self._results: dict[str, ProviderBookingResult] = {}
        self._uncertain: set[str] = set()

    def book(self, record: AppointmentRecord, adapter: BookingAdapter, *, revision: str = "1") -> ProviderBookingResult:
        key = idempotency_key(record.appointment_id, "book", revision)
        record.idempotency_key = key
        if key in self._results:
            return self._results[key]
        if key in self._uncertain:
            return self.reconcile(record, adapter, key=key)
        if record.status != AppointmentStatus.APPROVED:
            raise ValueError("booking requires approved state")
        transition(record, AppointmentStatus.BOOKING)
        try:
            result = adapter.book(record, key)
        except TimeoutError:
            self._uncertain.add(key)
            transition(record, AppointmentStatus.CONFIRMATION_PENDING)
            record.last_error = "provider_timeout_unknown_outcome"
            return ProviderBookingResult("confirmation_pending", reason=record.last_error)
        return self._apply_booking_result(record, key, result)

    def reconcile(self, record: AppointmentRecord, adapter: BookingAdapter, *, key: str | None = None) -> ProviderBookingResult:
        key = key or record.idempotency_key
        if not key:
            raise ValueError("missing idempotency key")
        result = adapter.get_booking_status(record, key)
        return self._apply_booking_result(record, key, result)

    def _apply_booking_result(self, record: AppointmentRecord, key: str, result: ProviderBookingResult) -> ProviderBookingResult:
        status = result.status.lower()
        if status == "confirmed":
            if record.status in {AppointmentStatus.BOOKING, AppointmentStatus.CONFIRMATION_PENDING, AppointmentStatus.UNKNOWN}:
                transition(record, AppointmentStatus.CONFIRMED)
            record.provider_booking_id = result.provider_booking_id
            record.last_error = None
            self._uncertain.discard(key)
            self._results[key] = result
        elif status in {"pending", "confirmation_pending"}:
            if record.status == AppointmentStatus.BOOKING:
                transition(record, AppointmentStatus.CONFIRMATION_PENDING)
            self._uncertain.add(key)
        elif status == "unknown":
            if record.status == AppointmentStatus.BOOKING:
                transition(record, AppointmentStatus.UNKNOWN)
            elif record.status == AppointmentStatus.CONFIRMATION_PENDING:
                transition(record, AppointmentStatus.UNKNOWN)
            self._uncertain.add(key)
        else:
            if record.status in {AppointmentStatus.BOOKING, AppointmentStatus.CONFIRMATION_PENDING, AppointmentStatus.UNKNOWN}:
                transition(record, AppointmentStatus.FAILED)
            record.last_error = result.reason or "provider_booking_failed"
            self._uncertain.discard(key)
            self._results[key] = result
        return result


def begin_cancel(record: AppointmentRecord) -> None:
    if record.status not in {AppointmentStatus.CONFIRMED, AppointmentStatus.RESCHEDULED}:
        raise ValueError("only confirmed appointments can be cancelled")


def apply_cancel_result(record: AppointmentRecord, result: ProviderBookingResult) -> ProviderBookingResult:
    if result.status.lower() == "cancelled":
        transition(record, AppointmentStatus.CANCELLED)
    return result


def begin_reschedule(record: AppointmentRecord) -> None:
    transition(record, AppointmentStatus.RESCHEDULE_PENDING)


def apply_reschedule_result(record: AppointmentRecord, result: ProviderBookingResult) -> ProviderBookingResult:
    status = result.status.lower()
    if status in {"rescheduled", "confirmed"}:
        transition(record, AppointmentStatus.RESCHEDULED)
    elif status in {"pending", "confirmation_pending"}:
        transition(record, AppointmentStatus.CONFIRMATION_PENDING)
    elif status == "unknown":
        transition(record, AppointmentStatus.UNKNOWN)
    else:
        transition(record, AppointmentStatus.FAILED)
    return result


def email_request_contract(record: AppointmentRecord, provider: dict[str, Any]) -> dict[str, Any]:
    return {
        "contract": "appointment.email_request.v1",
        "appointment_id": record.appointment_id,
        "provider": provider.get("provider_id") or record.slots.get("provider"),
        "recipient": provider.get("email"),
        "service_type": record.slots.get("service_type"),
        "date": record.slots.get("date"),
        "time": record.slots.get("time"),
        "time_window": record.slots.get("time_window"),
        "notes": record.slots.get("notes"),
        "execute": False,
    }


def voice_request_contract(record: AppointmentRecord, provider: dict[str, Any]) -> dict[str, Any]:
    return {
        "contract": "appointment.outbound_call_request.v1",
        "appointment_id": record.appointment_id,
        "provider": provider.get("provider_id") or record.slots.get("provider"),
        "provider_phone": provider.get("phone"),
        "purpose": "appointment",
        "service_type": record.slots.get("service_type"),
        "date": record.slots.get("date"),
        "time": record.slots.get("time"),
        "time_window": record.slots.get("time_window"),
        "execute": False,
    }


def reminder_contract(record: AppointmentRecord, *, lead_minutes: int = 60) -> dict[str, Any]:
    if record.status not in {AppointmentStatus.CONFIRMED, AppointmentStatus.RESCHEDULED}:
        raise ValueError("reminder requires confirmed appointment")
    return {
        "contract": "appointment.reminder.v1",
        "appointment_id": record.appointment_id,
        "date": record.slots.get("date"),
        "time": record.slots.get("time"),
        "location": record.slots.get("location"),
        "provider": record.slots.get("provider"),
        "lead_minutes": lead_minutes,
        "execute": False,
    }


def calendar_contract(record: AppointmentRecord, operation: str) -> dict[str, Any]:
    if operation not in {"create_event", "update_event", "cancel_event"}:
        raise ValueError("unsupported calendar operation")
    return {
        "contract": "appointment.calendar.v1",
        "operation": operation,
        "appointment_id": record.appointment_id,
        "date": record.slots.get("date"),
        "time": record.slots.get("time"),
        "location": record.slots.get("location"),
        "provider": record.slots.get("provider"),
        "execute": False,
    }


def human_handoff_contract(record: AppointmentRecord, reason: str) -> dict[str, Any]:
    return {
        "contract": "appointment.human_handoff.v1",
        "appointment_id": record.appointment_id,
        "reason": reason,
        "slots": dict(record.slots),
        "execute": False,
    }
