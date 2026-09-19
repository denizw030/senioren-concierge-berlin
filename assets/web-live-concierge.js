// WEB_CONCIERGE_LIVE_BOOT_V1_20260919
import { mountNahwerkLiveConcierge } from "./nahwerk-live-concierge.js?v=1";

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
  send.after(button);

  const controller=mountNahwerkLiveConcierge({
    button,
    input,
    channel:"WEB",
    getAuthToken:()=>bridge()?.sessionToken?.()||"",
    getThreadId:()=>bridge()?.threadId?.()||null,
    onStateChange:(state)=>{
      window.dispatchEvent(new CustomEvent("nahwerk:live-state",{detail:state}));
    }
  });

  const backendReady=await ready();
  const sync=()=>{
    const b=bridge();
    const usable=backendReady&&Boolean(b?.isAllowed?.());
    button.hidden=!usable;
    button.disabled=!usable;
  };
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
