"""Isolated NAHWERK restaurant concierge orchestration.

This module composes the existing restaurant/local/availability cores. It does not
perform live bookings, voice calls, email sends, calendar writes, or reminder writes.
All external execution contracts are emitted with execute=False.
"""
from __future__ import annotations

from dataclasses import dataclass, field, replace
from enum import Enum
from hashlib import sha256
from typing import Any, Iterable, Mapping
from uuid import uuid4

from .restaurant import AvailabilityStatus, RestaurantCandidate


EMPTY = (None, "", [], {}, ())


def _present(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, (list, tuple, set, dict)):
        return bool(value)
    return True


def merge_sparse_state(previous: Mapping[str, Any] | None, current: Mapping[str, Any] | None) -> dict[str, Any]:
    """Merge previous state with sparse current slots.

    Null/undefined/empty values never erase known values. Explicit preference
    removals use preference_remove so they remain distinguishable from empty input.
    """
    merged = dict(previous or {})
    for key, value in dict(current or {}).items():
        if key in {"preference_add", "preference_remove"}:
            continue
        if _present(value):
            merged[key] = value
    prefs = list(merged.get("preferences") or [])
    for value in (current or {}).get("preference_add", []) or []:
        if value and value not in prefs:
            prefs.append(value)
    removals = {str(x).casefold() for x in ((current or {}).get("preference_remove", []) or []) if x}
    if removals:
        prefs = [p for p in prefs if str(p).casefold() not in removals]
    if prefs or "preferences" in merged:
        merged["preferences"] = prefs
    return merged


REQUIRED_SEARCH_SLOTS = ("location", "cuisine")
REQUIRED_AVAILABILITY_SLOTS = ("restaurant", "party_size", "date", "time")


def missing_slots(state: Mapping[str, Any], for_availability: bool = False) -> list[str]:
    required = REQUIRED_AVAILABILITY_SLOTS if for_availability else REQUIRED_SEARCH_SLOTS
    return [slot for slot in required if not _present(state.get(slot))]


class ReservationLifecycle(str, Enum):
    DRAFT = "draft"
    SEARCHING = "searching"
    RESTAURANT_FOUND = "restaurant_found"
    CHECKING_AVAILABILITY = "checking_availability"
    AVAILABILITY_FOUND = "availability_found"
    AWAITING_APPROVAL = "awaiting_approval"
    APPROVED = "approved"
    BOOKING = "booking"
    CONFIRMATION_PENDING = "confirmation_pending"
    CONFIRMED = "confirmed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    MODIFICATION_PENDING = "modification_pending"
    MODIFIED = "modified"


@dataclass(frozen=True)
class ReservationRecord:
    reservation_id: str
    idempotency_key: str
    state: ReservationLifecycle = ReservationLifecycle.DRAFT
    provider_booking_id: str | None = None
    provider_status: str | None = None
    restaurant: str | None = None
    date: str | None = None
    time: str | None = None
    party_size: int | None = None


class InvalidTransition(RuntimeError):
    pass


ALLOWED_TRANSITIONS: dict[ReservationLifecycle, set[ReservationLifecycle]] = {
    ReservationLifecycle.DRAFT: {ReservationLifecycle.SEARCHING, ReservationLifecycle.FAILED},
    ReservationLifecycle.SEARCHING: {ReservationLifecycle.RESTAURANT_FOUND, ReservationLifecycle.FAILED},
    ReservationLifecycle.RESTAURANT_FOUND: {ReservationLifecycle.CHECKING_AVAILABILITY, ReservationLifecycle.AWAITING_APPROVAL, ReservationLifecycle.FAILED},
    ReservationLifecycle.CHECKING_AVAILABILITY: {ReservationLifecycle.AVAILABILITY_FOUND, ReservationLifecycle.FAILED},
    ReservationLifecycle.AVAILABILITY_FOUND: {ReservationLifecycle.AWAITING_APPROVAL, ReservationLifecycle.FAILED},
    ReservationLifecycle.AWAITING_APPROVAL: {ReservationLifecycle.APPROVED, ReservationLifecycle.CANCELLED, ReservationLifecycle.FAILED},
    ReservationLifecycle.APPROVED: {ReservationLifecycle.BOOKING, ReservationLifecycle.CANCELLED, ReservationLifecycle.FAILED},
    ReservationLifecycle.BOOKING: {ReservationLifecycle.CONFIRMED, ReservationLifecycle.CONFIRMATION_PENDING, ReservationLifecycle.FAILED},
    ReservationLifecycle.CONFIRMATION_PENDING: {ReservationLifecycle.CONFIRMED, ReservationLifecycle.FAILED},
    ReservationLifecycle.CONFIRMED: {ReservationLifecycle.MODIFICATION_PENDING, ReservationLifecycle.CANCELLED},
    ReservationLifecycle.MODIFICATION_PENDING: {ReservationLifecycle.MODIFIED, ReservationLifecycle.FAILED},
    ReservationLifecycle.MODIFIED: {ReservationLifecycle.MODIFICATION_PENDING, ReservationLifecycle.CANCELLED},
    ReservationLifecycle.FAILED: set(),
    ReservationLifecycle.CANCELLED: set(),
}


def transition(record: ReservationRecord, new_state: ReservationLifecycle, *, provider_booking_id: str | None = None, provider_status: str | None = None) -> ReservationRecord:
    if new_state not in ALLOWED_TRANSITIONS[record.state]:
        raise InvalidTransition(f"{record.state.value} -> {new_state.value}")
    return replace(record, state=new_state, provider_booking_id=provider_booking_id or record.provider_booking_id, provider_status=provider_status or record.provider_status)


def make_idempotency_key(subject_person_id: str, restaurant: str, date: str, time: str, party_size: int) -> str:
    raw = f"restaurant|{subject_person_id}|{restaurant}|{date}|{time}|{party_size}".encode()
    return sha256(raw).hexdigest()


def new_reservation(subject_person_id: str, restaurant: str, date: str, time: str, party_size: int) -> ReservationRecord:
    return ReservationRecord(
        reservation_id=str(uuid4()),
        idempotency_key=make_idempotency_key(subject_person_id, restaurant, date, time, party_size),
        restaurant=restaurant,
        date=date,
        time=time,
        party_size=party_size,
    )


class ReservationRoute(str, Enum):
    API = "api"
    ONLINE = "online"
    RESTAURANT_SITE = "restaurant_site"
    VOICE = "voice"
    EMAIL = "email"
    HUMAN = "human"


@dataclass(frozen=True)
class RoutingCapabilities:
    api_available: bool = False
    online_provider_available: bool = False
    restaurant_booking_page: bool = False
    phone: str | None = None
    email: str | None = None


def choose_reservation_route(caps: RoutingCapabilities) -> ReservationRoute:
    if caps.api_available:
        return ReservationRoute.API
    if caps.online_provider_available:
        return ReservationRoute.ONLINE
    if caps.restaurant_booking_page:
        return ReservationRoute.RESTAURANT_SITE
    if caps.phone:
        return ReservationRoute.VOICE
    if caps.email:
        return ReservationRoute.EMAIL
    return ReservationRoute.HUMAN


def availability_truth(*, search_found: bool, open_at_time: bool | None, provider_status: AvailabilityStatus | None) -> AvailabilityStatus:
    """Never infer table availability from search existence or opening hours."""
    if provider_status is not None:
        return provider_status
    return AvailabilityStatus.UNKNOWN


@dataclass(frozen=True)
class ApprovalDecision:
    required: bool
    elevated: bool
    reason: str


def approval_requirement(*, binding_booking: bool, deposit: bool = False, prepayment: bool = False, no_show_fee: bool = False, cancellation_fee: bool = False, minimum_spend: bool = False) -> ApprovalDecision:
    commercial = any((deposit, prepayment, no_show_fee, cancellation_fee, minimum_spend))
    if commercial:
        return ApprovalDecision(True, True, "commercial commitment")
    if binding_booking:
        return ApprovalDecision(True, False, "binding reservation")
    return ApprovalDecision(False, False, "read-only")


@dataclass(frozen=True)
class ContractEnvelope:
    type: str
    payload: Mapping[str, Any]
    execute: bool = False


def voice_contract(*, restaurant: str, phone: str, date: str, time: str, party_size: int, reservation_name: str, preferences: Iterable[str] = (), fallback_windows: Iterable[str] = ()) -> ContractEnvelope:
    return ContractEnvelope("restaurant.reservation_call_request.v1", {
        "restaurant": restaurant,
        "phone": phone,
        "date": date,
        "time": time,
        "party_size": party_size,
        "reservation_name": reservation_name,
        "preferences": list(preferences),
        "fallback_windows": list(fallback_windows),
    })


def email_contract(*, restaurant: str, email: str, date: str, time: str, party_size: int, reservation_name: str, preferences: Iterable[str] = ()) -> ContractEnvelope:
    return ContractEnvelope("restaurant.reservation_email_request.v1", {
        "restaurant": restaurant,
        "email": email,
        "date": date,
        "time": time,
        "party_size": party_size,
        "reservation_name": reservation_name,
        "preferences": list(preferences),
    })


def reminder_contract(record: ReservationRecord, address: str) -> ContractEnvelope:
    if record.state is not ReservationLifecycle.CONFIRMED:
        raise InvalidTransition("reminder only allowed for confirmed reservation")
    return ContractEnvelope("restaurant.reservation_reminder_request.v1", {
        "restaurant": record.restaurant,
        "date": record.date,
        "time": record.time,
        "party_size": record.party_size,
        "address": address,
        "reservation_id": record.reservation_id,
    })


def calendar_contract(record: ReservationRecord, action: str, address: str) -> ContractEnvelope:
    allowed = {
        "create_event": {ReservationLifecycle.CONFIRMED},
        "update_event": {ReservationLifecycle.MODIFIED},
        "cancel_event": {ReservationLifecycle.CANCELLED},
    }
    if action not in allowed or record.state not in allowed[action]:
        raise InvalidTransition(f"calendar {action} invalid for {record.state.value}")
    return ContractEnvelope("restaurant.calendar_request.v1", {
        "action": action,
        "restaurant": record.restaurant,
        "date": record.date,
        "time": record.time,
        "party_size": record.party_size,
        "address": address,
        "reservation_id": record.reservation_id,
    })


def modification_requested(record: ReservationRecord, *, time: str | None = None, party_size: int | None = None) -> ReservationRecord:
    if record.state not in {ReservationLifecycle.CONFIRMED, ReservationLifecycle.MODIFIED}:
        raise InvalidTransition("only confirmed/modified reservations can be changed")
    next_record = transition(record, ReservationLifecycle.MODIFICATION_PENDING)
    return replace(next_record, time=time or record.time, party_size=party_size or record.party_size)


def modification_confirmed(record: ReservationRecord, provider_status: str = "modified") -> ReservationRecord:
    return transition(record, ReservationLifecycle.MODIFIED, provider_status=provider_status)


def cancellation_confirmed(record: ReservationRecord, provider_status: str = "cancelled") -> ReservationRecord:
    if record.state not in {ReservationLifecycle.CONFIRMED, ReservationLifecycle.MODIFIED, ReservationLifecycle.AWAITING_APPROVAL, ReservationLifecycle.APPROVED}:
        raise InvalidTransition("cancellation requires cancellable state")
    return replace(record, state=ReservationLifecycle.CANCELLED, provider_status=provider_status)


def timeout_pending(record: ReservationRecord, provider_status: str = "timeout") -> ReservationRecord:
    if record.state is not ReservationLifecycle.BOOKING:
        raise InvalidTransition("timeout only during booking")
    return transition(record, ReservationLifecycle.CONFIRMATION_PENDING, provider_status=provider_status)


def should_retry_booking(record: ReservationRecord) -> bool:
    """Blind booking retries are forbidden after a timeout/pending state."""
    return record.state is ReservationLifecycle.APPROVED and not record.provider_booking_id


def no_reask_message(state: Mapping[str, Any], *, for_availability: bool = False) -> str | None:
    missing = missing_slots(state, for_availability=for_availability)
    if not missing:
        return None
    labels = {"location": "Ort", "cuisine": "Küche", "restaurant": "Restaurant", "party_size": "Personenzahl", "date": "Datum", "time": "Uhrzeit"}
    return "Mir fehlt noch: " + ", ".join(labels[x] for x in missing) + "."


def candidate_summary(candidate: RestaurantCandidate, availability: AvailabilityStatus = AvailabilityStatus.UNKNOWN) -> dict[str, Any]:
    p = candidate.place
    return {
        "restaurant": p.name,
        "address": p.address,
        "cuisines": list(candidate.cuisines),
        "opening_status": p.opening_status.value,
        "reservation_url": candidate.reservation_url,
        "availability": availability.value,
    }
