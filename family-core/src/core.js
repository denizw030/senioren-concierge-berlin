export const PermissionStatus=Object.freeze({PENDING:'pending',ACTIVE:'active',EXPIRED:'expired',REVOKED:'revoked',REJECTED:'rejected'});
export const Sensitivity=Object.freeze({NORMAL:0,PRIVATE:1,SENSITIVE:2,RESTRICTED:3});
export const SCOPES=Object.freeze(['reminder.read','reminder.create','reminder.update','reminder.delete','profile.basic.read','support.request','memory.read','memory.write','mobility.information','mobility.prepare','mobility.approve','mobility.execute','restaurant.information','restaurant.prepare','restaurant.approve','restaurant.execute','provider_switch.information','provider_switch.prepare','provider_switch.approve','provider_switch.execute','documents.read']);
const scopeSensitivity={
 'profile.basic.read':Sensitivity.NORMAL,'support.request':Sensitivity.NORMAL,
 'reminder.read':Sensitivity.PRIVATE,'reminder.create':Sensitivity.PRIVATE,'reminder.update':Sensitivity.PRIVATE,'reminder.delete':Sensitivity.PRIVATE,
 'memory.read':Sensitivity.SENSITIVE,'memory.write':Sensitivity.SENSITIVE,'documents.read':Sensitivity.RESTRICTED,
 'mobility.information':Sensitivity.PRIVATE,'mobility.prepare':Sensitivity.SENSITIVE,'mobility.approve':Sensitivity.RESTRICTED,'mobility.execute':Sensitivity.RESTRICTED,
 'restaurant.information':Sensitivity.PRIVATE,'restaurant.prepare':Sensitivity.SENSITIVE,'restaurant.approve':Sensitivity.RESTRICTED,'restaurant.execute':Sensitivity.RESTRICTED,
 'provider_switch.information':Sensitivity.PRIVATE,'provider_switch.prepare':Sensitivity.SENSITIVE,'provider_switch.approve':Sensitivity.RESTRICTED,'provider_switch.execute':Sensitivity.RESTRICTED
};
export function validatePermission(p){
 if(!p||!p.permission_id||!p.grantor_person_id||!p.grantee_person_id||!p.customer_account_id||!SCOPES.includes(p.permission_type)||!Object.values(PermissionStatus).includes(p.status)) return false;
 if(p.expires_at&&Number.isNaN(Date.parse(p.expires_at))) return false;
 return true;
}
export function effectiveStatus(p,now=new Date()){
 if(p.status===PermissionStatus.ACTIVE&&p.expires_at&&new Date(p.expires_at)<=now)return PermissionStatus.EXPIRED;
 return p.status;
}
export function authorizeFamilyAction({actor_person_id,subject_person_id,customer_account_id,requested_scope,context={},permissions=[],now=new Date()}){
 const deny=reason=>({allowed:false,reason,permission_id:null,effective_scope:null,expires_at:null});
 if(!actor_person_id||!subject_person_id||!customer_account_id||!SCOPES.includes(requested_scope))return deny('invalid_request');
 if(context.client_authorized===true)return deny('untrusted_client_authorization');
 const required=scopeSensitivity[requested_scope]??Sensitivity.RESTRICTED;
 const requestedSensitivity=context.sensitivity??required;
 const candidates=permissions.filter(p=>validatePermission(p)&&p.grantee_person_id===actor_person_id&&p.grantor_person_id===subject_person_id&&p.customer_account_id===customer_account_id&&p.permission_type===requested_scope);
 const p=candidates.find(x=>effectiveStatus(x,now)===PermissionStatus.ACTIVE);
 if(!p)return deny('permission_missing_or_inactive');
 const max=p.metadata?.max_sensitivity??scopeSensitivity[p.permission_type]??Sensitivity.NORMAL;
 if(requestedSensitivity>max)return deny('sensitivity_exceeded');
 return {allowed:true,reason:'allowed',permission_id:p.permission_id,effective_scope:p.permission_type,expires_at:p.expires_at??null};
}
export function createInvite(input,now=new Date()){
 if(!input?.invite_id||!input.grantor_person_id||!input.grantee_person_id||!input.customer_account_id||!Array.isArray(input.requested_scopes)||input.requested_scopes.length===0||input.requested_scopes.some(s=>!SCOPES.includes(s)))throw new Error('invalid_invite');
 if(new Date(input.expires_at)<=now)throw new Error('invalid_expiry');
 return {...input,status:'pending',consent_state:'pending',created_at:now.toISOString()};
}
export function decideInvite(invite,{subject_person_id,decision},now=new Date()){
 if(invite.status!=='pending'||new Date(invite.expires_at)<=now)return {...invite,status:'expired',consent_state:'pending'};
 if(subject_person_id!==invite.grantor_person_id)throw new Error('wrong_subject');
 if(decision==='reject')return {...invite,status:'rejected',consent_state:'rejected',rejected_at:now.toISOString()};
 if(decision!=='consent')throw new Error('invalid_decision');
 return {...invite,status:'accepted',consent_state:'granted',accepted_at:now.toISOString()};
}
export function activateInvite(invite,now=new Date()){
 if(invite.status!=='accepted'||invite.consent_state!=='granted')throw new Error('consent_required');
 return invite.requested_scopes.map((scope,i)=>({permission_id:`${invite.invite_id}:${i}`,grantor_person_id:invite.grantor_person_id,grantee_person_id:invite.grantee_person_id,customer_account_id:invite.customer_account_id,permission_type:scope,scope:'senior',status:'active',granted_at:now.toISOString(),expires_at:invite.permission_expires_at??null,revoked_at:null,source:'family_invite',metadata:{max_sensitivity:scopeSensitivity[scope]}}));
}
export function revokePermission(permission,now=new Date()){return {...permission,status:'revoked',revoked_at:now.toISOString()};}
export function toMemoryAuthorizationContext(auth,{categories=[]}={}){
 if(!auth?.allowed||auth.effective_scope!=='memory.read')return null;
 return Object.freeze({authorized:true,source:'family_server_authorization',permission_id:auth.permission_id,scope:'memory.read',categories:[...categories],expires_at:auth.expires_at});
}
export function auditEvent(type,{actor_person_id=null,subject_person_id=null,permission_id=null,scope=null,result,reason=null,correlation_id=null}={}){return {type,actor_person_id,subject_person_id,permission_id,scope,result,reason,correlation_id,occurred_at:new Date().toISOString()};}
