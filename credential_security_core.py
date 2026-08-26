"""NAHWERK provider-neutral credential/staging security core.

Metadata and policy only. This module deliberately has no secret-store or live-provider I/O.
"""
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import FrozenSet, Mapping, Optional

class CredentialType(str, Enum):
    SYSTEM_API_KEY='SYSTEM_API_KEY'; SYSTEM_CLIENT_SECRET='SYSTEM_CLIENT_SECRET'; WEBHOOK_SECRET='WEBHOOK_SECRET'; OAUTH_CLIENT_ID='OAUTH_CLIENT_ID'; OAUTH_CLIENT_SECRET='OAUTH_CLIENT_SECRET'; OAUTH_ACCESS_TOKEN='OAUTH_ACCESS_TOKEN'; OAUTH_REFRESH_TOKEN='OAUTH_REFRESH_TOKEN'; USER_APP_PASSWORD='USER_APP_PASSWORD'; USER_IMAP_CREDENTIAL='USER_IMAP_CREDENTIAL'; SERVICE_ACCOUNT='SERVICE_ACCOUNT'; SIGNING_SECRET='SIGNING_SECRET'; ENCRYPTION_KEY_REFERENCE='ENCRYPTION_KEY_REFERENCE'; OTHER='OTHER'
class OwnerType(str, Enum): PLATFORM='PLATFORM'; CUSTOMER='CUSTOMER'; ACCOUNT='ACCOUNT'; PERSON='PERSON'; PROVIDER_CONNECTION='PROVIDER_CONNECTION'
class Environment(str, Enum): DEVELOPMENT='DEVELOPMENT'; TEST='TEST'; STAGING='STAGING'; PRODUCTION='PRODUCTION'
class CredentialStatus(str, Enum): CREATED='CREATED'; ACTIVE='ACTIVE'; EXPIRING='EXPIRING'; EXPIRED='EXPIRED'; ROTATING='ROTATING'; REVOKED='REVOKED'; COMPROMISED='COMPROMISED'; DELETED_REFERENCE='DELETED_REFERENCE'
class ConnectionStatus(str, Enum): PENDING='PENDING'; CONNECTED='CONNECTED'; EXPIRED='EXPIRED'; REVOKED='REVOKED'; ERROR='ERROR'; DISCONNECTED='DISCONNECTED'

FORBIDDEN_FIELDS=frozenset({'password','token','access_token','refresh_token','authorization','api_key','secret','client_secret','cookie','session','auth_token','credential_value'})
ALLOWED_AUDIT_FIELDS=frozenset({'credential_id','provider','environment','status','error_category','event'})
END_USER_SCOPES=frozenset({'provider_connection.read','provider_connection.create','provider_connection.disconnect'})


def _reject_secret_fields(data: Mapping):
    bad={str(k).lower() for k in data} & FORBIDDEN_FIELDS
    if bad: raise ValueError('secret material is forbidden: '+','.join(sorted(bad)))

@dataclass(frozen=True)
class CredentialReference:
    credential_id:str; provider:str; credential_type:CredentialType; owner_type:OwnerType; owner_id:str; environment:Environment; scope:FrozenSet[str]; secret_store:str; secret_reference:str; status:CredentialStatus=CredentialStatus.CREATED; created_at:datetime=field(default_factory=lambda: datetime.now(timezone.utc)); expires_at:Optional[datetime]=None; rotated_at:Optional[datetime]=None; revoked_at:Optional[datetime]=None; last_used_at:Optional[datetime]=None; metadata:Mapping=field(default_factory=dict)
    def __post_init__(self):
        _reject_secret_fields(self.metadata)
        if not self.secret_reference or any(x in self.secret_reference.lower() for x in ('bearer ','password=','api_key=','secret=')): raise ValueError('secret_reference must be opaque')

@dataclass(frozen=True)
class OAuthConnection:
    connection_id:str; person_id:Optional[str]; account_id:Optional[str]; provider:str; scopes:FrozenSet[str]; status:ConnectionStatus; access_token_ref:str; refresh_token_ref:Optional[str]; token_expires_at:Optional[datetime]; consented_at:datetime; revoked_at:Optional[datetime]=None; provider_account_id:Optional[str]=None; created_at:datetime=field(default_factory=lambda: datetime.now(timezone.utc))
    def usable(self, now=None):
        now=now or datetime.now(timezone.utc)
        return self.status==ConnectionStatus.CONNECTED and self.revoked_at is None and (self.token_expires_at is None or self.token_expires_at>now)

@dataclass(frozen=True)
class ProviderConnection:
    connection_id:str; provider:str; person_id:Optional[str]; account_id:Optional[str]; environment:Environment; credential_reference:str; capabilities:FrozenSet[str]; status:ConnectionStatus; authorized_scopes:FrozenSet[str]; provider_subject_id:Optional[str]=None; created_at:datetime=field(default_factory=lambda: datetime.now(timezone.utc)); updated_at:datetime=field(default_factory=lambda: datetime.now(timezone.utc)); last_success_at:Optional[datetime]=None; last_failure_at:Optional[datetime]=None

@dataclass(frozen=True)
class RotationPolicy:
    rotation_required:bool; max_age:Optional[timedelta]; rotate_before_expiry:Optional[timedelta]; grace_period:timedelta=timedelta(0); dual_key_window_allowed:bool=False; revoke_old_after:Optional[timedelta]=None

@dataclass(frozen=True)
class CredentialIncident:
    incident_id:str; credential_id:str; provider:str; severity:str; detected_at:datetime; action_taken:str; rotated:bool; revoked:bool; affected_environment:Environment; status:str

@dataclass(frozen=True)
class CutoverGate:
    staging_credential_works:bool; scope_review:bool; terms_review:bool; secret_storage_review:bool; rotation_revocation:bool; audit_redaction_tested:bool; e2e_passed:bool; feature_flag:bool; rollback:bool
    @property
    def ready(self): return all(self.__dict__.values())

def assert_environment(ref:CredentialReference, environment:Environment):
    if ref.environment!=environment: raise PermissionError('cross-environment credential use denied')
    if ref.status in {CredentialStatus.REVOKED,CredentialStatus.EXPIRED,CredentialStatus.COMPROMISED,CredentialStatus.DELETED_REFERENCE}: raise PermissionError('credential not usable')
    return True

def can_manage_connection(actor_person_id:str, connection:ProviderConnection): return connection.person_id==actor_person_id

def validate_end_user_scope(scope:str):
    if scope=='secret.read' or scope not in END_USER_SCOPES: raise PermissionError('scope denied')
    return True

def disconnect(connection:ProviderConnection):
    if connection.status==ConnectionStatus.DISCONNECTED: return connection
    return ProviderConnection(**{**connection.__dict__,'status':ConnectionStatus.DISCONNECTED,'updated_at':datetime.now(timezone.utc)})

def transition_credential(status:CredentialStatus, target:CredentialStatus):
    if status==CredentialStatus.COMPROMISED and target==CredentialStatus.ACTIVE: raise ValueError('compromised credential cannot be reactivated')
    return target

def redact(value):
    if isinstance(value,dict):
        return {k:('[REDACTED]' if str(k).lower() in FORBIDDEN_FIELDS else redact(v)) for k,v in value.items()}
    if isinstance(value,list): return [redact(v) for v in value]
    return value

def safe_error(provider:str, credential_id:str, environment:Environment, category:str):
    return {'provider':provider,'credential_id':credential_id,'environment':environment.value,'error_category':category}

def audit_event(event:str, **fields):
    data={'event':event,**fields}; _reject_secret_fields(data)
    return {k:v for k,v in data.items() if k in ALLOWED_AUDIT_FIELDS}

SECRET_INVENTORY={
'OpenTable':('partner/API credential','platform','separate preferred','provider/secret manager'),'TheFork':('partner/API credential','platform','separate preferred','provider/secret manager'),'Verivox':('partner credential','platform','separate preferred','secret manager'),'CHECK24':('partner credential','platform','separate preferred','secret manager'),'Twilio':('API key/auth token','platform','yes','n8n/server secret store'),'OpenAI':('project API key','platform','yes','n8n/server secret store'),'Microsoft':('OAuth client + user tokens','platform+user','yes','server secret store'),'Gmail':('OAuth client + user tokens','platform+user','yes','server secret store'),'GMX':('app password/IMAP','user','yes','encrypted user credential store'),'WEB.DE':('app password/IMAP','user','yes','encrypted user credential store'),'T-Online':('app password/IMAP','user','yes','encrypted user credential store'),'TIMIFY':('partner/OAuth credential','platform+user','yes','server secret store'),'Calendly':('OAuth','platform+user','yes','server secret store'),'Google Document AI':('service account/API credential','platform','yes','server secret store'),'Azure':('key/identity','platform','yes','server secret store'),'AWS':('IAM role/temporary credential','platform','yes','provider-native IAM'),'DB/VBB':('API/partner credential if required','platform','separate preferred','server secret store')}
