"""NAHWERK restaurant execution orchestrator.

Pure orchestration layer over the existing restaurant core/contracts. No external
provider is called here; adapters feed real/sandbox outcomes back into this state
machine. This keeps retries bounded, idempotent and safe to resume after handoff.
"""
from __future__ import annotations

from dataclasses import dataclass, field, replace
from datetime import datetime, timezone
from enum import Enum
from hashlib import sha256
from typing import Any, Iterable, Mapping
from uuid import uuid4

from .restaurant import AvailabilityStatus, RestaurantCandidate, RestaurantRequest, deduplicate_candidates, rank_restaurants
from .restaurant_concierge import ContractEnvelope, approval_requirement, calendar_contract, email_contract, reminder_contract, ReservationLifecycle, ReservationRecord, voice_contract


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class JobState(str, Enum):
    CREATED="CREATED"; SEARCHING="SEARCHING"; CANDIDATES_FOUND="CANDIDATES_FOUND"
    CHECKING_ONLINE="CHECKING_ONLINE"; WAITING_APPROVAL="WAITING_APPROVAL"; BOOKING_ONLINE="BOOKING_ONLINE"
    CALLING="CALLING"; WAITING_PROVIDER="WAITING_PROVIDER"; TRYING_NEXT="TRYING_NEXT"
    WAITING_CUSTOMER="WAITING_CUSTOMER"; HANDOFF="HANDOFF"; CONFIRMATION_PENDING="CONFIRMATION_PENDING"
    CONFIRMED="CONFIRMED"; FAILED="FAILED"; CANCELLED="CANCELLED"


ALLOWED_JOB_TRANSITIONS: dict[JobState, set[JobState]] = {
    JobState.CREATED:{JobState.SEARCHING,JobState.CANCELLED,JobState.FAILED},
    JobState.SEARCHING:{JobState.CANDIDATES_FOUND,JobState.WAITING_CUSTOMER,JobState.HANDOFF,JobState.FAILED,JobState.CANCELLED},
    JobState.CANDIDATES_FOUND:{JobState.CHECKING_ONLINE,JobState.CALLING,JobState.TRYING_NEXT,JobState.HANDOFF,JobState.FAILED,JobState.CANCELLED},
    JobState.CHECKING_ONLINE:{JobState.WAITING_APPROVAL,JobState.BOOKING_ONLINE,JobState.CALLING,JobState.TRYING_NEXT,JobState.WAITING_CUSTOMER,JobState.CONFIRMATION_PENDING,JobState.HANDOFF,JobState.FAILED},
    JobState.WAITING_APPROVAL:{JobState.BOOKING_ONLINE,JobState.CALLING,JobState.CANCELLED,JobState.FAILED},
    JobState.BOOKING_ONLINE:{JobState.CONFIRMED,JobState.CONFIRMATION_PENDING,JobState.TRYING_NEXT,JobState.CALLING,JobState.HANDOFF,JobState.FAILED},
    JobState.CALLING:{JobState.CONFIRMED,JobState.WAITING_PROVIDER,JobState.WAITING_CUSTOMER,JobState.TRYING_NEXT,JobState.HANDOFF,JobState.FAILED},
    JobState.WAITING_PROVIDER:{JobState.CONFIRMED,JobState.CONFIRMATION_PENDING,JobState.TRYING_NEXT,JobState.WAITING_CUSTOMER,JobState.HANDOFF,JobState.FAILED},
    JobState.TRYING_NEXT:{JobState.CHECKING_ONLINE,JobState.CALLING,JobState.HANDOFF,JobState.FAILED},
    JobState.WAITING_CUSTOMER:{JobState.CHECKING_ONLINE,JobState.CALLING,JobState.TRYING_NEXT,JobState.CANCELLED,JobState.HANDOFF,JobState.FAILED},
    JobState.HANDOFF:{JobState.SEARCHING,JobState.CHECKING_ONLINE,JobState.CALLING,JobState.CANCELLED,JobState.FAILED},
    JobState.CONFIRMATION_PENDING:{JobState.CONFIRMED,JobState.TRYING_NEXT,JobState.HANDOFF,JobState.FAILED},
    JobState.CONFIRMED:set(), JobState.FAILED:set(), JobState.CANCELLED:set(),
}


class InvalidJobTransition(RuntimeError): pass


class CallResult(str, Enum):
    CONFIRMED="CONFIRMED"; UNAVAILABLE="UNAVAILABLE"; NO_ANSWER="NO_ANSWER"; BUSY="BUSY"
    CALL_FAILED="CALL_FAILED"; ALTERNATIVE_OFFERED="ALTERNATIVE_OFFERED"; CALLBACK_REQUIRED="CALLBACK_REQUIRED"
    UNCERTAIN="UNCERTAIN"; BLOCKED_BY_PROVIDER="BLOCKED_BY_PROVIDER"


class AttemptChannel(str, Enum):
    API="API"; ONLINE="ONLINE"; RESTAURANT_SITE="RESTAURANT_SITE"; VOICE="VOICE"; EMAIL="EMAIL"


class AttemptState(str, Enum):
    PENDING="PENDING"; IN_PROGRESS="IN_PROGRESS"; FAILED="FAILED"; CONFIRMATION_PENDING="CONFIRMATION_PENDING"; CONFIRMED="CONFIRMED"; SKIPPED="SKIPPED"


@dataclass(frozen=True)
class ExecutionLimits:
    max_candidates:int=5; max_calls:int=5; max_online_attempts:int=5; per_candidate_retry_limit:int=2; global_timeout_seconds:int=600


@dataclass(frozen=True)
class ExecutionCandidate:
    candidate_id:str; restaurant_name:str; external_id:str; address:str; rank:int
    rating:float|None=None; distance:float|None=None; online_reservation_capability:bool=False
    restaurant_site_capability:bool=False; phone:str|None=None; email:str|None=None
    availability_state:AvailabilityStatus=AvailabilityStatus.UNKNOWN
    attempt_state:AttemptState=AttemptState.PENDING; attempt_count:int=0; last_result:str|None=None


@dataclass(frozen=True)
class AttemptRecord:
    attempt_id:str; candidate_id:str; channel:AttemptChannel; idempotency_key:str
    state:AttemptState=AttemptState.IN_PROGRESS; result:str|None=None; provider_booking_id:str|None=None; provider_status:str|None=None


@dataclass
class RestaurantExecutionJob:
    job_id:str; reservation_id:str; account_id:str; member_ref:str|None; status:JobState
    criteria:dict[str,Any]; candidate_list:list[ExecutionCandidate]=field(default_factory=list)
    current_candidate:int|None=None; attempt_count:int=0; max_attempts:int=10
    channel_attempts:dict[str,int]=field(default_factory=dict); customer_constraints:dict[str,Any]=field(default_factory=dict)
    allowed_time_window:tuple[str,str]|None=None; allowed_radius:float|None=None; minimum_rating:float|None=None
    approval_state:str="NOT_REQUIRED"; provider_state:str|None=None; result:dict[str,Any]|None=None
    handoff_id:str|None=None; created_at:str=field(default_factory=_now); updated_at:str=field(default_factory=_now)
    attempts:list[AttemptRecord]=field(default_factory=list); audit:list[dict[str,Any]]=field(default_factory=list)
    limits:ExecutionLimits=field(default_factory=ExecutionLimits); tenant_id:str|None=None

    def event(self, name:str, **safe:Any) -> None:
        self.audit.append({"event":name,"at":_now(),**safe}); self.updated_at=_now()


def _job_key(account_id:str, criteria:Mapping[str,Any]) -> str:
    material="|".join([account_id,str(criteria.get("date")),str(criteria.get("time")),str(criteria.get("party_size")),str(criteria.get("location")),str(criteria.get("cuisine"))])
    return sha256(material.encode()).hexdigest()


def create_job(*, account_id:str, member_ref:str|None, criteria:Mapping[str,Any], tenant_id:str|None=None, constraints:Mapping[str,Any]|None=None, limits:ExecutionLimits|None=None) -> RestaurantExecutionJob:
    key=_job_key(account_id,criteria)
    job=RestaurantExecutionJob(job_id=str(uuid4()), reservation_id=key[:32], account_id=account_id, member_ref=member_ref,
        status=JobState.CREATED, criteria=dict(criteria), customer_constraints=dict(constraints or {}),
        allowed_time_window=(constraints or {}).get("allowed_time_window"), allowed_radius=(constraints or {}).get("allowed_radius"),
        minimum_rating=(criteria or {}).get("minimum_rating"), limits=limits or ExecutionLimits(), tenant_id=tenant_id)
    job.event("restaurant_job_created")
    return job


def transition_job(job:RestaurantExecutionJob,new_state:JobState) -> RestaurantExecutionJob:
    if new_state==job.status: return job
    if new_state not in ALLOWED_JOB_TRANSITIONS[job.status]: raise InvalidJobTransition(f"{job.status.value} -> {new_state.value}")
    job.status=new_state; job.updated_at=_now(); return job


def _candidate_id(c:RestaurantCandidate)->str:
    p=c.place
    return sha256(f"{p.source}|{p.external_id}|{p.name}|{p.address}".encode()).hexdigest()[:20]


def build_candidates(raw:list[RestaurantCandidate], req:RestaurantRequest, *, memory:dict|None=None, max_candidates:int=5) -> list[ExecutionCandidate]:
    ranked=rank_restaurants(deduplicate_candidates(raw),req,memory)
    out=[]
    for idx,c in enumerate(ranked[:max_candidates],1):
        p=c.place
        out.append(ExecutionCandidate(candidate_id=_candidate_id(c),restaurant_name=p.name,external_id=p.external_id,address=p.address,rank=idx,
            rating=p.rating,distance=p.distance,online_reservation_capability=bool(c.reservation_url),phone=p.phone))
    return out


def set_candidates(job:RestaurantExecutionJob,candidates:list[ExecutionCandidate]) -> None:
    if job.status==JobState.CREATED: transition_job(job,JobState.SEARCHING); job.event("restaurant_search_started")
    if job.status!=JobState.SEARCHING: raise InvalidJobTransition("candidate search requires SEARCHING")
    job.candidate_list=candidates[:job.limits.max_candidates]
    if not job.candidate_list:
        transition_job(job,JobState.HANDOFF); job.event("restaurant_handoff_created",reason="no_candidates"); return
    transition_job(job,JobState.CANDIDATES_FOUND); job.current_candidate=0; job.event("restaurant_candidates_found",count=len(job.candidate_list))


def current_candidate(job:RestaurantExecutionJob)->ExecutionCandidate|None:
    if job.current_candidate is None or job.current_candidate>=len(job.candidate_list): return None
    return job.candidate_list[job.current_candidate]


def select_current(job:RestaurantExecutionJob)->ExecutionCandidate:
    c=current_candidate(job)
    if not c: raise IndexError("no current candidate")
    job.event("restaurant_candidate_selected",candidate_id=c.candidate_id,rank=c.rank); return c


def _attempt_key(job:RestaurantExecutionJob,candidate_id:str,channel:AttemptChannel,sequence:int)->str:
    return sha256(f"{job.job_id}|{job.reservation_id}|{candidate_id}|{channel.value}|{sequence}".encode()).hexdigest()


def begin_attempt(job:RestaurantExecutionJob,channel:AttemptChannel) -> AttemptRecord:
    if job.status in {JobState.CONFIRMED,JobState.CANCELLED,JobState.FAILED}: raise RuntimeError("terminal job")
    c=select_current(job)
    if job.attempt_count>=job.max_attempts: raise RuntimeError("global attempt limit")
    if channel==AttemptChannel.VOICE and job.channel_attempts.get("VOICE",0)>=job.limits.max_calls: raise RuntimeError("voice attempt limit")
    if channel in {AttemptChannel.API,AttemptChannel.ONLINE,AttemptChannel.RESTAURANT_SITE} and job.channel_attempts.get("ONLINE",0)>=job.limits.max_online_attempts: raise RuntimeError("online attempt limit")
    existing=[a for a in job.attempts if a.candidate_id==c.candidate_id and a.channel==channel and a.state in {AttemptState.IN_PROGRESS,AttemptState.CONFIRMATION_PENDING,AttemptState.CONFIRMED}]
    if existing: return existing[-1]
    seq=sum(1 for a in job.attempts if a.candidate_id==c.candidate_id and a.channel==channel)+1
    if seq>job.limits.per_candidate_retry_limit+1: raise RuntimeError("candidate retry limit")
    attempt=AttemptRecord(str(uuid4()),c.candidate_id,channel,_attempt_key(job,c.candidate_id,channel,seq))
    job.attempts.append(attempt); job.attempt_count+=1
    bucket="VOICE" if channel==AttemptChannel.VOICE else "ONLINE" if channel in {AttemptChannel.API,AttemptChannel.ONLINE,AttemptChannel.RESTAURANT_SITE} else channel.value
    job.channel_attempts[bucket]=job.channel_attempts.get(bucket,0)+1
    job.event("restaurant_call_requested" if channel==AttemptChannel.VOICE else "restaurant_booking_attempt",candidate_id=c.candidate_id,channel=channel.value)
    return attempt


def online_first_channel(c:ExecutionCandidate)->AttemptChannel|None:
    if c.online_reservation_capability: return AttemptChannel.ONLINE
    if c.restaurant_site_capability: return AttemptChannel.RESTAURANT_SITE
    return None


def register_availability(job:RestaurantExecutionJob,status:AvailabilityStatus) -> None:
    c=current_candidate(job)
    if not c: raise IndexError("no current candidate")
    job.candidate_list[job.current_candidate]=replace(c,availability_state=status)
    job.event("restaurant_online_check",candidate_id=c.candidate_id,availability=status.value)


def needs_approval(*, binding:bool=True, deposit:bool=False,prepayment:bool=False,no_show_fee:bool=False,cancellation_fee:bool=False,minimum_spend:bool=False):
    return approval_requirement(binding_booking=binding,deposit=deposit,prepayment=prepayment,no_show_fee=no_show_fee,cancellation_fee=cancellation_fee,minimum_spend=minimum_spend)


def set_approval(job:RestaurantExecutionJob,approved:bool,*,elevated:bool=False)->None:
    job.approval_state="APPROVED_ELEVATED" if approved and elevated else "APPROVED" if approved else "DENIED"
    if not approved: transition_job(job,JobState.CANCELLED)


def _within_window(offered:str,window:tuple[str,str]|None)->bool:
    return bool(window and window[0] <= offered <= window[1])


def handle_call_result(job:RestaurantExecutionJob,result:CallResult,*,offered_time:str|None=None,provider_reference:str|None=None)->str:
    c=current_candidate(job)
    if not c: raise IndexError("no current candidate")
    job.event("restaurant_call_result",candidate_id=c.candidate_id,result=result.value)
    if result==CallResult.CONFIRMED:
        confirm(job,provider_reference=provider_reference or "voice-confirmed",provider_status="confirmed"); return "CONFIRMED"
    if result==CallResult.ALTERNATIVE_OFFERED:
        if offered_time and _within_window(offered_time,job.allowed_time_window):
            job.criteria["time"]=offered_time; return "ACCEPTABLE_ALTERNATIVE"
        transition_job(job,JobState.WAITING_CUSTOMER); job.event("restaurant_customer_input_required",offered_time=offered_time); return "WAITING_CUSTOMER"
    if result in {CallResult.CALLBACK_REQUIRED,CallResult.UNCERTAIN}:
        transition_job(job,JobState.WAITING_PROVIDER); return "WAITING_PROVIDER"
    if result in {CallResult.NO_ANSWER,CallResult.BUSY,CallResult.CALL_FAILED,CallResult.UNAVAILABLE,CallResult.BLOCKED_BY_PROVIDER}:
        return try_next(job,reason=result.value)
    return try_next(job,reason="unknown")


def mark_confirmation_pending(job:RestaurantExecutionJob,attempt:AttemptRecord,provider_status:str="timeout")->None:
    i=job.attempts.index(attempt); job.attempts[i]=replace(attempt,state=AttemptState.CONFIRMATION_PENDING,provider_status=provider_status)
    transition_job(job,JobState.CONFIRMATION_PENDING); job.provider_state=provider_status


def reconcile_provider(job:RestaurantExecutionJob,*,confirmed:bool,provider_booking_id:str|None=None,provider_status:str|None=None)->str:
    if job.status!=JobState.CONFIRMATION_PENDING: raise InvalidJobTransition("reconciliation requires CONFIRMATION_PENDING")
    if confirmed:
        confirm(job,provider_reference=provider_booking_id or "provider-confirmed",provider_status=provider_status or "confirmed"); return "CONFIRMED"
    return try_next(job,reason=provider_status or "provider_not_confirmed")


def try_next(job:RestaurantExecutionJob,*,reason:str)->str:
    c=current_candidate(job)
    if c:
        job.candidate_list[job.current_candidate]=replace(c,attempt_state=AttemptState.FAILED,last_result=reason)
        job.event("restaurant_candidate_failed",candidate_id=c.candidate_id,reason=reason)
    next_index=(job.current_candidate or 0)+1
    if next_index < len(job.candidate_list) and next_index < job.limits.max_candidates:
        if job.status!=JobState.TRYING_NEXT: transition_job(job,JobState.TRYING_NEXT)
        job.current_candidate=next_index; job.event("restaurant_try_next",candidate_id=job.candidate_list[next_index].candidate_id); return "NEXT"
    if job.status!=JobState.HANDOFF: transition_job(job,JobState.HANDOFF)
    job.handoff_id=job.handoff_id or str(uuid4()); job.event("restaurant_handoff_created",reason="candidates_exhausted"); return "HANDOFF"


def handoff_contract(job:RestaurantExecutionJob)->ContractEnvelope:
    checked=[{"candidate_id":c.candidate_id,"restaurant":c.restaurant_name,"result":c.last_result} for c in job.candidate_list if c.attempt_count or c.last_result]
    return ContractEnvelope("restaurant.human_handoff_request.v1",{"job_id":job.job_id,"reservation_id":job.reservation_id,"criteria":job.criteria,"checked":checked,"reason":"automation_blocked_or_exhausted"},False)


def resume_from_handoff(job:RestaurantExecutionJob,operator_result:Mapping[str,Any])->None:
    if job.status!=JobState.HANDOFF: raise InvalidJobTransition("resume requires HANDOFF")
    if "allowed_radius" in operator_result:
        job.allowed_radius=float(operator_result["allowed_radius"]); job.criteria["allowed_radius"]=job.allowed_radius
    if operator_result.get("action") in {"expand_search","search_again"}:
        transition_job(job,JobState.SEARCHING); job.current_candidate=None; job.candidate_list=[]; job.event("restaurant_job_resumed",action=operator_result.get("action")); return
    if operator_result.get("action")=="call_candidate":
        transition_job(job,JobState.CALLING); job.event("restaurant_job_resumed",action="call_candidate"); return
    raise ValueError("unsupported operator result")


def email_fallback_contract(job:RestaurantExecutionJob,reservation_name:str)->ContractEnvelope:
    c=select_current(job)
    if not c.email: raise ValueError("candidate has no email")
    return email_contract(restaurant=c.restaurant_name,email=c.email,date=str(job.criteria.get("date")),time=str(job.criteria.get("time")),party_size=int(job.criteria.get("party_size")),reservation_name=reservation_name,preferences=job.criteria.get("preferences",[]))


def voice_fallback_contract(job:RestaurantExecutionJob,reservation_name:str)->ContractEnvelope:
    c=select_current(job)
    if not c.phone: raise ValueError("candidate has no phone")
    windows=[]
    if job.allowed_time_window: windows=[f"{job.allowed_time_window[0]}-{job.allowed_time_window[1]}"]
    return voice_contract(restaurant=c.restaurant_name,phone=c.phone,date=str(job.criteria.get("date")),time=str(job.criteria.get("time")),party_size=int(job.criteria.get("party_size")),reservation_name=reservation_name,preferences=job.criteria.get("preferences",[]),fallback_windows=windows)


def confirm(job:RestaurantExecutionJob,*,provider_reference:str,provider_status:str="confirmed")->None:
    if job.status==JobState.CONFIRMED: return
    if job.status not in {JobState.BOOKING_ONLINE,JobState.CALLING,JobState.WAITING_PROVIDER,JobState.CONFIRMATION_PENDING,JobState.WAITING_APPROVAL}:
        raise InvalidJobTransition(f"cannot confirm from {job.status.value}")
    transition_job(job,JobState.CONFIRMED); job.provider_state=provider_status
    c=current_candidate(job)
    job.result={"status":"confirmed","restaurant":c.restaurant_name if c else None,"address":c.address if c else None,"date":job.criteria.get("date"),"time":job.criteria.get("time"),"party_size":job.criteria.get("party_size"),"reference":provider_reference}
    job.event("restaurant_confirmed",candidate_id=c.candidate_id if c else None)


def followup_contracts(job:RestaurantExecutionJob)->tuple[ContractEnvelope,ContractEnvelope]:
    if job.status!=JobState.CONFIRMED or not job.result: raise InvalidJobTransition("follow-up only after confirmed")
    record=ReservationRecord(job.reservation_id,_job_key(job.account_id,job.criteria),ReservationLifecycle.CONFIRMED,provider_booking_id=job.result.get("reference"),provider_status=job.provider_state,restaurant=job.result.get("restaurant"),date=str(job.result.get("date")),time=str(job.result.get("time")),party_size=int(job.result.get("party_size")))
    return reminder_contract(record,str(job.result.get("address") or "")),calendar_contract(record,"create_event",str(job.result.get("address") or ""))


def failure_result(job:RestaurantExecutionJob)->dict[str,Any]:
    reasons=[c.last_result for c in job.candidate_list if c.last_result]
    return {"status":"not_confirmed","candidates_checked":len([c for c in job.candidate_list if c.last_result]),"reasons":reasons,"can_expand_criteria":True,"handoff":job.status==JobState.HANDOFF,"handoff_id":job.handoff_id}


def customer_result(job:RestaurantExecutionJob)->dict[str,Any]:
    return dict(job.result) if job.status==JobState.CONFIRMED and job.result else failure_result(job)


def tenant_guard(job:RestaurantExecutionJob,*,tenant_id:str|None,account_id:str)->None:
    if job.account_id!=account_id or (job.tenant_id is not None and job.tenant_id!=tenant_id): raise PermissionError("tenant/customer isolation")
