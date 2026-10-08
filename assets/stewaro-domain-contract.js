(()=>{
  "use strict";

  const PUBLIC_ORIGIN="https://stewaro.com";
  const ACCOUNT_ORIGIN="https://account.stewaro.com";
  const APP_ORIGIN="https://app.stewaro.com";
  const SESSION_KEY="scb_web_session";
  const SESSION_URL="https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/web-session-secure";

  const publicHosts=new Set(["stewaro.com","www.stewaro.com"]);
  const accountHost="account.stewaro.com";
  const explicitAccountPaths=new Set([
    "/zugang","/anmelden","/registrieren","/konto","/concierge-anpassen",
    "/payg","/telefonate","/zugang-uebertragen","/passwort-zuruecksetzen",
    "/email-concierge"
  ]);
  const sessionMigrationPaths=new Set([
    "/","/konto","/concierge-anpassen","/payg","/telefonate",
    "/zugang-uebertragen","/email-concierge"
  ]);
  const publicPrefixes=[
    "/de","/prime-concierge","/concierges","/safety","/digitaler-schutz",
    "/angehoerige","/leistungen","/kontakt","/pakete","/faq","/ablauf",
    "/impressum","/datenschutz","/agb","/widerruf","/ki-transparenz","/datenloeschung"
  ];

  const cleanPath=(value)=>{
    let p=String(value||"/").replace(/\/index\.html$/,"/").replace(/\.html$/,"");
    if(p.length>1)p=p.replace(/\/+$/,"");
    return p||"/";
  };
  const currentPath=cleanPath(location.pathname);
  const accountPath=(path)=>ACCOUNT_ORIGIN+(path==="/zugang"?"/":path);
  const publicPath=(path)=>PUBLIC_ORIGIN+path;
  const safeAccountNext=(value)=>{
    const p=cleanPath(value||"/konto");
    if(p==="/"||explicitAccountPaths.has(p))return p==="/zugang"?"/":p;
    return "/konto";
  };

  function readSession(){
    for(const storage of [sessionStorage,localStorage]){
      try{
        const parsed=JSON.parse(storage.getItem(SESSION_KEY)||"null");
        if(parsed?.session_token)return parsed;
      }catch(_){}
    }
    return null;
  }

  function storeSession(body){
    if(!body?.session_token)return false;
    const payload={
      session_token:body.session_token,
      customer_account_id:body.customer_account_id,
      person_id:body.person_id,
      role:body.role,
      auth_level:body.auth_level,
      expires_at:body.expires_at,
      idle_expires_at:body.idle_expires_at,
      remember_me:body.remember_me===true,
      product_context:body.product_context||"senioren"
    };
    sessionStorage.setItem(SESSION_KEY,JSON.stringify(payload));
    if(payload.remember_me)localStorage.setItem(SESSION_KEY,JSON.stringify(payload));
    else localStorage.removeItem(SESSION_KEY);
    return true;
  }

  async function claimAccountHandoff(){
    if(location.hostname!==accountHost)return true;
    const hash=new URLSearchParams(location.hash.replace(/^#/,""));
    const token=String(hash.get("handoff")||"");
    if(!token)return true;
    const next=safeAccountNext(new URLSearchParams(location.search).get("next"));
    try{
      const response=await fetch(SESSION_URL,{
        method:"POST",
        headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},
        body:JSON.stringify({action:"handoff_claim"}),
        cache:"no-store",
        credentials:"omit"
      });
      const body=await response.json().catch(()=>({}));
      if(!response.ok||body?.ok!==true||body?.status!=="handoff_claimed"||!storeSession(body)){
        history.replaceState({},"", "/anmelden?source=account_handoff_failed");
        location.replace("/anmelden?source=account_handoff_failed");
        return false;
      }
      history.replaceState({},"",next);
      location.replace(next);
      return false;
    }catch(_){
      history.replaceState({},"","/anmelden?source=account_handoff_retry");
      location.replace("/anmelden?source=account_handoff_retry");
      return false;
    }
  }

  async function migrateRememberedSession(targetPath){
    const session=readSession();
    if(!session?.session_token)return false;
    try{
      const response=await fetch(SESSION_URL,{
        method:"POST",
        headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.session_token},
        body:JSON.stringify({action:"handoff_create",target:"account"}),
        cache:"no-store",
        credentials:"omit"
      });
      const body=await response.json().catch(()=>({}));
      if(!response.ok||body?.ok!==true||body?.status!=="handoff_ready")return false;
      const target=new URL(String(body.target_url||""));
      if(target.origin!==ACCOUNT_ORIGIN||!target.hash.startsWith("#handoff="))return false;
      const next=safeAccountNext(targetPath);
      location.replace(ACCOUNT_ORIGIN+"/?next="+encodeURIComponent(next)+target.hash);
      return true;
    }catch(_){
      return false;
    }
  }

  async function movePublicAccountRoute(){
    if(!publicHosts.has(location.hostname)||!explicitAccountPaths.has(currentPath))return false;
    const target=currentPath==="/zugang"?"/":currentPath;
    if(await migrateRememberedSession(target))return true;
    location.replace(accountPath(currentPath)+location.search+location.hash);
    return true;
  }

  function moveAccountPublicRoute(){
    if(location.hostname!==accountHost)return false;
    if(currentPath==="/"||explicitAccountPaths.has(currentPath))return false;
    if(publicPrefixes.some(prefix=>currentPath===prefix||currentPath.startsWith(prefix+"/"))){
      location.replace(publicPath(location.pathname)+location.search+location.hash);
      return true;
    }
    return false;
  }

  function rewriteLinks(){
    document.querySelectorAll("a[href]").forEach((link)=>{
      const raw=link.getAttribute("href");
      if(!raw||raw.startsWith("#")||raw.startsWith("mailto:")||raw.startsWith("tel:")||raw.startsWith("http://")||raw.startsWith("https://"))return;
      let parsed;
      try{parsed=new URL(raw,location.origin);}catch(_){return;}
      const p=cleanPath(parsed.pathname);
      if(explicitAccountPaths.has(p)){
        const dest=p==="/zugang"?"/":parsed.pathname;
        link.href=ACCOUNT_ORIGIN+dest+parsed.search+parsed.hash;
        return;
      }
      if(p==="/web-concierge"||p.startsWith("/web-concierge/")){
        link.href=APP_ORIGIN+parsed.pathname+parsed.search+parsed.hash;
        return;
      }
      if(location.hostname===accountHost&&(p==="/de"||publicPrefixes.some(prefix=>p===prefix||p.startsWith(prefix+"/")))){
        link.href=PUBLIC_ORIGIN+parsed.pathname+parsed.search+parsed.hash;
      }
    });
  }

  document.addEventListener("click",(event)=>{
    if(!publicHosts.has(location.hostname)||event.defaultPrevented)return;
    const anchor=event.target instanceof Element?event.target.closest("a[href]"):null;
    if(!(anchor instanceof HTMLAnchorElement)||anchor.target==="_blank"||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    let url;
    try{url=new URL(anchor.href,location.href);}catch(_){return;}
    const p=cleanPath(url.pathname);
    const accountDestination=url.origin===ACCOUNT_ORIGIN;
    const legacyPublicAccountRoute=publicHosts.has(url.hostname)&&explicitAccountPaths.has(p);
    if(!accountDestination&&!legacyPublicAccountRoute)return;
    const migrationPath=p==="/"||p==="/zugang"||p==="/anmelden"||p==="/registrieren"?"/konto":p;
    if(!sessionMigrationPaths.has(migrationPath)||!readSession()?.session_token)return;
    event.preventDefault();
    void migrateRememberedSession(migrationPath).then((migrated)=>{
      if(!migrated)location.href=accountDestination?url.href:accountPath(p)+url.search+url.hash;
    });
  },true);

  window.STEWARO_DOMAINS=Object.freeze({
    publicOrigin:PUBLIC_ORIGIN,
    accountOrigin:ACCOUNT_ORIGIN,
    appOrigin:APP_ORIGIN,
    accountUrl:(path="/")=>ACCOUNT_ORIGIN+path,
    publicUrl:(path="/")=>PUBLIC_ORIGIN+path,
    appUrl:(path="/")=>APP_ORIGIN+path
  });

  if(moveAccountPublicRoute())return;
  window.STEWARO_ACCOUNT_AUTH_READY=claimAccountHandoff();
  void movePublicAccountRoute();
  document.addEventListener("DOMContentLoaded",rewriteLinks,{once:true});
})();