
    import { mountNahwerkLiveConcierge } from "/assets/nahwerk-live-concierge.js?v=29";
    import { createStewaroClientCallJoin } from "/assets/stewaro-client-call-join.js?v=1";
    let token="";
    let controller=null;
    let callJoin=null;
    const notifyClose=()=>{
      try{window.webkit?.messageHandlers?.nahwerkLiveClose?.postMessage("close");}catch{}
      try{window.NAHWERKAndroidLive?.close?.();}catch{}
    };
    window.startNahwerkAppLive=async(sessionToken)=>{
      if(typeof sessionToken!=="string"||sessionToken.length<32)return false;
      token=sessionToken;
      document.getElementById("appLiveBoot")?.remove();
      if(!callJoin){
        callJoin=createStewaroClientCallJoin({
          channel:"APP",
          getAuthToken:()=>token,
          onStateChange:(detail)=>{
            try{window.webkit?.messageHandlers?.nahwerkClientCallJoinState?.postMessage(detail);}catch{}
            try{window.NAHWERKAndroidLive?.clientCallJoinState?.(JSON.stringify(detail));}catch{}
          }
        });
      }
      void callJoin.start();
      if(!controller){
        controller=mountNahwerkLiveConcierge({
          button:"#appLiveStart",
          channel:"APP",
          fidelRoom:true,
          getAuthToken:()=>token,
          onClose:notifyClose
        });
      }
      await controller.start();
      return true;
    };
    window.stopNahwerkAppLive=async()=>{
      if(controller)await controller.stop();
      if(callJoin)await callJoin.stop();
      return true;
    };
  