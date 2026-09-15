(() => {
  'use strict';
  const SESSION_KEY='scb_web_session';
  const PLATFORM_CONTRACT='WEBSITE_EMAIL_INTEGRATION_CONTRACT_V1';
  const PLATFORM_CONTRACT_SHA='prod-email-runtime-v7';
  const EMAIL_GATEWAY_BASE='https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-email-runtime';
  const PROVIDERS=['GOOGLE','MICROSOFT','GENERIC'];
  const CAPABILITIES=['EMAIL_READ','EMAIL_SEARCH','EMAIL_ATTACHMENTS','EMAIL_DRAFT','EMAIL_SEND'];
  const STATES=['DISCONNECTED','CONNECTING','CONNECTED','REAUTH_REQUIRED','SCOPE_REQUIRED','ERROR','REVOKED'];
  const ERROR_MAP={
    UNAUTHENTICATED:{retryable:false,message:'Ihre Sitzung ist nicht mehr gültig. Bitte melden Sie sich erneut an.'},
    EMAIL_IDENTITY_BINDING_FAILED:{retryable:false,message:'Die E-Mail-Verbindung konnte Ihrem Konto nicht sicher zugeordnet werden.'},
    EMAIL_PROVIDER_UNAVAILABLE:{retryable:true,message:'Der E-Mail-Anbieter ist derzeit nicht erreichbar.'},
    EMAIL_PROVIDER_NOT_SUPPORTED:{retryable:false,message:'Dieser E-Mail-Anbieter ist derzeit noch nicht verfügbar.'},
    EMAIL_OAUTH_FAILED:{retryable:true,message:'Die E-Mail-Anmeldung konnte nicht abgeschlossen werden.'},
    EMAIL_REQUEST_INVALID:{retryable:false,message:'Die E-Mail-Anfrage konnte nicht sicher verarbeitet werden.'}
  };
  function sessionToken(storage=globalThis.sessionStorage){try{const row=JSON.parse(storage?.getItem(SESSION_KEY)||'null');return row?.session_token?String(row.session_token):''}catch{return ''}}
  function buildUrl(path,query){const u=new URL(EMAIL_GATEWAY_BASE.replace(/\/$/,'')+path);for(const [k,v] of Object.entries(query||{}))if(v!==null&&v!==undefined&&v!=='')u.searchParams.set(k,String(v));return u.toString()}
  function normalizeError(data){const raw=typeof data?.error==='string'?data.error:data?.error?.code;const code=ERROR_MAP[raw]?raw:'EMAIL_REQUEST_INVALID';return {code,...ERROR_MAP[code],retryable:ERROR_MAP[code].retryable===true&&data?.error?.retryable!==false}}
  async function request(path,{method='GET',body=null,query=null,token=sessionToken(),fetchImpl=globalThis.fetch}={}){
    if(!token)return {ok:false,error:{code:'UNAUTHENTICATED',...ERROR_MAP.UNAUTHENTICATED},networkRequestMade:false};
    const headers={Authorization:'Bearer '+token};const init={method,headers};if(body!==null){headers['Content-Type']='application/json';init.body=JSON.stringify(body)}
    try{const r=await fetchImpl(buildUrl(path,query),init);const data=await r.json().catch(()=>null);if(!r.ok||data?.ok!==true)return {ok:false,httpStatus:r.status,error:normalizeError(data),networkRequestMade:true};return {ok:true,data,httpStatus:r.status,networkRequestMade:true}}catch{return {ok:false,error:{code:'EMAIL_PROVIDER_UNAVAILABLE',...ERROR_MAP.EMAIL_PROVIDER_UNAVAILABLE},networkRequestMade:true}}
  }
  function normalizeProviders(data){if(data?.ok!==true||!Array.isArray(data.providers))return [];return data.providers.filter(x=>PROVIDERS.includes(String(x.provider))).map(x=>({provider:String(x.provider),label:String(x.label||x.provider),availability:String(x.availability||'UNAVAILABLE'),capabilities:Array.isArray(x.capabilities)?x.capabilities.filter(v=>CAPABILITIES.includes(v)):[],reason:x.reason||null}))}
  function normalizeConnection(data){if(data?.ok!==true)return null;const state=String(data.state||'');if(!STATES.includes(state))return null;return {provider:data.provider?String(data.provider):null,state,capabilities:Array.isArray(data.capabilities)?data.capabilities.filter(v=>CAPABILITIES.includes(v)):[],account_display_hint:String(data.account_display_hint||''),reauth_required:data.reauth_required===true,scope_required:data.scope_required===true}}
  function safeGoogleRedirect(value){try{const u=new URL(String(value||''));return u.protocol==='https:'&&u.hostname==='accounts.google.com'?u.toString():null}catch{return null}}
  async function listProviders(args={}){return request('/email/providers',args)}
  async function getConnection(args={}){return request('/email/connection',args)}
  async function getOAuthStatus(args={}){return request('/email/oauth/status',{...args,query:{provider:'GOOGLE'}})}
  async function connectEmail(args={}){const out=await request('/email/connect',{...args,method:'POST',body:{provider:'GOOGLE',requested_capabilities:CAPABILITIES}});if(!out.ok)return out;const redirect=safeGoogleRedirect(out.data.authorization_redirect_url);return redirect?{...out,redirect}:{ok:false,error:{code:'EMAIL_OAUTH_FAILED',...ERROR_MAP.EMAIL_OAUTH_FAILED},networkRequestMade:true}}
  async function reauthEmail(args={}){const out=await request('/email/reauth',{...args,method:'POST',body:{provider:'GOOGLE',requested_capabilities:CAPABILITIES}});if(!out.ok)return out;const redirect=safeGoogleRedirect(out.data.authorization_redirect_url);return redirect?{...out,redirect}:{ok:false,error:{code:'EMAIL_OAUTH_FAILED',...ERROR_MAP.EMAIL_OAUTH_FAILED},networkRequestMade:true}}
  async function disconnectLocal(args={}){return request('/email/disconnect',{...args,method:'POST',body:{mode:'LOCAL'}})}
  function parseOAuthReturn(value){try{const u=new URL(String(value),'https://nahwerkconcierge.com/konto.html');if(u.searchParams.get('email_oauth')!=='complete'||String(u.searchParams.get('provider')||'').toUpperCase()!=='GOOGLE')return null;return {provider:'GOOGLE',flow:String(u.searchParams.get('flow')||'CONNECT').toUpperCase()}}catch{return null}}
  function cleanOAuthQuery(value,historyImpl){try{const u=new URL(String(value),'https://nahwerkconcierge.com/konto.html');for(const k of ['email_oauth','provider','flow','code'])u.searchParams.delete(k);historyImpl?.replaceState?.(null,'',u.pathname+(u.search||'')+(u.hash||''));return true}catch{return false}}
  globalThis.NAHWERKEmailIntegrationTestHooks=Object.freeze({PLATFORM_CONTRACT,PLATFORM_CONTRACT_SHA,runtimeGatewayBase:EMAIL_GATEWAY_BASE,PROVIDERS,CAPABILITIES,STATES,ERROR_MAP,sessionToken,request,normalizeProviders,normalizeConnection,safeGoogleRedirect,listProviders,getConnection,getOAuthStatus,connectEmail,reauthEmail,disconnectLocal,parseOAuthReturn,cleanOAuthQuery});
  if(typeof document==='undefined')return;
  const root=document.getElementById('accountEmailCard');if(!root)return;
  root.dataset.emailRuntime='prod';
  const buttons=[...root.querySelectorAll('[data-email-provider]')];const capInputs=[...root.querySelectorAll('[data-email-capability]')];
  const badge=document.getElementById('emailConnectionStatus'),runtimeNote=document.getElementById('emailRuntimeNote'),title=document.getElementById('emailStateTitle'),meta=document.getElementById('emailStateMeta'),hint=document.getElementById('emailAccountHint');
  const connect=document.getElementById('emailConnectButton'),reauth=document.getElementById('emailReauthButton'),disconnect=document.getElementById('emailDisconnectButton'),retry=document.getElementById('emailRetryButton'),generic=document.getElementById('emailGenericForm');
  let providers=[],connection=null,lastError=null,loading=false,loaded=false;
  const setBusy=v=>[connect,reauth,disconnect,retry].forEach(b=>{if(b&&!b.hidden)b.disabled=v});
  function renderProviders(){for(const b of buttons){const key=b.dataset.emailProvider,row=providers.find(x=>x.provider===key),available=row?.availability==='AVAILABLE';b.disabled=!available;b.setAttribute('aria-disabled',String(!available));b.setAttribute('aria-pressed',String(key==='GOOGLE'&&available));b.classList.toggle('is-selected',key==='GOOGLE'&&available);const s=b.querySelector('[data-email-provider-status]');if(s)s.textContent=available?'Verfügbar':row?.availability==='CONFIGURATION_REQUIRED'?'Google-Freigabe ausstehend':'Noch nicht verfügbar'}for(const i of capInputs){i.checked=true;i.disabled=true}if(generic)generic.hidden=true}
  function renderConnection(c){connection=c;lastError=null;badge.textContent={DISCONNECTED:'Nicht verbunden',CONNECTING:'Verbindung läuft',CONNECTED:'Verbunden',REAUTH_REQUIRED:'Erneute Verbindung nötig',SCOPE_REQUIRED:'Berechtigung erforderlich',ERROR:'Fehler',REVOKED:'Getrennt'}[c.state]||'Status';hint.textContent=c.account_display_hint||'';connect.hidden=!['DISCONNECTED','REVOKED'].includes(c.state);reauth.hidden=!['REAUTH_REQUIRED','SCOPE_REQUIRED'].includes(c.state);disconnect.hidden=!['CONNECTED','REAUTH_REQUIRED','SCOPE_REQUIRED','ERROR'].includes(c.state);retry.hidden=true;if(c.state==='CONNECTED'){title.textContent='Gmail ist verbunden';meta.textContent='Dein persönlicher NAHWERK Concierge nutzt diese Verbindung über denselben Core und sendet E-Mails nur über den geschützten Freigabe-/CAO-Pfad.'}else if(c.state==='DISCONNECTED'||c.state==='REVOKED'){title.textContent='Gmail verbinden';meta.textContent='Verbinde dein Google-Konto sicher über Google OAuth.'}else if(c.state==='REAUTH_REQUIRED'||c.state==='SCOPE_REQUIRED'){title.textContent='Gmail erneut verbinden';meta.textContent='Google verlangt eine erneute Bestätigung der Verbindung.'}else{title.textContent='Gmail-Verbindung wird geprüft';meta.textContent='Der serverseitige Status ist maßgeblich.'}}
  function renderError(e){lastError=e;badge.textContent='Fehler';title.textContent=e?.message||ERROR_MAP.EMAIL_REQUEST_INVALID.message;meta.textContent='Es werden keine internen Provider- oder Token-Details angezeigt.';hint.textContent='';connect.hidden=true;reauth.hidden=true;disconnect.hidden=true;retry.hidden=e?.retryable!==true;retry.disabled=false}
  async function activate(){if(loading||loaded)return;loading=true;setBusy(true);runtimeNote.textContent='PROD · Sichere Google-OAuth-Verbindung. Gmail-Inhalte werden dem bestehenden NAHWERK Core zugeordnet; Versand bleibt freigabepflichtig.';try{const p=await listProviders();if(!p.ok){renderError(p.error);return}providers=normalizeProviders(p.data);renderProviders();const c=await getConnection();if(!c.ok){renderError(c.error);return}const n=normalizeConnection(c.data);if(!n){renderError(ERROR_MAP.EMAIL_REQUEST_INVALID);return}renderConnection(n);loaded=true}finally{loading=false;setBusy(false)}}
  connect?.addEventListener('click',async()=>{setBusy(true);const r=await connectEmail();setBusy(false);if(!r.ok)return renderError(r.error);location.assign(r.redirect)});
  reauth?.addEventListener('click',async()=>{setBusy(true);const r=await reauthEmail();setBusy(false);if(!r.ok)return renderError(r.error);location.assign(r.redirect)});
  disconnect?.addEventListener('click',async()=>{setBusy(true);const r=await disconnectLocal();if(!r.ok){setBusy(false);return renderError(r.error)}loaded=false;setBusy(false);await activate()});
  retry?.addEventListener('click',async()=>{if(lastError?.retryable!==true)return;loaded=false;await activate()});
  const returned=parseOAuthReturn(location.href);if(returned){cleanOAuthQuery(location.href,history);loaded=false;document.getElementById('accountTabEmail')?.click()}
  globalThis.NAHWERKEmailAccount=Object.freeze({activate});
})();
