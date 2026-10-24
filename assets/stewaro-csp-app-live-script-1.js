
    import { mountNahwerkLiveConcierge } from "/assets/nahwerk-live-concierge.js?v=29";
    let token="";
    let controller=null;
    const notifyClose=()=>{
      token="";
      try{window.webkit?.messageHandlers?.nahwerkLiveClose?.postMessage("close");}catch{}
      try{window.NAHWERKAndroidLive?.close?.();}catch{}
    };
    window.startNahwerkAppLive=async(sessionToken)=>{
      if(typeof sessionToken!=="string"||sessionToken.length<32)return false;
      token=sessionToken;
      document.getElementById("appLiveBoot")?.remove();
      if(!controller){
        controller=mountNahwerkLiveConcierge({
          button:"#appLiveStart",
          channel:"APP",
          fidelRoom:true,
          getAuthToken:()=>token,
          onClose:notifyClose
        });
      }
      try{
        await controller.start();
        return true;
      }catch(error){
        token="";
        throw error;
      }
    };
    window.stopNahwerkAppLive=async()=>{
      token="";
      if(controller)await controller.stop();
      return true;
    };
  