"""Provider-capability layer for restaurant availability and booking.

No network transport is implemented here. Provider adapters model only capabilities
confirmed by public provider documentation and fail closed until partner credentials
and an approved integration are configured.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from typing import Mapping

from .providers import ProviderRateLimited, ProviderUnavailable
from .restaurant import (
    AvailabilityResult,
    AvailabilityStatus,
    PreparedReservation,
    ReservationResult,
    RestaurantAvailabilityProvider,
    RestaurantCandidate,
    RestaurantRequest,
)


class MissingPartnerConfiguration(RuntimeError):
    pass


class UnsupportedProviderCapability(RuntimeError):
    pass


@dataclass(frozen=True)
class RestaurantProviderCapabilities:
    supports_availability_search: bool = False
    supports_timeslots: bool = False
    supports_prepare: bool = False
    supports_confirm: bool = False
    supports_modify: bool = False
    supports_cancel: bool = False
    supports_deeplink: bool = False
    supports_webhook: bool = False
    requires_partner_contract: bool = True


# Conservative capability matrix: true only where the public provider material
# reviewed for NW-RESTAURANT-AVAILABILITY-PROVIDERS-01 substantiates the feature.
OPENTABLE_CAPABILITIES = RestaurantProviderCapabilities(
    supports_availability_search=True,
    supports_timeslots=True,
    supports_prepare=True,
    supports_confirm=True,
    supports_deeplink=True,
    requires_partner_contract=True,
)
QUANDOO_CAPABILITIES = RestaurantProviderCapabilities(
    supports_availability_search=True,
    supports_timeslots=True,
    supports_prepare=True,
    supports_confirm=True,
    supports_modify=True,
    supports_cancel=True,  # cancellation is represented as a reservation status update
    supports_deeplink=True,
    supports_webhook=True,
    requires_partner_contract=True,
)
THEFORK_CAPABILITIES = RestaurantProviderCapabilities(
    supports_deeplink=True,
    requires_partner_contract=True,
)
SEVENROOMS_CAPABILITIES = RestaurantProviderCapabilities(
    supports_deeplink=True,
    requires_partner_contract=True,
)
RESMIO_CAPABILITIES = RestaurantProviderCapabilities(
    supports_deeplink=True,
    requires_partner_contract=True,
)
GOOGLE_RESERVE_CAPABILITIES = RestaurantProviderCapabilities(
    # Actions Center is a distribution channel for approved reservation platforms;
    # it is not a general upstream consumer-booking API for NAHWERK.
    supports_deeplink=True,
    requires_partner_contract=True,
)
ALENO_CAPABILITIES = RestaurantProviderCapabilities(
    supports_availability_search=True,
    supports_timeslots=True,
    supports_prepare=True,
    supports_confirm=True,
    supports_modify=True,
    supports_webhook=True,
    requires_partner_contract=True,
)


@dataclass(frozen=True)
class AvailabilitySearchInput:
    restaurant_id: str
    date: str
    requested_time: str
    party_size: int

    def __post_init__(self):
        if self.party_size < 1:
            raise ValueError("party_size must be positive")
        if not self.restaurant_id:
            raise ValueError("restaurant_id required")


@dataclass(frozen=True)
class ReservationGuestData:
    name: str
    phone: str | None = None
    email: str | None = None

    def minimal_payload(self) -> dict[str, str]:
        payload = {"name": self.name}
        if self.phone:
            payload["phone"] = self.phone
        if self.email:
            payload["email"] = self.email
        return payload


@dataclass(frozen=True)
class ReservationPrepareInput:
    restaurant_id: str
    date: str
    requested_time: str
    party_size: int
    guest: ReservationGuestData
    provider_reference: str | None = None

    def __post_init__(self):
        if self.party_size < 1:
            raise ValueError("party_size must be positive")


class ProviderAction(str, Enum):
    STRUCTURED_AVAILABILITY = "STRUCTURED_AVAILABILITY"
    DEEPLINK = "DEEPLINK"
    RESTAURANT_SYSTEM = "RESTAURANT_SYSTEM"
    OUTBOUND_CALL = "OUTBOUND_CALL"
    NEEDS_USER_INPUT = "NEEDS_USER_INPUT"


@dataclass(frozen=True)
class ProviderPlan:
    action: ProviderAction
    provider_name: str | None = None
    reason: str | None = None


class ConfiguredAvailabilityAdapter(RestaurantAvailabilityProvider):
    """Fail-closed adapter boundary. No HTTP transport or hidden endpoint exists."""

    provider_name = "base"
    capabilities = RestaurantProviderCapabilities()

    def __init__(self, *, partner_configured: bool = False, fixtures: Mapping[str, AvailabilityResult] | None = None):
        self.partner_configured = partner_configured
        self._fixtures = dict(fixtures or {})

    def _require(self, capability: str):
        if not getattr(self.capabilities, capability):
            raise UnsupportedProviderCapability(f"{self.provider_name}: {capability} unsupported")
        if self.capabilities.requires_partner_contract and not self.partner_configured:
            raise MissingPartnerConfiguration(f"{self.provider_name}: partner configuration required")

    def build_search_input(self, candidate: RestaurantCandidate, request: RestaurantRequest) -> AvailabilitySearchInput:
        self._require("supports_availability_search")
        if not request.date or not request.time or request.party_size is None:
            raise ValueError("date, time and party_size required")
        return AvailabilitySearchInput(
            restaurant_id=candidate.place.external_id,
            date=request.date.isoformat(),
            requested_time=request.time.strftime("%H:%M"),
            party_size=request.party_size,
        )

    def check_availability(self, candidate: RestaurantCandidate, request: RestaurantRequest) -> AvailabilityResult:
        search_input = self.build_search_input(candidate, request)
        # Tests may inject synthetic responses. Production transport stays unwired.
        if search_input.restaurant_id in self._fixtures:
            return self._fixtures[search_input.restaurant_id]
        raise ProviderUnavailable(f"{self.provider_name}: live transport not configured")

    def prepare_reservation(self, candidate: RestaurantCandidate, request: RestaurantRequest, availability: AvailabilityResult) -> PreparedReservation:
        self._require("supports_prepare")
        if request.party_size is None or request.party_size < 1 or not request.time:
            raise ValueError("valid party_size and time required")
        requested = request.time.strftime("%H:%M")
        if availability.offered_times and requested not in availability.offered_times:
            raise ValueError("requested time differs from available time")
        return PreparedReservation(
            candidate=candidate,
            requested_time=requested,
            party_size=request.party_size,
            fee_required=availability.fee_required,
            prepayment_required=availability.prepayment_required,
            cancellation_fee=availability.cancellation_fee,
            minimum_spend=availability.minimum_spend,
        )

    def confirm_reservation(self, prepared: PreparedReservation) -> ReservationResult:
        self._require("supports_confirm")
        if any((prepared.fee_required, prepared.prepayment_required, prepared.cancellation_fee, prepared.minimum_spend)):
            raise PermissionError("commercial commitment requires explicit user approval")
        raise ProviderUnavailable(f"{self.provider_name}: live booking transport not configured")

    def modify_reservation(self, provider_reference: str, changes: Mapping[str, object]):
        self._require("supports_modify")
        raise ProviderUnavailable(f"{self.provider_name}: live modify transport not configured")

    def cancel_reservation(self, provider_reference: str):
        self._require("supports_cancel")
        raise ProviderUnavailable(f"{self.provider_name}: live cancel transport not configured")


class OpenTableAvailabilityAdapter(ConfiguredAvailabilityAdapter):
    provider_name = "opentable"
    capabilities = OPENTABLE_CAPABILITIES


class QuandooAvailabilityAdapter(ConfiguredAvailabilityAdapter):
    provider_name = "quandoo"
    capabilities = QUANDOO_CAPABILITIES


class AlenoAvailabilityAdapter(ConfiguredAvailabilityAdapter):
    provider_name = "aleno"
    capabilities = ALENO_CAPABILITIES


class DeepLinkOnlyAdapter(ConfiguredAvailabilityAdapter):
    def __init__(self, provider_name: str, capabilities: RestaurantProviderCapabilities, *, partner_configured: bool = False):
        self.provider_name = provider_name
        self.capabilities = capabilities
        super().__init__(partner_configured=partner_configured)

    def booking_link(self, candidate: RestaurantCandidate) -> str:
        self._require("supports_deeplink")
        if not candidate.reservation_url:
            raise ProviderUnavailable(f"{self.provider_name}: no verified booking link")
        return candidate.reservation_url


def choose_provider_plan(
    *,
    capabilities: RestaurantProviderCapabilities | None,
    partner_configured: bool,
    deeplink_available: bool,
    restaurant_system_available: bool,
    phone_available: bool,
) -> ProviderPlan:
    if capabilities and capabilities.supports_availability_search and (partner_configured or not capabilities.requires_partner_contract):
        return ProviderPlan(ProviderAction.STRUCTURED_AVAILABILITY)
    if deeplink_available:
        return ProviderPlan(ProviderAction.DEEPLINK)
    if restaurant_system_available:
        return ProviderPlan(ProviderAction.RESTAURANT_SYSTEM)
    if phone_available:
        return ProviderPlan(ProviderAction.OUTBOUND_CALL, reason="digital availability unavailable")
    return ProviderPlan(ProviderAction.NEEDS_USER_INPUT, reason="no safe reservation method")


def map_provider_http_error(status: int):
    if status == 429:
        raise ProviderRateLimited("provider rate limited")
    if status >= 500:
        raise ProviderUnavailable("provider unavailable")
