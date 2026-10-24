
    import { mountNahwerkLiveConcierge } from "/assets/nahwerk-live-concierge.js?v=29";
    let token="";
    let controller=null;
    let lifecycleGeneration=0;
    const notifyClose=()=>{
      lifecycleGeneration++;
      token="";
      try{window.webkit?.messageHandlers?.nahwerkLiveClose?.postMessage("close");}catch{}
      try{window.NAHWERKAndroidLive?.close?.();}catch{}
    };
    window.startNahwerkAppLive=async(sessionToken)=>{
      if(typeof sessionToken!=="string"||sessionToken.length<32)return false;
      const generation=++lifecycleGeneration;
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
        return generation===lifecycleGeneration && token===sessionToken;
      }catch(error){
        if(generation===lifecycleGeneration)token="";
        throw error;
      }
    };
    window.stopNahwerkAppLive=async()=>{
      lifecycleGeneration++;
      token="";
      if(controller)await controller.stop();
      return true;
    };
  