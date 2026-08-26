from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from hashlib import sha256
import json
from typing import Any, Callable, Mapping


class ActionState(str, Enum):
    REQUESTED='REQUESTED'; AUTHORIZED='AUTHORIZED'; PREPARING='PREPARING'; PREPARED='PREPARED'
    NEEDS_USER_INPUT='NEEDS_USER_INPUT'; AWAITING_APPROVAL='AWAITING_APPROVAL'; APPROVED='APPROVED'
    EXECUTING='EXECUTING'; SUCCEEDED='SUCCEEDED'; FAILED='FAILED'; CANCELLED='CANCELLED'; EXPIRED='EXPIRED'; REVOKED='REVOKED'

class RiskGate(str, Enum):
    PAYMENT_REQUIRED='PAYMENT_REQUIRED'; CREDIT_CARD_REQUIRED='CREDIT_CARD_REQUIRED'; PRICE_CHANGED='PRICE_CHANGED'
    FEE_CHANGED='FEE_CHANGED'; CONTRACT_CHANGED='CONTRACT_CHANGED'; TIME_CHANGED='TIME_CHANGED'
    PARTY_SIZE_CHANGED='PARTY_SIZE_CHANGED'; IDENTITY_MISMATCH='IDENTITY_MISMATCH'; AUTHORIZATION_CHANGED='AUTHORIZATION_CHANGED'
    APPROVAL_EXPIRED='APPROVAL_EXPIRED'; PROVIDER_UNTRUSTED='PROVIDER_UNTRUSTED'; SENSITIVE_DATA_REQUIRED='SENSITIVE_DATA_REQUIRED'

TERMINAL={ActionState.SUCCEEDED,ActionState.FAILED,ActionState.CANCELLED,ActionState.EXPIRED,ActionState.REVOKED}
TRANSITIONS={
 ActionState.REQUESTED:{ActionState.AUTHORIZED,ActionState.CANCELLED,ActionState.FAILED},
 ActionState.AUTHORIZED:{ActionState.PREPARING,ActionState.CANCELLED,ActionState.FAILED},
 ActionState.PREPARING:{ActionState.PREPARED,ActionState.NEEDS_USER_INPUT,ActionState.FAILED,ActionState.CANCELLED},
 ActionState.PREPARED:{ActionState.AWAITING_APPROVAL,ActionState.APPROVED,ActionState.EXPIRED,ActionState.CANCELLED},
 ActionState.NEEDS_USER_INPUT:{ActionState.PREPARING,ActionState.CANCELLED,ActionState.EXPIRED},
 ActionState.AWAITING_APPROVAL:{ActionState.APPROVED,ActionState.REVOKED,ActionState.EXPIRED,ActionState.CANCELLED},
 ActionState.APPROVED:{ActionState.EXECUTING,ActionState.REVOKED,ActionState.EXPIRED,ActionState.AWAITING_APPROVAL,ActionState.NEEDS_USER_INPUT,ActionState.CANCELLED},
 ActionState.EXECUTING:{ActionState.SUCCEEDED,ActionState.FAILED},
 ActionState.SUCCEEDED:set(),ActionState.FAILED:set(),ActionState.CANCELLED:set(),ActionState.EXPIRED:set(),ActionState.REVOKED:set(),
}

@dataclass(frozen=True)
class AuthorizationContext:
    authorized: bool
    actor_person_id: str
    subject_person_id: str
    account_id: str
    scopes: frozenset[str]=frozenset()
    version: str='1'

@dataclass(frozen=True)
class ActionRequest:
    action_id: str; idempotency_key: str; actor_person_id: str; subject_person_id: str; account_id: str
    action_type: str; requested_parameters: Mapping[str,Any]; authorization_context: AuthorizationContext
    source_channel: str; created_at: datetime
    mode: str='PREPARE'
    @staticmethod
    def deterministic_idempotency(action_type:str, actor_person_id:str, subject_person_id:str, account_id:str, parameters:Mapping[str,Any], source_message_id:str)->str:
        raw={'action_type':action_type,'actor':actor_person_id,'subject':subject_person_id,'account':account_id,'parameters':parameters,'source_message_id':source_message_id}
        return sha256(json.dumps(raw,sort_keys=True,separators=(',',':'),default=str).encode()).hexdigest()

@dataclass(frozen=True)
class PreparedAction:
    action_id:str; action_type:str; parameters:Mapping[str,Any]; prepared_at:datetime; expires_at:datetime
    material_fingerprint:str; provider_metadata:Mapping[str,Any]=field(default_factory=dict); risk_gates:frozenset[RiskGate]=frozenset()

@dataclass(frozen=True)
class ApprovalPolicy:
    required: bool=True
    parameter_limits: Mapping[str,Any]=field(default_factory=dict)
    allowed_variance: Mapping[str,Any]=field(default_factory=dict)

@dataclass(frozen=True)
class ApprovalGrant:
    approval_id:str; action_id:str; actor_person_id:str; subject_person_id:str; account_id:str
    granted_at:datetime; expires_at:datetime; parameter_limits:Mapping[str,Any]; prepared_fingerprint:str; authorization_version:str
    revoked_at:datetime|None=None

@dataclass(frozen=True)
class ExecutionRequest:
    execution_id:str; action_id:str; idempotency_key:str; parameters:Mapping[str,Any]; requested_at:datetime

@dataclass(frozen=True)
class ActionResult:
    action_id:str; success:bool; provider_result_id:str|None=None; error_code:str|None=None

@dataclass(frozen=True)
class ActionAuditEvent:
    action_id:str; event_type:str; at:datetime; actor_person_id:str|None=None; subject_person_id:str|None=None; account_id:str|None=None; details:Mapping[str,Any]=field(default_factory=dict)

@dataclass
class ActionRecord:
    request:ActionRequest; state:ActionState; prepared:PreparedAction|None=None; approval:ApprovalGrant|None=None; result:ActionResult|None=None; audits:list[ActionAuditEvent]=field(default_factory=list)

class ActionBlocked(Exception):
    def __init__(self, code:str, gates:set[RiskGate]|None=None):
        super().__init__(code); self.code=code; self.gates=gates or set()

class ActionApprovalEngine:
    def __init__(self, feature_flags:Mapping[str,bool]|None=None, now:Callable[[],datetime]|None=None):
        self.feature_flags=dict(feature_flags or {})
        self._now=now or (lambda: datetime.now(timezone.utc))
        self.actions:dict[str,ActionRecord]={}
        self.idempotency:dict[str,str]={}
        self.execution_idempotency:dict[str,ActionResult]={}

    def _audit(self, rec:ActionRecord, event:str, details:Mapping[str,Any]|None=None):
        safe={k:v for k,v in (details or {}).items() if k.lower() not in {'secret','token','password','credit_card','card_number','cvv','message_body','payment_data'}}
        rec.audits.append(ActionAuditEvent(rec.request.action_id,event,self._now(),rec.request.actor_person_id,rec.request.subject_person_id,rec.request.account_id,safe))

    def _transition(self, rec:ActionRecord, target:ActionState):
        if target not in TRANSITIONS[rec.state]: raise ActionBlocked(f'INVALID_STATE_TRANSITION:{rec.state}->{target}')
        rec.state=target

    def request(self, req:ActionRequest)->ActionRecord:
        if req.idempotency_key in self.idempotency: return self.actions[self.idempotency[req.idempotency_key]]
        rec=ActionRecord(req,ActionState.REQUESTED); self.actions[req.action_id]=rec; self.idempotency[req.idempotency_key]=req.action_id
        self._audit(rec,'requested',{'action_type':req.action_type,'source_channel':req.source_channel})
        return rec

    def authorize(self, action_id:str)->ActionRecord:
        rec=self.actions[action_id]; a=rec.request.authorization_context
        identity_ok=(a.actor_person_id==rec.request.actor_person_id and a.subject_person_id==rec.request.subject_person_id and a.account_id==rec.request.account_id)
        if not a.authorized or not identity_ok or rec.request.action_type not in a.scopes:
            self._audit(rec,'denied',{'reason':'authorization'}); raise ActionBlocked('AUTHORIZATION_DENIED',{RiskGate.IDENTITY_MISMATCH} if not identity_ok else set())
        self._transition(rec,ActionState.AUTHORIZED); self._audit(rec,'authorized',{'authorization_version':a.version}); return rec

    @staticmethod
    def _fingerprint(action_type:str, params:Mapping[str,Any])->str:
        return sha256(json.dumps({'action_type':action_type,'parameters':params},sort_keys=True,separators=(',',':'),default=str).encode()).hexdigest()

    def prepare(self, action_id:str, parameters:Mapping[str,Any], expires_at:datetime, provider_metadata:Mapping[str,Any]|None=None, risk_gates:set[RiskGate]|None=None, needs_input:bool=False)->PreparedAction:
        rec=self.actions[action_id]
        self._transition(rec,ActionState.PREPARING)
        if needs_input:
            self._transition(rec,ActionState.NEEDS_USER_INPUT); self._audit(rec,'prepared',{'status':'needs_user_input'}); raise ActionBlocked('NEEDS_USER_INPUT')
        pa=PreparedAction(action_id,rec.request.action_type,dict(parameters),self._now(),expires_at,self._fingerprint(rec.request.action_type,parameters),dict(provider_metadata or {}),frozenset(risk_gates or set()))
        rec.prepared=pa; self._transition(rec,ActionState.PREPARED); self._audit(rec,'prepared',{'fingerprint':pa.material_fingerprint}); return pa

    def require_approval(self, action_id:str):
        rec=self.actions[action_id]; self._transition(rec,ActionState.AWAITING_APPROVAL); self._audit(rec,'approval_requested')

    def approve(self, action_id:str, approval_id:str, actor_person_id:str, subject_person_id:str, account_id:str, expires_at:datetime, parameter_limits:Mapping[str,Any]|None=None)->ApprovalGrant:
        rec=self.actions[action_id]; pa=rec.prepared
        if not pa or pa.expires_at<=self._now():
            if rec.state in {ActionState.PREPARED,ActionState.AWAITING_APPROVAL}: self._transition(rec,ActionState.EXPIRED)
            raise ActionBlocked('PREPARED_ACTION_EXPIRED')
        if actor_person_id!=rec.request.actor_person_id or subject_person_id!=rec.request.subject_person_id or account_id!=rec.request.account_id: raise ActionBlocked('APPROVAL_IDENTITY_MISMATCH',{RiskGate.IDENTITY_MISMATCH})
        if rec.state==ActionState.PREPARED: self._transition(rec,ActionState.APPROVED)
        elif rec.state==ActionState.AWAITING_APPROVAL: self._transition(rec,ActionState.APPROVED)
        else: raise ActionBlocked('APPROVAL_STATE_INVALID')
        ag=ApprovalGrant(approval_id,action_id,actor_person_id,subject_person_id,account_id,self._now(),expires_at,dict(parameter_limits or pa.parameters),pa.material_fingerprint,rec.request.authorization_context.version)
        rec.approval=ag; self._audit(rec,'approved',{'approval_id':approval_id}); return ag

    def revoke(self, action_id:str):
        rec=self.actions[action_id]
        if rec.state not in {ActionState.APPROVED,ActionState.AWAITING_APPROVAL}: raise ActionBlocked('REVOKE_STATE_INVALID')
        if rec.approval: rec.approval=ApprovalGrant(**{**rec.approval.__dict__,'revoked_at':self._now()})
        self._transition(rec,ActionState.REVOKED); self._audit(rec,'revoked')

    def cancel(self, action_id:str):
        rec=self.actions[action_id]; self._transition(rec,ActionState.CANCELLED); self._audit(rec,'cancelled')

    def _changes(self, approved:Mapping[str,Any], actual:Mapping[str,Any], variance:Mapping[str,Any]|None=None)->set[RiskGate]:
        variance=variance or {}; gates=set()
        for k,new in actual.items():
            if k not in approved: continue
            old=approved[k]
            if old==new: continue
            if k in {'price','monthly_price'}: gates.add(RiskGate.PRICE_CHANGED)
            elif k in {'fee','fees'}: gates.add(RiskGate.FEE_CHANGED)
            elif k in {'provider','provider_id'}: gates.add(RiskGate.PROVIDER_UNTRUSTED)
            elif k in {'tariff','tariff_id','contract_term','termination_terms','binding'}: gates.add(RiskGate.CONTRACT_CHANGED)
            elif k in {'party_size','persons'}: gates.add(RiskGate.PARTY_SIZE_CHANGED)
            elif k in {'time','datetime','reservation_time'}:
                tol=variance.get(k,0)
                try:
                    if isinstance(old,(int,float)) and isinstance(new,(int,float)) and abs(new-old)<=tol: continue
                except TypeError: pass
                gates.add(RiskGate.TIME_CHANGED)
            else: gates.add(RiskGate.CONTRACT_CHANGED)
        if actual.get('prepayment_required'): gates.add(RiskGate.PAYMENT_REQUIRED)
        if actual.get('credit_card_required'): gates.add(RiskGate.CREDIT_CARD_REQUIRED)
        if actual.get('sensitive_data_required'): gates.add(RiskGate.SENSITIVE_DATA_REQUIRED)
        return gates

    def execute(self, request:ExecutionRequest, executor:Callable[[PreparedAction,Mapping[str,Any]],ActionResult], allowed_variance:Mapping[str,Any]|None=None)->ActionResult:
        if request.idempotency_key in self.execution_idempotency: return self.execution_idempotency[request.idempotency_key]
        rec=self.actions[request.action_id]; now=self._now(); auth=rec.request.authorization_context
        if not self.feature_flags.get(f'{rec.request.action_type}.execute',False): raise ActionBlocked('EXECUTE_FEATURE_DISABLED')
        if not auth.authorized or auth.version!=(rec.approval.authorization_version if rec.approval else None): raise ActionBlocked('AUTHORIZATION_CHANGED',{RiskGate.AUTHORIZATION_CHANGED})
        if rec.state!=ActionState.APPROVED or not rec.approval: raise ActionBlocked('APPROVAL_REQUIRED')
        if rec.approval.revoked_at is not None: raise ActionBlocked('APPROVAL_REVOKED')
        if rec.approval.expires_at<=now: self._transition(rec,ActionState.EXPIRED); raise ActionBlocked('APPROVAL_EXPIRED',{RiskGate.APPROVAL_EXPIRED})
        if not rec.prepared or rec.prepared.expires_at<=now: self._transition(rec,ActionState.EXPIRED); raise ActionBlocked('PREPARED_ACTION_EXPIRED')
        if rec.approval.prepared_fingerprint!=rec.prepared.material_fingerprint: raise ActionBlocked('PREPARED_ACTION_CHANGED')
        if rec.approval.actor_person_id!=auth.actor_person_id or rec.approval.subject_person_id!=auth.subject_person_id or rec.approval.account_id!=auth.account_id: raise ActionBlocked('APPROVAL_IDENTITY_MISMATCH',{RiskGate.IDENTITY_MISMATCH})
        gates=set(rec.prepared.risk_gates)|self._changes(rec.approval.parameter_limits,request.parameters,allowed_variance)
        if gates:
            target=ActionState.NEEDS_USER_INPUT if gates & {RiskGate.PAYMENT_REQUIRED,RiskGate.CREDIT_CARD_REQUIRED,RiskGate.SENSITIVE_DATA_REQUIRED} else ActionState.AWAITING_APPROVAL
            self._transition(rec,target); self._audit(rec,'approval_requested',{'risk_gates':sorted(g.value for g in gates)}); raise ActionBlocked('RISK_GATE_BLOCKED',gates)
        self._transition(rec,ActionState.EXECUTING); self._audit(rec,'execution_started')
        try:
            result=executor(rec.prepared,request.parameters)
        except Exception as e:
            result=ActionResult(request.action_id,False,error_code=type(e).__name__)
        rec.result=result; self.execution_idempotency[request.idempotency_key]=result
        self._transition(rec,ActionState.SUCCEEDED if result.success else ActionState.FAILED); self._audit(rec,'succeeded' if result.success else 'failed',{'error_code':result.error_code})
        return result

    def information(self, action_type:str, payload:Mapping[str,Any])->Mapping[str,Any]:
        return {'mode':'INFORMATION','action_type':action_type,'payload':dict(payload),'mutation_performed':False}

    @staticmethod
    def memory_suggestion(memory:Mapping[str,Any])->Mapping[str,Any]:
        return {'suggested_parameters':dict(memory),'approval':None}
