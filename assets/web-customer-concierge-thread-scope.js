(() => {
  "use strict";

  const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const GATEWAY_PATH="/functions/v1/nahwerk-web-gateway";
  const VIRTUAL_WHATSAPP_THREAD_ID="00000000-0000-4000-8000-0000000000a1";
  const VIRTUAL_PHONE_THREAD_ID="00000000-0000-4000-8000-0000000000a3";
  const NORMAL_CHANNELS=new Set(["WEB","APP"]);
  const nativeFetch=window.fetch.bind(window);

  let mainThreadId="";
  let phoneAvailable=false;
  let phoneProbeAt=0;
  let lastPublishedView="";

  const validUuid=(value)=>UUID.test(String(value||""));
  const urlOf=(input)=>{try{return new URL(typeof input==="string"?input:input?.url||"",location.href);}catch{return null;}};
  const jsonClone=async(response)=>response.clone().json().catch(()=>null);
  const normalizedChannel=(value)=>String(value||"WEB").trim().toUpperCase()||"WEB";

  function rewriteJsonResponse(response,payload){
    const headers=new Headers(response.headers);
    headers.set("content-type","application/json; charset=utf-8");
    headers.set("cache-control","no-store");
    return new Response(JSON.stringify(payload),{status:response.status,statusText:response.statusText,headers});
  }

  function isNormalThread(thread){
    const channels=Array.isArray(thread?.channels)?thread.channels.map(normalizedChannel):[];
    return channels.some((channel)=>NORMAL_CHANNELS.has(channel));
  }

  function normalTitle(thread){
    const title=String(thread?.title||"").trim();
    if(!title||/^hauptchat$/i.test(title)||/^web\s*chat$/i.test(title))return "Chat";
    return title;
  }

  function normalPreview(thread){
    const preview=String(thread?.preview||"").trim();
    return preview;
  }

  function selectMainThread(threads){
    const main=threads.find(isNormalThread)||null;
    if(validUuid(main?.thread_id))mainThreadId=String(main.thread_id);
    if(!validUuid(mainThreadId))mainThreadId=crypto.randomUUID();
    return main;
  }

  function normalizeThreadList(payload){
    if(!payload||!Array.isArray(payload.threads))return payload;
    const original=[...payload.threads];
    const main=selectMainThread(original);
    const base=main||{
      thread_id:mainThreadId,
      title:"Chat",
      preview:"",
      updated_at:new Date().toISOString(),
      created_at:new Date().toISOString(),
      turn_count:0,
      channels:["WEB","APP"]
    };

    const projected=[{
      ...base,
      thread_id:mainThreadId,
      title:"Chat",
      preview:normalPreview(base),
      channels:["WEB","APP"],
      is_main:true,
      thread_scope:"MAIN",
      channel_view:"CHAT"
    },{
      thread_id:VIRTUAL_WHATSAPP_THREAD_ID,
      title:"WhatsApp",
      preview:"",
      updated_at:null,
      created_at:null,
      turn_count:0,
      channels:["WHATSAPP"],
      is_main:false,
      thread_scope:"CHANNEL",
      channel_view:"WHATSAPP",
      virtual_channel_thread:true
    }];

    if(phoneAvailable){
      projected.push({
        thread_id:VIRTUAL_PHONE_THREAD_ID,
        title:"Telefonprotokoll",
        preview:"",
        updated_at:null,
        created_at:null,
        turn_count:0,
        channels:["PHONE"],
        is_main:false,
        thread_scope:"CHANNEL",
        channel_view:"PHONE",
        virtual_channel_thread:true
      });
    }

    payload.threads=projected;
    return payload;
  }

  function viewForThreadId(threadId){
    const id=String(threadId||"");
    if(id===VIRTUAL_WHATSAPP_THREAD_ID)return "WHATSAPP";
    if(id===VIRTUAL_PHONE_THREAD_ID)return "PHONE";
    return "CHAT";
  }

  function filterNormalHistory(payload){
    if(!payload||!Array.isArray(payload.messages))return payload;
    payload.messages=payload.messages.filter((message)=>NORMAL_CHANNELS.has(normalizedChannel(message?.channel)));
    return payload;
  }

  function publishActiveView(box){
    const active=box?.querySelector(".web-concierge-thread.is-active");
    const next=String(active?.dataset?.chatChannel||"CHAT").toUpperCase();
    if(next===lastPublishedView)return;
    lastPublishedView=next;
    window.dispatchEvent(new CustomEvent("nahwerk:chat-channel-view",{
      detail:{channel:next,readOnly:next==="WHATSAPP"||next==="PHONE"}
    }));
  }

  function decorateSidebar(){
    const box=document.getElementById("webConciergeThreads");
    if(!box)return;
    for(const button of box.querySelectorAll(".web-concierge-thread")){
      const id=String(button.dataset.threadId||"");
      const channel=viewForThreadId(id);
      button.dataset.chatChannel=channel;
      button.dataset.chatScope=channel==="CHAT"?"MAIN":"CHANNEL";

      const title=button.querySelector(".web-concierge-thread-title");
      const preview=button.querySelector(".web-concierge-thread-preview");
      if(channel==="CHAT"){
        if(title)title.textContent="Chat";
        button.setAttribute("aria-label","Chat");
      }else if(channel==="WHATSAPP"){
        if(title)title.textContent="WhatsApp";
        if(preview)preview.textContent="";
        button.setAttribute("aria-label","WhatsApp");
      }else if(channel==="PHONE"){
        if(title)title.textContent="Telefonprotokoll";
        if(preview)preview.textContent="";
        button.setAttribute("aria-label","Telefonprotokoll");
      }
      delete button.dataset.chatChannelFirst;
    }
    const firstChannel=[...box.querySelectorAll(".web-concierge-thread")].find((button)=>button.dataset.chatScope==="CHANNEL");
    if(firstChannel)firstChannel.dataset.chatChannelFirst="true";
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

  async function channelHistory(requestUrl,init,channel,threadId){
    const url=new URL(requestUrl.origin+GATEWAY_PATH+"/web/channel-history");
    url.searchParams.set("channel",channel);
    const response=await nativeFetch(url.href,{
      method:"GET",
      headers:init?.headers,
      cache:"no-store",
      credentials:"omit"
    });
    const payload=await jsonClone(response)||{};
    payload.thread_id=threadId;
    payload.history_contract="canonical-core-receipts-v1";
    return rewriteJsonResponse(response,payload);
  }

  async function probePhone(requestUrl,init){
    if(Date.now()-phoneProbeAt<15000)return;
    phoneProbeAt=Date.now();
    try{
      const url=new URL(requestUrl.origin+GATEWAY_PATH+"/web/channel-history");
      url.searchParams.set("channel","PHONE");
      const response=await nativeFetch(url.href,{
        method:"GET",
        headers:init?.headers,
        cache:"no-store",
        credentials:"omit"
      });
      const payload=await response.json().catch(()=>null);
      phoneAvailable=response.ok&&payload?.has_calls===true;
    }catch{}
  }

  window.fetch=async function(input,init){
    const requestUrl=urlOf(input);
    const path=requestUrl?.pathname||"";
    if(!path.startsWith(GATEWAY_PATH))return nativeFetch(input,init);

    const method=String(init?.method||((typeof input!=="string"&&input?.method)||"GET")).toUpperCase();
    const requestedThreadId=String(requestUrl?.searchParams.get("thread_id")||"");
    const requestedView=viewForThreadId(requestedThreadId);

    if(method==="GET"&&path.endsWith("/web/history")&&requestedThreadId){
      if(requestedView==="WHATSAPP")return channelHistory(requestUrl,init,"WHATSAPP",VIRTUAL_WHATSAPP_THREAD_ID);
      if(requestedView==="PHONE")return channelHistory(requestUrl,init,"PHONE",VIRTUAL_PHONE_THREAD_ID);
    }

    if(method==="POST"&&path.endsWith("/web/chat")&&typeof init?.body==="string"){
      try{
        const body=JSON.parse(init.body);
        const threadId=String(body?.thread_id||"");
        if(threadId===VIRTUAL_WHATSAPP_THREAD_ID||threadId===VIRTUAL_PHONE_THREAD_ID){
          return new Response(JSON.stringify({ok:false,error:"channel_view_read_only"}),{
            status:409,
            headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}
          });
        }
      }catch{}
    }

    const response=await nativeFetch(input,init);

    if(method==="GET"&&path.endsWith("/web/history")&&response.ok){
      const payload=await jsonClone(response);
      if(!payload)return response;

      if(!requestedThreadId){
        await probePhone(requestUrl,init);
        normalizeThreadList(payload);
        queueMicrotask(decorateSidebar);
        return rewriteJsonResponse(response,payload);
      }

      filterNormalHistory(payload);
      payload.thread_id=requestedThreadId;
      return rewriteJsonResponse(response,payload);
    }

    return response;
  };

  window.NAHWERKChatChannelViews=Object.freeze({
    normal:["WEB","APP"],
    whatsapp:"WHATSAPP",
    phone:"PHONE",
    virtualWhatsAppThreadId:VIRTUAL_WHATSAPP_THREAD_ID,
    virtualPhoneThreadId:VIRTUAL_PHONE_THREAD_ID
  });
})();