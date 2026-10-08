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

  function readSession(){
    for(const storage of [sessionStorage,localStorage]){
      try{
        const parsed=JSON.parse(storage.getItem(SESSION_KEY)||"null");
        if(parsed?.session_token)return parsed;
      }catch(_){}
    }
    return null;
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
      const target=String(body.target_url||"");
      if(!target.startsWith(ACCOUNT_ORIGIN+"/#handoff="))return false;
      const join=target.includes("?")?"&":"?";
      location.replace(target+join+"next="+encodeURIComponent(targetPath||"/konto"));
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

  window.STEWARO_DOMAINS=Object.freeze({
    publicOrigin:PUBLIC_ORIGIN,
    accountOrigin:ACCOUNT_ORIGIN,
    appOrigin:APP_ORIGIN,
    accountUrl:(path="/")=>ACCOUNT_ORIGIN+path,
    publicUrl:(path="/")=>PUBLIC_ORIGIN+path,
    appUrl:(path="/")=>APP_ORIGIN+path
  });

  if(moveAccountPublicRoute())return;
  void movePublicAccountRoute();
  document.addEventListener("DOMContentLoaded",rewriteLinks,{once:true});
})();