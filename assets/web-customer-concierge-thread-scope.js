(() => {
  "use strict";

  const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const GATEWAY_PATH="/functions/v1/nahwerk-web-gateway";
  const nativeFetch=window.fetch.bind(window);
  let mainThreadId="";

  const validUuid=(value)=>UUID.test(String(value||""));
  const pathOf=(input)=>{
    try{return new URL(typeof input==="string"?input:input?.url||"",location.href).pathname;}
    catch{return "";}
  };
  const jsonClone=async(response)=>response.clone().json().catch(()=>null);

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

  function normalizeThreadList(payload){
    if(!payload||!Array.isArray(payload.threads))return payload;
    let main=payload.threads.find((thread)=>thread?.is_main===true||String(thread?.thread_scope||"").toUpperCase()==="MAIN")||null;
    if(!mainThreadId&&validUuid(main?.thread_id))mainThreadId=String(main.thread_id);
    if(mainThreadId){
      if(!main){
        main={thread_id:mainThreadId,title:"Hauptchat",preview:"Web · App · WhatsApp",updated_at:null,created_at:null,turn_count:0,channels:["WEB","APP","WHATSAPP"],is_main:true,thread_scope:"MAIN"};
      }else{
        main={...main,thread_id:mainThreadId,title:"Hauptchat",preview:"Web · App · WhatsApp",is_main:true,thread_scope:"MAIN"};
      }
    }
    const extras=payload.threads
      .filter((thread)=>thread!==main&&thread?.is_main!==true&&String(thread?.thread_scope||"").toUpperCase()!=="MAIN")
      .map((thread)=>({...thread,is_main:false,thread_scope:"EXTRA",preview:String(thread?.preview||"").startsWith("Extra-Chat")?thread.preview:`Extra-Chat${thread?.preview?` · ${thread.preview}`:""}`}));
    payload.threads=main?[main,...extras]:extras;
    return payload;
  }

  function decorateSidebar(){
    const box=document.getElementById("webConciergeThreads");
    if(!box)return;
    for(const button of box.querySelectorAll(".web-concierge-thread")){
      const title=button.querySelector(".web-concierge-thread-title");
      const preview=button.querySelector(".web-concierge-thread-preview");
      const isMain=(mainThreadId&&button.dataset.threadId===mainThreadId)||title?.textContent==="Hauptchat";
      const scope=isMain?"MAIN":"EXTRA";
      if(button.dataset.chatScope!==scope)button.dataset.chatScope=scope;
      if(isMain){
        if(title&&title.textContent!=="Hauptchat")title.textContent="Hauptchat";
        if(preview&&preview.textContent!=="Web · App · WhatsApp")preview.textContent="Web · App · WhatsApp";
        if(button.getAttribute("aria-label")!=="Hauptchat – Web, App und WhatsApp")button.setAttribute("aria-label","Hauptchat – Web, App und WhatsApp");
        if(button.style.border!=="1px solid rgba(205, 168, 78, 0.26)")button.style.border="1px solid rgba(205,168,78,.26)";
        if(button.style.background!=="rgba(205, 168, 78, 0.065)")button.style.background="rgba(205,168,78,.065)";
      }else{
        if(button.style.border!=="1px solid transparent")button.style.border="1px solid transparent";
        if(button.style.background)button.style.background="";
      }
    }
  }

  const observer=new MutationObserver(()=>decorateSidebar());
  const startObserver=()=>{
    const box=document.getElementById("webConciergeThreads");
    if(box){observer.observe(box,{childList:true,subtree:true});decorateSidebar();}
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",startObserver,{once:true});else startObserver();

  window.fetch=async function(input,init){
    const path=pathOf(input);
    if(!path.startsWith(GATEWAY_PATH))return nativeFetch(input,init);

    const method=String(init?.method||((typeof input!=="string"&&input?.method)||"GET")).toUpperCase();
    let nextInit=init;
    let outgoingThreadId="";
    let outgoingScope="";

    if(method==="POST"&&path.endsWith("/web/chat")&&typeof init?.body==="string"){
      try{
        const body=JSON.parse(init.body);
        const threadId=String(body?.thread_id||"");
        if(validUuid(threadId)){
          outgoingThreadId=threadId;
          outgoingScope=mainThreadId&&threadId===mainThreadId?"MAIN":"EXTRA";
          body.client_correlation_id=`${outgoingScope==="MAIN"?"main":"extra"}-thread-v1:${threadId}`;
          nextInit={...init,body:JSON.stringify(body)};
        }
      }catch{}
    }

    const response=await nativeFetch(input,nextInit);

    if(method==="GET"&&path.endsWith("/web/me")&&response.ok){
      const payload=await jsonClone(response);
      mainIdFromMe(payload);
      queueMicrotask(decorateSidebar);
      return response;
    }

    if(method==="GET"&&path.endsWith("/web/history")&&!new URL(typeof input==="string"?input:input.url,location.href).searchParams.has("thread_id")&&response.ok){
      const payload=await jsonClone(response);
      if(payload){normalizeThreadList(payload);queueMicrotask(decorateSidebar);return rewriteJsonResponse(response,payload);}
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
})();
