(()=>{
const SB='https://btqklftjmwtqqqdmwlnk.supabase.co';
const KEY='sb_publishable_onbKIoe0eb9hgsYC2UeYzw_qttxclvj';
const PORTAL=`${SB}/functions/v1/nahwerk-customer-portal-staging`;
const EMAIL=`${SB}/functions/v1/nahwerk-email-oauth-staging`;
const SESSION='nahwerk_portal_staging_session_v1';
const $=id=>document.getElementById(id);
let session=null,model=null;
function message(id,text,error=false){const el=$(id);el.textContent=text;el.classList.remove('hidden');el.style.borderLeft=`4px solid ${error?'#a84b4b':'#b28a45'}`}
function clearMessage(id){$(id).classList.add('hidden')}
function loadSession(){try{const v=JSON.parse(sessionStorage.getItem(SESSION)||'null');if(v?.access_token&&v?.expires_at*1000>Date.now()+10000)return v}catch(_){}return null}
function saveSession(v){session=v;sessionStorage.setItem(SESSION,JSON.stringify(v))}
function clearSession(){session=null;model=null;sessionStorage.removeItem(SESSION)}
async function api(url,opts={}){if(!session?.access_token)throw new Error('not_authenticated');const headers=new Headers(opts.headers||{});headers.set('apikey',KEY);headers.set('authorization',`Bearer ${session.access_token}`);if(opts.body&&!headers.has('content-type'))headers.set('content-type','application/json');const r=await fetch(url,{...opts,headers,cache:'no-store'});const body=await r.json().catch(()=>({}));if(r.status===401){clearSession();showLogin();throw new Error('session_expired')}if(!r.ok)throw new Error(body.error||`http_${r.status}`);return body}
async function signIn(email,password){const r=await fetch(`${SB}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:KEY,'content-type':'application/json'},body:JSON.stringify({email,password}),cache:'no-store'});const body=await r.json().catch(()=>({}));if(!r.ok||!body.access_token)throw new Error('invalid_login');saveSession(body)}
async function signOut(){if(session?.access_token){await fetch(`${SB}/auth/v1/logout`,{method:'POST',headers:{apikey:KEY,authorization:`Bearer ${session.access_token}`}}).catch(()=>{})}clearSession();showLogin()}
function showLogin(){$('portalView').classList.add('hidden');$('loginView').classList.remove('hidden')}
function showPortal(){$('loginView').classList.add('hidden');$('portalView').classList.remove('hidden')}
function badge(status){const label={AVAILABLE:'Verfügbar',COMING_SOON:'Demnächst',CONNECTED:'Verbunden',REAUTH_REQUIRED:'Erneute Anmeldung erforderlich',ERROR:'Fehler',DISCONNECTED:'Nicht verbunden'}[status]||status;const cls=status==='CONNECTED'?'connected':status==='REAUTH_REQUIRED'||status==='ERROR'?'warn':'';return `<span class="badge ${cls}">${label}</span>`}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function renderServices(){const byProvider=new Map((model.connections||[]).map(x=>[x.provider,x]));function render(group){return model.services.filter(s=>s.group===group).map(s=>{const c=byProvider.get(s.id);const status=c?.status||s.status;let action='';if(group==='email'&&s.id==='google'){
 if(status==='CONNECTED'||status==='REAUTH_REQUIRED'||status==='ERROR') action=`<button class="btn light" data-disconnect="${escapeHtml(c?.id||'')}" type="button">E-Mail-Verbindung trennen</button>`;
 else action='<button class="btn red" data-connect-google type="button">Gmail verbinden</button>';
 }else action='<button class="btn light" type="button" disabled>Demnächst</button>';
 const details=c?`<div class="service-meta">${escapeHtml(c.provider_email||'')} ${badge(status)}${Array.isArray(c.permissions)&&c.permissions.length?`<ul class="permissions">${c.permissions.map(p=>`<li>${escapeHtml(p)}</li>`).join('')}</ul>`:''}</div>`:`<div class="service-meta">${badge(status)}</div>`;
 return `<div class="service"><div class="service-main"><div class="service-title">${escapeHtml(s.label)}</div>${details}</div>${action}</div>`}).join('')}
 $('emailServices').innerHTML=render('email');$('calendarServices').innerHTML=render('calendar');
 document.querySelectorAll('[data-connect-google]').forEach(b=>b.addEventListener('click',connectGoogle));document.querySelectorAll('[data-disconnect]').forEach(b=>b.addEventListener('click',()=>disconnectEmail(b.dataset.disconnect)))}
function render(){showPortal();$('accountSummary').textContent=`Konto: ${model.account.brand} · Status: ${model.account.status}. Rolle: ${model.member.role}.`;$('memberPermissions').textContent=model.member.can_manage_plan?'Du darfst diesen Kundenbereich und den Tarif verwalten.':'Deine Rolle hat nur die im Konto hinterlegten Berechtigungen.';renderServices()}
async function refresh(){model=await api(`${PORTAL}/portal/me`);render();await consumeDeepLinkIfPresent()}
async function consumeDeepLinkIfPresent(){const u=new URL(location.href);const token=u.searchParams.get('connect');if(!token)return;try{const result=await api(`${PORTAL}/portal/connect-intent/consume`,{method:'POST',body:JSON.stringify({token})});message('deepLinkNotice',`Sicherer Verbindungsauftrag bestätigt: ${result.purpose}${result.provider?` · ${result.provider}`:''}.`);u.searchParams.delete('connect');history.replaceState({},'',u)}catch(e){message('deepLinkNotice','Dieser Verbindungslink ist ungültig, abgelaufen oder wurde bereits verwendet.',true)}}
async function connectGoogle(){try{clearMessage('portalMessage');const body=await api(`${EMAIL}/email/connect/google`,{method:'POST',body:JSON.stringify({scope_mode:'read'})});if(!body.authorization_url)throw new Error('connect_start_failed');const popup=open(body.authorization_url,'nahwerkGoogleOAuth','width=540,height=720');if(!popup)location.href=body.authorization_url;else{const timer=setInterval(async()=>{if(popup.closed){clearInterval(timer);try{await refresh();message('portalMessage','E-Mail-Verbindungsstatus wurde aktualisiert.')}catch(_){}}},700)}}catch(e){message('portalMessage','Gmail-Verbindung konnte nicht gestartet werden.',true)}}
async function disconnectEmail(id){if(!id)return;if(!confirm('E-Mail-Verbindung wirklich trennen?'))return;try{await api(`${EMAIL}/email/disconnect`,{method:'POST',body:JSON.stringify({connection_id:id})});await refresh();message('portalMessage','E-Mail-Verbindung wurde getrennt.')}catch(e){message('portalMessage','Die Verbindung konnte nicht sicher getrennt werden.',true)}}
$('loginForm').addEventListener('submit',async e=>{e.preventDefault();clearMessage('loginMessage');$('loginButton').disabled=true;try{await signIn($('email').value.trim(),$('password').value);await refresh()}catch(_){message('loginMessage','Anmeldung nicht möglich. Bitte Zugangsdaten prüfen.',true)}finally{$('loginButton').disabled=false}});
$('logoutButton').addEventListener('click',signOut);
session=loadSession();if(session)refresh().catch(()=>{clearSession();showLogin()});else showLogin();
})();