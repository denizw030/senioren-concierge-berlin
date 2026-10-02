
    import { mountNahwerkLiveConcierge } from "/assets/nahwerk-live-concierge.js?v=28";
    let token="";
    let controller=null;
    const notifyClose=()=>{
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
          getAuthToken:()=>token,
          onClose:notifyClose
        });
      }
      await controller.start();
      return true;
    };
    window.stopNahwerkAppLive=async()=>{
      if(controller)await controller.stop();
      return true;
    };
  