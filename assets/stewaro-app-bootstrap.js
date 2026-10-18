(() => {
  "use strict";
  const APP_HOST="app.stewaro.com";
  // Old Account-hosted chat URLs now enter through a real cross-origin session handoff.
  if(location.hostname==="account.stewaro.com"){
    const path=location.pathname.replace(/\/index\.html$/,"").replace(/\/+$/,"");
    if(path==="/web-concierge"||path==="/web-concierge.html")location.replace("/konto?stewaro_app=1");
    return;
  }
  if(location.hostname!==APP_HOST)return;

  window.STEWARO_APP_AUTH_READY=Promise.resolve(false);

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
    if(!payload.session_token)throw new Error("session_token_missing");
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
    history.replaceState(null,"",location.pathname+location.search);
    const valid=handoffValues.length===1&&[...params.keys()].every(key=>key==="handoff")&&/^hnd_[A-Za-z0-9_-]{40,120}$/.test(handoff);
    if(!valid){window.STEWARO_APP_AUTH_READY=Promise.resolve(false);accountLogin();return;}

    document.documentElement.classList.add("stewaro-app-claiming");
    const shield=document.createElement("style");
    shield.id="stewaro-app-claim-shield";
    shield.textContent="html.stewaro-app-claiming body{visibility:hidden!important}";
    document.head.appendChild(shield);

    window.STEWARO_APP_AUTH_READY=authRequest(handoff,"handoff_claim").then(({response,body})=>{
      if(!response.ok||body?.ok!==true||body?.status!=="handoff_claimed"||!body?.session_token){
        throw new Error(String(body?.status||"handoff_claim_failed"));
      }
      saveSession(body);
      location.replace(location.pathname+location.search);
      return false;
    }).catch(()=>{
      try{sessionStorage.removeItem(SESSION_KEY)}catch{}
      try{localStorage.removeItem(SESSION_KEY)}catch{}
      accountLogin();
      return false;
    });
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
  window.STEWARO_APP_AUTH_READY=authRequest(currentSession.session_token,"check").then(({response,body})=>{
    const validDate=value=>typeof value==="string"&&Number.isFinite(Date.parse(value))&&Date.parse(value)>Date.now();
    if(!response.ok||body?.ok!==true||body?.status!=="session_valid"
       ||!currentSession.person_id||!currentSession.customer_account_id
       ||String(body.person_id||"")!==String(currentSession.person_id)
       ||String(body.customer_account_id||"")!==String(currentSession.customer_account_id)
       ||!validDate(body.expires_at)||!validDate(body.idle_expires_at)){
      throw new Error("session_check_failed");
    }
    saveSession({...currentSession,expires_at:body.expires_at,idle_expires_at:body.idle_expires_at});
    return true;
  }).catch(()=>{
    try{sessionStorage.removeItem(SESSION_KEY)}catch{}
    try{localStorage.removeItem(SESSION_KEY)}catch{}
    accountLogin();
    return false;
  });

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
