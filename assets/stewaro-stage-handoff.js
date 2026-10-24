(() => {
  "use strict";
  // CloudFront STAGING only. Platform draft #1231 was not readable here (private repo 404).
  // Adjust STAGE_HANDOFF_CONTRACT if that server uses different field names.
  // create: POST {action:"handoff_create"} with the STAGING access token.
  //         expect {ok:true,status:"handoff_ready",handoff:"hnd_…"}
  //         target_url is followed only when its host is this page's host.
  // claim:  POST {action:"handoff_claim",handoff:"hnd_…"} with that one-time token.
  //         expect {ok:true,status:"handoff_claimed"}
  //         replay: {ok:false,status:"handoff_replay_denied"}
  // claimBearer: "handoff" sends the one-time token. Set "session" if the function
  // requires the STAGING access token instead.
  if(location.hostname!=="d2h3bbcracss71.cloudfront.net")return;
  const STAGE_HANDOFF_CONTRACT={
    endpoint:"https://btqklftjmwtqqqdmwlnk.supabase.co/functions/v1/nahwerk-email-runtime-staging/stage-handoff",
    createAction:"handoff_create",
    claimAction:"handoff_claim",
    readyStatus:"handoff_ready",
    claimedStatus:"handoff_claimed",
    deniedStatus:"handoff_replay_denied",
    tokenField:"handoff",
    claimBearer:"handoff"
  };
  const TOKEN=/^hnd_[A-Za-z0-9_-]{40,120}$/;
  const PUBLISHABLE="sb_publishable_onbKIoe0eb9hgsYC2UeYzw_qttxclvj";
  const STORE="stewaro_stage_auth_session_v1";
  const LOCKED="FIDEL-Sprachgespräche sind noch gesperrt.";
  const status=document.getElementById("webConciergeStatus");
  const outcome=document.getElementById("stewaroStageResult");
  const form=document.getElementById("stewaroStageAuthForm");
  const panel=document.querySelector(".stewaro-stage-auth");
  let started=false;

  function report(text){if(outcome)outcome.textContent=text;}
  function mark(state){panel?.setAttribute("data-stage-handoff",state);}
  function sessionToken(){
    try{
      const saved=JSON.parse(sessionStorage.getItem(STORE)||"null");
      return typeof saved?.token==="string"?saved.token:"";
    }catch{return "";}
  }
  function tokenFrom(body){
    const direct=String(body?.[STAGE_HANDOFF_CONTRACT.tokenField]||body?.handoff_token||"");
    if(TOKEN.test(direct))return direct;
    try{
      const url=new URL(String(body?.target_url||""));
      if(url.protocol!=="https:"||url.hostname!==location.hostname)return "";
      const value=new URLSearchParams(url.hash.replace(/^#/,"")).get("handoff")||"";
      return TOKEN.test(value)?value:"";
    }catch{return "";}
  }
  function openUrl(body,token){
    const fallback=location.origin+location.pathname+location.search+"#handoff="+encodeURIComponent(token);
    try{
      const url=new URL(String(body?.target_url||""));
      if(url.protocol!=="https:"||url.hostname!==location.hostname)return fallback;
      const value=new URLSearchParams(url.hash.replace(/^#/,"")).get("handoff")||"";
      return value===token?url.toString():fallback;
    }catch{return fallback;}
  }
  function ready(response,body){
    return !!response?.ok&&body?.ok!==false&&String(body?.status||"")===STAGE_HANDOFF_CONTRACT.readyStatus&&!!tokenFrom(body);
  }
  function claimed(response,body){
    return !!response?.ok&&body?.ok!==false&&String(body?.status||"")===STAGE_HANDOFF_CONTRACT.claimedStatus;
  }
  async function post(payload,bearer){
    const response=await fetch(STAGE_HANDOFF_CONTRACT.endpoint,{
      method:"POST",cache:"no-store",credentials:"omit",
      headers:{apikey:PUBLISHABLE,"content-type":"application/json",Authorization:"Bearer "+bearer},
      body:JSON.stringify(payload)
    });
    const body=await response.json().catch(()=>({}));
    return {response,body};
  }
  function showClaimed(){
    mark("claimed");
    if(form)form.hidden=true;
    if(status)status.textContent="STAGING · Übergabe einmalig bestätigt · Gespräche gesperrt";
    report("STAGING-Übergabe bestätigt. Dieser Link ist verbraucht. "+LOCKED);
  }
  function showDenied(replay){
    mark("denied");
    if(status)status.textContent="STAGING · Übergabe abgelehnt";
    report(replay
      ?"STAGING-Übergabe abgelehnt. Dieser Einmal-Link wurde bereits verwendet. "+LOCKED
      :"STAGING-Übergabe abgelehnt. Dieser Einmal-Link ist ungültig. "+LOCKED);
  }
  async function create(session){
    if(started||!session)return;
    started=true;
    try{
      const {response,body}=await post({action:STAGE_HANDOFF_CONTRACT.createAction},session);
      const token=tokenFrom(body);
      if(!ready(response,body)||!token){
        report("STAGING-Anmeldung bestätigt. Die einmalige App-Übergabe ist derzeit nicht verfügbar. "+LOCKED);
        return;
      }
      location.replace(openUrl(body,token));
    }catch{
      report("STAGING-Anmeldung bestätigt. Die einmalige App-Übergabe ist derzeit nicht erreichbar. "+LOCKED);
    }
  }
  async function claim(token){
    if(started)return;
    started=true;
    history.replaceState(null,"",location.pathname+location.search);
    if(!TOKEN.test(token)){showDenied(false);return;}
    const bearer=STAGE_HANDOFF_CONTRACT.claimBearer==="session"&&sessionToken()?sessionToken():token;
    try{
      const {response,body}=await post({
        action:STAGE_HANDOFF_CONTRACT.claimAction,
        [STAGE_HANDOFF_CONTRACT.tokenField]:token
      },bearer);
      if(claimed(response,body)){showClaimed();return;}
      showDenied(String(body?.status||"")===STAGE_HANDOFF_CONTRACT.deniedStatus);
    }catch{showDenied(false);}
  }
  window.addEventListener("stewaro:stage-session",(event)=>{
    window.STEWARO_STAGE_HANDOFF=create(String(event?.detail?.token||""));
  });
  const incoming=new URLSearchParams(location.hash.replace(/^#/,"")).get("handoff")||"";
  if(incoming)window.STEWARO_STAGE_HANDOFF=claim(incoming);
})();
