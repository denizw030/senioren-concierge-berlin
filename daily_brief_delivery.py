from dataclasses import dataclass, field
from datetime import datetime, time
from enum import Enum
import hashlib, json

class Channel(str, Enum):
    WHATSAPP='WHATSAPP'; APP_PUSH='APP_PUSH'; EMAIL='EMAIL'; VOICE='VOICE'; WEB='WEB'
class DeliveryState(str, Enum):
    PLANNED='PLANNED'; SCHEDULED='SCHEDULED'; CLAIMED='CLAIMED'; RENDERED='RENDERED'; SENDING='SENDING'; SENT='SENT'; DELIVERED='DELIVERED'; FAILED='FAILED'; CANCELLED='CANCELLED'; EXPIRED='EXPIRED'; SKIPPED='SKIPPED'
class Receipt(str, Enum):
    QUEUED='QUEUED'; SENT='SENT'; DELIVERED='DELIVERED'; FAILED='FAILED'; READ='READ'; UNKNOWN='UNKNOWN'
class Sensitivity(str, Enum):
    NORMAL='NORMAL'; PRIVATE='PRIVATE'; SENSITIVE='SENSITIVE'; RESTRICTED='RESTRICTED'

@dataclass(frozen=True)
class AuthorizationContext:
    scopes: frozenset[str]=frozenset()
    self_access: bool=True

@dataclass
class RetryPolicy:
    max_attempts:int=3
    retryable:frozenset[str]=frozenset({'TEMPORARY_PROVIDER_ERROR','TIMEOUT','RATE_LIMIT'})

@dataclass
class DailyBriefDeliveryPolicy:
    enabled:bool=True
    only_if_relevant:bool=True
    send_all_clear:bool=False
    preferred_time:str='08:00'
    timezone:str='Europe/Berlin'
    allowed_channels:tuple[Channel,...]=(Channel.WHATSAPP,Channel.APP_PUSH,Channel.WEB)
    fallback_channels:tuple[Channel,...]=(Channel.APP_PUSH,)
    quiet_hours:tuple[str,str]=('22:00','08:00')
    weekend_policy:str='USER_PREFERENCE'
    max_deliveries_per_day:int=2
    retry_policy:RetryPolicy=field(default_factory=RetryPolicy)
    voice_allowed:bool=False
    email_allowed:bool=False
    family_scope_required:bool=True
    sensitivity_ceiling:Sensitivity=Sensitivity.SENSITIVE

@dataclass(frozen=True)
class DailyBriefDeliveryRequest:
    delivery_request_id:str; brief_id:str; person_id:str; account_id:str
    requested_mode:str; preferred_channel:Channel; fallback_channels:tuple[Channel,...]
    timezone:str; scheduled_for:datetime; delivery_policy:DailyBriefDeliveryPolicy
    authorization_context:AuthorizationContext; idempotency_key:str; created_at:datetime

@dataclass(frozen=True)
class ChannelCapabilities:
    supports_text:bool=False; supports_audio:bool=False; supports_html:bool=False
    supports_push:bool=False; supports_receipts:bool=False; supports_read_receipts:bool=False
    supports_links:bool=False; supports_buttons:bool=False

CAPABILITIES={
 Channel.WHATSAPP:ChannelCapabilities(True,True,False,False,True,True,True,True),
 Channel.APP_PUSH:ChannelCapabilities(True,False,False,True,True,False,True,False),
 Channel.EMAIL:ChannelCapabilities(True,False,True,False,True,False,True,False),
 Channel.VOICE:ChannelCapabilities(False,True,False,False,True,False,False,False),
 Channel.WEB:ChannelCapabilities(True,True,True,False,False,False,True,True),
}
FEATURE_FLAGS={
 'daily_brief.on_demand':False,'daily_brief.whatsapp_delivery':False,
 'daily_brief.push_delivery':False,'daily_brief.email_delivery':False,
 'daily_brief.voice_delivery':False,'daily_brief.scheduled_delivery':False,
}

@dataclass
class TemporaryDeliveryPause:
    starts_at:datetime; ends_at:datetime; reason:str; scope:str='ALL'
    def active(self, now): return self.starts_at <= now < self.ends_at

@dataclass
class DeliveryRecord:
    request:DailyBriefDeliveryRequest; state:DeliveryState=DeliveryState.PLANNED
    worker_id:str|None=None; lease_until:datetime|None=None; attempt:int=0
    receipt:Receipt=Receipt.UNKNOWN; provider_calls:int=0; audit:list=field(default_factory=list)

class DailyBriefDeliveryProvider:
    capabilities=ChannelCapabilities()
    def prepare_delivery(self,payload): return payload
    def send(self,payload): raise NotImplementedError
    def get_status(self,provider_id): return Receipt.UNKNOWN
    def cancel(self,provider_id): return False
class FixtureDeliveryProvider(DailyBriefDeliveryProvider):
    def __init__(self,channel): self.channel=channel; self.capabilities=CAPABILITIES[channel]; self.sent=[]
    def send(self,payload): self.sent.append(payload); return {'provider_id':f'fixture-{len(self.sent)}','receipt':Receipt.SENT}

class Renderer:
    @staticmethod
    def render(channel, brief, sensitivity=Sensitivity.NORMAL):
        # Renderer changes representation only; it never fetches providers or invents facts.
        headline=brief.get('headline','')
        points=list(brief.get('top_items',[]))[:3]
        if channel==Channel.APP_PUSH:
            if sensitivity in (Sensitivity.SENSITIVE,Sensitivity.RESTRICTED): return {'title':'NAHWERK','body':'Ihre Tagesübersicht ist verfügbar.'}
            return {'title':'NAHWERK','body':points[0] if points else 'Ihre Tagesübersicht ist bereit.'}
        if channel==Channel.WHATSAPP:
            more=max(0,len(brief.get('top_items',[]))-3); body='\n'.join([headline]+[f'• {p}' for p in points])
            return {'text':body+(f'\nWeitere {more} Punkte' if more else '')}
        if channel==Channel.EMAIL: return {'subject':'Ihre NAHWERK Tagesübersicht','body':'\n'.join([headline]+points)}
        if channel==Channel.VOICE: return {'text':' '.join([headline]+points),'voice':brief.get('voice','cedar')}
        if channel==Channel.WEB: return {'headline':headline,'items':points,'more_count':max(0,len(brief.get('top_items',[]))-3)}
        raise ValueError(channel)

class DeliveryPlanner:
    @staticmethod
    def deterministic_id(person_id,date,mode,data_snapshot,channel):
        raw='|'.join(map(str,(person_id,date,mode,data_snapshot,channel.value)))
        return hashlib.sha256(raw.encode()).hexdigest()
    @staticmethod
    def in_quiet_hours(now, quiet):
        start,end=(time.fromisoformat(x) for x in quiet); t=now.time()
        return (t>=start or t<end) if start>end else start<=t<end
    @staticmethod
    def retryable(error_code, policy): return error_code in policy.retryable
    @staticmethod
    def choose_channel(req):
        p=req.delivery_policy; c=req.preferred_channel
        if c not in p.allowed_channels: return None
        if c==Channel.VOICE and not p.voice_allowed: return None
        if c==Channel.EMAIL and not p.email_allowed: return None
        return c
    @staticmethod
    def fallback(req, failed_channel):
        p=req.delivery_policy
        for c in req.fallback_channels or p.fallback_channels:
            if c==failed_channel or c not in p.allowed_channels: continue
            if c==Channel.VOICE and not p.voice_allowed: continue
            if c==Channel.EMAIL and not p.email_allowed: continue
            return c
        return None
    @staticmethod
    def authorize(req, sensitivity, for_other=False):
        if not req.delivery_policy.enabled: return False
        if for_other and req.delivery_policy.family_scope_required and 'brief.receive' not in req.authorization_context.scopes: return False
        if sensitivity==Sensitivity.RESTRICTED: return False
        return True

class ClaimStore:
    def __init__(self): self.records={}
    def put(self,record):
        if record.request.idempotency_key in self.records: return False
        self.records[record.request.idempotency_key]=record; return True
    def claim(self,key,worker,now,lease_until):
        r=self.records[key]
        if r.state==DeliveryState.CLAIMED and r.lease_until and r.lease_until>now: return False
        if r.state in (DeliveryState.SENT,DeliveryState.DELIVERED,DeliveryState.CANCELLED,DeliveryState.EXPIRED,DeliveryState.SKIPPED): return False
        r.state=DeliveryState.CLAIMED; r.worker_id=worker; r.lease_until=lease_until; r.attempt+=1; r.audit.append('delivery_claimed'); return True
    def release(self,key):
        r=self.records[key]; r.state=DeliveryState.SCHEDULED; r.worker_id=None; r.lease_until=None
    def complete(self,key,receipt=Receipt.SENT):
        r=self.records[key]; r.receipt=receipt; r.state=DeliveryState.DELIVERED if receipt==Receipt.DELIVERED else DeliveryState.SENT; r.audit.append('delivery_sent')
    def cancel(self,key): self.records[key].state=DeliveryState.CANCELLED; self.records[key].audit.append('delivery_cancelled')

ROLLOUT=('PHASE 0: Core only','PHASE 1: On-demand in Staging','PHASE 2: opt-in Morning Brief','PHASE 3: Fallback Channel','PHASE 4: weitere Channels')
