// STEWARO_CLIENT_CALL_JOIN_V1_20261007
const DEFAULT_GATEWAY="https://ta832v8wah.execute-api.eu-central-1.amazonaws.com/prod/v1/web";

function text(v,n=300){return String(v??"").trim().slice(0,n)}
function param(call,key){
  try{return text(call?.customParameters?.get?.(key),120)}catch{return ""}
}
function makeSurface(){
  let root=document.getElementById("stewaroClientCallJoin");
  if(root)return root;
  root=document.createElement("section");
  root.id="stewaroClientCallJoin";
  root.className="stewaro-client-call-join";
  root.hidden=true;
  root.setAttribute("role","dialog");
  root.setAttribute("aria-modal","true");
  root.setAttribute("aria-labelledby","stewaroClientCallJoinTitle");
  root.innerHTML=`
    <div class="stewaro-client-call-join-card">
      <div class="stewaro-client-call-join-mark" aria-hidden="true">S</div>
      <p class="stewaro-client-call-join-kicker">STEWARO · FIDEL</p>
      <h2 id="stewaroClientCallJoinTitle">Dein Gespräch ist bereit.</h2>
      <p id="stewaroClientCallJoinText">Die angerufene Person ist verfügbar. Du kannst jetzt direkt über diese App beitreten.</p>
      <p class="stewaro-client-call-join-status" id="stewaroClientCallJoinStatus" aria-live="polite">Bereit zum Verbinden</p>
      <div class="stewaro-client-call-join-actions">
        <button type="button" class="stewaro-client-call-join-accept" data-call-join-accept>Gespräch beitreten</button>
        <button type="button" class="stewaro-client-call-join-decline" data-call-join-decline>Nicht jetzt</button>
      </div>
    </div>`;
  document.body.appendChild(root);
  return root;
}

export function createStewaroClientCallJoin({
  getAuthToken,
  channel="WEB",
  gateway=DEFAULT_GATEWAY,
  onStateChange=()=>{}
}={}){
  let device=null,currentCall=null,currentConferenceId="",stopped=false,starting=null;
  const normalizedChannel=String(channel||"WEB").toUpperCase()==="APP"?"APP":"WEB";
  const surface=makeSurface();
  const status=surface.querySelector("#stewaroClientCallJoinStatus");
  const accept=surface.querySelector("[data-call-join-accept]");
  const decline=surface.querySelector("[data-call-join-decline]");

  function setState(state,label){
    if(status)status.textContent=label||state;
    surface.dataset.state=state;
    onStateChange({state,label:label||state});
  }
  function hide(){
    surface.hidden=true;
    currentCall=null;
    currentConferenceId="";
    if(accept)accept.disabled=false;
    if(decline)decline.disabled=false;
  }
  async function request(path,body={}){
    const token=text(await getAuthToken?.(),12000);
    if(token.length<32)throw new Error("session_required");
    const r=await fetch(gateway+path,{
      method:"POST",
      headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
      body:JSON.stringify({...body,channel:normalizedChannel}),
      cache:"no-store",
      credentials:"omit",
      signal:AbortSignal.timeout(12000)
    });
    const d=await r.json().catch(()=>({}));
    if(!r.ok||d?.ok!==true)throw new Error(text(d?.error,180)||"call_join_unavailable");
    return d;
  }
  async function tokenPayload(){
    return request("/live/call-join/token");
  }
  async function refreshToken(){
    if(!device||stopped)return false;
    try{
      const payload=await tokenPayload();
      device.updateToken(payload.token);
      return true;
    }catch{return false}
  }
  function bindCall(call){
    currentCall=call;
    currentConferenceId=param(call,"conference_id");
    const kind=param(call,"kind");
    if(kind!=="stewaro_join"||!currentConferenceId){
      try{call.reject()}catch{}
      currentCall=null;currentConferenceId="";
      return;
    }
    surface.hidden=false;
    setState("ringing","Die angerufene Person ist bereit.");
    call.on("accept",()=>setState("connected","Verbunden · Du sprichst jetzt direkt."));
    call.on("reconnecting",()=>setState("reconnecting","Verbindung wird wiederhergestellt …"));
    call.on("reconnected",()=>setState("connected","Wieder verbunden."));
    call.on("disconnect",()=>{setState("ended","Gespräch beendet.");setTimeout(hide,900)});
    call.on("cancel",()=>{setState("ended","Die Verbindung wurde beendet.");setTimeout(hide,900)});
    call.on("reject",()=>{setState("declined","Nicht verbunden.");setTimeout(hide,700)});
    call.on("error",()=>{setState("error","Die Internetverbindung konnte nicht hergestellt werden.");setTimeout(hide,1300)});
    requestAnimationFrame(()=>accept?.focus());
  }
  async function start(){
    if(stopped)return false;
    if(starting)return starting;
    starting=(async()=>{
      if(!globalThis.Twilio?.Device)throw new Error("twilio_voice_sdk_missing");
      const payload=await tokenPayload();
      device=new globalThis.Twilio.Device(payload.token,{
        appName:"STEWARO",
        appVersion:"client-call-join-v1",
        allowIncomingWhileBusy:false,
        closeProtection:"Ein STEWARO Gespräch ist noch aktiv. Beim Verlassen wird die Verbindung beendet.",
        tokenRefreshMs:60000
      });
      device.on("incoming",bindCall);
      device.on("tokenWillExpire",()=>{void refreshToken()});
      device.on("error",()=>onStateChange({state:"device_error"}));
      device.on("registered",()=>onStateChange({state:"registered",identity:payload.identity}));
      await device.register();
      return true;
    })().catch((error)=>{
      onStateChange({state:"unavailable",error:text(error?.message,160)});
      return false;
    }).finally(()=>{starting=null});
    return starting;
  }
  async function stop(){
    stopped=true;
    try{if(currentCall)currentCall.disconnect()}catch{}
    try{await device?.unregister?.()}catch{}
    try{device?.destroy?.()}catch{}
    hide();device=null;
  }
  accept?.addEventListener("click",()=>{
    if(!currentCall)return;
    accept.disabled=true;if(decline)decline.disabled=true;
    setState("connecting","Wird verbunden …");
    try{currentCall.accept({rtcConstraints:{audio:true}})}
    catch{setState("error","Mikrofon oder Verbindung konnte nicht geöffnet werden.");accept.disabled=false;if(decline)decline.disabled=false}
  });
  decline?.addEventListener("click",async()=>{
    if(!currentCall)return;
    accept.disabled=true;decline.disabled=true;
    setState("declining","Wird abgelehnt …");
    const call=currentCall,conferenceId=currentConferenceId;
    try{await request("/live/call-join/decline",{conference_session_id:conferenceId})}catch{}
    try{call.reject()}catch{}
    setTimeout(hide,500);
  });
  window.addEventListener("pagehide",()=>{void stop()},{once:true});
  return {start,stop,refreshToken,state:()=>({registered:device?.state==="registered",active:Boolean(currentCall),conference_session_id:currentConferenceId||null})};
}
