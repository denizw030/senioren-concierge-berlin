// NAHWERK LIVE CONCIERGE WEB CLIENT V1
const DEFAULT_API="https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-web-gateway/live";

const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
const uid=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2);

function waitForIce(pc){
  if(pc.iceGatheringState==="complete")return Promise.resolve();
  return new Promise((resolve)=>{
    const onChange=()=>{
      if(pc.iceGatheringState==="complete"){
        pc.removeEventListener("icegatheringstatechange",onChange);
        resolve();
      }
    };
    pc.addEventListener("icegatheringstatechange",onChange);
    setTimeout(resolve,3500);
  });
}
function rms(analyser){
  if(!analyser)return 0;
  const data=new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(data);
  let sum=0;
  for(const n of data){const v=(n-128)/128;sum+=v*v;}
  return Math.min(1,Math.sqrt(sum/data.length)*4.2);
}
function audioMeter(stream){
  if(!stream)return null;
  const ctx=new (window.AudioContext||window.webkitAudioContext)();
  const source=ctx.createMediaStreamSource(stream);
  const analyser=ctx.createAnalyser();
  analyser.fftSize=256;
  analyser.smoothingTimeConstant=.72;
  source.connect(analyser);
  return {ctx,analyser,close:()=>ctx.close().catch(()=>{})};
}
function svgMic(){
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 14.5a4 4 0 0 0 4-4v-4a4 4 0 1 0-8 0v4a4 4 0 0 0 4 4Zm-7-4a1 1 0 1 1 2 0 5 5 0 0 0 10 0 1 1 0 1 1 2 0 7 7 0 0 1-6 6.93V20h3a1 1 0 1 1 0 2H8a1 1 0 1 1 0-2h3v-2.57A7 7 0 0 1 5 10.5Z"/></svg>';
}
function ensureOverlay(){
  let root=document.querySelector(".nw-live");
  if(root)return root;
  root=document.createElement("div");
  root.className="nw-live";
  root.hidden=true;
  root.innerHTML=`
    <div class="nw-live-backdrop"></div>
    <section class="nw-live-panel" role="dialog" aria-modal="true" aria-label="NAHWERK Live Concierge">
      <div class="nw-live-top">
        <button class="nw-live-close" type="button" aria-label="Live-Gespräch schließen">×</button>
        <div class="nw-live-name"></div>
        <div class="nw-live-spacer"></div>
      </div>
      <div class="nw-live-stage">
        <div class="nw-live-orb" style="--nw-live-level:0">
          <div class="nw-live-avatar">
            <img class="nw-live-image" alt="" hidden>
            <span class="nw-live-initials">N</span>
          </div>
        </div>
        <div class="nw-live-status">Verbindet …</div>
      </div>
      <div class="nw-live-controls">
        <button class="nw-live-mute" type="button" aria-label="Mikrofon stummschalten">${svgMic()}</button>
        <button class="nw-live-end" type="button">Beenden</button>
      </div>
      <audio class="nw-live-audio" autoplay playsinline></audio>
    </section>`;
  document.body.appendChild(root);
  return root;
}

export function mountNahwerkLiveConcierge({
  button,
  input,
  getAuthToken,
  channel="WEB",
  getThreadId=()=>null,
  apiBase=DEFAULT_API,
  onStateChange=()=>{},
  onClose=()=>{}
}={}){
  if(typeof getAuthToken!=="function")throw new Error("getAuthToken is required");
  const ch=String(channel||"WEB").toUpperCase();
  if(!["WEB","APP"].includes(ch))throw new Error("channel must be WEB or APP");

  let trigger=typeof button==="string"?document.querySelector(button):button;
  const inputEl=typeof input==="string"?document.querySelector(input):input;
  if(!trigger){
    if(!inputEl?.parentElement)throw new Error("button or input is required");
    trigger=document.createElement("button");
    trigger.type="button";
    trigger.className="nw-live-trigger";
    trigger.setAttribute("aria-label","Live mit Concierge sprechen");
    trigger.innerHTML=svgMic();
    inputEl.parentElement.appendChild(trigger);
  }else{
    trigger.classList.add("nw-live-trigger");
    if(!trigger.innerHTML.trim())trigger.innerHTML=svgMic();
  }

  const ui=ensureOverlay();
  const q=(s)=>ui.querySelector(s);
  const orb=q(".nw-live-orb"),status=q(".nw-live-status"),name=q(".nw-live-name");
  const image=q(".nw-live-image"),initials=q(".nw-live-initials"),remoteAudio=q(".nw-live-audio");
  const muteBtn=q(".nw-live-mute"),endBtn=q(".nw-live-end"),closeBtn=q(".nw-live-close");

  let pc=null,dc=null,micStream=null,micMeter=null,outMeter=null,raf=0;
  let sessionId="",inputTranscript="",outputTranscript="",started=false,muted=false,ending=false;

  const state=(value,detail={})=>{onStateChange({state:value,...detail});};
  const setStatus=(text)=>{status.textContent=text;};
  const setPersona=(p)=>{
    const display=p?.display_name||"NAHWERK Concierge";
    name.textContent=display;
    initials.textContent=p?.initials||display.slice(0,1).toUpperCase();
    const key=String(p?.persona_key||"").trim().toLowerCase();
    const localPortrait=/^[a-z0-9_-]{1,64}$/.test(key)
      ? `${location.origin}/assets/concierges/large/${encodeURIComponent(key)}.webp`
      : "";
    const portrait=String(p?.portrait_url||localPortrait||"").trim();
    image.onerror=()=>{
      image.hidden=true;
      initials.hidden=false;
    };
    if(portrait){
      image.src=portrait;
      image.alt=display;
      image.hidden=false;
      initials.hidden=true;
    }else{
      image.hidden=true;
      initials.hidden=false;
    }
  };
  const animate=()=>{
    const inLevel=rms(micMeter?.analyser);
    const outLevel=rms(outMeter?.analyser);
    const level=Math.max(inLevel,outLevel);
    orb.style.setProperty("--nw-live-level",level.toFixed(3));
    if(started){
      if(outLevel>.055)setStatus((name.textContent||"Concierge")+" spricht …");
      else if(inLevel>.05)setStatus("Hört zu …");
    }
    raf=requestAnimationFrame(animate);
  };
  const auth=async()=>{
    const token=await getAuthToken();
    if(!token)throw new Error("SESSION_REQUIRED");
    return token;
  };
  const post=async(path,body)=>{
    const token=await auth();
    const r=await fetch(apiBase+path,{
      method:"POST",
      headers:{authorization:"Bearer "+token,"content-type":"application/json"},
      body:JSON.stringify(body)
    });
    const d=await r.json().catch(()=>null);
    if(!r.ok||d?.ok!==true)throw new Error(d?.error||("LIVE_HTTP_"+r.status));
    return d;
  };
  const sendEvent=(event)=>{
    if(dc?.readyState==="open")dc.send(JSON.stringify(event));
  };
  const handleDelegation=async(event)=>{
    const id=event?.delegation?.id;
    if(!id||event?.delegation?.target!=="client")return;
    await wait(120);
    const transcript=inputTranscript.trim();
    inputTranscript="";
    if(!transcript){
      sendEvent({type:"session.commentary.append",delegation_id:id,content:"Ich konnte die letzte Äußerung nicht sicher transkribieren. Bitte frage kurz nach.",event_id:"nw-"+uid()});
      return;
    }
    setStatus("Prüft …");
    try{
      const d=await post("/delegation",{session_id:sessionId,delegation_id:id,transcript,source_message_id:"live-"+uid()});
      sendEvent({type:"session.commentary.append",delegation_id:id,content:d.commentary,event_id:"nw-"+uid()});
    }catch{
      sendEvent({type:"session.commentary.append",delegation_id:id,content:"Die sichere Prüfung ist gerade nicht verfügbar. Behaupte keinen Erfolg und bitte kurz darum, es erneut zu versuchen.",event_id:"nw-"+uid()});
    }
  };
  const handleEvent=async(raw)=>{
    let e; try{e=JSON.parse(raw.data);}catch{return;}
    if(e.type==="session.started"){
      started=true;setStatus("Hört zu …");state("connected",{session_id:sessionId});return;
    }
    if(e.type==="session.input_transcript.delta"){
      inputTranscript=(inputTranscript+String(e.delta||"")).slice(-12000);return;
    }
    if(e.type==="session.output_transcript.delta"){
      outputTranscript=(outputTranscript+String(e.delta||"")).slice(-12000);
      setStatus((name.textContent||"Concierge")+" spricht …");return;
    }
    if(e.type==="session.delegation.created"){await handleDelegation(e);return;}
    if(e.type==="session.closed"){await stop({notifyBackend:false});return;}
    if(e.type==="error"){state("error",{error:e?.error?.code||"LIVE_SESSION_ERROR"});}
  };

  async function start(){
    if(pc)return;
    ending=false;started=false;inputTranscript="";outputTranscript="";
    ui.hidden=false;document.documentElement.classList.add("nw-live-open");
    setStatus("Mikrofon wird aktiviert …");state("connecting");
    try{
      micStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
      pc=new RTCPeerConnection();
      micStream.getTracks().forEach(track=>pc.addTrack(track,micStream));
      micMeter=audioMeter(micStream);

      pc.ontrack=(ev)=>{
        const stream=ev.streams?.[0]||new MediaStream([ev.track]);
        remoteAudio.srcObject=stream;
        remoteAudio.play().catch(()=>{});
        outMeter?.close?.(); outMeter=audioMeter(stream);
      };
      dc=pc.createDataChannel("oai-events");
      dc.addEventListener("message",handleEvent);
      dc.addEventListener("close",()=>{if(!ending)state("disconnected");});

      const offer=await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitForIce(pc);
      const localSdp=pc.localDescription?.sdp;
      if(!localSdp)throw new Error("LOCAL_SDP_MISSING");

      const threadId=ch==="WEB"?await getThreadId():null;
      if(ch==="WEB"&&!threadId)throw new Error("THREAD_ID_REQUIRED");

      const live=await post("/session",{channel:ch,sdp:localSdp,thread_id:threadId});
      sessionId=live.session_id;
      setPersona(live.persona);
      await pc.setRemoteDescription({type:"answer",sdp:live.sdp});
      setStatus("Verbindet …");
      cancelAnimationFrame(raf);animate();
    }catch(e){
      state("error",{error:e?.message||"LIVE_START_FAILED"});
      setStatus("Live-Gespräch konnte nicht gestartet werden.");
      await stop({notifyBackend:Boolean(sessionId),keepVisible:true});
    }
  }

  async function stop({notifyBackend=true,keepVisible=false}={}){
    if(ending)return; ending=true;
    cancelAnimationFrame(raf);
    if(notifyBackend&&sessionId)post("/end",{session_id:sessionId}).catch(()=>{});
    try{dc?.close();}catch{}
    try{pc?.close();}catch{}
    micStream?.getTracks()?.forEach(t=>t.stop());
    micMeter?.close?.();outMeter?.close?.();
    remoteAudio.pause();remoteAudio.srcObject=null;
    pc=null;dc=null;micStream=null;micMeter=null;outMeter=null;sessionId="";started=false;muted=false;
    muteBtn.classList.remove("is-muted");
    if(!keepVisible){
      ui.hidden=true;
      document.documentElement.classList.remove("nw-live-open");
      try{onClose();}catch{}
    }
    state("ended");ending=false;
  }

  function toggleMute(){
    muted=!muted;
    micStream?.getAudioTracks()?.forEach(t=>t.enabled=!muted);
    muteBtn.classList.toggle("is-muted",muted);
    muteBtn.setAttribute("aria-label",muted?"Mikrofon einschalten":"Mikrofon stummschalten");
    setStatus(muted?"Mikrofon aus":"Hört zu …");
  }

  trigger.addEventListener("click",start);
  muteBtn.addEventListener("click",toggleMute);
  endBtn.addEventListener("click",()=>stop());
  closeBtn.addEventListener("click",()=>stop());

  return {start,stop,toggleMute,button:trigger};
}
