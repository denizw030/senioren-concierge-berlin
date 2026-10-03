from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Optional
import hashlib

class CaseType(str, Enum):
 GENERAL='GENERAL'; DOCUMENT='DOCUMENT'; FRAUD_REVIEW='FRAUD_REVIEW'; EMAIL='EMAIL'; RESTAURANT='RESTAURANT'; MOBILITY='MOBILITY'; SERVICE_APPOINTMENT='SERVICE_APPOINTMENT'; PROVIDER_SWITCH='PROVIDER_SWITCH'; REMINDER='REMINDER'; FAMILY='FAMILY'; ACCOUNT_SUPPORT='ACCOUNT_SUPPORT'; TECH_SUPPORT='TECH_SUPPORT'; OUTBOUND_CALL='OUTBOUND_CALL'; TRAVEL='TRAVEL'; SHOPPING='SHOPPING'; OTHER='OTHER'
class Status(str, Enum):
 OPEN='OPEN'; IN_PROGRESS='IN_PROGRESS'; WAITING_FOR_USER='WAITING_FOR_USER'; WAITING_FOR_APPROVAL='WAITING_FOR_APPROVAL'; WAITING_FOR_PROVIDER='WAITING_FOR_PROVIDER'; WAITING_FOR_FAMILY='WAITING_FOR_FAMILY'; WAITING_FOR_HUMAN='WAITING_FOR_HUMAN'; BLOCKED='BLOCKED'; ESCALATED='ESCALATED'; RESOLVED='RESOLVED'; CANCELLED='CANCELLED'; EXPIRED='EXPIRED'
class StepType(str, Enum):
 INFORMATION='INFORMATION'; ANALYSIS='ANALYSIS'; SEARCH='SEARCH'; PREPARE='PREPARE'; APPROVAL='APPROVAL'; EXECUTION='EXECUTION'; WAIT='WAIT'; FOLLOW_UP='FOLLOW_UP'; HUMAN_REVIEW='HUMAN_REVIEW'
class Priority(str, Enum): LOW='LOW'; NORMAL='NORMAL'; HIGH='HIGH'; URGENT='URGENT'
class NextAction(str, Enum): NONE='NONE'; ASK_USER='ASK_USER'; REQUEST_APPROVAL='REQUEST_APPROVAL'; CALL_PROVIDER='CALL_PROVIDER'; WAIT_PROVIDER='WAIT_PROVIDER'; RUN_ANALYSIS='RUN_ANALYSIS'; SEARCH='SEARCH'; PREPARE_ACTION='PREPARE_ACTION'; HUMAN_HANDOFF='HUMAN_HANDOFF'; CLOSE_CASE='CLOSE_CASE'
class Owner(str, Enum): AI='AI'; HUMAN='HUMAN'; HYBRID='HYBRID'; UNASSIGNED='UNASSIGNED'
class ProviderState(str, Enum): TEMPORARY_WAIT='TEMPORARY_WAIT'; PROVIDER_UNAVAILABLE='PROVIDER_UNAVAILABLE'; PERMANENT_BLOCK='PERMANENT_BLOCK'; RETRY_LATER='RETRY_LATER'

@dataclass
class AuthorizationContext:
 scopes:set[str]=field(default_factory=set)
 def allows(self, scope): return scope in self.scopes
@dataclass
class CaseStep:
 step_id:str; case_id:str; step_type:StepType; status:str='OPEN'; description:str=''; required_input:list[str]=field(default_factory=list); result_summary:str=''; dependency:Optional[str]=None; created_at:datetime=field(default_factory=lambda:datetime.now(timezone.utc)); completed_at:Optional[datetime]=None
@dataclass
class FollowUpPolicy:
 follow_up_after:timedelta=timedelta(days=1); max_follow_ups:int=2; channel:str='SOURCE'; escalation_if_no_response:bool=False; close_if_stale:bool=False; expires_at:Optional[datetime]=None; attempts:int=0
 def due(self, last_update, now): return self.attempts < self.max_follow_ups and (not self.expires_at or now < self.expires_at) and now >= last_update+self.follow_up_after
@dataclass
class HumanHandoffRequest:
 case_id:str; person_id:str; subject_person_id:Optional[str]; account_id:Optional[str]; reason:str; urgency:Priority; requested_by:str; allowed_data_scope:set[str]; summary:str; unresolved_questions:list[str]; previous_actions:list[str]; authorization_context:AuthorizationContext; created_at:datetime=field(default_factory=lambda:datetime.now(timezone.utc))
@dataclass
class ConciergeCase:
 case_id:str; person_id:str; subject_person_id:Optional[str]; account_id:Optional[str]; created_by_person_id:str; case_type:CaseType; title:str; summary:str; source_channel:str; source_message_id:str; status:Status=Status.OPEN; priority:Priority=Priority.NORMAL; current_step:Optional[str]=None; next_action:NextAction=NextAction.RUN_ANALYSIS; assigned_to:Owner=Owner.AI; authorization_context:AuthorizationContext=field(default_factory=AuthorizationContext); sensitivity:str='NORMAL'; created_at:datetime=field(default_factory=lambda:datetime.now(timezone.utc)); updated_at:datetime=field(default_factory=lambda:datetime.now(timezone.utc)); expires_at:Optional[datetime]=None; completed_at:Optional[datetime]=None; metadata:dict=field(default_factory=dict); steps:list[CaseStep]=field(default_factory=list); open_questions:list[str]=field(default_factory=list); relevant_facts:list[str]=field(default_factory=list); lease_until:Optional[datetime]=None; worker_id:Optional[str]=None; owner_type:Optional[Owner]=None; audit:list[dict]=field(default_factory=list)

_ALLOWED={
 Status.OPEN:{Status.IN_PROGRESS,Status.WAITING_FOR_USER,Status.CANCELLED,Status.EXPIRED},
 Status.IN_PROGRESS:{Status.WAITING_FOR_USER,Status.WAITING_FOR_APPROVAL,Status.WAITING_FOR_PROVIDER,Status.WAITING_FOR_FAMILY,Status.WAITING_FOR_HUMAN,Status.BLOCKED,Status.ESCALATED,Status.RESOLVED,Status.CANCELLED,Status.EXPIRED},
 Status.WAITING_FOR_USER:{Status.IN_PROGRESS,Status.CANCELLED,Status.EXPIRED}, Status.WAITING_FOR_APPROVAL:{Status.IN_PROGRESS,Status.BLOCKED,Status.CANCELLED,Status.EXPIRED}, Status.WAITING_FOR_PROVIDER:{Status.IN_PROGRESS,Status.BLOCKED,Status.ESCALATED,Status.CANCELLED,Status.EXPIRED}, Status.WAITING_FOR_FAMILY:{Status.IN_PROGRESS,Status.BLOCKED,Status.CANCELLED,Status.EXPIRED}, Status.WAITING_FOR_HUMAN:{Status.IN_PROGRESS,Status.ESCALATED,Status.CANCELLED,Status.EXPIRED}, Status.BLOCKED:{Status.IN_PROGRESS,Status.ESCALATED,Status.CANCELLED,Status.EXPIRED}, Status.ESCALATED:{Status.IN_PROGRESS,Status.WAITING_FOR_HUMAN,Status.RESOLVED,Status.CANCELLED}, Status.RESOLVED:{Status.IN_PROGRESS}, Status.CANCELLED:set(), Status.EXPIRED:set()}

class CaseCore:
 def __init__(self): self.cases={}; self.message_index={}
 def _audit(self,c,event,**data): c.audit.append({'event':event,'at':datetime.now(timezone.utc).isoformat(),**{k:v for k,v in data.items() if k not in {'chat','payment','secret'}}})
 def create(self, person_id, message_id, case_type=CaseType.GENERAL, title='Vorgang', channel='WHATSAPP', **kw):
  key=(person_id,message_id)
  if key in self.message_index:return self.cases[self.message_index[key]]
  cid='case_'+hashlib.sha256(f'{person_id}:{message_id}'.encode()).hexdigest()[:16]
  c=ConciergeCase(cid,person_id,kw.get('subject_person_id'),kw.get('account_id'),kw.get('created_by_person_id',person_id),case_type,title,kw.get('summary',''),channel,message_id,priority=kw.get('priority',Priority.NORMAL))
  self.cases[cid]=c; self.message_index[key]=cid; self._audit(c,'case_created'); return c
 def transition(self,c,status):
  if status not in _ALLOWED[c.status]: raise ValueError('illegal state transition')
  c.status=status;c.updated_at=datetime.now(timezone.utc)
  if status==Status.RESOLVED:c.completed_at=c.updated_at;self._audit(c,'case_resolved')
  return c
 def add_step(self,c,t,description='',required_input=None):
  s=CaseStep(f'step-{len(c.steps)+1}',c.case_id,t,description=description,required_input=required_input or []);c.steps.append(s);c.current_step=s.step_id;self._audit(c,'step_started');return s
 def complete_step(self,c,s,result=''): s.status='COMPLETED';s.result_summary=result;s.completed_at=datetime.now(timezone.utc);self._audit(c,'step_completed');return s
 def resume(self,c):
  done=[s for s in c.steps if s.completed_at]; pending=[s for s in c.steps if not s.completed_at]
  return {'current_status':c.status.value,'last_completed_step':done[-1].description if done else None,'next_step':pending[0].description if pending else None,'missing_information':list(c.open_questions),'waiting_for':c.status.value.replace('WAITING_FOR_','') if c.status.value.startswith('WAITING_FOR_') else None,'approval_required':c.status==Status.WAITING_FOR_APPROVAL,'last_update':c.updated_at}
 def handoff(self,c,reason,allowed_data_scope):
  c.assigned_to=Owner.HUMAN; self.transition(c,Status.WAITING_FOR_HUMAN) if c.status!=Status.WAITING_FOR_HUMAN else None; self._audit(c,'handoff_requested')
  return HumanHandoffRequest(c.case_id,c.person_id,c.subject_person_id,c.account_id,reason,c.priority,c.created_by_person_id,set(allowed_data_scope),c.summary,list(c.open_questions),[s.result_summary for s in c.steps if s.result_summary],c.authorization_context)
 def handoff_summary(self,c,scope):
  return {'case_id':c.case_id,'summary':c.summary,'relevant_facts':c.relevant_facts if 'case.read' in scope else [],'open_questions':c.open_questions,'approved_data_scope':sorted(scope)}
 def acquire(self,c,worker,owner,now=None,seconds=60):
  now=now or datetime.now(timezone.utc)
  if c.lease_until and c.lease_until>now and c.worker_id!=worker:return False
  c.worker_id=worker;c.owner_type=owner;c.lease_until=now+timedelta(seconds=seconds);return True
 def can_ai_execute(self,c): return c.assigned_to in {Owner.AI,Owner.HYBRID}
 def provider_wait(self,c,state,retries,max_retries=3):
  if state in {ProviderState.TEMPORARY_WAIT,ProviderState.RETRY_LATER} and retries<max_retries:self.transition(c,Status.WAITING_FOR_PROVIDER);return NextAction.WAIT_PROVIDER
  self.transition(c,Status.BLOCKED);return NextAction.HUMAN_HANDOFF
 def senior_status(self,c):
  return {Status.WAITING_FOR_PROVIDER:'Ich warte noch auf die Rückmeldung des Anbieters.',Status.WAITING_FOR_APPROVAL:'Es fehlt noch Ihre Freigabe.',Status.WAITING_FOR_HUMAN:'Ich habe den Vorgang an einen Mitarbeiter weitergegeben.',Status.RESOLVED:'Der Vorgang ist erledigt.'}.get(c.status,'Der Vorgang ist in Bearbeitung.')
 def reopen(self,c):
  if c.status!=Status.RESOLVED:raise ValueError('only resolved cases can reopen')
  c.status=Status.IN_PROGRESS;c.completed_at=None;self._audit(c,'case_resumed');return c
 def inbox(self,statuses=None):
  xs=[c for c in self.cases.values() if not statuses or c.status in statuses]
  return sorted(xs,key=lambda c:({Priority.URGENT:0,Priority.HIGH:1,Priority.NORMAL:2,Priority.LOW:3}[c.priority],-c.updated_at.timestamp()))

def family_can(ctx,scope): return ctx.allows(scope)
def memory_context(memory): return {k:memory[k] for k in ('preferred_providers','language','preferences') if k in memory}
def action_approval_hook(c): return {'case_id':c.case_id,'external_action_owned_by':'ACTION_APPROVAL_CORE'}
def reminder_hook(c,policy): return {'case_id':c.case_id,'follow_up_after':policy.follow_up_after,'owned_by':'REMINDER_CORE'}
def fach_core_hook(c): return {'case_id':c.case_id,'case_type':c.case_type.value,'delegated':True}
