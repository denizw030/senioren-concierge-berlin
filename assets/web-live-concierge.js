// WEB_CONCIERGE_LIVE_BOOT_V1_20260919
import { mountNahwerkLiveConcierge } from "./nahwerk-live-concierge.js?v=21";

const GATEWAY="https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-web-gateway";

function bridge(){
  return window.NAHWERKWebCustomerConciergeLiveBridge||null;
}
async function ready(){
  if(!navigator.mediaDevices?.getUserMedia||typeof RTCPeerConnection==="undefined")return false;
  try{
    const r=await fetch(GATEWAY+"/health",{cache:"no-store",credentials:"omit"});
    const d=await r.json().catch(()=>null);
    return r.ok&&d?.ok===true&&d?.live_webrtc_v1===true;
  }catch{return false;}
}
async function boot(){
  const input=document.getElementById("webConciergeInput");
  const send=document.getElementById("webConciergeSend");
  if(!(input instanceof HTMLTextAreaElement)||!(send instanceof HTMLButtonElement))return;

  const button=document.createElement("button");
  button.type="button";
  button.id="webConciergeLive";
  button.className="nw-live-trigger";
  button.hidden=true;
  button.setAttribute("aria-label","Live mit deinem Concierge sprechen");
  button.title="Live sprechen";
  send.hidden=false;
  send.removeAttribute("aria-hidden");
  send.removeAttribute("tabindex");
  send.after(button);

  const controller=mountNahwerkLiveConcierge({
    button,
    input,
    channel:"WEB",
    bindTrigger:false,
    getAuthToken:()=>{
      void window.SCBAuth?.validateSession?.().catch(()=>false);
      return bridge()?.sessionToken?.()||"";
    },
    getThreadId:()=>bridge()?.threadId?.()||null,
    onStateChange:(state)=>{
      window.dispatchEvent(new CustomEvent("nahwerk:live-state",{detail:state}));
    },
    onClose:(detail={})=>{
      window.dispatchEvent(new CustomEvent("nahwerk:live-ended",{detail}));
    }
  });

  const wave='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none"><path d="M4.5 10.25v3.5M8 7.25v9.5M11.5 5.25v13.5M15 7.25v9.5M18.5 10.25v3.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>';
  const arrow='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none"><path d="M12 17V7M7.8 11.2 12 7l4.2 4.2" stroke="currentColor" stroke-width="2.15" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const backendReady=await ready();
  const sync=()=>{
    const b=bridge();
    const usable=backendReady&&Boolean(b?.isAllowed?.());
    const hasText=Boolean(input.value.trim());
    send.hidden=usable;
    if(usable){
      send.setAttribute("aria-hidden","true");
      send.tabIndex=-1;
    }else{
      send.removeAttribute("aria-hidden");
      send.removeAttribute("tabindex");
    }
    button.hidden=!usable;
    button.disabled=!usable;
    button.classList.toggle("is-send-mode",hasText);
    button.innerHTML=hasText?arrow:wave;
    button.setAttribute("aria-label",hasText?"Nachricht senden":"Live mit deinem Concierge sprechen");
    button.title=hasText?"Senden":"Live sprechen";
  };
  button.addEventListener("click",()=>{
    if(button.disabled)return;
    if(input.value.trim()){
      send.click();
      setTimeout(sync,0);
      setTimeout(sync,120);
    }else{
      void controller.start();
    }
  });
  input.addEventListener("input",sync);
  sync();
  const timer=setInterval(sync,1000);
  window.addEventListener("nahwerk:chat-channel-view",sync);
  window.addEventListener("pagehide",()=>{
    clearInterval(timer);
    controller.stop({notifyBackend:true}).catch(()=>{});
  },{once:true});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
else void boot();
