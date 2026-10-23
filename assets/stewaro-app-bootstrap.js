(() => {
  "use strict";
  const APP_HOST="app.stewaro.com";
  // Old Account-hosted chat URLs now enter through a real cross-origin session handoff.
  if(location.hostname==="account.stewaro.com"){
    if(location.origin!=="https://account.stewaro.com")return;
    const path=location.pathname.replace(/\/index\.html$/,"").replace(/\/+$/,"");
    if(path==="/web-concierge"||path==="/web-concierge.html")location.replace("/konto?stewaro_app=1");
    return;
  }
  if(location.hostname!==APP_HOST)return;

  // Other shared FIDEL modules require this gate even on an invalid origin.
  window.STEWARO_APP_AUTH_READY=Promise.resolve(false);
  if(location.origin!=="https://app.stewaro.com")return;

  const SESSION_KEY="scb_web_session";
  const SESSION_URL="https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/web-session-secure";
  const ACCOUNT_LOGIN="https://account.stewaro.com/anmelden?produkt=senioren&next=app";
  const SITE_ORIGIN="https://stewaro.com";
  const ACCOUNT_ORIGIN="https://account.stewaro.com";
  const ACCOUNT_SESSION_TRANSFER=ACCOUNT_ORIGIN+"/konto?stewaro_app=1";

  document.documentElement.dataset.stewaroApp="1";
  const style=document.createElement("style");
  style.textContent=`
    html[data-stewaro-app="1"] body.web-concierge-page>footer.footer{display:none!important}
    html[data-stewaro-app="1"] body.web-concierge-page header.top .links{display:none!important}
    html[data-stewaro-app="1"] body.web-concierge-page .web-concierge-shell{padding-bottom:max(18px,env(safe-area-inset-bottom))!important}
    html[data-stewaro-app="1"] body.web-concierge-page .web-concierge-pagebar{max-width:none!important}
  `;
  document.head.appendChild(style);

  function readSession(){
    try{
      const active=JSON.parse(sessionStorage.getItem(SESSION_KEY)||"null");
      if(active?.session_token)return active;
    }catch{}
    try{
      const remembered=JSON.parse(localStorage.getItem(SESSION_KEY)||"null");
      if(remembered?.session_token&&remembered?.remember_me===true){
        sessionStorage.setItem(SESSION_KEY,JSON.stringify(remembered));
        return remembered;
      }
    }catch{}
    return null;
  }

  function saveSession(body){
    const payload={
      session_token:String(body.session_token||""),
      customer_account_id:String(body.customer_account_id||""),
      person_id:String(body.person_id||""),
      role:String(body.role||"client"),
      expires_at:body.expires_at||null,
      idle_expires_at:body.idle_expires_at||null,
      remember_me:body.remember_me===true,
      product_context:"senioren"
    };
    const future=value=>typeof value==="string"&&Number.isFinite(Date.parse(value))&&Date.parse(value)>Date.now();
    if(!payload.session_token||!payload.person_id||!payload.customer_account_id
       ||!future(payload.expires_at)||!future(payload.idle_expires_at)){
      throw new Error("session_payload_invalid");
    }
    sessionStorage.setItem(SESSION_KEY,JSON.stringify(payload));
    if(payload.remember_me)localStorage.setItem(SESSION_KEY,JSON.stringify(payload));
    else localStorage.removeItem(SESSION_KEY);
  }


  // A bounded identity request must settle even in older Safari versions.
  // A late response may never restore a session after the deadline.
  function authRequest(token,action){
    const controller=typeof AbortController==="function"?new AbortController():null;
    let timer,expired=false,request;
    try{
      request=Promise.resolve(fetch(SESSION_URL,{
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},
        body:JSON.stringify({action}),
        cache:"no-store",
        credentials:"omit",
        ...(controller?{signal:controller.signal}:{})
      })).then(async(response)=>{
        const body=await response.json().catch(()=>({}));
        if(expired)throw new Error("auth_timeout");
        return {response,body};
      });
    }catch(error){request=Promise.reject(error);}
    const timeout=new Promise((_,reject)=>{
      timer=setTimeout(()=>{
        expired=true;
        try{controller?.abort()}catch{}
        reject(new Error("auth_timeout"));
      },8000);
    });
    return Promise.race([request,timeout]).finally(()=>clearTimeout(timer));
  }

  function accountLogin(){
    location.replace(ACCOUNT_LOGIN);
  }

  const params=new URLSearchParams(location.hash.replace(/^#/,""));
  const handoffValues=params.getAll("handoff");
  const handoff=String(handoffValues[0]||"");
  if(params.has("handoff")){
    // Remove a prior identity before other auth modules can restore or use it.
    // The only next active session is the result of this one-time claim.
    try{sessionStorage.removeItem(SESSION_KEY)}catch{}
    try{localStorage.removeItem(SESSION_KEY)}catch{}
    // A browser that refuses fragment removal must never claim the token.
    try{history.replaceState(null,"",location.pathname+location.search)}catch{accountLogin();return;}
    const valid=handoffValues.length===1&&[...params.keys()].every(key=>key==="handoff")&&/^hnd_[A-Za-z0-9_-]{40,120}$/.test(handoff);
    if(!valid){window.STEWARO_APP_AUTH_READY=Promise.resolve(false);accountLogin();return;}

    document.documentElement.classList.add("stewaro-app-claiming");
    const shield=document.createElement("style");
    shield.id="stewaro-app-claim-shield";
    shield.textContent="html.stewaro-app-claiming body{visibility:hidden!important}";
    document.head.appendChild(shield);

    // Only the current one-time claim may establish a new App identity.
    // A logout, new login or another auth gate supersedes this request.
    const claimGate=authRequest(handoff,"handoff_claim").then(({response,body})=>{
      if(window.STEWARO_APP_AUTH_READY!==claimGate||readSession()?.session_token)return false;
      if(!response.ok||body?.ok!==true||body?.status!=="handoff_claimed"||!body?.session_token){
        throw new Error(String(body?.status||"handoff_claim_failed"));
      }
      saveSession(body);
      location.replace(location.pathname+location.search);
      return false;
    }).catch(()=>{
      // A stale rejection must not clear or redirect a newer authenticated user.
      if(window.STEWARO_APP_AUTH_READY!==claimGate||readSession()?.session_token)return false;
      try{sessionStorage.removeItem(SESSION_KEY)}catch{}
      try{localStorage.removeItem(SESSION_KEY)}catch{}
      accountLogin();
      return false;
    });
    window.STEWARO_APP_AUTH_READY=claimGate;
    return;
  }

  const currentSession=readSession();
  if(!currentSession){
    window.STEWARO_APP_AUTH_READY=Promise.resolve(false);
    // Ask the signed-in Account host to issue a scoped one-time App handoff.
    // An anonymous Account visitor will be sent to the existing app-aware login.
    location.replace(ACCOUNT_SESSION_TRANSFER);
    return;
  }

  // Browser storage alone is not authentication. Block the App runtime until
  // the existing session authority confirms identity and both expirations.
  // Bind each async validation to its original local session and active gate.
  // A logout or a newer login must not be undone by a late network response.
  const authGate=authRequest(currentSession.session_token,"check").then(({response,body})=>{
    const validDate=value=>typeof value==="string"&&Number.isFinite(Date.parse(value))&&Date.parse(value)>Date.now();
    if(!response.ok||body?.ok!==true||body?.status!=="session_valid"
       ||!currentSession.person_id||!currentSession.customer_account_id
       ||String(body.person_id||"")!==String(currentSession.person_id)
       ||String(body.customer_account_id||"")!==String(currentSession.customer_account_id)
       ||!validDate(body.expires_at)||!validDate(body.idle_expires_at)){
      throw new Error("session_check_failed");
    }
    const active=readSession();
    if(window.STEWARO_APP_AUTH_READY!==authGate
       ||String(active?.session_token||"")!==String(currentSession.session_token)
       ||String(active?.person_id||"")!==String(currentSession.person_id)
       ||String(active?.customer_account_id||"")!==String(currentSession.customer_account_id)){
      return false;
    }
    saveSession({...currentSession,expires_at:body.expires_at,idle_expires_at:body.idle_expires_at});
    return true;
  }).catch(()=>{
    // A superseded validation must never delete a newer login or redirect it.
    if(window.STEWARO_APP_AUTH_READY!==authGate)return false;
    const active=readSession();
    if(active?.session_token&&String(active.session_token)!==String(currentSession.session_token))return false;
    try{sessionStorage.removeItem(SESSION_KEY)}catch{}
    try{localStorage.removeItem(SESSION_KEY)}catch{}
    accountLogin();
    return false;
  });
  window.STEWARO_APP_AUTH_READY=authGate;

  // A restored Safari tab must not expose an expired locally cached identity.
  // The existing server remains authoritative for session validity.
  let resumeRedirecting=false;
  function checkResumedExpiry(){
    if(document.visibilityState==="hidden"||resumeRedirecting)return;
    window.STEWARO_APP_AUTH_READY.then((ready)=>{
      if(ready!==true||resumeRedirecting)return;
      const session=readSession();
      const unexpired=value=>typeof value==="string"&&Number.isFinite(Date.parse(value))&&Date.parse(value)>Date.now();
      if(session?.session_token&&unexpired(session.expires_at)&&unexpired(session.idle_expires_at))return;
      resumeRedirecting=true;
      try{sessionStorage.removeItem(SESSION_KEY)}catch{}
      try{localStorage.removeItem(SESSION_KEY)}catch{}
      accountLogin();
    }).catch(()=>{});
  }
  // Safari's back-forward cache restores JS state without a fresh login.
  // Hide personal UI before caching and revalidate with the existing authority.
  let restoredValidation=null;
  let cachedShellWasVisible=false;
  addEventListener("pagehide",(event)=>{
    if(event?.persisted!==true)return;
    const shell=document.getElementById("stewaroAppShell");
    cachedShellWasVisible=Boolean(shell&&!shell.hidden);
    if(shell)shell.hidden=true;
  });
  function onPageShow(event){
    if(event?.persisted!==true){checkResumedExpiry();return;}
    if(resumeRedirecting||restoredValidation)return;
    const shell=document.getElementById("stewaroAppShell");
    const revealAfterCheck=cachedShellWasVisible||Boolean(shell&&!shell.hidden);
    if(shell)shell.hidden=true;
    cachedShellWasVisible=false;
    const saved=readSession();
    const future=value=>typeof value==="string"&&Number.isFinite(Date.parse(value))&&Date.parse(value)>Date.now();
    if(!saved?.session_token||!future(saved.expires_at)||!future(saved.idle_expires_at)){
      resumeRedirecting=true;
      try{sessionStorage.removeItem(SESSION_KEY)}catch{}
      try{localStorage.removeItem(SESSION_KEY)}catch{}
      accountLogin();
      return;
    }
    const priorGate=window.STEWARO_APP_AUTH_READY;
    const check=Promise.resolve(priorGate).then(async(ready)=>{
      if(ready!==true)throw new Error("resume_unready");
      const {response,body}=await authRequest(saved.session_token,"check");
      if(window.STEWARO_APP_AUTH_READY!==check)return false;
      const active=readSession();
      if(!active||active.session_token!==saved.session_token
         ||active.person_id!==saved.person_id
         ||active.customer_account_id!==saved.customer_account_id)return false;
      if(!response.ok||body?.ok!==true||body?.status!=="session_valid"
         ||String(body.person_id||"")!==String(saved.person_id)
         ||String(body.customer_account_id||"")!==String(saved.customer_account_id)
         ||!future(body.expires_at)||!future(body.idle_expires_at))throw new Error("resume_invalid");
      saveSession({...active,expires_at:body.expires_at,idle_expires_at:body.idle_expires_at});
      if(shell&&revealAfterCheck)shell.hidden=false;
      return true;
    }).catch(()=>{
      if(window.STEWARO_APP_AUTH_READY!==check)return false;
      const active=readSession();
      if(active?.session_token&&active.session_token!==saved.session_token)return false;
      resumeRedirecting=true;
      try{sessionStorage.removeItem(SESSION_KEY)}catch{}
      try{localStorage.removeItem(SESSION_KEY)}catch{}
      accountLogin();
      return false;
    }).finally(()=>{if(restoredValidation===check)restoredValidation=null;});
    restoredValidation=check;
    window.STEWARO_APP_AUTH_READY=check;
  }
  addEventListener("pageshow",onPageShow);
  addEventListener("focus",checkResumedExpiry);
  document.addEventListener?.("visibilitychange",checkResumedExpiry);

  addEventListener("DOMContentLoaded",()=>{
    document.querySelectorAll("header.top a.brand,footer a.brand").forEach((link)=>{
      if(link instanceof HTMLAnchorElement)link.href=SITE_ORIGIN;
    });
    const back=document.querySelector(".web-concierge-back");
    if(back instanceof HTMLAnchorElement){
      back.href=ACCOUNT_ORIGIN+"/konto";
      back.textContent="Konto";
    }
  },{once:true});
})();
