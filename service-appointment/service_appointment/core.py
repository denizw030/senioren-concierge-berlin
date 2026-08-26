from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from typing import Protocol, Any
import math

class ServiceCategory(str, Enum):
    HAIRDRESSER='HAIRDRESSER'; BARBER='BARBER'; BEAUTY='BEAUTY'; FOOT_CARE='FOOT_CARE'; OPTICIAN='OPTICIAN'; HEARING_AID='HEARING_AID'; ELECTRICIAN='ELECTRICIAN'; PLUMBER='PLUMBER'; LOCKSMITH='LOCKSMITH'; HANDYMAN='HANDYMAN'; CLEANING='CLEANING'; HOUSEHOLD_HELP='HOUSEHOLD_HELP'; GARDENING='GARDENING'; IT_SUPPORT='IT_SUPPORT'; PHONE_REPAIR='PHONE_REPAIR'; TV_REPAIR='TV_REPAIR'; APPLIANCE_REPAIR='APPLIANCE_REPAIR'; CAR_REPAIR='CAR_REPAIR'; TAX_ADVISOR='TAX_ADVISOR'; LEGAL_SERVICE='LEGAL_SERVICE'; FUNERAL_SERVICE='FUNERAL_SERVICE'; VETERINARY='VETERINARY'; HEALTH_APPOINTMENT='HEALTH_APPOINTMENT'; OTHER='OTHER'
class RankingMode(str, Enum): PASSEND='PASSEND'; EINES_DER_BESTEN='EINES_DER_BESTEN'; NAECHSTE='NAECHSTE'; GUENSTIGSTE='GUENSTIGSTE'; SCHNELLSTER_TERMIN='SCHNELLSTER_TERMIN'; WENIGSTE_ANREISE='WENIGSTE_ANREISE'
class Accessibility(str, Enum): NONE='NONE'; LIMITED_WALKING='LIMITED_WALKING'; ROLLATOR='ROLLATOR'; WHEELCHAIR='WHEELCHAIR'; NO_STAIRS='NO_STAIRS'; LOW_ENTRY='LOW_ENTRY'; ASSISTANCE_REQUIRED='ASSISTANCE_REQUIRED'; UNKNOWN='UNKNOWN'
class PriceKind(str, Enum): FIXED='FIXED'; FROM_PRICE='FROM_PRICE'; ESTIMATE='ESTIMATE'; HOURLY='HOURLY'; ON_REQUEST='ON_REQUEST'; UNKNOWN='UNKNOWN'
class AvailabilityState(str, Enum): AVAILABLE='AVAILABLE'; UNAVAILABLE='UNAVAILABLE'; UNKNOWN='UNKNOWN'; REQUIRES_CALL='REQUIRES_CALL'; REQUIRES_EXTERNAL_BOOKING='REQUIRES_EXTERNAL_BOOKING'; PROVIDER_UNAVAILABLE='PROVIDER_UNAVAILABLE'; NEEDS_USER_INPUT='NEEDS_USER_INPUT'
class Capability(str, Enum): SEARCH='SEARCH'; DETAILS='DETAILS'; AVAILABILITY='AVAILABILITY'; PREPARE='PREPARE'; CONFIRM='CONFIRM'; MODIFY='MODIFY'; CANCEL='CANCEL'
class ActionStage(str, Enum): INFORMATION='INFORMATION'; PREPARE='PREPARE'; APPROVE='APPROVE'; EXECUTE='EXECUTE'; NEEDS_USER_INPUT='NEEDS_USER_INPUT'; BLOCKED='BLOCKED'

@dataclass(frozen=True)
class LocationContext:
    source:str; locality:str|None=None; postal_code:str|None=None; latitude:float|None=None; longitude:float|None=None; authorized:bool=False; ephemeral:bool=True
    def usable(self): return self.authorized and bool(self.locality or self.postal_code or (self.latitude is not None and self.longitude is not None))
@dataclass(frozen=True)
class AuthorizationContext:
    actor_person_id:str; subject_person_id:str; scopes:frozenset[str]=frozenset()
    def self_action(self): return self.actor_person_id == self.subject_person_id
    def allows(self, scope): return self.self_action() or scope in self.scopes
@dataclass(frozen=True)
class PriceInfo:
    kind:PriceKind=PriceKind.UNKNOWN; amount:float|None=None; currency:str='EUR'
    def guaranteed(self): return self.kind==PriceKind.FIXED and self.amount is not None
@dataclass
class ServiceRequest:
    request_id:str; actor_person_id:str; subject_person_id:str; account_id:str; service_category:ServiceCategory; service_query:str; location:LocationContext
    preferred_provider:str|None=None; preferred_date:str|None=None; preferred_time:str|None=None; time_window:tuple[str,str]|None=None; urgency:str='normal'; accessibility_requirements:set[Accessibility]=field(default_factory=set); max_distance:float|None=None; max_travel_time:float|None=None; max_price:float|None=None; ranking_mode:RankingMode=RankingMode.PASSEND; authorization_context:AuthorizationContext|None=None; source_channel:str='unknown'; source_message_id:str=''; created_at:str=''
@dataclass
class ServiceProvider:
    provider_id:str; external_provider:str; external_id:str; name:str; category:ServiceCategory; address:str; coordinates:tuple[float,float]|None=None; phone:str|None=None; website:str|None=None; booking_url:str|None=None; rating:float|None=None; review_count:int=0; opening_status:str='UNKNOWN'; accessibility:set[Accessibility]=field(default_factory=set); service_area:set[str]=field(default_factory=set); price_information:PriceInfo=field(default_factory=PriceInfo); appointment_methods:set[str]=field(default_factory=set); provider_metadata:dict[str,Any]=field(default_factory=dict); confidence:float=0.5; distance_km:float|None=None; travel_minutes:float|None=None; next_available_minutes:float|None=None; permanently_closed:bool=False; partner:bool=False
@dataclass
class AppointmentRequest:
    service_request_id:str; provider_id:str; actor_person_id:str; subject_person_id:str; account_id:str; requested_date:str|None; requested_time:str|None; acceptable_time_window:tuple[str,str]|None; service_type:str; duration_if_known:int|None=None; party_size_if_relevant:int|None=None; accessibility_requirements:set[Accessibility]=field(default_factory=set); price_limit:float|None=None; notes:str|None=None; authorization_context:AuthorizationContext|None=None
@dataclass(frozen=True)
class AvailabilityResult:
    state:AvailabilityState; slots:tuple[str,...]=(); price:PriceInfo=PriceInfo(); reason:str|None=None
@dataclass(frozen=True)
class ProviderCapabilities:
    values:frozenset[Capability]
    def supports(self,c): return c in self.values
@dataclass(frozen=True)
class PreAuthorization:
    provider_ids:frozenset[str]; date:str; time_window:tuple[str,str]; service_type:str; max_price:float|None=None; accessibility:frozenset[Accessibility]=frozenset(); allow_payment:bool=False; allow_card:bool=False; allow_cancellation_fee:bool=False
@dataclass(frozen=True)
class PreparedAction:
    action_type:str; stage:ActionStage; payload:dict[str,Any]; reason:str|None=None

class AppointmentProvider(Protocol):
    capabilities:ProviderCapabilities
    def search_providers(self, request:ServiceRequest)->list[ServiceProvider]: ...
    def get_provider_details(self, provider_id:str)->ServiceProvider|None: ...
    def check_availability(self, request:AppointmentRequest)->AvailabilityResult: ...
    def prepare_appointment(self, request:AppointmentRequest)->dict: ...
    def confirm_appointment(self, prepared:dict)->dict: ...
    def modify_appointment(self, appointment_id:str, changes:dict)->dict: ...
    def cancel_appointment(self, appointment_id:str)->dict: ...

class FixtureAppointmentProvider:
    def __init__(self, providers=(), availability=None, capabilities=None, fail=False):
        self.providers=list(providers); self.availability=availability or {}; self.fail=fail
        self.capabilities=ProviderCapabilities(frozenset(capabilities or {Capability.SEARCH,Capability.DETAILS,Capability.AVAILABILITY,Capability.PREPARE}))
    def search_providers(self,request):
        if self.fail: raise RuntimeError('provider unavailable')
        return list(self.providers)
    def get_provider_details(self,pid): return next((p for p in self.providers if p.provider_id==pid),None)
    def check_availability(self,request):
        if self.fail: return AvailabilityResult(AvailabilityState.PROVIDER_UNAVAILABLE,reason='provider unavailable')
        if not self.capabilities.supports(Capability.AVAILABILITY):
            return AvailabilityResult(AvailabilityState.REQUIRES_EXTERNAL_BOOKING if self.get_provider_details(request.provider_id) and self.get_provider_details(request.provider_id).booking_url else AvailabilityState.REQUIRES_CALL)
        return self.availability.get(request.provider_id, AvailabilityResult(AvailabilityState.UNKNOWN))
    def prepare_appointment(self,request):
        if not self.capabilities.supports(Capability.PREPARE): raise RuntimeError('prepare unsupported')
        return {'provider_id':request.provider_id,'service_type':request.service_type,'date':request.requested_date,'time':request.requested_time}
    def confirm_appointment(self,prepared):
        if not self.capabilities.supports(Capability.CONFIRM): raise RuntimeError('confirm unsupported')
        return {'status':'confirmed','id':'fixture'}
    def modify_appointment(self,appointment_id,changes):
        if not self.capabilities.supports(Capability.MODIFY): raise RuntimeError('modify unsupported')
        return {'status':'modified'}
    def cancel_appointment(self,appointment_id):
        if not self.capabilities.supports(Capability.CANCEL): raise RuntimeError('cancel unsupported')
        return {'status':'cancelled'}

def eligible(p:ServiceProvider,r:ServiceRequest)->bool:
    if p.permanently_closed or p.category!=r.service_category: return False
    if p.service_area and r.location.locality and r.location.locality not in p.service_area: return False
    if r.max_distance is not None and (p.distance_km is None or p.distance_km>r.max_distance): return False
    if r.max_travel_time is not None and (p.travel_minutes is None or p.travel_minutes>r.max_travel_time): return False
    req={x for x in r.accessibility_requirements if x not in {Accessibility.NONE,Accessibility.UNKNOWN}}
    if req and not req.issubset(p.accessibility): return False
    return True

def quality(p):
    n=max(0,p.review_count); r=p.rating or 0; prior=4.2; weight=50
    return (n*r+weight*prior)/(n+weight) if n or r else 0

def rank_providers(providers:list[ServiceProvider], r:ServiceRequest)->list[ServiceProvider]:
    ps=[p for p in providers if eligible(p,r)]
    def key(p):
        if r.ranking_mode==RankingMode.NAECHSTE: return (-(p.distance_km if p.distance_km is not None else math.inf), quality(p))
        if r.ranking_mode==RankingMode.GUENSTIGSTE: return (-(p.price_information.amount if p.price_information.amount is not None else math.inf), quality(p))
        if r.ranking_mode==RankingMode.SCHNELLSTER_TERMIN: return (-(p.next_available_minutes if p.next_available_minutes is not None else math.inf), quality(p))
        if r.ranking_mode==RankingMode.WENIGSTE_ANREISE: return (-(p.travel_minutes if p.travel_minutes is not None else math.inf), quality(p))
        if r.ranking_mode==RankingMode.EINES_DER_BESTEN: return (quality(p),p.confidence,-(p.distance_km or 0))
        return (p.confidence*2+quality(p)-(p.distance_km or 0)*.05,)
    return sorted(ps,key=key,reverse=True)[:3]

def validate_request(r:ServiceRequest)->AvailabilityState|None:
    if not r.location.usable(): return AvailabilityState.NEEDS_USER_INPUT
    if r.service_category==ServiceCategory.OTHER or not r.service_query.strip(): return AvailabilityState.NEEDS_USER_INPUT
    return None

def check_price(price:PriceInfo,limit:float|None)->bool:
    if limit is None: return True
    if price.amount is None: return False
    return price.amount<=limit

def within_preauth(pre:PreAuthorization, provider_id:str,date:str,time:str,service_type:str,price:PriceInfo,accessibility:set[Accessibility],payment=False,card=False,cancellation_fee=False)->bool:
    if provider_id not in pre.provider_ids or date!=pre.date or service_type!=pre.service_type: return False
    if not (pre.time_window[0] <= time <= pre.time_window[1]): return False
    if pre.max_price is not None and (price.amount is None or price.amount>pre.max_price): return False
    if not set(pre.accessibility).issubset(accessibility): return False
    if payment and not pre.allow_payment: return False
    if card and not pre.allow_card: return False
    if cancellation_fee and not pre.allow_cancellation_fee: return False
    return True

def authorize(r:ServiceRequest, scope:str)->bool:
    a=r.authorization_context
    return bool(a and a.allows(scope))

def prepare_action(r:ServiceRequest,a:AppointmentRequest,availability:AvailabilityResult, *, payment=False,card=False,cancellation_fee=False, execute_enabled=False)->PreparedAction:
    if not authorize(r,'service.appointment.prepare'): return PreparedAction('service.appointment.prepare',ActionStage.BLOCKED,{},'authorization_scope_missing')
    if availability.state!=AvailabilityState.AVAILABLE: return PreparedAction('service.appointment.prepare',ActionStage.NEEDS_USER_INPUT,{},'availability_not_confirmed')
    if not check_price(availability.price,a.price_limit): return PreparedAction('service.appointment.prepare',ActionStage.NEEDS_USER_INPUT,{},'price_limit_or_unknown')
    if payment or card or cancellation_fee: return PreparedAction('service.appointment.book',ActionStage.APPROVE,{},'payment_risk_gate')
    payload={'provider_id':a.provider_id,'date':a.requested_date,'time':a.requested_time,'service_type':a.service_type}
    return PreparedAction('service.appointment.book',ActionStage.PREPARE if not execute_enabled else ActionStage.APPROVE,payload,'execute_default_off' if not execute_enabled else None)

def outbound_call_task(a:AppointmentRequest,provider:ServiceProvider,allowed_questions=())->dict:
    return {'provider_id':provider.provider_id,'provider_phone':provider.phone,'purpose':'appointment_availability','service_type':a.service_type,'requested_date':a.requested_date,'requested_time':a.requested_time,'acceptable_time_window':a.acceptable_time_window,'accessibility':sorted(x.value for x in a.accessibility_requirements),'price_limit':a.price_limit,'allowed_questions':list(allowed_questions)}

def audit(event:str, *, request_id:str, provider_id:str|None=None, source_message_id:str|None=None)->dict:
    allowed={'service_requested','providers_found','provider_selected','availability_checked','appointment_prepared','approval_requested','appointment_confirmed','appointment_failed','appointment_cancelled','outbound_call_requested'}
    if event not in allowed: raise ValueError('unsupported audit event')
    return {'event':event,'request_id':request_id,'provider_id':provider_id,'source_message_id':source_message_id}

class IdempotencyGuard:
    def __init__(self): self.messages=set(); self.bookings=set()
    def accept_message(self,message_id):
        if message_id in self.messages:return False
        self.messages.add(message_id); return True
    def accept_booking(self,key):
        if key in self.bookings:return False
        self.bookings.add(key); return True

def senior_summary(providers:list[ServiceProvider])->list[dict]:
    return [{'name':p.name,'distance_km':p.distance_km,'rating':p.rating,'booking':'online' if p.booking_url else ('call' if p.phone else 'unknown')} for p in providers[:3]]

def medical_boundary(category:ServiceCategory)->dict:
    return {'organizational_only':category==ServiceCategory.HEALTH_APPOINTMENT,'diagnosis':False,'treatment_recommendation':False,'medical_best_claim':False}

def delegate_hook(kind:str,payload:dict)->dict:
    if kind not in {'reminder','mobility','fraud','memory','family','action_approval','outbound_call','local_intelligence'}: raise ValueError('unknown hook')
    return {'delegate_to':kind,'payload':payload}
