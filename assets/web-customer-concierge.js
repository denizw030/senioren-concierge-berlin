(() => {
  "use strict";

  const SESSION_KEY = "scb_web_session";
  const CORE_CONTRACT_VERSION = "core-v1";
  const GATEWAY_CONTRACT_VERSION = "web-gateway-v1";
  const GATEWAY_ENDPOINT = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-web-gateway";
  const HISTORY_ENDPOINT = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-web-gateway/web/history";
  const HISTORY_CONTRACT_VERSION = "canonical-core-receipts-v1";
  const SYNC_INTERVAL_MS = 3000;
  const RESPONSE_STATES = new Set(["ANSWER","QUESTION","ACTION_STARTED","ACTION_PENDING","ACTION_RESULT","ERROR_RESPONSE","HANDOFF","SAFE_TERMINATION"]);

  let gatewayReady = false;
  let sending = false;
  let activeThreadId = null;
  let threadCache = [];
  let lastDateKey = "";
  let historyFingerprint = "";
  let syncTimer = null;

  function sessionToken() {
    try { return String(JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null")?.session_token || ""); }
    catch { return ""; }
  }

  function configuredEndpoint() {
    try {
      const url = new URL(GATEWAY_ENDPOINT);
      if (url.protocol !== "https:") return null;
      if (url.hostname !== "djicahhmnnamtjuqedqd.supabase.co") return null;
      if (url.pathname !== "/functions/v1/nahwerk-web-gateway") return null;
      if (/staging|shadow/i.test(url.href)) return null;
      return url.href.replace(/\/$/,"");
    } catch { return null; }
  }

  function configuredHistoryEndpoint() {
    try {
      const url = new URL(HISTORY_ENDPOINT);
      if (url.protocol !== "https:" || url.hostname !== "djicahhmnnamtjuqedqd.supabase.co") return null;
      if (url.pathname !== "/functions/v1/nahwerk-web-gateway/web/history") return null;
      return url.href.replace(/\/$/,"");
    } catch { return null; }
  }

  function normalizeGatewayReadiness(raw) {
    if (!raw || typeof raw !== "object") return null;
    const ready = raw.ok === true
      && raw.service === "nahwerk-web-gateway"
      && raw.production === true
      && raw.contract_version === GATEWAY_CONTRACT_VERSION
      && raw.web_route_authoritative === true
      && raw.cao_web_authoritative === true
      && raw.fail_safe === "closed";
    return Object.freeze({
      service:String(raw.service || ""), contract_version:String(raw.contract_version || ""),
      production:raw.production === true, web_route_authoritative:raw.web_route_authoritative === true,
      cao_web_authoritative:raw.cao_web_authoritative === true, fail_safe:String(raw.fail_safe || ""), ready
    });
  }

  function normalizeCoreV1Response(raw) {
    if (!raw || typeof raw !== "object" || raw.contract_version !== CORE_CONTRACT_VERSION) return null;
    const responseState = String(raw.response_state || "").toUpperCase();
    if (!RESPONSE_STATES.has(responseState)) return null;
    const messages = Array.isArray(raw.messages)
      ? raw.messages.filter((item) => item?.type === "text" && typeof item?.text === "string" && item.text.trim()).map((item) => ({ type:"text", text:item.text.trim(), semantic_role:String(item.semantic_role || "core") }))
      : [];
    const delivery = raw.delivery_hints && typeof raw.delivery_hints === "object" ? raw.delivery_hints : {};
    const authoritative = delivery.shadow === false && delivery.deliver === true && String(delivery.channel || "").toUpperCase() === "WEB";
    return {
      response_id:String(raw.response_id || ""), conversation_id:String(raw.conversation_id || ""), turn_id:String(raw.turn_id || ""),
      active_task_id:raw.active_task_id ? String(raw.active_task_id) : null, response_state:responseState, messages,
      pending_approval:raw.pending_approval && typeof raw.pending_approval === "object" ? raw.pending_approval : null,
      action_refs:Array.isArray(raw.action_refs) ? raw.action_refs : [], error:raw.error && typeof raw.error === "object" ? raw.error : null,
      state_version:Number(raw.state_version || 0), correlation_id:String(raw.correlation_id || ""), authoritative
    };
  }

  function validUuid(value) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || "")); }
  function clearNode(node) { while (node?.firstChild) node.removeChild(node.firstChild); }
  function logNode() { return document.getElementById("webConciergeLog"); }
  function scrollBottom() { const log=logNode(); if (log) requestAnimationFrame(() => { log.scrollTop=log.scrollHeight; }); }

  function dateKey(value) {
    const d=new Date(value || Date.now());
    return Number.isNaN(d.getTime()) ? "" : `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
  }
  function dayLabel(value) {
    const d=new Date(value || Date.now()),now=new Date();
    const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    const day=new Date(d.getFullYear(),d.getMonth(),d.getDate());
    const diff=Math.round((today-day)/86400000);
    if(diff===0)return "Heute"; if(diff===1)return "Gestern";
    return new Intl.DateTimeFormat("de-DE",{day:"2-digit",month:"2-digit",year:d.getFullYear()===now.getFullYear()?undefined:"numeric"}).format(d);
  }
  function timeLabel(value) {
    const d=new Date(value || Date.now());
    return Number.isNaN(d.getTime()) ? "" : new Intl.DateTimeFormat("de-DE",{hour:"2-digit",minute:"2-digit"}).format(d);
  }
  function appendDateIfNeeded(at) {
    const log=logNode(),key=dateKey(at); if(!log||!key||key===lastDateKey)return;
    lastDateKey=key; const el=document.createElement("div");el.className="web-concierge-date";el.textContent=dayLabel(at);log.appendChild(el);
  }
  function appendMessage(role,text,at=new Date().toISOString(),id="") {
    const log=logNode(); if(!log||!text)return null;
    log.querySelector(".web-concierge-empty")?.remove(); appendDateIfNeeded(at);
    const row=document.createElement("div");row.className=`web-concierge-message-row is-${role}`;if(id)row.dataset.messageId=id;
    const bubble=document.createElement("div");bubble.className=`web-concierge-message web-concierge-message-${role}`;
    const body=document.createElement("span");body.className="web-concierge-message-text";body.textContent=text;
    const time=document.createElement("span");time.className="web-concierge-message-time";time.textContent=timeLabel(at);
    bubble.append(body,time);row.appendChild(bubble);log.appendChild(row);scrollBottom();return row;
  }
  function emptyChat() {
    const log=logNode(); if(!log)return;clearNode(log);lastDateKey="";historyFingerprint="";
    const empty=document.createElement("div");empty.className="web-concierge-empty";
    const strong=document.createElement("strong");strong.textContent="Wie kann ich dir helfen?";
    const span=document.createElement("span");span.textContent="Schreib mir einfach, was du brauchst.";empty.append(strong,span);log.appendChild(empty);
  }
  function showTyping() {
    const log=logNode(); if(!log)return;removeTyping();
    const row=document.createElement("div");row.className="web-concierge-message-row is-assistant";row.id="webConciergeTyping";
    const typing=document.createElement("div");typing.className="web-concierge-typing";typing.setAttribute("aria-label","NAHWERK Concierge schreibt");
    for(let i=0;i<3;i++)typing.appendChild(document.createElement("i"));row.appendChild(typing);log.appendChild(row);scrollBottom();
  }
  function removeTyping(){document.getElementById("webConciergeTyping")?.remove();}

  function addRuntimeCard(titleText,bodyText,className="") {
    const log=logNode();if(!log)return null;
    const card=document.createElement("div");card.className=`web-concierge-runtime-card${className?` ${className}`:""}`;
    const title=document.createElement("strong");title.textContent=titleText;const text=document.createElement("span");text.textContent=bodyText;card.append(title,text);log.appendChild(card);scrollBottom();return card;
  }
  function paygQuoteIdOf(pending) { return [pending?.payg_quote_id,pending?.metadata?.payg_quote_id].map((v)=>String(v||"")).find(validUuid)||null; }
  function renderApproval(pending) {
    const approvalId=String(pending?.approval_id||"");
    if(!validUuid(approvalId)){addRuntimeCard("Freigabe erforderlich","Diese Freigabe kann gerade nicht angezeigt werden. Bitte versuche es noch einmal.","is-error");return;}
    const card=addRuntimeCard("Freigabe erforderlich",String(pending?.prompt_text||pending?.message||"Bitte bestätige, wie ich fortfahren soll."));if(!card)return;
    const actions=document.createElement("div");actions.className="web-concierge-approval-actions";const quoteId=paygQuoteIdOf(pending);
    if(quoteId){const link=document.createElement("a");link.className="btn red";link.href=`/payg#quote-${encodeURIComponent(quoteId)}`;link.textContent="Preis prüfen und freigeben";actions.appendChild(link);}
    else{const hint=document.createElement("span");hint.textContent="Antworte einfach im Chat mit deiner Entscheidung.";actions.appendChild(hint);}card.appendChild(actions);
  }
  function renderCoreV1Response(raw) {
    const response=normalizeCoreV1Response(raw);if(!response||!response.authoritative)return false;
    removeTyping();const now=new Date().toISOString();
    for(const message of response.messages)appendMessage("assistant",message.text,now,`a:${response.turn_id}`);
    if(response.pending_approval)renderApproval(response.pending_approval);
    if(response.error)addRuntimeCard("Das hat noch nicht geklappt",String(response.error.customer_safe_message||"Bitte versuche es noch einmal."),"is-error");
    return true;
  }

  async function gatewayRequest(path,{method="GET",body=null,auth=true}={}) {
    const endpoint=configuredEndpoint();if(!endpoint)throw new Error("gateway_not_configured");const headers={};
    if(auth){const token=sessionToken();if(!token)throw new Error("session_required");headers.Authorization=`Bearer ${token}`;}
    if(body!==null)headers["Content-Type"]="application/json";
    const response=await fetch(`${endpoint}${path}`,{method,headers,body:body===null?undefined:JSON.stringify(body),cache:"no-store",credentials:"omit"});
    const payload=await response.json().catch(()=>({}));if(!response.ok||payload?.ok===false)throw new Error(String(payload?.error||`http_${response.status}`));return payload;
  }
  async function historyRequest(threadId=null) {
    const endpoint=configuredHistoryEndpoint(),token=sessionToken();if(!endpoint||!token)throw new Error("history_unavailable");
    const url=threadId?`${endpoint}?thread_id=${encodeURIComponent(threadId)}`:endpoint;
    const response=await fetch(url,{headers:{Authorization:`Bearer ${token}`},cache:"no-store",credentials:"omit"});
    const payload=await response.json().catch(()=>({}));if(!response.ok||payload?.ok!==true||payload?.history_contract!==HISTORY_CONTRACT_VERSION)throw new Error("history_unavailable");return payload;
  }

  function setComposerReady(ready) {
    const input=document.getElementById("webConciergeInput"),send=document.getElementById("webConciergeSend");
    if(input){input.disabled=!ready;input.setAttribute("aria-disabled",ready?"false":"true");}
    if(send)send.disabled=!ready||sending;
  }
  function resizeInput(){const input=document.getElementById("webConciergeInput");if(!(input instanceof HTMLTextAreaElement))return;input.style.height="auto";input.style.height=`${Math.min(input.scrollHeight,132)}px`;}
  function sidebarDate(value){const d=new Date(value||Date.now()),now=new Date();if(Number.isNaN(d.getTime()))return "";if(dateKey(d)===dateKey(now))return timeLabel(d);return new Intl.DateTimeFormat("de-DE",{day:"2-digit",month:"2-digit"}).format(d);}
  function renderThreads() {
    const box=document.getElementById("webConciergeThreads");if(!box)return;clearNode(box);
    const list=[...threadCache];if(activeThreadId&&!list.some((t)=>t.thread_id===activeThreadId))list.unshift({thread_id:activeThreadId,title:"Neuer Chat",preview:"",updated_at:new Date().toISOString(),draft:true});
    if(!list.length){const e=document.createElement("div");e.className="web-concierge-threads-empty";e.textContent="Noch keine gespeicherten Chats.";box.appendChild(e);return;}
    for(const thread of list){const b=document.createElement("button");b.type="button";b.className=`web-concierge-thread${thread.thread_id===activeThreadId?" is-active":""}`;b.dataset.threadId=thread.thread_id;
      const title=document.createElement("span");title.className="web-concierge-thread-title";title.textContent=thread.title||"Chat";
      const preview=document.createElement("span");preview.className="web-concierge-thread-preview";preview.textContent=thread.preview||"";
      const date=document.createElement("span");date.className="web-concierge-thread-date";date.textContent=thread.draft?"":sidebarDate(thread.updated_at);
      b.append(title,preview,date);b.addEventListener("click",()=>selectThread(thread.thread_id));box.appendChild(b);
    }
  }
  function historySignature(messages) {
    return (Array.isArray(messages)?messages:[]).map((m)=>`${m?.id||""}|${m?.at||""}|${m?.role||""}|${m?.text||""}`).join("\n");
  }
  function renderHistory(messages,{force=false}={}) {
    const list=Array.isArray(messages)?messages.filter((m)=>(m?.role==="user"||m?.role==="assistant")&&m?.text):[];
    const signature=historySignature(list);if(!force&&signature===historyFingerprint)return false;
    const log=logNode();if(!log)return false;clearNode(log);lastDateKey="";removeTyping();
    if(!list.length){emptyChat();return true;}
    for(const m of list)appendMessage(m.role,m.text,m.at,m.id);
    historyFingerprint=signature;return true;
  }
  async function loadThreads({selectFirst=false}={}) {
    try{const data=await historyRequest();threadCache=Array.isArray(data.threads)?data.threads:[];if(selectFirst&&!activeThreadId&&threadCache[0])activeThreadId=threadCache[0].thread_id;renderThreads();return true;}catch{renderThreads();return false;}
  }
  async function refreshThread(threadId,{force=false,showError=false}={}) {
    if(!validUuid(threadId))return false;
    try{const data=await historyRequest(threadId);if(activeThreadId!==threadId)return false;renderHistory(data.messages,{force});return true;}
    catch{if(showError)addRuntimeCard("Verlauf nicht verfügbar","Der gespeicherte Verlauf konnte gerade nicht geladen werden. Neue Nachrichten kannst du weiterhin senden.","is-error");return false;}
  }
  async function selectThread(threadId) {
    if(sending)return;activeThreadId=threadId;historyFingerprint="";renderThreads();emptyChat();
    if(validUuid(threadId))await refreshThread(threadId,{force:true,showError:true});
    document.getElementById("webConciergeInput")?.focus();
  }
  function newChat() { if(sending)return;activeThreadId=crypto.randomUUID();emptyChat();renderThreads();document.getElementById("webConciergeInput")?.focus(); }

  async function syncHistory() {
    if(!gatewayReady||sending||document.hidden)return false;
    const selectedBefore=activeThreadId;
    const loaded=await loadThreads();if(!loaded)return false;
    const serverHasSelected=selectedBefore&&threadCache.some((thread)=>thread.thread_id===selectedBefore);
    if(serverHasSelected)return refreshThread(selectedBefore);
    if(!selectedBefore&&threadCache[0]){activeThreadId=threadCache[0].thread_id;renderThreads();return refreshThread(activeThreadId,{force:true});}
    return true;
  }
  function startLiveSync() {
    if(syncTimer)clearInterval(syncTimer);
    syncTimer=setInterval(()=>{void syncHistory();},SYNC_INTERVAL_MS);
    document.addEventListener("visibilitychange",()=>{if(!document.hidden)void syncHistory();});
  }

  async function sendTurn() {
    const input=document.getElementById("webConciergeInput");if(!(input instanceof HTMLTextAreaElement)||!gatewayReady||sending)return;
    const content=input.value.trim();if(!content||content.length>4000)return;if(!activeThreadId)activeThreadId=crypto.randomUUID();
    const sourceMessageId=crypto.randomUUID(),clientId=`local:${sourceMessageId}`,now=new Date().toISOString();
    appendMessage("user",content,now,clientId);input.value="";resizeInput();sending=true;setComposerReady(true);showTyping();
    try{
      const response=await gatewayRequest("/web/chat",{method:"POST",body:{message:content,source_message_id:sourceMessageId,thread_id:activeThreadId}});
      if(response?.ok!==true||response?.environment!=="PROD"||response?.authoritative!==true||(response?.thread_id&&response?.thread_id!==activeThreadId))throw new Error("gateway_response_not_authoritative");
      if(!renderCoreV1Response(response.core))throw new Error("core_response_not_authoritative");
      const canonicalThreadId=String(response?.core?.conversation_id||"");if(validUuid(canonicalThreadId))activeThreadId=canonicalThreadId;
      await loadThreads();
      if(validUuid(activeThreadId))await refreshThread(activeThreadId,{force:true});
    }catch{
      removeTyping();const row=document.querySelector(`[data-message-id="${CSS.escape(clientId)}"]`);row?.classList.add("is-failed");
      if(row){const state=document.createElement("span");state.className="web-concierge-message-state";state.textContent="Nicht gesendet – bitte noch einmal versuchen.";row.appendChild(state);}
    }finally{sending=false;setComposerReady(gatewayReady);input.focus();}
  }

  async function checkReadiness() {
    try{
      const readiness=normalizeGatewayReadiness(await gatewayRequest("/health",{auth:false}));if(readiness?.ready!==true)throw new Error("gateway_not_authoritative");
      const me=await gatewayRequest("/web/me"),identity=me?.identity&&typeof me.identity==="object"?me.identity:{};
      if(me?.ok!==true||me?.environment!=="PROD"||me?.authoritative!==true)throw new Error("gateway_identity_not_authoritative");
      if(![identity.person_id,identity.customer_account_id,identity.customer_member_id].every(validUuid))throw new Error("gateway_identity_invalid");
      gatewayReady=true;return true;
    }catch{gatewayReady=false;return false;}
  }

  async function boot() {
    const valid=window.SCBAuth?.validateSession?await window.SCBAuth.validateSession().catch(()=>false):false;if(!valid){location.replace("/anmelden");return;}
    const status=document.getElementById("webConciergeStatus");setComposerReady(false);const ready=await checkReadiness();
    if(status){status.textContent=ready?"Online":"Verbindung momentan nicht möglich";status.classList.toggle("is-online",ready);}
    setComposerReady(ready);if(ready){const loaded=await loadThreads({selectFirst:true});if(activeThreadId)await selectThread(activeThreadId);else{newChat();if(!loaded)renderThreads();}startLiveSync();}
    document.getElementById("webConciergeNewChat")?.addEventListener("click",newChat);
    document.getElementById("webConciergeSend")?.addEventListener("click",sendTurn);
    document.getElementById("webConciergeInput")?.addEventListener("input",resizeInput);
    document.getElementById("webConciergeInput")?.addEventListener("keydown",(event)=>{if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();sendTurn();}});
  }

  window.NAHWERKWebCustomerConciergeTestHooks=Object.freeze({configuredEndpoint,configuredHistoryEndpoint,sessionToken,normalizeGatewayReadiness,normalizeCoreV1Response,renderCoreV1Response,gatewayRequest,historyRequest,syncHistory,CORE_CONTRACT_VERSION,GATEWAY_CONTRACT_VERSION,HISTORY_CONTRACT_VERSION,SYNC_INTERVAL_MS,GATEWAY_ENDPOINT,HISTORY_ENDPOINT});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();