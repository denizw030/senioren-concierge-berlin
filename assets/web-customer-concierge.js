(() => {
  "use strict";

  const SESSION_KEY = "scb_web_session";
  const CORE_CONTRACT_VERSION = "core-v1";
  const GATEWAY_CONTRACT_VERSION = "web-gateway-v1";
  const GATEWAY_ENDPOINT = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-web-gateway";
  let lastInputWasVoiceMemo=false;
  const HISTORY_ENDPOINT = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-web-gateway/web/history";
  const HISTORY_CONTRACT_VERSION = "canonical-core-receipts-v1";
  const HISTORY_PAGE_SIZE = 60;
  const SYNC_INTERVAL_MS = 3000;
  const PERSONA_SYNC_INTERVAL_MS = 3000;
  const CLIENT_FETCH_TIMEOUT_MS = 12000;
  const SETTINGS_URL = "/concierge-anpassen";
  const isMobile=()=>window.matchMedia("(max-width:820px)").matches;
  const RESPONSE_STATES = new Set(["ANSWER","QUESTION","ACTION_STARTED","ACTION_PENDING","ACTION_RESULT","ERROR_RESPONSE","HANDOFF","SAFE_TERMINATION"]);

  let gatewayReady = false;
  let sending = false;
  let activeThreadId = null;
  let threadCache = [];
  let lastDateKey = "";
  let historyFingerprint = "";
  let historyMessages = [];
  let historyHasMore = false;
  let historyNextBefore = null;
  let historyLoadedOlder = false;
  let loadingOlder = false;
  let syncTimer = null;
  let lastPersonaSyncAt = 0;
  let channelView = "CHAT";
  let channelViewReadOnly = false;

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

  function normalizePersona(raw) {
    if (!raw || typeof raw !== "object") return null;
    const rawKey = [raw.persona_id,raw.persona_key,raw.key,raw.slug,raw.id,raw.code].map((v)=>String(v||"").trim().toLowerCase()).find(Boolean) || "";
    const key = /^[a-z0-9_-]{1,64}$/.test(rawKey) ? rawKey : "";
    const name = [raw.display_name,raw.name,raw.persona_name,raw.label].map((v)=>String(v||"").trim()).find(Boolean) || (key ? key.charAt(0).toUpperCase()+key.slice(1) : "");
    const directImage = [raw.image_url,raw.avatar_url,raw.portrait_url,raw.photo_url,raw.image,raw.avatar,raw.portrait].map((v)=>String(v||"").trim()).find(Boolean) || "";
    let image = "";
    if (directImage) {
      try {
        const url = new URL(directImage,location.origin);
        if (url.origin === location.origin || url.protocol === "https:") image = url.href;
      } catch {}
    }
    if (!image && key) image = `/assets/concierges/large/${encodeURIComponent(key)}.webp`;
    return { key, name, image };
  }

  function openConciergeSettings() { location.href = SETTINGS_URL; }

  function applyPersona(raw) {
    const persona = normalizePersona(raw);
    const title = document.getElementById("webConciergeTitle");
    const avatar = document.querySelector(".web-concierge-avatar");
    const name = persona?.name || "Dein Concierge";
    if (title) {
      title.textContent = name;
      title.setAttribute("role","link");
      title.tabIndex = 0;
      title.setAttribute("aria-label",`${name} – Concierge-Einstellungen öffnen`);
      title.title = "Concierge-Einstellungen öffnen";
      title.style.cursor = "pointer";
      title.onclick = openConciergeSettings;
      title.onkeydown = (event) => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openConciergeSettings(); }
      };
    }
    if (avatar) {
      avatar.setAttribute("role","link");
      avatar.tabIndex = 0;
      avatar.setAttribute("aria-label",`${name} – Concierge-Einstellungen öffnen`);
      avatar.title = "Concierge-Einstellungen öffnen";
      avatar.style.cursor = "pointer";
      avatar.onclick = openConciergeSettings;
      avatar.onkeydown = (event) => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openConciergeSettings(); }
      };
      if (persona?.image) {
        avatar.classList.remove("nahwerk-mark");
        avatar.style.backgroundImage = `url("${persona.image.replaceAll('"','%22')}")`;
        avatar.style.backgroundSize = "cover";
        avatar.style.backgroundPosition = "center top";
      }
    }
    return persona;
  }

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
  function appendMessage(role,text,at=new Date().toISOString(),id="",channel="WEB",{scroll=true}={}) {
    const log=logNode(); if(!log||!text)return null;
    log.querySelector(".web-concierge-empty")?.remove(); appendDateIfNeeded(at);
    const normalizedChannel=String(channel||"WEB").toUpperCase();
    const row=document.createElement("div");row.className=`web-concierge-message-row is-${role}`;row.dataset.channel=normalizedChannel;if(id)row.dataset.messageId=id;
    const bubble=document.createElement("div");bubble.className=`web-concierge-message web-concierge-message-${role}`;
    const body=document.createElement("span");body.className="web-concierge-message-text";body.textContent=text;
    const meta=document.createElement("span");meta.style.cssText="display:flex;align-items:center;justify-content:flex-end;gap:6px;margin-top:3px;min-height:14px";
    if(normalizedChannel==="WHATSAPP"){
      const badge=document.createElement("span");
      badge.className="web-concierge-channel-badge is-whatsapp";
      badge.textContent="WhatsApp";
      badge.setAttribute("aria-label","Nachricht über WhatsApp");
      badge.style.cssText="display:inline-flex;align-items:center;min-height:16px;padding:1px 6px;border:1px solid rgba(93,188,124,.28);border-radius:999px;background:rgba(54,145,84,.12);color:#91cda4;font-size:.58rem;font-weight:800;letter-spacing:.02em";
      meta.appendChild(badge);
    }
    const time=document.createElement("span");time.className="web-concierge-message-time";time.textContent=timeLabel(at);time.style.cssText="float:none;margin:0";
    meta.appendChild(time);
    bubble.append(body,meta);row.appendChild(bubble);log.appendChild(row);if(scroll)scrollBottom();return row;
  }
  function resetHistoryState() {
    historyMessages=[];
    historyHasMore=false;
    historyNextBefore=null;
    historyLoadedOlder=false;
    loadingOlder=false;
    historyFingerprint="";
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
    const typing=document.createElement("div");typing.className="web-concierge-typing";typing.setAttribute("aria-label","Dein Concierge schreibt");
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
    for(const message of response.messages){appendMessage("assistant",message.text,now,`a:${response.turn_id}`,"WEB");if(lastInputWasVoiceMemo)void playAssistantAudio(message.text);}lastInputWasVoiceMemo=false;
    if(response.pending_approval)renderApproval(response.pending_approval);
    if(response.error)addRuntimeCard("Das hat noch nicht geklappt",String(response.error.customer_safe_message||"Bitte versuche es noch einmal."),"is-error");
    return true;
  }

  async function playAssistantAudio(text){
    try{
      const token=sessionToken();if(!token||!text)return;
      const response=await fetchWithTimeout(`${GATEWAY_ENDPOINT}/web/audio-reply`,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({text}),cache:"no-store",credentials:"omit"},50000);
      if(!response.ok)return;
      const blob=await response.blob(),url=URL.createObjectURL(blob),audio=new Audio(url);
      audio.addEventListener("ended",()=>URL.revokeObjectURL(url),{once:true});
      await audio.play();
    }catch{}
  }
  window.addEventListener("nahwerk:voice-memo-sent",()=>{lastInputWasVoiceMemo=true;});

  function fetchWithTimeout(url,options={},timeoutMs=CLIENT_FETCH_TIMEOUT_MS) {
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    return fetch(url,{...options,signal:controller.signal}).finally(()=>clearTimeout(timer));
  }

  async function gatewayRequest(path,{method="GET",body=null,auth=true}={}) {
    const endpoint=configuredEndpoint();if(!endpoint)throw new Error("gateway_not_configured");const headers={};
    if(auth){const token=sessionToken();if(!token)throw new Error("session_required");headers.Authorization=`Bearer ${token}`;}
    if(body!==null)headers["Content-Type"]="application/json";
    const response=await fetchWithTimeout(`${endpoint}${path}`,{method,headers,body:body===null?undefined:JSON.stringify(body),cache:"no-store",credentials:"omit"});
    const payload=await response.json().catch(()=>({}));if(!response.ok||payload?.ok===false)throw new Error(String(payload?.error||`http_${response.status}`));return payload;
  }
  async function historyRequest(threadId=null,{before=null,limit=HISTORY_PAGE_SIZE}={}) {
    const endpoint=configuredHistoryEndpoint(),token=sessionToken();if(!endpoint||!token)throw new Error("history_unavailable");
    const url=new URL(endpoint);
    if(threadId){url.searchParams.set("thread_id",threadId);url.searchParams.set("limit",String(limit));if(before)url.searchParams.set("before",before);}
    const response=await fetchWithTimeout(url.href,{headers:{Authorization:`Bearer ${token}`},cache:"no-store",credentials:"omit"});
    const payload=await response.json().catch(()=>({}));if(!response.ok||payload?.ok!==true||payload?.history_contract!==HISTORY_CONTRACT_VERSION)throw new Error("history_unavailable");return payload;
  }

  async function refreshPersona(force=false) {
    const now=Date.now();
    if(!force && now-lastPersonaSyncAt<PERSONA_SYNC_INTERVAL_MS)return true;
    const me=await gatewayRequest("/web/me"),identity=me?.identity&&typeof me.identity==="object"?me.identity:{};
    if(me?.ok!==true||me?.environment!=="PROD"||me?.authoritative!==true)throw new Error("gateway_identity_not_authoritative");
    if(![identity.person_id,identity.customer_account_id,identity.customer_member_id].every(validUuid))throw new Error("gateway_identity_invalid");
    applyPersona(me.persona);
    lastPersonaSyncAt=now;
    return true;
  }

  function setComposerReady(ready) {
    const input=document.getElementById("webConciergeInput"),send=document.getElementById("webConciergeSend");
    const usable=ready&&!channelViewReadOnly;
    if(input){
      input.disabled=!usable;
      input.setAttribute("aria-disabled",usable?"false":"true");
      input.placeholder=channelViewReadOnly
        ? (channelView==="WHATSAPP"?"WhatsApp-Verlauf – antworte in WhatsApp":channelView==="TELEGRAM"?"Telegram-Verlauf – antworte in Telegram":"Nachricht schreiben …")
        : "Nachricht schreiben …";
    }
    if(send)send.disabled=!usable||sending;
  }

  window.addEventListener("nahwerk:chat-channel-view",(event)=>{
    const next=String(event?.detail?.channel||"CHAT").toUpperCase();
    channelView=next;
    channelViewReadOnly=event?.detail?.readOnly===true||next==="WHATSAPP"||next==="TELEGRAM";
    setComposerReady(gatewayReady);
  });
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
      b.append(title,preview,date);b.addEventListener("click",()=>{setMobileDrawer(false);selectThread(thread.thread_id);});box.appendChild(b);
    }
  }
  function historySignature(messages) {
    return `${historyHasMore?"more":"end"}\n`+(Array.isArray(messages)?messages:[]).map((m)=>`${m?.id||""}|${m?.at||""}|${m?.role||""}|${m?.channel||""}|${m?.text||""}`).join("\n");
  }
  function mergeHistory(existing,incoming) {
    const byId=new Map();
    for(const item of [...(Array.isArray(existing)?existing:[]),...(Array.isArray(incoming)?incoming:[])]){
      if(!item||!item.text||(item.role!=="user"&&item.role!=="assistant"))continue;
      const key=String(item.id||`${item.role}:${item.channel||"WEB"}:${item.at||""}:${item.text}`);
      byId.set(key,item);
    }
    return [...byId.values()].sort((a,b)=>Date.parse(String(a.at||0))-Date.parse(String(b.at||0))||String(a.id||"").localeCompare(String(b.id||"")));
  }
  function renderOlderControl() {
    const log=logNode();if(!log||!historyHasMore||!historyNextBefore)return;
    const wrap=document.createElement("div");wrap.className="web-concierge-history-more";wrap.style.cssText="display:flex;justify-content:center;padding:6px 0 12px";
    const button=document.createElement("button");button.type="button";button.className="btn light";button.textContent=loadingOlder?"Wird geladen …":"Ältere Nachrichten laden";button.disabled=loadingOlder;
    button.addEventListener("click",()=>{void loadOlderMessages();});wrap.appendChild(button);log.appendChild(wrap);
  }
  function renderHistory(messages,{force=false,scrollToBottom=true,preserveScroll=false}={}) {
    const list=Array.isArray(messages)?messages.filter((m)=>(m?.role==="user"||m?.role==="assistant")&&m?.text):[];
    const signature=historySignature(list);if(!force&&signature===historyFingerprint)return false;
    const log=logNode();if(!log)return false;const previousHeight=log.scrollHeight,previousTop=log.scrollTop;clearNode(log);lastDateKey="";removeTyping();
    if(!list.length){emptyChat();return true;}
    renderOlderControl();
    for(const m of list)appendMessage(m.role,m.text,m.at,m.id,m.channel||"WEB",{scroll:false});
    historyFingerprint=signature;
    requestAnimationFrame(()=>{
      if(preserveScroll)log.scrollTop=Math.max(0,log.scrollHeight-previousHeight+previousTop);
      else if(scrollToBottom)log.scrollTop=log.scrollHeight;
    });
    return true;
  }
  async function loadThreads({selectFirst=false}={}) {
    try{const data=await historyRequest();threadCache=Array.isArray(data.threads)?data.threads:[];if(selectFirst&&!activeThreadId&&threadCache[0])activeThreadId=threadCache[0].thread_id;renderThreads();return true;}catch{renderThreads();return false;}
  }
  async function refreshThread(threadId,{force=false,reset=false}={}) {
    if(!validUuid(threadId))return false;
    try{
      const data=await historyRequest(threadId,{limit:HISTORY_PAGE_SIZE});if(activeThreadId!==threadId)return false;
      if(reset){historyMessages=mergeHistory([],data.messages);historyHasMore=data.has_more===true;historyNextBefore=data.next_before||null;historyLoadedOlder=false;}
      else{
        historyMessages=mergeHistory(historyMessages,data.messages);
        if(!historyLoadedOlder){historyHasMore=data.has_more===true;historyNextBefore=data.next_before||null;}
      }
      renderHistory(historyMessages,{force,scrollToBottom:reset||force});return true;
    } catch { return false; }
  }
  async function loadOlderMessages() {
    if(loadingOlder||!activeThreadId||!historyHasMore||!historyNextBefore)return false;
    loadingOlder=true;renderHistory(historyMessages,{force:true,scrollToBottom:false,preserveScroll:true});
    try{
      const threadId=activeThreadId;
      const data=await historyRequest(threadId,{before:historyNextBefore,limit:HISTORY_PAGE_SIZE});
      if(activeThreadId!==threadId)return false;
      historyMessages=mergeHistory(data.messages,historyMessages);
      historyHasMore=data.has_more===true;
      historyNextBefore=data.next_before||null;
      historyLoadedOlder=true;
      return true;
    } catch { return false; }
    finally { loadingOlder=false;renderHistory(historyMessages,{force:true,scrollToBottom:false,preserveScroll:true}); }
  }
  async function selectThread(threadId) {
    if(sending)return;activeThreadId=threadId;resetHistoryState();renderThreads();emptyChat();
    if(validUuid(threadId))await refreshThread(threadId,{force:true,reset:true});
    document.getElementById("webConciergeInput")?.focus();
  }
  function newChat() { if(sending)return;activeThreadId=crypto.randomUUID();resetHistoryState();emptyChat();renderThreads();document.getElementById("webConciergeInput")?.focus(); }

  async function syncHistory() {
    if(!gatewayReady||sending||document.hidden)return false;
    const selectedBefore=activeThreadId;
    const loaded=await loadThreads();if(!loaded)return false;
    const serverHasSelected=selectedBefore&&threadCache.some((thread)=>thread.thread_id===selectedBefore);
    if(Date.now()-lastPersonaSyncAt>=PERSONA_SYNC_INTERVAL_MS){try{await refreshPersona();}catch{}}
    if(serverHasSelected)return refreshThread(selectedBefore);
    if(!selectedBefore&&threadCache[0]){activeThreadId=threadCache[0].thread_id;renderThreads();return refreshThread(activeThreadId,{force:true,reset:true});}
    return true;
  }
  function startLiveSync() {
    if(syncTimer)clearInterval(syncTimer);
    syncTimer=setInterval(()=>{void syncHistory();},SYNC_INTERVAL_MS);
    document.addEventListener("visibilitychange",()=>{if(!document.hidden){void refreshPersona(true).catch(()=>{});void syncHistory();}});
  }

  async function sendTurn() {
    const input=document.getElementById("webConciergeInput");if(!(input instanceof HTMLTextAreaElement)||!gatewayReady||sending||channelViewReadOnly)return;
    const content=input.value.trim();if(!content||content.length>4000)return;if(!activeThreadId)activeThreadId=crypto.randomUUID();
    const sourceMessageId=crypto.randomUUID(),clientId=`local:${sourceMessageId}`,now=new Date().toISOString();
    appendMessage("user",content,now,clientId,"WEB");input.value="";resizeInput();sending=true;setComposerReady(true);showTyping();
    try{
      const response=await gatewayRequest("/web/chat",{method:"POST",body:{message:content,source_message_id:sourceMessageId,thread_id:activeThreadId}});
      if(response?.ok!==true||response?.environment!=="PROD"||response?.authoritative!==true||(response?.thread_id&&response?.thread_id!==activeThreadId))throw new Error("gateway_response_not_authoritative");
      if(!renderCoreV1Response(response.core))throw new Error("core_response_not_authoritative");
      await refreshPersona(true).catch(()=>{});
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
      await refreshPersona(true);
      gatewayReady=true;return true;
    }catch{gatewayReady=false;applyPersona(null);return false;}
  }

  // MOBILE_CHAT_DRAWER_V1_20260918
  let mobileDrawerReady=false;
  function setMobileDrawer(open){
    const workspace=document.querySelector(".web-concierge-workspace");
    const button=workspace?.querySelector(".web-concierge-mobile-chats");
    workspace?.classList.toggle("is-mobile-sidebar-open",Boolean(open));
    button?.setAttribute("aria-expanded",open?"true":"false");
  }
  function initMobileDrawer(){
    if(mobileDrawerReady)return;
    const workspace=document.querySelector(".web-concierge-workspace");if(!workspace)return;
    mobileDrawerReady=true;
    const topbar=document.createElement("div");topbar.className="web-concierge-mobile-topbar";
    topbar.innerHTML='<button type="button" class="web-concierge-mobile-exit" aria-label="Chat verlassen">‹</button><button type="button" class="web-concierge-mobile-chats" aria-label="Chats öffnen" aria-expanded="false">☰</button><div class="web-concierge-mobile-topbar-title">NAHWERK Concierge</div><button type="button" class="web-concierge-mobile-new" aria-label="Neuer Chat">＋</button>';
    const backdrop=document.createElement("button");backdrop.type="button";backdrop.className="web-concierge-mobile-backdrop";backdrop.setAttribute("aria-label","Chatliste schließen");
    workspace.prepend(topbar);workspace.appendChild(backdrop);
    topbar.querySelector(".web-concierge-mobile-exit")?.addEventListener("click",()=>{setMobileDrawer(false);location.href="/konto";});
    topbar.querySelector(".web-concierge-mobile-chats")?.addEventListener("click",()=>setMobileDrawer(!workspace.classList.contains("is-mobile-sidebar-open")));
    topbar.querySelector(".web-concierge-mobile-new")?.addEventListener("click",()=>{setMobileDrawer(false);newChat();});
    backdrop.addEventListener("click",()=>setMobileDrawer(false));
  }

  async function boot() {
    initMobileDrawer();
// IOS_VISUAL_VIEWPORT_COMPOSER_V1_20260918
function syncIosVisualViewport(){
  if(!isMobile())return;
  const vv=window.visualViewport;
  const workspace=document.querySelector(".web-concierge-workspace");
  if(!workspace)return;
  if(!vv){workspace.style.removeProperty("--nw-vv-height");workspace.style.removeProperty("--nw-vv-top");return;}
  workspace.style.setProperty("--nw-vv-height",Math.round(vv.height)+"px");
  workspace.style.setProperty("--nw-vv-top",Math.round(vv.offsetTop)+"px");
  const currentLog=logNode();
  if(currentLog)requestAnimationFrame(()=>{currentLog.scrollTop=currentLog.scrollHeight;});
}
window.visualViewport?.addEventListener("resize",syncIosVisualViewport,{passive:true});
window.visualViewport?.addEventListener("scroll",syncIosVisualViewport,{passive:true});
const composerInput=document.getElementById("webConciergeInput");
composerInput?.addEventListener("focus",()=>{syncIosVisualViewport();setTimeout(syncIosVisualViewport,80);setTimeout(syncIosVisualViewport,260);});
composerInput?.addEventListener("blur",()=>setTimeout(syncIosVisualViewport,120));
syncIosVisualViewport();

    if(!sessionToken()){
      const valid=window.SCBAuth?.validateSession
        ? await Promise.race([
            window.SCBAuth.validateSession().catch(()=>false),
            new Promise((resolve)=>setTimeout(()=>resolve(false),CLIENT_FETCH_TIMEOUT_MS))
          ])
        : false;
      if(!valid){location.replace("/anmelden");return;}
    }
    applyPersona(null);
    const status=document.getElementById("webConciergeStatus");
    setComposerReady(false);
    if(status){status.textContent="Verbindung wird hergestellt …";status.classList.remove("is-online");}
    const ready=await checkReadiness();
    if(status){status.textContent=ready?"Online":"Verbindung momentan nicht möglich";status.classList.toggle("is-online",ready);}
    setComposerReady(ready);if(ready){const loaded=await loadThreads({selectFirst:true});if(activeThreadId)await selectThread(activeThreadId);else{newChat();if(!loaded)renderThreads();}startLiveSync();}
    document.getElementById("webConciergeNewChat")?.addEventListener("click",newChat);
    document.getElementById("webConciergeSend")?.addEventListener("click",sendTurn);
    document.getElementById("webConciergeInput")?.addEventListener("input",resizeInput);
    document.getElementById("webConciergeInput")?.addEventListener("keydown",(event)=>{if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();sendTurn();}});
  }

  window.NAHWERKWebCustomerConciergeLiveBridge=Object.freeze({
    sessionToken,
    threadId:()=>{if(!activeThreadId)activeThreadId=crypto.randomUUID();return activeThreadId;},
    isAllowed:()=>gatewayReady&&!channelViewReadOnly&&channelView==="CHAT"
  });
  window.NAHWERKWebCustomerConciergeTestHooks=Object.freeze({configuredEndpoint,configuredHistoryEndpoint,sessionToken,normalizeGatewayReadiness,normalizeCoreV1Response,normalizePersona,applyPersona,renderCoreV1Response,gatewayRequest,historyRequest,refreshPersona,syncHistory,loadOlderMessages,mergeHistory,CORE_CONTRACT_VERSION,GATEWAY_CONTRACT_VERSION,HISTORY_CONTRACT_VERSION,HISTORY_PAGE_SIZE,SYNC_INTERVAL_MS,PERSONA_SYNC_INTERVAL_MS,GATEWAY_ENDPOINT,HISTORY_ENDPOINT});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
