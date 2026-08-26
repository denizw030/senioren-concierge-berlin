"""Provider-neutral Restaurant Concierge core. No live reservations or calls."""
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import date, time
from enum import Enum
from math import log10
from typing import Any
from .core import Place, OpeningStatus, Confidence, duplicate

class RankingMode(str, Enum):
    BEST_MATCH="BEST_MATCH"; BEST_RATED="BEST_RATED"; NEAREST_GOOD="NEAREST_GOOD"; PRICE_CONSCIOUS="PRICE_CONSCIOUS"; MEMORY_PERSONALIZED="MEMORY_PERSONALIZED"
class ReservationState(str, Enum):
    REQUESTED="REQUESTED"; SEARCHING="SEARCHING"; CANDIDATES_FOUND="CANDIDATES_FOUND"; CHECKING_AVAILABILITY="CHECKING_AVAILABILITY"; AVAILABLE="AVAILABLE"; PREPARED="PREPARED"; APPROVED="APPROVED"; RESERVING="RESERVING"; CONFIRMED="CONFIRMED"; FAILED="FAILED"; NEEDS_USER_INPUT="NEEDS_USER_INPUT"; CANCELLED="CANCELLED"
class AvailabilityStatus(str, Enum): AVAILABLE="AVAILABLE"; UNAVAILABLE="UNAVAILABLE"; UNKNOWN="UNKNOWN"

@dataclass(frozen=True)
class AuthorizationContext:
    actor_person_id: str
    subject_person_id: str
    scopes: frozenset[str] = frozenset()
    def permits(self, scope: str) -> bool:
        return self.actor_person_id == self.subject_person_id or scope in self.scopes

@dataclass
class RestaurantRequest:
    actor_person_id: str
    subject_person_id: str
    location_context: Any
    date: date | None = None
    time: time | None = None
    party_size: int | None = None
    cuisine_preferences: list[str] = field(default_factory=list)
    min_rating: float | None = None
    max_distance: float | None = None
    max_travel_time: float | None = None
    price_preference: str | None = None
    atmosphere_preferences: list[str] = field(default_factory=list)
    accessibility_preferences: list[str] = field(default_factory=list)
    ranking_mode: RankingMode = RankingMode.BEST_MATCH
    reservation_intent: bool = False
    explicit_auto_reserve: bool = False
    fallback_preferences: dict = field(default_factory=dict)
    request_text: str = ""

@dataclass
class RestaurantCandidate:
    place: Place
    cuisines: list[str] = field(default_factory=list)
    price_level: str | None = None
    atmosphere: list[str] = field(default_factory=list)
    accessibility: list[str] = field(default_factory=list)
    reservation_url: str | None = None
    commercial_partner: bool = False

@dataclass
class AvailabilityResult:
    status: AvailabilityStatus
    offered_times: list[str] = field(default_factory=list)
    reservation_possible: bool = False
    provider_reference: str | None = None
    fee_required: bool = False
    prepayment_required: bool = False
    cancellation_fee: bool = False
    minimum_spend: bool = False
    confidence: float = 0.0

@dataclass
class PreparedReservation:
    candidate: RestaurantCandidate
    requested_time: str
    party_size: int
    fee_required: bool = False
    prepayment_required: bool = False
    cancellation_fee: bool = False
    minimum_spend: bool = False

@dataclass
class ReservationResult:
    confirmed: bool
    confirmation_reference: str | None = None
    notes: str | None = None

class RestaurantAvailabilityProvider:
    supports_live_availability = True
    def check_availability(self, candidate: RestaurantCandidate, request: RestaurantRequest) -> AvailabilityResult: raise NotImplementedError
    def prepare_reservation(self, candidate: RestaurantCandidate, request: RestaurantRequest, availability: AvailabilityResult) -> PreparedReservation: raise NotImplementedError
    def confirm_reservation(self, prepared: PreparedReservation) -> ReservationResult: raise NotImplementedError

class FixtureAvailabilityProvider(RestaurantAvailabilityProvider):
    def __init__(self, results=None, confirmations=None): self.results=results or {}; self.confirmations=confirmations or {}
    def check_availability(self,candidate,request): return self.results.get(candidate.place.external_id, AvailabilityResult(AvailabilityStatus.UNKNOWN))
    def prepare_reservation(self,candidate,request,availability):
        return PreparedReservation(candidate, request.time.strftime("%H:%M") if request.time else "", request.party_size or 0, availability.fee_required, availability.prepayment_required, availability.cancellation_fee, availability.minimum_spend)
    def confirm_reservation(self,prepared): return self.confirmations.get(prepared.candidate.place.external_id, ReservationResult(False))

@dataclass(frozen=True)
class OutboundCallRequest:
    restaurant_name: str; phone: str; date: str; time: str; party_size: int; reservation_name: str; special_requests: str | None; call_purpose: str; authorized_scope: str; request_id: str
@dataclass
class OutboundCallResult:
    call_status: str; availability_status: AvailabilityStatus; offered_times: list[str]; reservation_possible: bool; reservation_confirmed: bool=False; confirmation_reference: str|None=None; notes: str|None=None; confidence: float=0.0

class OutboundCallFixture:
    """Contract fixture only. It never dials a telephone number."""
    def __init__(self,result:OutboundCallResult): self.result=result
    def restaurant_call_availability(self, request:OutboundCallRequest)->OutboundCallResult: return self.result

CALL_DISCLOSURE_TEMPLATE = "Guten Abend, hier spricht der digitale Concierge von NAHWERK im Auftrag eines Kunden. Haben Sie {date} um {time} einen Tisch für {party_size} Personen frei?"

def objective_quality(place: Place) -> float:
    rating = place.rating or 0.0
    reviews = max(0, place.review_count or 0)
    confidence = {Confidence.HIGH:1.0, Confidence.MEDIUM:0.65, Confidence.LOW:0.25, Confidence.REJECT:0.0}[place.confidence]
    review_strength = min(1.0, log10(reviews + 1) / 3.0)
    reputation = rating * (0.55 + 0.45 * review_strength)
    return reputation * 12.0 + confidence * 10.0

def _memory_score(c:RestaurantCandidate, memory:dict) -> float:
    score=0.0
    cuisines={x.casefold() for x in c.cuisines}
    preferred={x.casefold() for x in memory.get("favorite_cuisines",[])}
    if cuisines & preferred: score += 8
    if memory.get("quiet") and "quiet" in {x.casefold() for x in c.atmosphere}: score += 4
    if memory.get("accessible") and "accessible" in {x.casefold() for x in c.accessibility}: score += 4
    pref_price=memory.get("price_preference")
    if pref_price and c.price_level == pref_price: score += 3
    return score

def eligible(c:RestaurantCandidate, req:RestaurantRequest)->bool:
    p=c.place
    if p.permanently_closed or p.confidence==Confidence.REJECT: return False
    if req.min_rating is not None and (p.rating is None or p.rating < req.min_rating): return False
    if req.max_distance is not None and (p.distance is None or p.distance > req.max_distance): return False
    if req.max_travel_time is not None and (p.travel_time is None or p.travel_time > req.max_travel_time): return False
    if p.opening_status in (OpeningStatus.CLOSED_NOW,OpeningStatus.CLOSED_TODAY): return False
    if req.cuisine_preferences and not ({x.casefold() for x in req.cuisine_preferences}&{x.casefold() for x in c.cuisines}): return False
    return True

def rank_restaurants(candidates:list[RestaurantCandidate], req:RestaurantRequest, memory:dict|None=None)->list[RestaurantCandidate]:
    memory=memory or {}
    def score(c):
        p=c.place; q=objective_quality(p)
        distance = max(0.0, 18.0-(p.distance or 20.0)*2.0)
        travel = max(0.0, 12.0-(p.travel_time or 60.0)*0.4)
        opening={OpeningStatus.OPEN_NOW:10,OpeningStatus.OPENING_SOON:6,OpeningStatus.OPEN_TODAY_LATER:5,OpeningStatus.UNKNOWN:0,OpeningStatus.CLOSING_SOON:2,OpeningStatus.CLOSED_NOW:-50,OpeningStatus.CLOSED_TODAY:-50}[p.opening_status]
        memory_score=_memory_score(c,memory)
        price=5 if req.price_preference and c.price_level==req.price_preference else 0
        if req.ranking_mode==RankingMode.BEST_RATED: return q*1.45 + distance*.35 + travel*.25 + opening
        if req.ranking_mode==RankingMode.NEAREST_GOOD: return q*.75 + distance*1.5 + travel + opening
        if req.ranking_mode==RankingMode.PRICE_CONSCIOUS: return q*.8 + distance*.7 + opening + price*2
        if req.ranking_mode==RankingMode.MEMORY_PERSONALIZED: return q + distance*.6 + opening + min(memory_score,12)
        return q + distance*.8 + travel*.4 + opening + min(memory_score,8) + price
    return sorted([c for c in candidates if eligible(c,req)], key=score, reverse=True)

def deduplicate_candidates(candidates:list[RestaurantCandidate])->list[RestaurantCandidate]:
    out=[]
    for candidate in candidates:
        if not any(duplicate(candidate.place, existing.place) for existing in out):
            out.append(candidate)
    return out

def visible_candidates(candidates:list[RestaurantCandidate])->list[RestaurantCandidate]: return candidates[:3]

def approval_from_original_request(req:RestaurantRequest)->bool:
    return bool(req.reservation_intent and req.explicit_auto_reserve and req.date and req.time and req.party_size and req.location_context)

def reservation_decision(req:RestaurantRequest, availability:AvailabilityResult, offered_time:str|None=None)->ReservationState:
    if availability.status==AvailabilityStatus.UNKNOWN: return ReservationState.NEEDS_USER_INPUT
    if availability.status==AvailabilityStatus.UNAVAILABLE: return ReservationState.NEEDS_USER_INPUT
    if any((availability.fee_required,availability.prepayment_required,availability.cancellation_fee,availability.minimum_spend)): return ReservationState.NEEDS_USER_INPUT
    if offered_time and req.time and offered_time != req.time.strftime("%H:%M"): return ReservationState.NEEDS_USER_INPUT
    return ReservationState.APPROVED if approval_from_original_request(req) else ReservationState.PREPARED

def authorize(req:RestaurantRequest, auth:AuthorizationContext):
    if req.actor_person_id!=req.subject_person_id and not auth.permits("restaurant.reserve"): raise PermissionError("DENY: restaurant.reserve scope required")
    return True

def candidate_flow(candidates:list[RestaurantCandidate], req:RestaurantRequest, availability_provider:RestaurantAvailabilityProvider, memory:dict|None=None):
    ranked=rank_restaurants(deduplicate_candidates(candidates),req,memory)
    checked=[]
    for c in ranked:
        checked.append((c,availability_provider.check_availability(c,req)))
    return checked

def senior_search_message(count:int, cuisine:str|None=None, when:str|None=None, party_size:int|None=None)->str:
    quality="sehr gute " if count else "keine passenden "
    cuisine_text=f"{cuisine}e " if cuisine else ""
    suffix=f" und prüfe, wo {when} noch ein Tisch für {party_size} frei ist" if when and party_size else ""
    return f"Ich habe {min(count,3)} {quality}{cuisine_text}Restaurants in deiner Nähe gefunden{suffix}."
