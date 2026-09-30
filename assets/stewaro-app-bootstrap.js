(() => {
  "use strict";
  const APP_HOST="app.stewaro.com";
  if(location.hostname!==APP_HOST)return;

  window.STEWARO_APP_AUTH_READY=Promise.resolve(true);

  const SESSION_KEY="scb_web_session";
  const SESSION_URL="https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/web-session-secure";
  const ACCOUNT_LOGIN="https://account.stewaro.com/anmelden?produkt=senioren&next=app";
  const SITE_ORIGIN="https://stewaro.com";
  const ACCOUNT_ORIGIN="https://account.stewaro.com";

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

  function accountLogin(){
    location.replace(ACCOUNT_LOGIN);
  }

  const params=new URLSearchParams(location.hash.replace(/^#/,""));
  const handoff=String(params.get("handoff")||"");
  if(handoff){
    // Remove a prior identity before other auth modules can restore or use it.
    // The only next active session is the result of this one-time claim.
    try{sessionStorage.removeItem(SESSION_KEY)}catch{}
    try{localStorage.removeItem(SESSION_KEY)}catch{}
    history.replaceState(null,"",location.pathname+location.search);
    const valid=/^hnd_[A-Za-z0-9_-]{40,120}$/.test(handoff);
    if(!valid){window.STEWARO_APP_AUTH_READY=Promise.resolve(false);accountLogin();return;}

    document.documentElement.classList.add("stewaro-app-claiming");
    const shield=document.createElement("style");
    shield.id="stewaro-app-claim-shield";
    shield.textContent="html.stewaro-app-claiming body{visibility:hidden!important}";
    document.head.appendChild(shield);

    window.STEWARO_APP_AUTH_READY=fetch(SESSION_URL,{
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":"Bearer "+handoff},
      body:JSON.stringify({action:"handoff_claim"}),
      cache:"no-store",
      credentials:"omit"
    }).then(async(response)=>{
      const body=await response.json().catch(()=>({}));
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

  if(!readSession()){
    window.STEWARO_APP_AUTH_READY=Promise.resolve(false);
    accountLogin();
    return;
  }

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
