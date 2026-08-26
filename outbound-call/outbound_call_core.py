from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Protocol, Set


class CallState(str, Enum):
    REQUESTED="REQUESTED"; AUTHORIZED="AUTHORIZED"; QUEUED="QUEUED"; DIALING="DIALING"; RINGING="RINGING"; CONNECTED="CONNECTED"
    AI_DISCLOSURE="AI_DISCLOSURE"; IN_CONVERSATION="IN_CONVERSATION"; WAITING_FOR_REMOTE="WAITING_FOR_REMOTE"; RESULT_CAPTURED="RESULT_CAPTURED"
    NEEDS_USER_INPUT="NEEDS_USER_INPUT"; CONFIRMED="CONFIRMED"; FAILED="FAILED"; NO_ANSWER="NO_ANSWER"; BUSY="BUSY"; VOICEMAIL="VOICEMAIL"
    TRANSFERRED="TRANSFERRED"; CANCELLED="CANCELLED"; COMPLETED="COMPLETED"


TERMINAL={CallState.FAILED,CallState.NO_ANSWER,CallState.BUSY,CallState.VOICEMAIL,CallState.TRANSFERRED,CallState.CANCELLED,CallState.COMPLETED}
TRANSITIONS={
 CallState.REQUESTED:{CallState.AUTHORIZED,CallState.CANCELLED,CallState.FAILED},
 CallState.AUTHORIZED:{CallState.QUEUED,CallState.CANCELLED,CallState.FAILED},
 CallState.QUEUED:{CallState.DIALING,CallState.CANCELLED,CallState.FAILED},
 CallState.DIALING:{CallState.RINGING,CallState.CONNECTED,CallState.NO_ANSWER,CallState.BUSY,CallState.FAILED},
 CallState.RINGING:{CallState.CONNECTED,CallState.NO_ANSWER,CallState.BUSY,CallState.VOICEMAIL,CallState.CANCELLED,CallState.FAILED},
 CallState.CONNECTED:{CallState.AI_DISCLOSURE,CallState.FAILED},
 CallState.AI_DISCLOSURE:{CallState.IN_CONVERSATION,CallState.FAILED},
 CallState.IN_CONVERSATION:{CallState.WAITING_FOR_REMOTE,CallState.RESULT_CAPTURED,CallState.NEEDS_USER_INPUT,CallState.TRANSFERRED,CallState.FAILED},
 CallState.WAITING_FOR_REMOTE:{CallState.IN_CONVERSATION,CallState.RESULT_CAPTURED,CallState.NEEDS_USER_INPUT,CallState.TRANSFERRED,CallState.FAILED},
 CallState.RESULT_CAPTURED:{CallState.CONFIRMED,CallState.NEEDS_USER_INPUT,CallState.COMPLETED,CallState.FAILED},
 CallState.CONFIRMED:{CallState.COMPLETED,CallState.FAILED}, CallState.NEEDS_USER_INPUT:{CallState.COMPLETED,CallState.CANCELLED},
}

ACTION_TYPES={"restaurant.availability","restaurant.reserve","appointment.availability","appointment.book","service.inquiry","service.schedule","hotel.availability","transport.inquiry"}
ALLOWED_TOOLS={"restaurant.availability":{"report_availability","report_alternative_times","request_user_input"},"restaurant.reserve":{"report_availability","report_alternative_times","request_user_input","prepare_reservation","confirm_reservation"}}
PAYMENT_TERMS={"payment","credit_card","card","pin","tan","authcode"}


@dataclass(frozen=True)
class OutboundCallRequest:
    request_id:str; actor_person_id:str; subject_person_id:str; action_type:str; target_name:str; target_phone:str; locale:str="de-DE"; voice_persona:str="Nilo"
    call_purpose:str=""; authorized_scope:Set[str]=field(default_factory=set); parameters:Dict[str,Any]=field(default_factory=dict); max_call_duration:int=300
    disclosure_required:bool=True; recording_allowed:bool=False; transcript_retention:str="none"; created_at:datetime=field(default_factory=datetime.utcnow)


@dataclass
class Disclosure:
    disclosure_text:str="Guten Abend, hier spricht der digitale Concierge von NAHWERK im Auftrag eines Kunden."
    disclosure_spoken:bool=False; disclosure_timestamp:Optional[datetime]=None
    def mark_spoken(self): self.disclosure_spoken=True; self.disclosure_timestamp=datetime.utcnow()


@dataclass
class AvailabilityResult:
    available:Optional[bool]=None; alternative_times:List[str]=field(default_factory=list); conditions:List[str]=field(default_factory=list)
    deposit_required:bool=False; cancellation_fee:bool=False; minimum_spend:bool=False; reservation_name_required:bool=False; phone_required:bool=False
    notes:str=""; confidence:float=0.0


@dataclass
class OutboundCallResult:
    call_id:str; request_id:str; status:CallState; started_at:Optional[datetime]=None; connected_at:Optional[datetime]=None; ended_at:Optional[datetime]=None
    duration_seconds:int=0; target_answered:bool=False; disclosure_spoken:bool=False; result_type:str=""; structured_result:Dict[str,Any]=field(default_factory=dict)
    confidence:float=0.0; needs_user_input:bool=False; failure_reason:Optional[str]=None; provider_metadata:Dict[str,Any]=field(default_factory=dict); audit_metadata:Dict[str,Any]=field(default_factory=dict)


class VoiceCallProvider(Protocol):
    def create_call(self, request:OutboundCallRequest)->str: ...
    def cancel_call(self, call_id:str)->None: ...
    def get_call_status(self, call_id:str)->str: ...
    def send_audio(self, call_id:str, audio:bytes)->None: ...
    def receive_audio(self, call_id:str)->bytes: ...
    def send_dtmf(self, call_id:str, digits:str)->None: ...
    def transfer_call(self, call_id:str, target:str)->None: ...


class RealtimeVoiceAgent(Protocol):
    def start_session(self, persona:str)->str: ...
    def send_audio(self, audio:bytes)->None: ...
    def receive_audio(self)->bytes: ...
    def handle_turn(self, text:str)->str: ...
    def invoke_tool(self, name:str, arguments:Dict[str,Any])->Any: ...
    def end_session(self)->None: ...


class TwilioVoiceAdapter:
    supports_live=False
    def create_call(self,*a,**k): raise RuntimeError("Twilio credentials/live calling intentionally not connected")

class SIPVoiceAdapter:
    supports_live=False
    def create_call(self,*a,**k): raise RuntimeError("SIP live calling intentionally not connected")

class FixtureVoiceAdapter:
    supports_live=False
    def __init__(self, outcomes:Optional[List[str]]=None): self.outcomes=list(outcomes or ["connected"]); self.calls={}; self.created=0
    def create_call(self,request): self.created+=1; cid=f"fixture-{request.request_id}-{self.created}"; self.calls[cid]=self.outcomes.pop(0) if self.outcomes else "connected"; return cid
    def cancel_call(self,call_id): self.calls[call_id]="cancelled"
    def get_call_status(self,call_id): return self.calls[call_id]
    def send_audio(self,call_id,audio): return None
    def receive_audio(self,call_id): return b""
    def send_dtmf(self,call_id,digits): return None
    def transfer_call(self,call_id,target): self.calls[call_id]="transferred"


class FixtureRealtimeVoiceAgent:
    def __init__(self, fail=False): self.fail=fail; self.persona=None; self.tools=[]
    def start_session(self,persona):
        if self.fail: raise RuntimeError("AI session failure")
        self.persona=persona; return "fixture-session"
    def send_audio(self,audio): pass
    def receive_audio(self): return b""
    def handle_turn(self,text): return text
    def invoke_tool(self,name,arguments): self.tools.append((name,arguments)); return arguments
    def end_session(self): pass


def voice_for(persona:str)->str:
    return {"Nilo":"cedar","Mira":"marin"}.get(persona, "cedar")


def valid_phone(value:str)->bool:
    return bool(re.fullmatch(r"\+[1-9]\d{6,14}", value or ""))


class CallOrchestrator:
    def __init__(self, provider:VoiceCallProvider, agent:RealtimeVoiceAgent, max_retries:int=2, rate_limit:int=5):
        self.provider=provider; self.agent=agent; self.max_retries=max_retries; self.rate_limit=rate_limit; self.seen={}; self.audit=[]
    def validate(self,r:OutboundCallRequest):
        if r.action_type not in ACTION_TYPES: raise ValueError("unsupported action_type")
        if not r.target_phone: raise ValueError("target phone missing")
        if not valid_phone(r.target_phone): raise ValueError("invalid target phone")
        if r.action_type not in r.authorized_scope: raise PermissionError("authorization missing")
        if r.max_call_duration<=0 or r.max_call_duration>1800: raise ValueError("invalid max duration")
        if r.recording_allowed: raise PermissionError("recording requires separate production consent gate")
    def transition(self,state:CallState,new:CallState)->CallState:
        if state in TERMINAL or new not in TRANSITIONS.get(state,set()): raise ValueError(f"invalid transition {state}->{new}")
        return new
    def create(self,r:OutboundCallRequest)->OutboundCallResult:
        if r.request_id in self.seen: return self.seen[r.request_id]
        self.validate(r)
        if len(self.seen)>=self.rate_limit: raise RuntimeError("rate limit")
        state=self.transition(CallState.REQUESTED,CallState.AUTHORIZED); state=self.transition(state,CallState.QUEUED)
        cid=self.provider.create_call(r); out=OutboundCallResult(cid,r.request_id,state,started_at=datetime.utcnow(),audit_metadata={"recording":False,"transcript_retention":r.transcript_retention})
        self.audit.extend(["request_created","authorization_checked","call_started"]); self.seen[r.request_id]=out; return out
    def begin_conversation(self,r:OutboundCallRequest,out:OutboundCallResult,disclosure:Disclosure):
        out.status=self.transition(out.status,CallState.DIALING); out.status=self.transition(out.status,CallState.CONNECTED); out.target_answered=True; out.connected_at=datetime.utcnow()
        out.status=self.transition(out.status,CallState.AI_DISCLOSURE)
        if r.disclosure_required and not disclosure.disclosure_spoken:
            out.status=self.transition(out.status,CallState.FAILED); out.failure_reason="disclosure_not_spoken"; return out
        out.disclosure_spoken=disclosure.disclosure_spoken; self.audit.append("disclosure_spoken")
        self.agent.start_session(voice_for(r.voice_persona)); out.status=self.transition(out.status,CallState.IN_CONVERSATION); return out
    def tool_allowed(self,r:OutboundCallRequest,name:str)->bool:
        return name in ALLOWED_TOOLS.get(r.action_type,set()) and name.lower() not in PAYMENT_TERMS
    def invoke_tool(self,r:OutboundCallRequest,name:str,args:Dict[str,Any]):
        if not self.tool_allowed(r,name): raise PermissionError("tool outside authorized scope")
        return self.agent.invoke_tool(name,args)
    def evaluate_reservation(self,r:OutboundCallRequest,a:AvailabilityResult)->CallState:
        p=r.parameters
        blocked=a.deposit_required or a.cancellation_fee or a.minimum_spend or any(x in {"fee","prepayment","credit_card","minimum_spend"} for x in a.conditions)
        if blocked: return CallState.NEEDS_USER_INPUT
        if not a.available: return CallState.COMPLETED
        if not p.get("explicit_auto_reserve"): return CallState.NEEDS_USER_INPUT
        if p.get("requested_time")!=p.get("offered_time",p.get("requested_time")): return CallState.NEEDS_USER_INPUT
        if p.get("requested_party_size")!=p.get("offered_party_size",p.get("requested_party_size")): return CallState.NEEDS_USER_INPUT
        return CallState.CONFIRMED
    def remote_terminal(self,out:OutboundCallResult,status:str):
        mapping={"no-answer":CallState.NO_ANSWER,"busy":CallState.BUSY,"voicemail":CallState.VOICEMAIL,"failed":CallState.FAILED}
        out.status=mapping[status]; out.ended_at=datetime.utcnow(); return out
    def retry(self,attempt:int)->bool: return attempt<self.max_retries
    def finish(self,out:OutboundCallResult,structured:Dict[str,Any],confidence:float=1.0):
        if out.status in {CallState.IN_CONVERSATION,CallState.WAITING_FOR_REMOTE}: out.status=CallState.RESULT_CAPTURED
        if out.status==CallState.RESULT_CAPTURED: out.status=CallState.COMPLETED
        out.structured_result=structured; out.confidence=confidence; out.ended_at=datetime.utcnow(); self.audit.extend(["result","call_ended"]); return out


def whatsapp_result(result:OutboundCallResult)->str:
    if result.needs_user_input or result.status==CallState.NEEDS_USER_INPUT: return "Ich habe nachgefragt. Es gibt eine Bedingung, die ich erst mit Ihnen klären muss."
    if result.structured_result.get("available") is True: return "Das Restaurant hat die Verfügbarkeit bestätigt."
    if result.structured_result.get("available") is False: return "Das Restaurant hat für die gewünschte Zeit keinen freien Tisch bestätigt."
    return "Der Anruf ist beendet."
