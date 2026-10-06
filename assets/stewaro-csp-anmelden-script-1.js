(()=>{
const LOGIN_URL='https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/web-login-secure';
const SESSION_URL='https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/web-session-secure';
const MFA_CHALLENGE_URL=LOGIN_URL;
const MFA_VERIFY_URL=LOGIN_URL;
const MFA_RECOVERY_CODE_URL='https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/web-mfa-recovery-code-secure';
const RESET_URL='https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/web-password-recovery-request-secure';
const SESSION_KEY='scb_web_session';
const ENTRY_PARAMS=new URLSearchParams(location.search);
const ENTRY_PRODUCT=ENTRY_PARAMS.get('produkt')==='senioren'?'senioren':null;
const ENTRY_GUEST_HANDOFF=ENTRY_PARAMS.get('source')==='web_guest_chat';
const ENTRY_APP_HANDOFF=ENTRY_PARAMS.get('next')==='app';
const ENTRY_HQ_HANDOFF=ENTRY_PARAMS.get('produkt')==='internal-hq'&&ENTRY_PARAMS.get('next')==='hq';
const ENTRY_NEXT=ENTRY_GUEST_HANDOFF&&ENTRY_PARAMS.get('next')==='/payg'?'/payg':'';
const form=document.getElementById('loginForm');
const status=document.getElementById('loginStatus');
const forgot=document.getElementById('forgotPassword');
const submit=document.getElementById('loginSubmit');
const emailInput=document.getElementById('loginEmail');
const passwordInput=document.getElementById('loginPassword');
const rememberInput=document.getElementById('rememberMe');
const mfaChoice=document.getElementById('mfaChoice');
const mfaChoiceSms=document.getElementById('mfaChoiceSms');
const mfaChoiceTotp=document.getElementById('mfaChoiceTotp');
const mfaStep=document.getElementById('mfaStep');
const mfaCode=document.getElementById('mfaCode');
const mfaCodeLabel=document.getElementById('mfaCodeLabel');
const mfaHint=document.getElementById('mfaHint');
const mfaVerify=document.getElementById('mfaVerify');
const mfaBack=document.getElementById('mfaBack');
const mfaRecovery=document.getElementById('mfaRecovery');
const mfaRecoveryOpen=document.getElementById('mfaRecoveryOpen');
const mfaRecoveryPassword=document.getElementById('mfaRecoveryPassword');
const mfaRecoveryCode=document.getElementById('mfaRecoveryCode');
const mfaRecoverySubmit=document.getElementById('mfaRecoverySubmit');
const mfaRecoveryBack=document.getElementById('mfaRecoveryBack');
let pendingMfa=null;

if(ENTRY_PRODUCT==='senioren'){
  document.querySelectorAll('a[href="/registrieren"]').forEach(a=>a.href='/registrieren?produkt=senioren');
}
if(ENTRY_GUEST_HANDOFF&&ENTRY_NEXT){
  document.querySelectorAll('a[href="/registrieren"]').forEach(a=>a.href='/registrieren?source=web_guest_chat&next=%2Fpayg');
}
if(ENTRY_APP_HANDOFF){
  document.querySelectorAll('a[href="/registrieren"]').forEach(a=>a.href='/registrieren?produkt=senioren&next=app');
}
if(ENTRY_HQ_HANDOFF){
  document.querySelectorAll('a[href="/registrieren"]').forEach(a=>a.hidden=true);
}

const eye='<svg class="eye-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"></path><circle cx="12" cy="12" r="2.7"></circle></svg>';
const eyeOff='<svg class="eye-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m3 3 18 18"></path><path d="M10.7 6.1A10.8 10.8 0 0 1 12 6c6 0 9.5 6 9.5 6a16.3 16.3 0 0 1-2.2 2.8"></path><path d="M6.2 6.2C3.8 8 2.5 12 2.5 12s3.5 6 9.5 6a10 10 0 0 0 4.1-.9"></path><path d="M9.8 9.8A3.1 3.1 0 0 0 14.2 14.2"></path></svg>';

function show(msg,error=false){
  status.style.display='block';
  status.style.borderLeftColor=error?'#a84b4b':'var(--gold)';
  status.innerHTML=msg;
}

async function handoffToTarget(sessionToken,target){
  const hq=target==='hq';
  const expected=hq?/^https:\/\/hq\.stewaro\.com\/#handoff=/:/^https:\/\/app\.stewaro\.com\/#handoff=/;
  try{
    const res=await fetch(SESSION_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json',Authorization:'Bearer '+sessionToken},
      body:JSON.stringify({action:'handoff_create',target:hq?'hq':'app'}),
      cache:'no-store',
      credentials:'omit'
    });
    const body=await res.json().catch(()=>({}));
    if(!res.ok||body?.ok!==true||body?.status!=='handoff_ready'||!expected.test(String(body?.target_url||''))){
      throw new Error(String(body?.status||'handoff_create_failed'));
    }
    location.replace(String(body.target_url));
  }catch(error){
    if(hq){
      const aal2=String(error?.message||'')==='handoff_hq_aal2_required';
      show(aal2
        ?'<strong>Management HQ benötigt eine zusätzliche Bestätigung.</strong><br>Bitte aktiviere bzw. bestätige MFA für deinen STEWARO-Zugang.'
        :'<strong>Management HQ konnte gerade nicht sicher geöffnet werden.</strong><br>Deine Anmeldung bleibt aktiv; es wurde kein HQ-Zugang erstellt.',true);
      return;
    }
    show('<strong>FIDEL konnte gerade nicht geöffnet werden.</strong><br>Deine Anmeldung ist sicher aktiv. Öffne FIDEL bitte erneut aus deinem Konto.',true);
    setTimeout(()=>location.href='/konto',1800);
  }
}

function completeLogin(body){
  void window.NahwerkAnalytics?.track("login_complete", { funnel_name: "login", funnel_step: "complete" });
  if(!body||body.ok!==true||body.status!=='logged_in'||!body.session_token||body.mfa_required===true)return false;
  const productContext=body.product_context==='senioren'||body.brand==='senioren_concierge'?'senioren':body.product_context==='prime'||body.brand==='prime_concierge'?'prime':ENTRY_PRODUCT;
  const rememberMe=body.remember_me===true;
  const sessionPayload={
    session_token:body.session_token,
    customer_account_id:body.customer_account_id,
    person_id:body.person_id,
    role:body.role,
    expires_at:body.expires_at,
    idle_expires_at:body.idle_expires_at,
    remember_me:rememberMe,
    product_context:productContext
  };
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.setItem(SESSION_KEY,JSON.stringify(sessionPayload));
  if(rememberMe)localStorage.setItem(SESSION_KEY,JSON.stringify(sessionPayload));
  pendingMfa=null;
  if(ENTRY_HQ_HANDOFF){
    show('<strong>Erfolgreich angemeldet.</strong><br>Management HQ wird jetzt sicher geöffnet.');
    setTimeout(()=>void handoffToTarget(body.session_token,'hq'),120);
    return true;
  }
  if(ENTRY_APP_HANDOFF){
    show('<strong>Erfolgreich angemeldet.</strong><br>FIDEL wird jetzt sicher geöffnet.');
    setTimeout(()=>void handoffToTarget(body.session_token,'app'),120);
    return true;
  }
  show(ENTRY_NEXT==='/payg'
    ? '<strong>Erfolgreich angemeldet.</strong><br>Du wirst jetzt zu PAYG weitergeleitet und kannst Guthaben aufladen.'
    : '<strong>Erfolgreich angemeldet.</strong><br>Sie werden zum Kundenbereich weitergeleitet.');
  setTimeout(()=>location.href=ENTRY_NEXT||'/konto',400);
  return true;
}

function lockLoginForMfa(){
  passwordInput.value='';
  emailInput.readOnly=true;
  passwordInput.readOnly=true;
  submit.hidden=true;
  rememberInput.disabled=true;
}

function renderMfaChallenge(method,payload={}){
  const methods=Array.isArray(pendingMfa?.methods)?pendingMfa.methods:[method];
  pendingMfa={
    mfa_token:String(payload.mfa_token||pendingMfa?.mfa_token||''),
    factor_id:String(payload.factor_id||''),
    challenge_id:String(payload.challenge_id||''),
    method,
    methods
  };
  mfaChoice.hidden=true;
  mfaStep.hidden=false;
  mfaBack.hidden=methods.length<2;
  mfaCode.value='';
  if(method==='sms'){
    mfaCodeLabel.textContent='SMS-Code';
    mfaHint.textContent='Geben Sie den 6-stelligen Code ein, den wir an Ihre hinterlegte Mobilnummer gesendet haben.';
    const masked=String(payload.masked_phone||'');
    show('<strong>Zusätzliche Bestätigung erforderlich.</strong><br>Wir haben einen 6-stelligen SMS-Code'+(masked?' an '+masked:' an Ihre hinterlegte Mobilnummer')+' gesendet.');
  }else{
    mfaCodeLabel.textContent='Code aus der Authenticator-App';
    mfaHint.textContent='Geben Sie den 6-stelligen Code aus Ihrer Authenticator-App ein.';
    show('<strong>Zusätzliche Bestätigung erforderlich.</strong><br>Geben Sie jetzt den 6-stelligen Code aus Ihrer Authenticator-App ein.');
  }
  setTimeout(()=>mfaCode.focus(),0);
}

function showMfaChoice(){
  if(!pendingMfa)return;
  const methods=Array.isArray(pendingMfa.methods)?pendingMfa.methods:[];
  mfaRecovery.hidden=true;
  mfaStep.hidden=true;
  mfaChoiceSms.hidden=!methods.includes('sms');
  mfaChoiceTotp.hidden=!methods.includes('totp');
  mfaChoice.hidden=false;
  show('<strong>Zusätzliche Bestätigung erforderlich.</strong><br>Wählen Sie SMS-Code oder Authenticator-App.');
}

function enterMfa(body){
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  const mfa_token=String(body.mfa_token||'');
  const methods=(Array.isArray(body.mfa_methods)?body.mfa_methods:[body.mfa_method]).filter(m=>m==='sms'||m==='totp');
  const method=String(body.mfa_method||'');
  if(!mfa_token||!methods.length){
    pendingMfa=null;
    show('<strong>Die zusätzliche Bestätigung konnte nicht gestartet werden.</strong><br>Bitte versuchen Sie die Anmeldung erneut.',true);
    return;
  }
  lockLoginForMfa();
  pendingMfa={mfa_token,methods,method:method==='choice'?'choice':methods[0]};
  if(method==='choice'||methods.length>1){
    showMfaChoice();
    return;
  }
  const challenge_id=String(body.challenge_id||'');
  const factor_id=String(body.factor_id||'');
  if(!challenge_id||(methods[0]==='totp'&&!factor_id)){
    pendingMfa=null;
    show('<strong>Die zusätzliche Bestätigung konnte nicht gestartet werden.</strong><br>Bitte versuchen Sie die Anmeldung erneut.',true);
    return;
  }
  renderMfaChallenge(methods[0],body);
}

async function startMfaChallenge(method){
  if(!pendingMfa||!pendingMfa.mfa_token||!pendingMfa.methods.includes(method))return;
  mfaChoiceSms.disabled=true;
  mfaChoiceTotp.disabled=true;
  show('<strong>Bestätigung wird vorbereitet …</strong>');
  try{
    const res=await fetch(MFA_CHALLENGE_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({mfa_token:pendingMfa.mfa_token,mfa_method:method})
    });
    const body=await res.json().catch(()=>({}));
    if(res.ok&&body.ok===true&&body.status==='mfa_challenge_ready'){
      renderMfaChallenge(method,body);
      return;
    }
    if(res.status===401){
      pendingMfa=null;
      mfaChoice.hidden=true;
      emailInput.readOnly=false;
      passwordInput.readOnly=false;
      submit.hidden=false;
      rememberInput.disabled=false;
      show('<strong>Die Anmeldung ist abgelaufen.</strong><br>Bitte melden Sie sich erneut an.',true);
      return;
    }
    show('<strong>Die gewählte Bestätigung konnte gerade nicht gestartet werden.</strong><br>Bitte versuchen Sie es erneut.',true);
  }catch(_){
    show('<strong>Die Verbindung zur zusätzlichen Bestätigung konnte nicht hergestellt werden.</strong>',true);
  }finally{
    mfaChoiceSms.disabled=false;
    mfaChoiceTotp.disabled=false;
  }
}

async function verifyMfa(){
  if(!pendingMfa||pendingMfa.method==='choice')return;
  const code=mfaCode.value.replace(/\D/g,'').slice(0,6);
  mfaCode.value=code;
  if(code.length!==6){
    show('<strong>Bitte geben Sie den 6-stelligen Code ein.</strong>',true);
    mfaCode.focus();
    return;
  }
  mfaVerify.disabled=true;
  mfaVerify.textContent='Code wird geprüft …';
  show('<strong>Code wird geprüft …</strong>');
  try{
    const res=await fetch(MFA_VERIFY_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        mfa_token:pendingMfa.mfa_token,
        mfa_method:pendingMfa.method,
        factor_id:pendingMfa.factor_id,
        challenge_id:pendingMfa.challenge_id,
        code
      })
    });
    const body=await res.json().catch(()=>({}));
    if(res.ok&&body.mfa_verified===true&&completeLogin(body))return;
    if(res.status===401||body.status==='invalid_mfa'){
      show('<strong>Der Code ist nicht korrekt oder nicht mehr gültig.</strong><br>Bitte prüfen Sie den Code und versuchen Sie es erneut.',true);
      mfaCode.select();
      return;
    }
    if(res.status===429||body.status==='too_many_attempts'){
      show('<strong>Zu viele Versuche.</strong><br>Bitte warten Sie einige Minuten und versuchen Sie es anschließend erneut.',true);
      return;
    }
    show('<strong>Die zusätzliche Bestätigung ist momentan nicht möglich.</strong><br>Bitte versuchen Sie die Anmeldung erneut.',true);
  }catch(_){
    show('<strong>Die Verbindung zur zusätzlichen Bestätigung konnte nicht hergestellt werden.</strong><br>Bitte prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',true);
  }finally{
    mfaVerify.disabled=false;
    mfaVerify.textContent='Code bestätigen';
  }
}

document.querySelectorAll('[data-password-toggle]').forEach(btn=>{
  btn.addEventListener('click',()=>{
    const input=document.getElementById(btn.dataset.passwordToggle);
    const showPassword=input.type==='password';
    input.type=showPassword?'text':'password';
    btn.setAttribute('aria-label',showPassword?'Passwort ausblenden':'Passwort anzeigen');
    btn.title=showPassword?'Passwort ausblenden':'Passwort anzeigen';
    btn.innerHTML=showPassword?eyeOff:eye;
  });
});

mfaCode.addEventListener('input',()=>{
  mfaCode.value=mfaCode.value.replace(/\D/g,'').slice(0,6);
});
mfaVerify.addEventListener('click',verifyMfa);
mfaChoiceSms.addEventListener('click',()=>startMfaChallenge('sms'));
mfaChoiceTotp.addEventListener('click',()=>startMfaChallenge('totp'));
mfaBack.addEventListener('click',showMfaChoice);

mfaRecoveryOpen.addEventListener('click',()=>{
  if(!pendingMfa)return;
  mfaChoice.hidden=true;
  mfaStep.hidden=true;
  mfaRecovery.hidden=false;
  mfaRecoveryPassword.value='';
  mfaRecoveryCode.value='';
  show('<strong>Sichere MFA-Wiederherstellung.</strong><br>Geben Sie Ihr aktuelles Passwort und einen noch unbenutzten Wiederherstellungscode ein.');
  setTimeout(()=>mfaRecoveryPassword.focus(),0);
});

mfaRecoveryBack.addEventListener('click',()=>{
  mfaRecovery.hidden=true;
  if(Array.isArray(pendingMfa?.methods)&&pendingMfa.methods.length>1)showMfaChoice();
  else if(pendingMfa?.method)renderMfaChallenge(pendingMfa.method,pendingMfa);
});

mfaRecoveryCode.addEventListener('input',()=>{
  mfaRecoveryCode.value=mfaRecoveryCode.value.toUpperCase().replace(/[^A-Z0-9-]/g,'').slice(0,29);
});

mfaRecoverySubmit.addEventListener('click',async()=>{
  if(!pendingMfa)return;
  const password=mfaRecoveryPassword.value;
  const recovery_code=mfaRecoveryCode.value.trim().toUpperCase();
  if(!password||!/^NWRC-[A-HJ-NP-Z2-9]{5}(?:-[A-HJ-NP-Z2-9]{5}){3}$/.test(recovery_code)){
    show('<strong>Bitte Passwort und vollständigen Wiederherstellungscode eingeben.</strong>',true);
    return;
  }
  mfaRecoverySubmit.disabled=true;
  mfaRecoverySubmit.textContent='Wird geprüft …';
  show('<strong>Wiederherstellung wird sicher geprüft …</strong>');
  try{
    const res=await fetch(MFA_RECOVERY_CODE_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({email:emailInput.value.trim(),password,recovery_code})
    });
    const body=await res.json().catch(()=>({}));
    if(res.ok&&body?.ok===true&&body?.status==='mfa_recovery_completed'){
      pendingMfa=null;
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
      mfaRecovery.hidden=true;
      mfaChoice.hidden=true;
      mfaStep.hidden=true;
      emailInput.readOnly=false;
      passwordInput.readOnly=false;
      submit.hidden=false;
      rememberInput.disabled=false;
      passwordInput.value='';
      mfaRecoveryPassword.value='';
      mfaRecoveryCode.value='';
      show('<strong>MFA wurde sicher zurückgesetzt.</strong><br>Melden Sie sich jetzt erneut an. Danach müssen Sie sofort eine neue Zwei-Faktor-Methode einrichten.');
      return;
    }
    if(res.status===429||body?.status==='too_many_attempts'){
      show('<strong>Zu viele Wiederherstellungsversuche.</strong><br>Bitte warten Sie und versuchen Sie es später erneut.',true);
    }else{
      show('<strong>Wiederherstellung nicht möglich.</strong><br>Passwort oder Wiederherstellungscode sind ungültig.',true);
    }
  }catch(_){
    show('<strong>Die sichere Wiederherstellung ist momentan nicht erreichbar.</strong>',true);
  }finally{
    mfaRecoverySubmit.disabled=false;
    mfaRecoverySubmit.textContent='MFA sicher zurücksetzen';
  }
});

form.addEventListener('submit',async e=>{
  void window.NahwerkAnalytics?.track("login_start", { funnel_name: "login", funnel_step: "start" });
  e.preventDefault();
  if(pendingMfa){
    if(!mfaStep.hidden)await verifyMfa();
    return;
  }
  if(!form.reportValidity())return;
  submit.disabled=true;
  submit.textContent='Anmeldung läuft …';
  show('<strong>Anmeldung wird geprüft …</strong>');
  try{
    const res=await fetch(LOGIN_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({email:emailInput.value.trim(),password:passwordInput.value,remember_me:rememberInput.checked===true})
    });
    const body=await res.json().catch(()=>({}));
    if(res.ok&&(body.status==='mfa_required'||body.mfa_required===true)){
      enterMfa(body);
      return;
    }
    if(res.ok&&completeLogin(body))return;
    if(res.status===401||body.status==='invalid_credentials'){
      show('<strong>E-Mail-Adresse oder Passwort ist nicht korrekt.</strong>',true);
      return;
    }
    if(res.status===429){
      show('<strong>Zu viele Anmeldeversuche.</strong><br>Bitte warten Sie einige Minuten und versuchen Sie es erneut.',true);
      return;
    }
    show('<strong>Die Anmeldung ist momentan nicht möglich.</strong><br>Bitte versuchen Sie es später erneut.',true);
  }catch(_){
    show('<strong>Die Verbindung zum Login konnte nicht hergestellt werden.</strong><br>Bitte prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',true);
  }finally{
    submit.disabled=false;
    submit.textContent='Anmelden';
  }
});

forgot.addEventListener('click',async e=>{
  e.preventDefault();
  const email=emailInput.value.trim();
  if(!email){
    show('<strong>E-Mail-Adresse eingeben.</strong><br>Tragen Sie oben zuerst die E-Mail-Adresse Ihres Kontos ein und klicken Sie anschließend erneut auf „Passwort vergessen?“.',true);
    emailInput.focus();
    return;
  }
  forgot.style.pointerEvents='none';
  show('<strong>Reset-Link wird angefordert …</strong>');
  try{
    await fetch(RESET_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});
    show('<strong>Bitte prüfen Sie Ihr E-Mail-Postfach.</strong><br>Wenn für diese Adresse ein Konto besteht, wurde ein Link zum Zurücksetzen des Passworts versendet. Prüfen Sie gegebenenfalls auch den Spam-Ordner.');
  }catch(_){
    show('<strong>Die Reset-Anfrage konnte momentan nicht gesendet werden.</strong><br>Bitte versuchen Sie es später erneut.',true);
  }finally{
    forgot.style.pointerEvents='auto';
  }
});
})();