// NAHWERK LIVE CONCIERGE WEB CLIENT V1
const DEFAULT_API="https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-web-gateway/live";
// LIVE_AUTHENTICATED_PRICE_QUOTE_V2_20260920

const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
const uid=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2);

function waitForIce(pc){
  if(pc.iceGatheringState==="complete")return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{
      pc.removeEventListener("icegatheringstatechange",onChange);
      reject(new Error("ICE_GATHERING_TIMEOUT"));
    },10000);
    const onChange=()=>{
      if(pc.iceGatheringState==="complete"){
        clearTimeout(timer);
        pc.removeEventListener("icegatheringstatechange",onChange);
        resolve();
      }
    };
    pc.addEventListener("icegatheringstatechange",onChange);
    onChange();
  });
}
function normalizedRemoteSdp(value){
  const raw=String(value??"");
  if(!raw)return "";
  return raw.replace(/\r?\n/g,"\r\n").replace(/[\r\n]+$/,"")+"\r\n";
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
function svgLiveWave(){
  return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none"><path d="M4.5 10.25v3.5M8 7.25v9.5M11.5 5.25v13.5M15 7.25v9.5M18.5 10.25v3.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>';
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
        <div class="nw-live-copy">
          <div class="nw-live-status">Verbindet …</div>
          <div class="nw-live-duration" aria-label="Gesprächsdauer" hidden>0:00</div>
        </div>
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
  onClose=()=>{},
  bindTrigger=true
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
    trigger.innerHTML=svgLiveWave();
    inputEl.parentElement.appendChild(trigger);
  }else{
    trigger.classList.add("nw-live-trigger");
    if(!trigger.innerHTML.trim())trigger.innerHTML=svgLiveWave();
  }

  const ui=ensureOverlay();
  const q=(s)=>ui.querySelector(s);
  const orb=q(".nw-live-orb"),status=q(".nw-live-status"),duration=q(".nw-live-duration"),name=q(".nw-live-name");
  const image=q(".nw-live-image"),initials=q(".nw-live-initials"),remoteAudio=q(".nw-live-audio");
  const muteBtn=q(".nw-live-mute"),endBtn=q(".nw-live-end"),closeBtn=q(".nw-live-close");

  let pc=null,dc=null,micStream=null,micMeter=null,outMeter=null,raf=0,inputFlushTimer=0,outputFlushTimer=0,transcriptSeq=0,userTurnSeq=0,assistantTurnSeq=0,maxSessionTimer=0;
  // LIVE_TRANSCRIPT_TERMINAL_FLUSH_V3_20260922
  const transcriptWrites=new Set();
  let lastTranscriptEventAt=0,lastUserPersistedEndMs=null,lastAssistantPersistedEndMs=null,responseActive=false,inputSpeechActive=false;
  // VOICE_DYNAMIC_PRICE_CLIENT_V1_20260920
  let currentQuote=null;
  let sessionId="",liveThreadId="",inputTranscript="",outputTranscript="",lastUserTurnText="",lastAssistantTurnText="",started=false,muted=false,ending=false;
  let inputStartMs=null,inputEndMs=null,outputStartMs=null,outputEndMs=null,callStartedAt=0,callTimer=0;

  const state=(value,detail={})=>{onStateChange({state:value,...detail});};
  const setStatus=(text)=>{status.textContent=text;};
  const callClock=(ms)=>{
    const total=Math.max(0,Math.floor(Number(ms||0)/1000));
    const hours=Math.floor(total/3600);
    const minutes=Math.floor((total%3600)/60);
    const seconds=total%60;
    return hours>0?`${hours}:${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`:`${minutes}:${String(seconds).padStart(2,"0")}`;
  };
  const stopCallTimer=()=>{
    if(callTimer)clearInterval(callTimer);
    callTimer=0;callStartedAt=0;
  };
  const startCallTimer=()=>{
    stopCallTimer();
    callStartedAt=Date.now();
    if(duration){duration.hidden=false;duration.textContent="0:00";}
    const tick=()=>{if(duration&&callStartedAt)duration.textContent=callClock(Date.now()-callStartedAt);};
    callTimer=setInterval(tick,250);
    tick();
  };
  const currentPersonaFromPage=()=>{
    const title=document.getElementById("webConciergeTitle");
    const avatar=document.querySelector(".web-concierge-avatar");
    const display=String(title?.textContent||"NAHWERK Concierge").trim();
    let portrait="";
    const inline=String(avatar?.style?.backgroundImage||"");
    const match=inline.match(/url\(["']?(.*?)["']?\)/i);
    if(match?.[1])portrait=match[1];
    return {display_name:display,portrait_url:portrait};
  };
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
  const reportClientDiagnostic=(code)=>{
    try{
      const root=apiBase.replace(/\/live\/?$/,"");
      const u=new URL(root+"/client-diagnostic");
      u.searchParams.set("source","LIVE_CLIENT");
      u.searchParams.set("code",String(code||"LIVE_CLIENT_ERROR").slice(0,180));
      fetch(u.href,{method:"GET",cache:"no-store",credentials:"omit"}).catch(()=>{});
    }catch{}
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
  const persistTranscript=async(role,text,startMs,endMs,eventKey="")=>{
    const value=String(text??"");
    if(!sessionId||!value.trim())return;
    transcriptSeq+=1;
    const write=post("/transcript",{
      session_id:sessionId,
      event_key:String(eventKey||`${String(role||"").toLowerCase()}:${transcriptSeq}:${uid()}`).slice(0,300),
      role,
      text:value,
      start_ms:Number.isFinite(Number(startMs))?Number(startMs):null,
      end_ms:Number.isFinite(Number(endMs))?Number(endMs):null
    }).catch((error)=>{
      reportClientDiagnostic("TRANSCRIPT_WRITE_"+String(error?.message||error?.name||"FAILED"));
    });
    transcriptWrites.add(write);
    try{await write;}finally{transcriptWrites.delete(write);}
  };
  const noteTranscriptEvent=()=>{lastTranscriptEventAt=Date.now();};
  const drainTranscriptWrites=async(timeoutMs=2400)=>{
    const deadline=Date.now()+Math.max(250,Number(timeoutMs)||2400);
    while(transcriptWrites.size&&Date.now()<deadline){
      const pending=[...transcriptWrites];
      await Promise.race([Promise.allSettled(pending),wait(Math.min(250,Math.max(1,deadline-Date.now())))]);
    }
  };
  const waitForTranscriptQuiescence=async({quietMs=1500,minWaitMs=1000,maxWaitMs=7000}={})=>{
    const startedAt=Date.now();
    if(!lastTranscriptEventAt)lastTranscriptEventAt=startedAt;
    while(dc?.readyState==="open"&&Date.now()-startedAt<maxWaitMs){
      const elapsed=Date.now()-startedAt;
      const idle=Date.now()-lastTranscriptEventAt;
      if(elapsed>=minWaitMs&&idle>=quietMs&&!responseActive&&!inputSpeechActive)break;
      await wait(Math.min(180,Math.max(30,quietMs-idle)));
    }
    await drainTranscriptWrites(2800);
  };
  const finalTranscriptTail=(finalText,seenText)=>{
    const full=String(finalText??"").trim(),seen=String(seenText??"").trim();
    if(!full)return "";
    if(!seen)return full;
    if(full===seen)return "";
    if(full.startsWith(seen))return full.slice(seen.length);
    let i=0;const n=Math.min(full.length,seen.length);
    while(i<n&&full[i]===seen[i])i+=1;
    if(i>=Math.max(12,Math.floor(seen.length*.9)))return full.slice(i);
    return "";
  };
  const flushUserTranscript=async()=>{
    if(inputFlushTimer){clearTimeout(inputFlushTimer);inputFlushTimer=0;}
    const text=inputTranscript.trim();
    if(!text)return "";
    lastUserTurnText=text;
    inputTranscript="";inputStartMs=null;inputEndMs=null;
    return text;
  };
  const flushAssistantTranscript=async()=>{
    if(outputFlushTimer){clearTimeout(outputFlushTimer);outputFlushTimer=0;}
    const text=outputTranscript.trim();
    if(!text)return "";
    lastAssistantTurnText=text;
    outputTranscript="";outputStartMs=null;outputEndMs=null;
    return text;
  };
  const persistFinalTranscriptTail=async(role,e)=>{
    const finalText=String(e?.transcript??e?.text??e?.content??"");
    const seen=role==="USER"?(inputTranscript.trim()||lastUserTurnText):(outputTranscript.trim()||lastAssistantTurnText);
    const tail=finalTranscriptTail(finalText,seen);
    if(!tail.trim())return;
    const eventId=String(e?.event_id??e?.item_id??e?.response_id??uid());
    const end=Number.isFinite(Number(e?.end_ms))?Number(e.end_ms):null;
    const start=role==="USER"?lastUserPersistedEndMs:lastAssistantPersistedEndMs;
    await persistTranscript(role,tail,start,end,`final-tail:${role.toLowerCase()}:${eventId}`);
    if(role==="USER"){
      lastUserTurnText=(seen+tail).trim();
      if(end!==null)lastUserPersistedEndMs=end;
    }else{
      lastAssistantTurnText=(seen+tail).trim();
      if(end!==null)lastAssistantPersistedEndMs=end;
    }
  };
  const handleDelegation=async(event)=>{
    const id=event?.delegation?.id;
    if(!id||event?.delegation?.target!=="client")return;
    await wait(120);
    const transcript=inputTranscript.trim()||lastUserTurnText;
    if(inputTranscript.trim())await flushUserTranscript();
    if(!transcript){
      sendEvent({type:"session.commentary.append",delegation_id:id,content:"Ich konnte die letzte Äußerung nicht sicher transkribieren. Bitte frage kurz nach.",event_id:"nw-"+uid()});
      return;
    }
    setStatus("Prüft …");
    try{
      const d=await post("/delegation",{session_id:sessionId,delegation_id:id,transcript,last_assistant_utterance:(outputTranscript.trim()||lastAssistantTurnText).slice(0,2000),source_message_id:"live-"+uid()});
      sendEvent({type:"session.commentary.append",delegation_id:id,content:d.commentary,event_id:"nw-"+uid()});
    }catch{
      sendEvent({type:"session.commentary.append",delegation_id:id,content:"Die sichere Prüfung ist gerade nicht verfügbar. Behaupte keinen Erfolg und bitte kurz darum, es erneut zu versuchen.",event_id:"nw-"+uid()});
    }
  };
  const handleEvent=async(raw)=>{
    let e; try{e=JSON.parse(raw.data);}catch{return;}
    if(e.type==="session.started"){
      started=true;startCallTimer();setStatus("Hört zu …");state("connected",{session_id:sessionId,thread_id:liveThreadId||null});return;
    }
    if(e.type==="input_audio_buffer.speech_started"){inputSpeechActive=true;noteTranscriptEvent();return;}
    if(e.type==="response.created"||e.type==="response.in_progress"){responseActive=true;noteTranscriptEvent();}
    if(e.type==="session.input_transcript.delta"||e.type==="conversation.item.input_audio_transcription.delta"){
      noteTranscriptEvent();
      const delta=String(e.delta??"");
      const start=Number.isFinite(Number(e.start_ms))?Number(e.start_ms):null;
      const end=Number.isFinite(Number(e.end_ms))?Number(e.end_ms):null;
      if(inputEndMs!==null&&start!==null&&start-inputEndMs>1600){
        lastUserTurnText=inputTranscript.trim()||lastUserTurnText;
        inputTranscript="";
        inputStartMs=null;
      }
      inputTranscript=(inputTranscript+delta).slice(-12000);
      if(inputStartMs===null&&start!==null)inputStartMs=start;
      if(end!==null){inputEndMs=end;lastUserPersistedEndMs=end;}
      void persistTranscript("USER",delta,start,end,`delta:user:${String(e.event_id||uid())}`);
      return;
    }
    if(e.type==="session.input_transcript.done"||e.type==="conversation.item.input_audio_transcription.completed"){
      noteTranscriptEvent();
      await persistFinalTranscriptTail("USER",e);
      await flushUserTranscript();
      return;
    }
    if(e.type==="session.output_transcript.delta"||e.type==="response.audio_transcript.delta"||e.type==="response.output_audio_transcript.delta"){
      noteTranscriptEvent();
      const delta=String(e.delta??"");
      const start=Number.isFinite(Number(e.start_ms))?Number(e.start_ms):null;
      const end=Number.isFinite(Number(e.end_ms))?Number(e.end_ms):null;
      if(outputEndMs!==null&&start!==null&&start-outputEndMs>1600){
        lastAssistantTurnText=outputTranscript.trim()||lastAssistantTurnText;
        outputTranscript="";
        outputStartMs=null;
      }
      outputTranscript=(outputTranscript+delta).slice(-12000);
      if(outputStartMs===null&&start!==null)outputStartMs=start;
      if(end!==null){outputEndMs=end;lastAssistantPersistedEndMs=end;}
      void persistTranscript("ASSISTANT",delta,start,end,`delta:assistant:${String(e.event_id||uid())}`);
      setStatus((name.textContent||"Concierge")+" spricht …");return;
    }
    if(e.type==="session.output_transcript.done"||e.type==="response.audio_transcript.done"||e.type==="response.output_audio_transcript.done"){
      noteTranscriptEvent();
      await persistFinalTranscriptTail("ASSISTANT",e);
      await flushAssistantTranscript();
      return;
    }
    if(e.type==="input_audio_buffer.speech_stopped"){
      inputSpeechActive=false;noteTranscriptEvent();
      if(inputFlushTimer)clearTimeout(inputFlushTimer);
      inputFlushTimer=setTimeout(()=>{void flushUserTranscript();},800);
      return;
    }
    if(e.type==="response.done"){
      responseActive=false;noteTranscriptEvent();
      if(outputFlushTimer)clearTimeout(outputFlushTimer);
      outputFlushTimer=setTimeout(()=>{void flushAssistantTranscript();},450);
      return;
    }
    if(e.type==="response.event"&&e.event){
      const nested=e.event;
      if(nested.type==="response.done"){
        responseActive=false;noteTranscriptEvent();
        outputTranscript="";
        outputStartMs=null;
        outputEndMs=null;
      }
      return;
    }
        if(e.type==="session.delegation.created"){await handleDelegation(e);return;}
    if(e.type==="session.closed"){await flushUserTranscript();await flushAssistantTranscript();await stop({notifyBackend:true});return;}
    if(e.type==="error"){state("error",{error:e?.error?.code||"LIVE_SESSION_ERROR"});}
  };

  async function start(){
    if(pc)return;
    ending=false;started=false;responseActive=false;inputSpeechActive=false;liveThreadId="";inputTranscript="";outputTranscript="";lastUserTurnText="";lastAssistantTurnText="";inputStartMs=null;inputEndMs=null;outputStartMs=null;outputEndMs=null;lastUserPersistedEndMs=null;lastAssistantPersistedEndMs=null;lastTranscriptEventAt=Date.now();transcriptSeq=0;userTurnSeq=0;assistantTurnSeq=0;transcriptWrites.clear();
    stopCallTimer();if(duration){duration.textContent="0:00";duration.hidden=true;}
    ui.hidden=false;document.documentElement.classList.add("nw-live-open");
    setPersona(currentPersonaFromPage());
    setStatus("Preis wird geprüft …");state("quoting");
    try{
      currentQuote=await post("/quote",{channel:ch});
      if(currentQuote?.customer_charge===true&&currentQuote?.billing_exempt!==true){
        const cents=Number(currentQuote.unit_price_cents||0);
        const price=(cents/100).toFixed(2).replace(".",",");
        const approved=window.confirm(`Live Concierge kostet aktuell ${price} € pro Minute. Abgerechnet wird sekundengenau; der Preis bleibt für dieses Gespräch fest. Live-Gespräch starten?`);
        if(!approved){
          ui.hidden=true;document.documentElement.classList.remove("nw-live-open");
          state("price_declined",{pricing:currentQuote});
          return;
        }
      }
      setStatus("Mikrofon wird aktiviert …");state("connecting",{pricing:currentQuote});
      micStream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
      pc=new RTCPeerConnection();
      micStream.getAudioTracks().forEach(track=>pc.addTrack(track,micStream));
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
      const initialSdp=offer?.sdp||"";
      await pc.setLocalDescription(offer);
      await waitForIce(pc);
      const localSdp=pc.localDescription?.sdp||"";
      if(!localSdp)throw new Error("LOCAL_SDP_MISSING");
      if(!/^v=0\r?\n/.test(localSdp)||!/(?:^|\r?\n)m=audio\s/.test(localSdp))throw new Error("LOCAL_SDP_INCOMPLETE");

      const threadId=ch==="WEB"?await getThreadId():null;
      if(ch==="WEB"&&!threadId)throw new Error("THREAD_ID_REQUIRED");
      liveThreadId=String(threadId||"");

      const live=await post("/session",{channel:ch,sdp:localSdp,initial_sdp:initialSdp,thread_id:threadId,price_acknowledged:Boolean(currentQuote&&currentQuote.customer_charge===true&&currentQuote.billing_exempt!==true),price_version:String(currentQuote?.price_version||"")});
      sessionId=live.session_id;
      setPersona(live.persona);
      const remoteSdp=String(live?.sdp||"");
      if(!/^v=0(?:\r?\n)/.test(remoteSdp)||!/(?:^|\r?\n)m=audio\s/.test(remoteSdp))throw new Error("REMOTE_SDP_INVALID");
      try{
        await pc.setRemoteDescription({type:"answer",sdp:remoteSdp});
      }catch(remoteError){
        const repaired=normalizedRemoteSdp(remoteSdp);
        if(repaired===remoteSdp)throw remoteError;
        try{
          await pc.setRemoteDescription({type:"answer",sdp:repaired});
        }catch{
          throw remoteError;
        }
      }
      setStatus("Verbindet …");
      const maxSeconds=Number(live?.pricing?.max_seconds||currentQuote?.max_seconds||0);
      if(maxSessionTimer)clearTimeout(maxSessionTimer);
      if(maxSeconds>0){
        maxSessionTimer=setTimeout(()=>{void stop({notifyBackend:true});},Math.max(1,maxSeconds)*1000);
      }
      state("pricing_locked",{pricing:live?.pricing||currentQuote||null});
      cancelAnimationFrame(raf);animate();
    }catch(e){
      const raw=String(e?.message||e?.name||"LIVE_START_FAILED");
      const code=e?.name==="NotAllowedError"?"MIC_PERMISSION_DENIED":
        e?.name==="NotFoundError"?"MICROPHONE_NOT_FOUND":
        e?.name==="NotReadableError"?"MICROPHONE_BUSY_OR_UNAVAILABLE":
        raw;
      state("error",{error:code});
      reportClientDiagnostic(code);
      post("/client-error",{error:code}).catch(()=>{});
      const message=code==="MIC_PERMISSION_DENIED"
        ?"Mikrofonzugriff ist nicht erlaubt. Bitte erlaube nahwerkconcierge.com den Mikrofonzugriff."
        : code==="MICROPHONE_NOT_FOUND"
          ?"Kein Mikrofon gefunden."
          : code==="MICROPHONE_BUSY_OR_UNAVAILABLE"
            ?"Das Mikrofon ist gerade nicht verfügbar."
            : code==="LIVE_PRICE_CHANGED"
              ?"Der Live-Preis wurde gerade aktualisiert. Bitte starte das Gespräch noch einmal."
              : code==="LIVE_PRICE_UNAVAILABLE"
                ?"Der Live-Preis konnte gerade nicht sicher geladen werden. Bitte versuche es erneut."
                :`Live-Fehler: ${code.slice(0,80)}`;
      setStatus(message);
      await stop({notifyBackend:Boolean(sessionId),keepVisible:true});
    }
  }

  async function stop({notifyBackend=true,keepVisible=false}={}){
    if(ending)return; ending=true;
    const endedSessionId=sessionId,endedThreadId=liveThreadId;
    // Stop accepting new speech immediately, but keep the data channel alive until both
    // speech and any active assistant response have reached a transcript-stable boundary.
    micStream?.getAudioTracks()?.forEach(t=>t.enabled=false);
    setStatus("Gespräch wird abgeschlossen …");
    if(started&&dc?.readyState==="open")await waitForTranscriptQuiescence({quietMs:1500,minWaitMs:1000,maxWaitMs:7000});
    if(inputFlushTimer){clearTimeout(inputFlushTimer);inputFlushTimer=0;}
    if(outputFlushTimer){clearTimeout(outputFlushTimer);outputFlushTimer=0;}
    await flushUserTranscript();
    await flushAssistantTranscript();
    await drainTranscriptWrites(2800);
    stopCallTimer();
    if(maxSessionTimer)clearTimeout(maxSessionTimer);maxSessionTimer=0;
    currentQuote=null;
    cancelAnimationFrame(raf);
    if(notifyBackend&&sessionId){
      await post("/end",{session_id:sessionId,transcript_finalized:true}).catch(()=>{});
      await wait(700);
      await drainTranscriptWrites(2400);
    }
    try{dc?.close();}catch{}
    try{pc?.close();}catch{}
    micStream?.getTracks()?.forEach(t=>t.stop());
    micMeter?.close?.();outMeter?.close?.();
    remoteAudio.pause();remoteAudio.srcObject=null;
    pc=null;dc=null;micStream=null;micMeter=null;outMeter=null;sessionId="";liveThreadId="";started=false;muted=false;responseActive=false;inputSpeechActive=false;
    muteBtn.classList.remove("is-muted");
    const endDetail={session_id:endedSessionId||null,thread_id:endedThreadId||null,transcript_finalized:true};
    if(!keepVisible){
      ui.hidden=true;
      document.documentElement.classList.remove("nw-live-open");
      try{onClose(endDetail);}catch{}
    }
    state("ended",endDetail);ending=false;
  }

  function toggleMute(){
    muted=!muted;
    micStream?.getAudioTracks()?.forEach(t=>t.enabled=!muted);
    muteBtn.classList.toggle("is-muted",muted);
    muteBtn.setAttribute("aria-label",muted?"Mikrofon einschalten":"Mikrofon stummschalten");
    setStatus(muted?"Mikrofon aus":"Hört zu …");
  }

  if(bindTrigger)trigger.addEventListener("click",start);
  muteBtn.addEventListener("click",toggleMute);
  endBtn.addEventListener("click",()=>stop());
  closeBtn.addEventListener("click",()=>stop());

  return {start,stop,toggleMute,button:trigger};
}
