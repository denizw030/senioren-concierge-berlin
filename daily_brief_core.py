from __future__ import annotations
from dataclasses import dataclass, field, asdict
from datetime import datetime, date, timedelta
from enum import Enum
from hashlib import sha256
import json
from typing import Any, Iterable

class RequestedMode(str, Enum):
    MORNING='MORNING'; DAY='DAY'; EVENING='EVENING'; ON_DEMAND='ON_DEMAND'; WEEK_PREVIEW='WEEK_PREVIEW'
class Priority(str, Enum):
    CRITICAL='CRITICAL'; HIGH='HIGH'; NORMAL='NORMAL'; LOW='LOW'
class SourceType(str, Enum):
    REMINDER='REMINDER'; APPOINTMENT='APPOINTMENT'; CASE='CASE'; EMAIL='EMAIL'; DOCUMENT='DOCUMENT'; FRAUD='FRAUD'; MOBILITY='MOBILITY'; RESTAURANT='RESTAURANT'; SERVICE='SERVICE'; PROVIDER_SWITCH='PROVIDER_SWITCH'; FAMILY='FAMILY'; OTHER='OTHER'
class Sensitivity(str, Enum):
    NORMAL='NORMAL'; PRIVATE='PRIVATE'; SENSITIVE='SENSITIVE'; RESTRICTED='RESTRICTED'
class Section(str, Enum):
    TODAY='TODAY'; ACTION_REQUIRED='ACTION_REQUIRED'; WAITING='WAITING'; UPCOMING='UPCOMING'; IMPORTANT_EMAILS='IMPORTANT_EMAILS'; DEADLINES='DEADLINES'; SAFETY='SAFETY'; OTHER='OTHER'

@dataclass(frozen=True)
class AuthorizationContext:
    scopes: frozenset[str] = frozenset()
    self_access: bool = True
    def allows(self, source: SourceType) -> bool:
        if self.self_access: return True
        mapping={SourceType.REMINDER:'reminder.read',SourceType.CASE:'case.read',SourceType.EMAIL:'email.read',SourceType.DOCUMENT:'document.read',SourceType.APPOINTMENT:'appointment.read',SourceType.SERVICE:'appointment.read'}
        required=mapping.get(source,'brief.read')
        return 'brief.read' in self.scopes and required in self.scopes

@dataclass(frozen=True)
class DailyBriefRequest:
    request_id:str; person_id:str; actor_person_id:str; subject_person_id:str; account_id:str; date:date; timezone:str='Europe/Berlin'; locale:str='de-DE'; source_channel:str='WEB'; requested_mode:RequestedMode=RequestedMode.ON_DEMAND; authorization_context:AuthorizationContext=AuthorizationContext(); preferences:dict[str,Any]=field(default_factory=dict); created_at:datetime=field(default_factory=datetime.utcnow)

@dataclass
class BriefItem:
    item_id:str; source_type:SourceType; source_id:str; category:str; title:str; short_summary:str; event_time:datetime|None=None; deadline:datetime|None=None; priority:Priority=Priority.NORMAL; action_required:bool=False; waiting_for:str|None=None; status:str='OPEN'; next_action:str|None=None; confidence:float=1.0; sensitivity:Sensitivity=Sensitivity.NORMAL; authorization_required:bool=False; source_updated_at:datetime=field(default_factory=datetime.utcnow); source_references:list[tuple[str,str]]=field(default_factory=list); correlation_key:str|None=None; amount:float|None=None; safety:bool=False; conflicting:bool=False

@dataclass(frozen=True)
class BriefDeliveryPreference:
    enabled:bool=True; preferred_time:str='08:00'; timezone:str='Europe/Berlin'; allowed_channels:tuple[str,...]=('WHATSAPP','APP','EMAIL','VOICE','WEB'); quiet_hours:tuple[str,str]=('22:00','07:00'); weekend_policy:str='ALLOW'; only_if_relevant:bool=False

@dataclass(frozen=True)
class StalenessPolicy:
    provider_hours:int=6; default_hours:int=72
    def stale(self,item:BriefItem,now:datetime)->bool:
        limit=self.provider_hours if item.source_type in {SourceType.MOBILITY,SourceType.RESTAURANT,SourceType.PROVIDER_SWITCH} else self.default_hours
        return now-item.source_updated_at>timedelta(hours=limit)

@dataclass
class DailyBrief:
    brief_id:str; person_id:str; date:date; timezone:str; generated_at:datetime; headline:str; summary:str; sections:dict[str,list[BriefItem]]; important_count:int; action_required_count:int; waiting_count:int; safety_items:list[BriefItem]; next_event:BriefItem|None; confidence:float; omitted_items_count:int; metadata:dict[str,Any]; top_items:list[BriefItem]=field(default_factory=list); optional_more_count:int=0; closing_question:str='Möchten Sie zu einem Punkt mehr wissen?'

class AuditLog:
    def __init__(self): self.events=[]
    def add(self,event:str,**data):
        safe={k:v for k,v in data.items() if k not in {'content','body','mail_body','document_text','chat'}}
        self.events.append({'event':event,**safe})

class BriefItemDeduplication:
    @staticmethod
    def merge(items:Iterable[BriefItem], audit:AuditLog|None=None)->list[BriefItem]:
        groups={}
        for item in items:
            key=item.correlation_key or f'{item.source_type}:{item.source_id}'
            if key not in groups: groups[key]=item; item.source_references=list(dict.fromkeys(item.source_references+[(item.source_type.value,item.source_id)])); continue
            base=groups[key]
            base.source_references=list(dict.fromkeys(base.source_references+item.source_references+[(item.source_type.value,item.source_id)]))
            if base.event_time and item.event_time and base.event_time!=item.event_time: base.conflicting=True
            if base.amount is not None and item.amount is not None and base.amount!=item.amount: base.conflicting=True
            base.action_required|=item.action_required
            base.safety|=item.safety
            base.priority=max((base.priority,item.priority), key=lambda p:{Priority.LOW:0,Priority.NORMAL:1,Priority.HIGH:2,Priority.CRITICAL:3}[p])
            if base.conflicting and audit: audit.add('conflict_detected',item_id=base.item_id)
        return list(groups.values())

class DailyBriefCore:
    def __init__(self,staleness:StalenessPolicy|None=None): self.staleness=staleness or StalenessPolicy()
    def build(self,request:DailyBriefRequest, structured_items:Iterable[BriefItem], now:datetime|None=None, delivery:BriefDeliveryPreference|None=None)->DailyBrief:
        now=now or datetime.utcnow(); audit=AuditLog(); audit.add('brief_requested',request_id=request.request_id)
        items=[]; omitted=0
        for item in structured_items:
            if not request.authorization_context.allows(item.source_type): omitted+=1; audit.add('item_omitted',item_id=item.item_id,reason='scope'); continue
            if item.sensitivity==Sensitivity.RESTRICTED and not request.authorization_context.self_access and 'restricted.read' not in request.authorization_context.scopes: omitted+=1; continue
            if item.confidence<0.5: omitted+=1; continue
            if item.source_type==SourceType.EMAIL and item.category.upper()=='NEWSLETTER': omitted+=1; continue
            if self.staleness.stale(item,now): omitted+=1; continue
            if item.sensitivity in {Sensitivity.SENSITIVE,Sensitivity.RESTRICTED}: item.short_summary=self._redact(item)
            items.append(item)
        items=BriefItemDeduplication.merge(items,audit)
        items=self._mode_filter(items,request)
        items.sort(key=lambda i:self._sort_key(i,request,now))
        top=items[:3]; more=max(0,len(items)-3)
        sections={}
        for item in items:
            sec=self._section(item,request,now).value
            sections.setdefault(sec,[]).append(item)
            audit.add('item_included',item_id=item.item_id,section=sec)
        action=sum(i.action_required for i in items); waiting=sum(bool(i.waiting_for) for i in items); safety=[i for i in items if i.safety]
        future=[i for i in items if i.event_time and i.event_time>=now]
        next_event=min(future,key=lambda i:i.event_time) if future else None
        confidence=min((i.confidence for i in items),default=1.0)
        headline=self._headline(request,items)
        summary=self._summary(request,top,more)
        snapshot=self._snapshot(items)
        brief_id=sha256(f'{request.person_id}|{request.date.isoformat()}|{request.requested_mode.value}|{snapshot}'.encode()).hexdigest()[:24]
        pref=delivery or BriefDeliveryPreference()
        metadata={'data_snapshot':snapshot,'audit':audit.events,'delivery_policy':asdict(pref),'external_provider_calls':0,'llm_business_logic':False,'automatic_delivery':False,'structured_first':True}
        audit.add('brief_generated',brief_id=brief_id)
        return DailyBrief(brief_id,request.person_id,request.date,request.timezone,now,headline,summary,sections,sum(i.priority in {Priority.CRITICAL,Priority.HIGH} for i in items),action,waiting,safety,next_event,confidence,omitted,metadata,top,more)
    def _redact(self,i):
        if i.category.upper() in {'MEDICAL','HEALTH'}: return 'Sie haben einen medizinischen Termin.'
        return 'Ein sensibler Punkt benötigt Ihre Aufmerksamkeit.'
    def _mode_filter(self,items,request):
        d=request.date
        if request.requested_mode==RequestedMode.WEEK_PREVIEW:
            end=d+timedelta(days=7)
            return [i for i in items if (i.event_time and d<=i.event_time.date()<end) or (i.deadline and d<=i.deadline.date()<end) or i.category=='SPECIAL_CASE']
        if request.requested_mode==RequestedMode.MORNING:
            return [i for i in items if not (i.event_time and i.event_time.date()<d)]
        if request.requested_mode==RequestedMode.EVENING:
            tomorrow=d+timedelta(days=1)
            return [i for i in items if i.status not in {'DONE','CLOSED'} or (i.event_time and i.event_time.date()==tomorrow)]
        return items
    def _sort_key(self,i,request,now):
        score={Priority.CRITICAL:0,Priority.HIGH:10,Priority.NORMAL:20,Priority.LOW:30}[i.priority]
        if i.deadline and i.deadline<now: score-=8
        elif i.deadline and i.deadline.date()==request.date: score-=6
        if i.action_required: score-=5
        if i.safety: score-=4
        if i.event_time and i.event_time.date()==request.date: score-=3
        if i.waiting_for: score-=2
        return (score,i.event_time or i.deadline or datetime.max,i.item_id)
    def _section(self,i,request,now):
        if i.safety:return Section.SAFETY
        if i.action_required:return Section.ACTION_REQUIRED
        if i.waiting_for:return Section.WAITING
        if i.source_type==SourceType.EMAIL:return Section.IMPORTANT_EMAILS
        if i.deadline:return Section.DEADLINES
        if i.event_time and i.event_time.date()==request.date:return Section.TODAY
        if i.event_time and i.event_time.date()>request.date:return Section.UPCOMING
        return Section.OTHER
    def _headline(self,r,items):
        if not items:return 'Für heute ist nichts Dringendes offen.'
        if r.requested_mode==RequestedMode.MORNING:return 'Guten Morgen. Hier ist Ihre Tagesübersicht.'
        if r.requested_mode==RequestedMode.EVENING:return 'Guten Abend. Das ist noch wichtig.'
        if r.requested_mode==RequestedMode.WEEK_PREVIEW:return 'Das ist in den nächsten sieben Tagen wichtig.'
        return 'Hier ist Ihre Übersicht.'
    def _summary(self,r,top,more):
        if not top:return 'Für heute ist nichts Dringendes offen.'
        lines=[]
        for i in top:
            text='Bei diesem Punkt gibt es widersprüchliche Angaben.' if i.conflicting else i.short_summary
            if i.waiting_for: text=self._waiting_text(i)
            lines.append(text)
        if more: lines.append(f'Weitere {more} Punkte sind vorhanden.')
        return ' '.join(lines)
    def _waiting_text(self,i):
        m={'WAITING_FOR_PROVIDER':'Wir warten noch auf eine Rückmeldung des Anbieters.','WAITING_FOR_APPROVAL':'Es fehlt noch Ihre Freigabe.','WAITING_FOR_USER':'Es fehlt noch Ihre Rückmeldung.','WAITING_FOR_FAMILY':'Wir warten noch auf eine Rückmeldung Ihrer Vertrauensperson.','WAITING_FOR_HUMAN':'Der Vorgang wartet auf persönliche Bearbeitung.'}
        return m.get(i.waiting_for,i.short_summary)
    def _snapshot(self,items):
        data=[{'id':i.item_id,'src':i.source_type.value,'sid':i.source_id,'status':i.status,'updated':i.source_updated_at.isoformat(),'conflict':i.conflicting} for i in sorted(items,key=lambda x:x.item_id)]
        return sha256(json.dumps(data,sort_keys=True).encode()).hexdigest()

class ChannelRenderer:
    @staticmethod
    def render(brief:DailyBrief,channel:str)->str:
        channel=channel.upper()
        if channel not in {'WHATSAPP','APP','EMAIL','VOICE','WEB'}: raise ValueError('unsupported channel')
        body=brief.headline+' '+brief.summary
        return body+' '+brief.closing_question
