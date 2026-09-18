(() => {
  "use strict";

  const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const GATEWAY_PATH="/functions/v1/nahwerk-web-gateway";
  const VIRTUAL_WHATSAPP_THREAD_ID="00000000-0000-4000-8000-0000000000a1";
  const VIRTUAL_TELEGRAM_THREAD_ID="00000000-0000-4000-8000-0000000000a2";
  const NORMAL_CHANNELS=new Set(["WEB","APP"]);
  const nativeFetch=window.fetch.bind(window);
  let mainThreadId="";
  let lastPublishedView="";

  const validUuid=(value)=>UUID.test(String(value||""));
  const pathOf=(input)=>{
    try{return new URL(typeof input==="string"?input:input?.url||"",location.href).pathname;}
    catch{return "";}
  };
  const urlOf=(input)=>{
    try{return new URL(typeof input==="string"?input:input?.url||"",location.href);}
    catch{return null;}
  };
  const jsonClone=async(response)=>response.clone().json().catch(()=>null);
  const normalizedChannel=(value)=>String(value||"WEB").trim().toUpperCase()||"WEB";

  function mainIdFromMe(payload){
    const id=String(payload?.conversation?.conversation_id||"");
    if(validUuid(id))mainThreadId=id;
  }

  function rewriteJsonResponse(response,payload){
    const headers=new Headers(response.headers);
    headers.set("content-type","application/json; charset=utf-8");
    headers.set("cache-control","no-store");
    return new Response(JSON.stringify(payload),{status:response.status,statusText:response.statusText,headers});
  }

  function normalTitle(thread){
    const title=String(thread?.title||"").trim();
    if(!title||/^hauptchat$/i.test(title)||/^web\s*chat$/i.test(title))return "Chat";
    return title;
  }

  function normalPreview(thread){
    const preview=String(thread?.preview||"").trim();
    if(!preview||/^web\s*·\s*app\s*·\s*whatsapp$/i.test(preview))return "";
    return preview;
  }

  function findMainThread(threads){
    return threads.find((thread)=>thread?.is_main===true||String(thread?.thread_scope||"").toUpperCase()==="MAIN")||null;
  }

  function normalizeThreadList(payload){
    if(!payload||!Array.isArray(payload.threads))return payload;
    const original=[...payload.threads];
    let main=findMainThread(original);
    if(!mainThreadId&&validUuid(main?.thread_id))mainThreadId=String(main.thread_id);

    const projected=[];
    if(mainThreadId){
      const base=main||{
        thread_id:mainThreadId,
        title:"Chat",
        preview:"",
        updated_at:null,
        created_at:null,
        turn_count:0,
        channels:["WEB","APP"],
        is_main:true,
        thread_scope:"MAIN"
      };
      const channels=new Set((Array.isArray(base.channels)?base.channels:[]).map(normalizedChannel));

      projected.push({
        ...base,
        thread_id:mainThreadId,
        title:normalTitle(base),
        preview:normalPreview(base),
        channels:["WEB","APP"],
        is_main:true,
        thread_scope:"MAIN",
        channel_view:"CHAT"
      });

      projected.push({
        ...base,
        thread_id:VIRTUAL_WHATSAPP_THREAD_ID,
        title:"WhatsApp",
        preview:"",
        channels:["WHATSAPP"],
        is_main:false,
        thread_scope:"CHANNEL",
        channel_view:"WHATSAPP",
        virtual_channel_thread:true
      });

      if(channels.has("TELEGRAM")){
        projected.push({
          ...base,
          thread_id:VIRTUAL_TELEGRAM_THREAD_ID,
          title:"Telegram",
          preview:"",
          channels:["TELEGRAM"],
          is_main:false,
          thread_scope:"CHANNEL",
          channel_view:"TELEGRAM",
          virtual_channel_thread:true
        });
      }
    }

    const extras=original
      .filter((thread)=>thread!==main&&thread?.is_main!==true&&String(thread?.thread_scope||"").toUpperCase()!=="MAIN")
      .map((thread)=>({
        ...thread,
        is_main:false,
        thread_scope:"EXTRA",
        channel_view:"CHAT",
        channels:Array.isArray(thread?.channels)&&thread.channels.length?thread.channels:["WEB","APP"]
      }));

    payload.threads=[...projected,...extras];
    return payload;
  }

  function viewForThreadId(threadId){
    const id=String(threadId||"");
    if(id===VIRTUAL_WHATSAPP_THREAD_ID)return "WHATSAPP";
    if(id===VIRTUAL_TELEGRAM_THREAD_ID)return "TELEGRAM";
    return "CHAT";
  }

  function messageMatchesView(message,view){
    const channel=normalizedChannel(message?.channel);
    if(view==="WHATSAPP")return channel==="WHATSAPP";
    if(view==="TELEGRAM")return channel==="TELEGRAM";
    return NORMAL_CHANNELS.has(channel);
  }

  function filterHistoryPayload(payload,view,requestedThreadId){
    if(!payload||!Array.isArray(payload.messages))return payload;
    payload.messages=payload.messages.filter((message)=>messageMatchesView(message,view));
    if(validUuid(requestedThreadId))payload.thread_id=requestedThreadId;
    return payload;
  }

  function publishActiveView(box){
    const active=box?.querySelector(".web-concierge-thread.is-active");
    const next=String(active?.dataset?.chatChannel||"CHAT").toUpperCase();
    if(next===lastPublishedView)return;
    lastPublishedView=next;
    window.dispatchEvent(new CustomEvent("nahwerk:chat-channel-view",{
      detail:{
        channel:next,
        readOnly:next==="WHATSAPP"||next==="TELEGRAM"
      }
    }));
  }

  function decorateSidebar(){
    const box=document.getElementById("webConciergeThreads");
    if(!box)return;
    for(const button of box.querySelectorAll(".web-concierge-thread")){
      const id=String(button.dataset.threadId||"");
      const channel=viewForThreadId(id);
      button.dataset.chatChannel=channel;
      button.dataset.chatScope=channel==="CHAT"?(id===mainThreadId?"MAIN":"EXTRA"):"CHANNEL";

      const title=button.querySelector(".web-concierge-thread-title");
      const preview=button.querySelector(".web-concierge-thread-preview");

      if(id===mainThreadId){
        if(title&&(/^hauptchat$/i.test(title.textContent||"")||/^web\s*chat$/i.test(title.textContent||"")))title.textContent="Chat";
        if(preview&&/^web\s*·\s*app\s*·\s*whatsapp$/i.test(preview.textContent||""))preview.textContent="";
        button.setAttribute("aria-label","Chat");
      }else if(channel==="WHATSAPP"){
        if(title&&title.textContent!=="WhatsApp")title.textContent="WhatsApp";
        if(preview&&preview.textContent!=="")preview.textContent="";
        button.setAttribute("aria-label","WhatsApp");
      }else if(channel==="TELEGRAM"){
        if(title&&title.textContent!=="Telegram")title.textContent="Telegram";
        if(preview&&preview.textContent!=="")preview.textContent="";
        button.setAttribute("aria-label","Telegram");
      }
      if(button.style.border)button.style.border="";
      if(button.style.background)button.style.background="";
    }
    publishActiveView(box);
  }

  const observer=new MutationObserver(()=>decorateSidebar());
  const startObserver=()=>{
    const box=document.getElementById("webConciergeThreads");
    if(box){
      observer.observe(box,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});
      decorateSidebar();
    }
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",startObserver,{once:true});else startObserver();

  window.fetch=async function(input,init){
    const requestUrl=urlOf(input);
    const path=requestUrl?.pathname||"";
    if(!path.startsWith(GATEWAY_PATH))return nativeFetch(input,init);

    const method=String(init?.method||((typeof input!=="string"&&input?.method)||"GET")).toUpperCase();
    const requestedThreadId=String(requestUrl?.searchParams.get("thread_id")||"");
    const requestedView=viewForThreadId(requestedThreadId);
    let fetchInput=input;
    let nextInit=init;
    let outgoingThreadId="";
    let outgoingScope="";

    if(method==="GET"&&path.endsWith("/web/history")&&(requestedView==="WHATSAPP"||requestedView==="TELEGRAM")&&validUuid(mainThreadId)){
      const rewritten=new URL(requestUrl.href);
      rewritten.searchParams.set("thread_id",mainThreadId);
      fetchInput=rewritten.href;
    }

    if(method==="POST"&&path.endsWith("/web/chat")&&typeof init?.body==="string"){
      try{
        const body=JSON.parse(init.body);
        const threadId=String(body?.thread_id||"");
        if(threadId===VIRTUAL_WHATSAPP_THREAD_ID||threadId===VIRTUAL_TELEGRAM_THREAD_ID){
          return new Response(JSON.stringify({ok:false,error:"channel_view_read_only"}),{
            status:409,
            headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}
          });
        }
        if(validUuid(threadId)){
          outgoingThreadId=threadId;
          outgoingScope=mainThreadId&&threadId===mainThreadId?"MAIN":"EXTRA";
          body.client_correlation_id=(outgoingScope==="MAIN"?"main":"extra")+"-thread-v2:"+threadId;
          nextInit={...init,body:JSON.stringify(body)};
        }
      }catch{}
    }

    const response=await nativeFetch(fetchInput,nextInit);

    if(method==="GET"&&path.endsWith("/web/me")&&response.ok){
      const payload=await jsonClone(response);
      mainIdFromMe(payload);
      queueMicrotask(decorateSidebar);
      return response;
    }

    if(method==="GET"&&path.endsWith("/web/history")&&response.ok){
      const payload=await jsonClone(response);
      if(!payload)return response;

      if(!requestedThreadId){
        normalizeThreadList(payload);
        queueMicrotask(decorateSidebar);
        return rewriteJsonResponse(response,payload);
      }

      const view=requestedView==="WHATSAPP"||requestedView==="TELEGRAM"
        ? requestedView
        : (requestedThreadId===mainThreadId?"CHAT":"EXTRA");

      if(view!=="EXTRA"){
        filterHistoryPayload(payload,view,requestedThreadId);
        return rewriteJsonResponse(response,payload);
      }
      return response;
    }

    if(method==="POST"&&path.endsWith("/web/chat")&&response.ok&&outgoingScope==="EXTRA"&&validUuid(outgoingThreadId)){
      const payload=await jsonClone(response);
      if(payload?.core&&typeof payload.core==="object"){
        payload.core={...payload.core,canonical_conversation_id:String(payload.core.conversation_id||""),conversation_id:outgoingThreadId};
        return rewriteJsonResponse(response,payload);
      }
    }

    return response;
  };

  window.NAHWERKChatChannelViews=Object.freeze({
    normal:["WEB","APP"],
    whatsapp:"WHATSAPP",
    telegram:"TELEGRAM",
    virtualWhatsAppThreadId:VIRTUAL_WHATSAPP_THREAD_ID,
    virtualTelegramThreadId:VIRTUAL_TELEGRAM_THREAD_ID
  });
})();
