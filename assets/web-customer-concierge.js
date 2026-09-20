(() => {
  "use strict";

  const SESSION_KEY = "scb_web_session";
  const GUEST_INSTALLATION_KEY = "nw_web_guest_installation_v1";
  const GUEST_TOKEN_KEY = "nw_web_guest_token_v1";
  const GUEST_THREAD_KEY = "nw_web_guest_thread_v1";
  const GUEST_VIEW_STATE_KEY = "nw_web_guest_view_state_v1";
  const GUEST_RESUME_KEY = "nw_guest_resume_request_v1";
  const CORE_CONTRACT_VERSION = "core-v1";
  const GATEWAY_CONTRACT_VERSION = "web-gateway-v1";
  const GATEWAY_ENDPOINT = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-web-gateway";
  const HISTORY_ENDPOINT = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-web-gateway/web/history";
  const RESPONSE_DELIVERY_ENDPOINT = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-email-runtime";
  const HISTORY_CONTRACT_VERSION = "canonical-core-receipts-v1";
  const HISTORY_PAGE_SIZE = 60;
  const SYNC_INTERVAL_MS = 3000;
  const PERSONA_SYNC_INTERVAL_MS = 3000;
  const CLIENT_FETCH_TIMEOUT_MS = 40000;
  const SETTINGS_URL = "/concierge-anpassen";
  const PORTAL_THEME_KEY = "nw_portal_theme_v1";
  const isMobile=()=>window.matchMedia("(max-width:820px)").matches;
  const RESPONSE_STATES = new Set(["ANSWER","QUESTION","ACTION_STARTED","ACTION_PENDING","ACTION_RESULT","ERROR_RESPONSE","HANDOFF","SAFE_TERMINATION"]);

  let gatewayReady = false;
  let guestMode = false;
  let sending = false;
  let lastGuestUserMessage = "";
  let restoringGuestView = false;
  let guestViewRestored = false;
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
  let primaryChatThreadId = null;
  let routedTurnIds = new Set();
  let routedTurnsLoadedAt = 0;
  let threadsLoadGeneration = 0;
  const VIRTUAL_WHATSAPP_THREAD_ID="00000000-0000-4000-8000-0000000000a1";
  const VIRTUAL_PHONE_THREAD_ID="00000000-0000-4000-8000-0000000000a3";
  const VIRTUAL_EMAIL_THREAD_ID="00000000-0000-4000-8000-0000000000a4";
  const NORMAL_CHAT_CHANNELS=new Set(["WEB","APP"]);

  function channelForThreadId(threadId){
    const id=String(threadId||"");
    if(id===VIRTUAL_WHATSAPP_THREAD_ID)return "WHATSAPP";
    if(id===VIRTUAL_PHONE_THREAD_ID)return "PHONE";
    if(id===VIRTUAL_EMAIL_THREAD_ID)return "EMAIL";
    return "CHAT";
  }
  function isNormalThread(thread){
    const channels=Array.isArray(thread?.channels)?thread.channels.map((v)=>String(v||"").toUpperCase()):[];
    return channels.some((channel)=>NORMAL_CHAT_CHANNELS.has(channel));
  }

  function sessionToken() {
    try { return String(JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null")?.session_token || ""); }
    catch { return ""; }
  }
  function guestInstallationId() {
    try {
      let value=String(localStorage.getItem(GUEST_INSTALLATION_KEY)||"");
      if(!/^[A-Za-z0-9._:-]{16,200}$/.test(value)){
        value="web-guest-"+crypto.randomUUID();
        localStorage.setItem(GUEST_INSTALLATION_KEY,value);
      }
      return value;
    } catch {
      return "web-guest-"+crypto.randomUUID();
    }
  }
  function guestToken() {
    try { return String(sessionStorage.getItem(GUEST_TOKEN_KEY)||""); }
    catch { return ""; }
  }
  function saveGuestToken(value) {
    const token=String(value||"");
    if(!token)return;
    try { sessionStorage.setItem(GUEST_TOKEN_KEY,token); } catch {}
  }
  function guestThreadId() {
    try {
      let value=String(sessionStorage.getItem(GUEST_THREAD_KEY)||"");
      if(!validUuid(value)){
        value=crypto.randomUUID();
        sessionStorage.setItem(GUEST_THREAD_KEY,value);
      }
      return value;
    } catch {
      return crypto.randomUUID();
    }
  }
  function setGuestThreadId(value) {
    if(!validUuid(value))return;
    try { sessionStorage.setItem(GUEST_THREAD_KEY,String(value)); } catch {}
  }

  function isChatPageReload() {
    try {
      const entry=performance.getEntriesByType?.("navigation")?.[0];
      if(entry?.type)return entry.type==="reload";
      return performance.navigation?.type===1;
    } catch { return false; }
  }
  function resetGuestChatSessionForReload() {
    try {
      sessionStorage.removeItem(GUEST_TOKEN_KEY);
      sessionStorage.removeItem(GUEST_THREAD_KEY);
      sessionStorage.removeItem(GUEST_VIEW_STATE_KEY);
      localStorage.removeItem(GUEST_TOKEN_KEY);
    } catch {}
  }
  function readGuestViewState(threadId="") {
    try {
      const raw=JSON.parse(sessionStorage.getItem(GUEST_VIEW_STATE_KEY)||"null");
      if(!raw||raw.version!==1||!Array.isArray(raw.entries))return null;
      if(threadId&&raw.thread_id&&String(raw.thread_id)!==String(threadId))return null;
      return {
        version:1,
        thread_id:String(raw.thread_id||threadId||""),
        entries:raw.entries.slice(-120)
      };
    } catch { return null; }
  }
  function writeGuestViewState(state) {
    if(!guestMode||restoringGuestView||!state)return;
    try {
      sessionStorage.setItem(GUEST_VIEW_STATE_KEY,JSON.stringify({
        version:1,
        thread_id:String(state.thread_id||activeThreadId||""),
        entries:Array.isArray(state.entries)?state.entries.slice(-120):[]
      }));
    } catch {}
  }
  function rememberGuestViewEntry(entry) {
    if(!guestMode||restoringGuestView||!entry)return;
    const current=readGuestViewState()||{version:1,thread_id:String(activeThreadId||guestThreadId()),entries:[]};
    current.thread_id=String(activeThreadId||current.thread_id||"");
    current.entries.push(entry);
    writeGuestViewState(current);
  }
  function rebindGuestViewThread(threadId) {
    if(!validUuid(threadId))return;
    const current=readGuestViewState()||{version:1,thread_id:String(threadId),entries:[]};
    current.thread_id=String(threadId);
    writeGuestViewState(current);
  }
  function restoreGuestViewState(threadId) {
    const state=readGuestViewState(threadId);
    if(!state?.entries?.length)return false;
    const log=logNode();if(!log)return false;
    clearNode(log);lastDateKey="";historyFingerprint="";
    restoringGuestView=true;
    try {
      for(const entry of state.entries){
        if(entry?.kind==="message"){
          const role=entry.role==="user"?"user":"assistant";
          const text=String(entry.text||"").slice(0,8000);
          if(!text)continue;
          appendMessage(role,text,String(entry.at||new Date().toISOString()),String(entry.id||""),String(entry.channel||"WEB"),{scroll:false});
          if(role==="user")lastGuestUserMessage=text;
        }else if(entry?.kind==="account_action"&&entry.action){
          renderGuestAccountActions([entry.action],{request:String(entry.request||entry.action?.request||"")});
        }
      }
    } finally {
      restoringGuestView=false;
    }
    scrollBottom();
    return true;
  }
  async function refreshSessionForWrite(){
    const token=sessionToken();
    if(!token)throw new Error("SESSION_REQUIRED");
    void window.SCBAuth?.validateSession?.().catch(()=>false);
    return token;
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
      ui_actions:Array.isArray(raw.ui_actions) ? raw.ui_actions.filter((item)=>["CREATE_ACCOUNT"].includes(String(item?.type||"").toUpperCase())).map((item)=>({type:String(item.type).toUpperCase(),purpose:String(item.purpose||"").toUpperCase(),label:String(item.label||"").trim(),href:String(item.href||""),post_auth_target:String(item.post_auth_target||"")})) : [],
      state_version:Number(raw.state_version || 0), correlation_id:String(raw.correlation_id || ""), authoritative
    };
  }

  function validUuid(value) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || "")); }
  function clearNode(node) { while (node?.firstChild) node.removeChild(node.firstChild); }
  function appendLinkifiedText(container,text) {
    const value=String(text??"");
    const pattern=/https?:\/\/[^\s<>"']+/gi;
    let cursor=0;
    for(const match of value.matchAll(pattern)){
      const index=Number(match.index??0);
      if(index>cursor)container.appendChild(document.createTextNode(value.slice(cursor,index)));
      let href=String(match[0]||"");
      let trailing="";
      while(href&&/[.,!?;:)\]]$/.test(href)){trailing=href.slice(-1)+trailing;href=href.slice(0,-1);}
      if(href){
        const link=document.createElement("a");
        link.className="web-concierge-message-link";
        link.href=href;
        link.target="_blank";
        link.rel="noopener noreferrer";
        link.textContent=href;
        container.appendChild(link);
      }
      if(trailing)container.appendChild(document.createTextNode(trailing));
      cursor=index+String(match[0]||"").length;
    }
    if(cursor<value.length)container.appendChild(document.createTextNode(value.slice(cursor)));
  }
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

  function applyChatTheme(theme){
    const normalized=theme==="light"?"light":"dark";
    document.documentElement.dataset.nwPortalTheme=normalized;
    document.body?.classList.toggle("nw-portal-light",normalized==="light");
    document.body?.classList.toggle("nw-portal-dark",normalized==="dark");
  }
  function readChatTheme(){
    try{
      const value=localStorage.getItem(PORTAL_THEME_KEY);
      if(value==="light"||value==="dark")return value;
    }catch{}
    return document.documentElement.dataset.nwPortalTheme==="light"?"light":"dark";
  }
  function initThemeToggle(){
    const toggle=document.getElementById("webConciergeThemeToggle");
    if(!(toggle instanceof HTMLInputElement))return;
    const sync=()=>{
      const theme=readChatTheme();
      applyChatTheme(theme);
      toggle.checked=theme==="dark";
      toggle.setAttribute("aria-checked",String(toggle.checked));
    };
    sync();
    toggle.addEventListener("change",()=>{
      const next=toggle.checked?"dark":"light";
      try{localStorage.setItem(PORTAL_THEME_KEY,next);}catch{}
      applyChatTheme(next);
      toggle.setAttribute("aria-checked",String(toggle.checked));
    });
    window.addEventListener("storage",(event)=>{if(event.key===PORTAL_THEME_KEY)sync();});
  }

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
    const body=document.createElement("span");body.className="web-concierge-message-text";appendLinkifiedText(body,text);
    const meta=document.createElement("span");meta.style.cssText="display:flex;align-items:center;justify-content:flex-end;gap:6px;margin-top:3px;min-height:14px";
    const time=document.createElement("span");time.className="web-concierge-message-time";time.textContent=timeLabel(at);time.style.cssText="float:none;margin:0";
    meta.appendChild(time);
    bubble.append(body,meta);row.appendChild(bubble);log.appendChild(row);
    if(guestMode&&!restoringGuestView)rememberGuestViewEntry({kind:"message",role:role==="user"?"user":"assistant",text:String(text),at:String(at),id:String(id||""),channel:normalizedChannel});
    if(scroll)scrollBottom();return row;
  }
  async function playStoredAudio(messageId,button){
    if(!validUuid(messageId))return;
    try{
      const token=await refreshSessionForWrite();
      button?.classList.add("is-loading");
      const response=await fetchWithTimeout(`${GATEWAY_ENDPOINT}/web/audio-message?id=${encodeURIComponent(messageId)}`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store",credentials:"omit"},45000);
      if(!response.ok)throw new Error("audio_fetch_failed");
      const blob=await response.blob(),url=URL.createObjectURL(blob),audio=new Audio(url);
      if(button)button.textContent="❚❚";
      audio.addEventListener("ended",()=>{URL.revokeObjectURL(url);if(button){button.textContent="▶";button.classList.remove("is-loading");}},{once:true});
      audio.addEventListener("error",()=>{URL.revokeObjectURL(url);if(button){button.textContent="▶";button.classList.remove("is-loading");}},{once:true});
      await audio.play();
    }catch{
      if(button){button.textContent="▶";button.classList.remove("is-loading");}
    }
  }
  function appendAudioMessage(role,message,at=new Date().toISOString(),id="",channel="WEB",{scroll=true}={}){
    const log=logNode();if(!log||!validUuid(message?.audio_message_id))return null;
    log.querySelector(".web-concierge-empty")?.remove();appendDateIfNeeded(at);
    const row=document.createElement("div");row.className=`web-concierge-message-row is-${role}`;row.dataset.channel=String(channel||"WEB").toUpperCase();if(id)row.dataset.messageId=id;
    const bubble=document.createElement("div");bubble.className=`web-concierge-message web-concierge-message-${role} web-concierge-audio-message`;
    const player=document.createElement("div");player.className="web-concierge-audio-player";
    const play=document.createElement("button");play.type="button";play.className="web-concierge-audio-play";play.textContent="▶";play.setAttribute("aria-label","Sprachmemo abspielen");
    const wave=document.createElement("span");wave.className="web-concierge-audio-wave";wave.innerHTML="<i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>";
    const duration=document.createElement("span");duration.className="web-concierge-audio-duration";
    const seconds=Math.max(0,Math.round(Number(message?.duration_ms||0)/1000));duration.textContent=seconds?`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,"0")}`:"Sprachmemo";
    play.addEventListener("click",()=>{void playStoredAudio(String(message.audio_message_id),play);});
    player.append(play,wave,duration);
    const time=document.createElement("span");time.className="web-concierge-message-time";time.textContent=timeLabel(at);
    bubble.append(player,time);row.appendChild(bubble);log.appendChild(row);if(scroll)scrollBottom();return row;
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
  function emptyChannelView(channel) {
    const log=logNode();if(!log)return;clearNode(log);lastDateKey="";historyFingerprint="";
    const empty=document.createElement("div");empty.className="web-concierge-empty";
    const strong=document.createElement("strong");
    const span=document.createElement("span");
    if(channel==="PHONE"){
      strong.textContent="Telefonprotokoll";
      span.textContent="Für frühere Telefonate liegt kein vollständiges Gesprächstranskript vor. Neue Telefonate werden hier automatisch als Chat dokumentiert.";
    }else if(channel==="EMAIL"){
      strong.textContent="E-Mail-Protokoll";
      span.textContent="Hier erscheint dein E-Mail-Austausch mit deinem persönlichen Concierge. Schreiben und Antworten erfolgen per E-Mail an core@nahwerkconcierge.com.";
    }else{
      strong.textContent="WhatsApp-Protokoll";
      span.textContent="Hier erscheint dein WhatsApp-Verlauf. Schreiben ist ausschließlich in WhatsApp möglich.";
    }
    empty.append(strong,span);log.appendChild(empty);
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
  async function connectProvider(provider,button){
    const providerKey=String(provider?.provider_key||"").trim();
    const family=String(provider?.connection_family||"").trim();
    if(!providerKey&&!family)return;
    const original=button?.textContent||"Verbinden";
    try{
      if(button){button.disabled=true;button.textContent="Verbindung wird vorbereitet …";}
      const out=await gatewayRequest("/web/integrations/connect",{method:"POST",body:{provider_key:providerKey,connection_family:family}});
      if(out?.authorization_url){location.assign(String(out.authorization_url));return;}
      if(out?.state==="SETUP_REQUIRED"){
        addRuntimeCard("Noch nicht direkt verbindbar",String(out.next_action||"Der Anbieterzugang muss zuerst eingerichtet werden."));
        return;
      }
      throw new Error(String(out?.error||"integration_connect_failed"));
    }catch(error){
      reportClientDiagnostic("INTEGRATION_CONNECT_"+String(error?.message||"failed").slice(0,80));
      addRuntimeCard("Verbindung nicht möglich","Der Dienst konnte gerade nicht verbunden werden. Bitte versuche es später erneut.","is-error");
    }finally{
      if(button&&document.contains(button)){button.disabled=false;button.textContent=original;}
    }
  }
  function renderConnectionOffer(offer){
    const providers=Array.isArray(offer?.providers)?offer.providers.filter(Boolean):[];
    if(!providers.length)return null;
    const title=String(offer?.title||"Dienst verbinden");
    const card=addRuntimeCard(title,"Damit ich das direkt für dich erledigen kann, kannst du den passenden Dienst verbinden.","is-connection");
    if(!card)return null;
    const actions=document.createElement("div");actions.className="web-concierge-connection-actions";
    for(const provider of providers){
      const button=document.createElement("button");button.type="button";
      button.className="web-concierge-connect-provider";
      const label=String(provider?.display_name||provider?.provider_key||"Dienst").trim();
      button.textContent=label+" verbinden";
      button.addEventListener("click",()=>{void connectProvider(provider,button);});
      actions.appendChild(button);
    }
    card.appendChild(actions);scrollBottom();return card;
  }
  function renderIntegrationReturnNotice(){
    const url=new URL(location.href);
    if(url.searchParams.get("integration")!=="connected")return false;
    const provider=String(url.searchParams.get("provider")||"").toLowerCase();
    const label=provider==="google"?"Google":provider==="microsoft"?"Microsoft 365":"Der Dienst";
    addRuntimeCard("Verbunden",label+" ist jetzt mit NAHWERK verbunden.","is-connection is-connected");
    url.searchParams.delete("integration");url.searchParams.delete("provider");
    const query=url.searchParams.toString();
    history.replaceState(history.state,"",url.pathname+(query?"?"+query:"")+url.hash);
    return true;
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
  function isExplicitGuestAccountIntent(text) {
    const value=String(text||"").toLowerCase().replace(/\s+/g," ").trim();
    if(!value)return false;
    return /(?:\banmelden\b|\beinloggen\b|\blogin\b|\blog in\b|\bregistrieren\b|\bregistrierung\b|\bkonto (?:erstellen|anlegen|machen)\b|\baccount (?:erstellen|anlegen)\b|\bsign in\b|\bsign up\b)/i.test(value);
  }
  function saveGuestExecutionHandoff(request) {
    const value=String(request||"").trim().slice(0,4000);
    if(!value)return;
    try{
      localStorage.setItem(GUEST_RESUME_KEY,JSON.stringify({
        request:value,
        thread_id:String(activeThreadId||""),
        post_auth_target:"/payg",
        created_at:new Date().toISOString()
      }));
    }catch{}
  }

  function renderGuestAccountActions(actions,{request=""}={}) {
    if(!guestMode||!Array.isArray(actions)||!actions.length)return null;
    const allowed=actions.filter((action)=>String(action?.type||"").toUpperCase()==="CREATE_ACCOUNT");
    if(!allowed.length)return null;
    const action=allowed[0];
    const purpose=String(action?.purpose||"").toUpperCase();
    if(!["ACCOUNT_REQUEST","EXECUTION"].includes(purpose))return null;
    const accountOnly=purpose==="ACCOUNT_REQUEST";
    const handoffRequest=String(request||lastGuestUserMessage||"").trim().slice(0,4000);
    const title=accountOnly?"Anmelden oder Konto erstellen":"Auftrag sicher fortsetzen";
    const body=accountOnly
      ?"Wenn du bereits ein NAHWERK Konto hast, kannst du dich direkt anmelden. Sonst erstellst du in wenigen Schritten ein neues Konto."
      :"Melde dich an oder erstelle ein Konto. Danach kannst du PAYG-Guthaben ab 5 € aufladen. Dein Auftrag wird nicht automatisch ausgeführt: Du siehst vorher den Preis und gibst die Ausführung ausdrücklich frei.";
    const card=addRuntimeCard(title,body,"is-guest-account");
    if(!card)return null;
    const wrap=document.createElement("div");wrap.className="web-concierge-guest-actions";
    const signIn=document.createElement("a");
    signIn.className="btn red";
    signIn.href=accountOnly?"/anmelden?source=web_guest_chat":"/anmelden?source=web_guest_chat&next=%2Fpayg";
    signIn.textContent="Anmelden";
    const create=document.createElement("a");
    create.className="btn light";
    const candidate=String(action?.href||"");
    create.href=accountOnly
      ?(candidate.startsWith("/registrieren?")?candidate:"/registrieren?source=web_guest_chat")
      :(candidate.startsWith("/registrieren?")&&candidate.includes("next=%2Fpayg")?candidate:"/registrieren?source=web_guest_chat&next=%2Fpayg");
    create.textContent="Konto erstellen";
    if(!accountOnly){
      signIn.addEventListener("click",()=>saveGuestExecutionHandoff(handoffRequest));
      create.addEventListener("click",()=>saveGuestExecutionHandoff(handoffRequest));
    }
    wrap.append(signIn,create);
    card.appendChild(wrap);
    if(!restoringGuestView)rememberGuestViewEntry({
      kind:"account_action",
      request:handoffRequest,
      action:{
        type:"CREATE_ACCOUNT",
        purpose,
        label:String(action?.label||"").trim(),
        href:String(action?.href||""),
        post_auth_target:String(action?.post_auth_target||"")
      }
    });
    scrollBottom();return card;
  }
  function renderCoreV1Response(raw,{guestRequest=""}={}) {
    const response=normalizeCoreV1Response(raw);if(!response||!response.authoritative)return false;
    removeTyping();const now=new Date().toISOString();
    for(const message of response.messages)appendMessage("assistant",message.text,now,`a:${response.turn_id}`,"WEB");
    if(response.pending_approval&&!guestMode)renderApproval(response.pending_approval);
    if(response.error)addRuntimeCard("Das hat noch nicht geklappt",String(response.error.customer_safe_message||"Bitte versuche es noch einmal."),"is-error");
    renderGuestAccountActions(response.ui_actions,{request:guestRequest});
    return true;
  }

  window.addEventListener("nahwerk:live-ended",()=>{
    void (async()=>{
      await new Promise((resolve)=>setTimeout(resolve,180));
      await loadThreads();
      if(validUuid(activeThreadId))await refreshThread(activeThreadId,{force:true,reset:true});
    })();
  });

  window.addEventListener("nahwerk:voice-memo-sent",(event)=>{
    const payload=event?.detail?.payload;
    const visibleThread=String(payload?.thread_id||payload?.canonical_thread_id||payload?.core?.conversation_id||"");
    if(validUuid(visibleThread))activeThreadId=visibleThread;
    void (async()=>{
      await loadThreads();
      if(validUuid(activeThreadId))await refreshThread(activeThreadId,{force:true,reset:true});
    })();
  });

  function reportClientDiagnostic(code){
    try{
      const u=new URL(GATEWAY_ENDPOINT+"/client-diagnostic");
      u.searchParams.set("source","TEXT_CHAT_CLIENT");
      u.searchParams.set("code",String(code||"TEXT_CHAT_CLIENT_ERROR").slice(0,180));
      fetch(u.href,{method:"GET",cache:"no-store",credentials:"omit"}).catch(()=>{});
    }catch{}
  }

  function fetchWithTimeout(url,options={},timeoutMs=CLIENT_FETCH_TIMEOUT_MS) {
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    return fetch(url,{...options,signal:controller.signal}).finally(()=>clearTimeout(timer));
  }

  async function gatewayRequest(path,{method="GET",body=null,auth=true}={}) {
    const endpoint=configuredEndpoint();if(!endpoint)throw new Error("gateway_not_configured");const headers={};
    if(auth){const token=sessionToken();if(!token)throw new Error("session_required");headers.Authorization=`Bearer ${token}`;}
    if(body!==null)headers["Content-Type"]="application/json";
    const timeoutMs=path==="/health"?8000:path==="/web/me"?20000:path==="/web/chat"?45000:CLIENT_FETCH_TIMEOUT_MS;
    const response=await fetchWithTimeout(`${endpoint}${path}`,{method,headers,body:body===null?undefined:JSON.stringify(body),cache:"no-store",credentials:"omit"},timeoutMs);
    const payload=await response.json().catch(()=>({}));if(!response.ok||payload?.ok===false)throw new Error(String(payload?.error||`http_${response.status}`));return payload;
  }
  async function responseDeliveryRequest(path,{method="GET",body=null}={}){
    const token=sessionToken();if(!token)throw new Error("session_required");
    const headers={Authorization:`Bearer ${token}`};if(body!==null)headers["Content-Type"]="application/json";
    const response=await fetchWithTimeout(RESPONSE_DELIVERY_ENDPOINT+path,{method,headers,body:body===null?undefined:JSON.stringify(body),cache:"no-store",credentials:"omit"},12000);
    const payload=await response.json().catch(()=>({}));
    if(!response.ok||payload?.ok!==true)throw new Error(String(payload?.error||`response_delivery_http_${response.status}`));
    return payload;
  }
  async function refreshRoutedTurns(force=false){
    const now=Date.now();if(!force&&now-routedTurnsLoadedAt<3000)return routedTurnIds;
    const payload=await responseDeliveryRequest("/response-delivery/web-routed");
    routedTurnIds=new Set((Array.isArray(payload?.routed_turn_ids)?payload.routed_turn_ids:[]).filter(validUuid));
    routedTurnsLoadedAt=now;return routedTurnIds;
  }
  function filterRoutedWebAnswers(messages){
    return (Array.isArray(messages)?messages:[]).filter((message)=>{
      if(String(message?.role||"").toLowerCase()!=="assistant"||String(message?.channel||"WEB").toUpperCase()!=="WEB")return true;
      const match=String(message?.id||"").match(/^a:WEB:([0-9a-f-]{36})(?::|$)/i);
      return !match||!routedTurnIds.has(match[1]);
    });
  }
  async function dispatchWebResponse(turnId,sourceMessageId){
    if(!validUuid(turnId)||!sourceMessageId)return null;
    let lastError=null;
    for(let attempt=0;attempt<2;attempt++){
      try{return await responseDeliveryRequest("/response-delivery/web",{method:"POST",body:{turn_id:turnId,source_message_id:sourceMessageId}})}
      catch(error){lastError=error;if(attempt===0)await new Promise((resolve)=>setTimeout(resolve,250))}
    }
    if(lastError)reportClientDiagnostic("RESPONSE_DELIVERY_FALLBACK_"+String(lastError?.message||"failed").slice(0,80));
    return null;
  }
  function renderRoutedDelivery(target){
    removeTyping();
    const key=String(target||"").toUpperCase();
    const text=key==="EMAIL"?"Die Antwort wurde per E-Mail gesendet.":key==="WHATSAPP"?"Die Antwort wurde über WhatsApp gesendet.":key==="CALL"?"Der Rückruf ist vorbereitet. Dein Concierge meldet sich telefonisch.":"Die Antwort wurde über deinen gewählten Antwortkanal zugestellt.";
    addRuntimeCard("Antwort weitergeleitet",text);
  }

  async function historyRequest(threadId=null,{before=null,limit=HISTORY_PAGE_SIZE}={}) {
    const endpoint=configuredHistoryEndpoint(),token=sessionToken();if(!endpoint||!token)throw new Error("history_unavailable");
    const url=new URL(endpoint);
    if(threadId){url.searchParams.set("thread_id",threadId);url.searchParams.set("limit",String(limit));if(before)url.searchParams.set("before",before);}
    const response=await fetchWithTimeout(url.href,{headers:{Authorization:`Bearer ${token}`},cache:"no-store",credentials:"omit"});
    const payload=await response.json().catch(()=>({}));if(!response.ok||payload?.ok!==true||payload?.history_contract!==HISTORY_CONTRACT_VERSION)throw new Error("history_unavailable");return payload;
  }
  async function channelHistoryRequest(channel,{summary=false}={}){
    const endpoint=configuredEndpoint(),token=sessionToken();if(!endpoint||!token)throw new Error("history_unavailable");
    const url=new URL(endpoint+"/web/channel-history");
    url.searchParams.set("channel",String(channel||"").toUpperCase());
    if(summary)url.searchParams.set("summary","1");
    const response=await fetchWithTimeout(url.href,{headers:{Authorization:`Bearer ${token}`},cache:"no-store",credentials:"omit"},10000);
    const payload=await response.json().catch(()=>({}));
    if(!response.ok||payload?.ok!==true||payload?.history_contract!==HISTORY_CONTRACT_VERSION)throw new Error("history_unavailable");
    return payload;
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
    const input=document.getElementById("webConciergeInput"),send=document.getElementById("webConciergeSend"),form=document.querySelector(".web-concierge-form");
    const usable=ready&&!channelViewReadOnly;
    if(form instanceof HTMLElement){
      form.hidden=channelViewReadOnly;
      form.setAttribute("aria-hidden",channelViewReadOnly?"true":"false");
    }
    if(input){
      input.disabled=!usable;
      input.setAttribute("aria-disabled",usable?"false":"true");
      input.placeholder=channelViewReadOnly
        ? (channelView==="WHATSAPP"?"WhatsApp-Verlauf – antworte in WhatsApp":channelView==="PHONE"?"Telefonprotokoll – nur lesen":"Nachricht schreiben …")
        : "Nachricht schreiben …";
    }
    if(send)send.disabled=!usable||sending;
  }

  window.addEventListener("nahwerk:chat-channel-view",(event)=>{
    const next=String(event?.detail?.channel||"CHAT").toUpperCase();
    channelView=next;
    channelViewReadOnly=event?.detail?.readOnly===true||next==="WHATSAPP"||next==="PHONE";
    setComposerReady(gatewayReady);
  });
  function resizeInput(){const input=document.getElementById("webConciergeInput");if(!(input instanceof HTMLTextAreaElement))return;input.style.height="auto";input.style.height=`${Math.min(input.scrollHeight,132)}px`;}
  function sidebarDate(value){const d=new Date(value||Date.now()),now=new Date();if(Number.isNaN(d.getTime()))return "";if(dateKey(d)===dateKey(now))return timeLabel(d);return new Intl.DateTimeFormat("de-DE",{day:"2-digit",month:"2-digit"}).format(d);}
  // CHANNEL_SIDEBAR_IDENTITY_V4_20260920
  function channelIcon(channel){
    const key=String(channel||"").toUpperCase();
    const icon=document.createElement("span");
    icon.className="web-concierge-channel-icon";
    icon.setAttribute("aria-hidden","true");
    if(key==="PHONE"){
      icon.innerHTML='<svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.69 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.28-1.28a2 2 0 0 1 2.11-.45c.9.33 1.84.56 2.8.69A2 2 0 0 1 22 16.92Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }else if(key==="EMAIL"){
      icon.innerHTML='<svg viewBox="0 0 24 24"><path d="M3.5 5.5h17A1.5 1.5 0 0 1 22 7v10a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 2 17V7a1.5 1.5 0 0 1 1.5-1.5ZM4 7.5l8 5.6 8-5.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }else if(key==="WHATSAPP"){
      icon.innerHTML='<svg viewBox="0 0 24 24"><path d="M20.5 11.7a8.5 8.5 0 0 1-12.6 7.5L3.5 20.5l1.3-4.3A8.5 8.5 0 1 1 20.5 11.7Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.4 7.7c.4-.3.9-.2 1.2.2l1 1.8c.2.4.1.8-.2 1.1l-.7.7c.8 1.6 2.1 2.9 3.7 3.7l.7-.7c.3-.3.8-.4 1.1-.2l1.8 1c.4.3.5.8.2 1.2l-.5.9c-.2.4-.6.6-1 .6-4.7-.4-8.4-4.1-8.8-8.8 0-.4.2-.8.6-1l.9-.5Z" fill="currentColor"/></svg>';
    }
    return icon;
  }
  function renderThreads() {
    const box=document.getElementById("webConciergeThreads");if(!box)return;clearNode(box);
    const list=[...threadCache];
    if(!list.length){const e=document.createElement("div");e.className="web-concierge-threads-empty";e.textContent="Noch keine gespeicherten Chats.";box.appendChild(e);return;}
    for(const thread of list){
      const b=document.createElement("button");
      b.type="button";
      b.className=`web-concierge-thread${thread.thread_id===activeThreadId?" is-active":""}`;
      b.dataset.threadId=thread.thread_id;
      b.dataset.chatChannel=String(thread.channel_view||channelForThreadId(thread.thread_id));
      if(b.dataset.chatChannel!=="CHAT")b.dataset.chatScope="CHANNEL";
      const title=document.createElement("span");title.className="web-concierge-thread-title";
      const titleText=document.createElement("span");titleText.className="web-concierge-thread-title-text";titleText.textContent=thread.title||"Chat";
      if(b.dataset.chatScope==="CHANNEL")title.append(channelIcon(b.dataset.chatChannel),titleText);else title.append(titleText);
      const preview=document.createElement("span");preview.className="web-concierge-thread-preview";preview.textContent=thread.preview||"";
      const date=document.createElement("span");date.className="web-concierge-thread-date";date.textContent=thread.updated_at?sidebarDate(thread.updated_at):"";
      b.append(title,preview,date);
      b.addEventListener("click",()=>{setMobileDrawer(false);void selectThread(thread.thread_id);});
      box.appendChild(b);
    }
    const firstChannel=[...box.querySelectorAll(".web-concierge-thread")].find((button)=>button.dataset.chatScope==="CHANNEL");
    if(firstChannel)firstChannel.dataset.chatChannelFirst="true";
  }
  function historySignature(messages) {
    return `${historyHasMore?"more":"end"}\n`+(Array.isArray(messages)?messages:[]).map((m)=>`${m?.id||""}|${m?.at||""}|${m?.role||""}|${m?.channel||""}|${m?.kind||"TEXT"}|${m?.audio_message_id||""}|${m?.text||""}`).join("\n");
  }
  function mergeHistory(existing,incoming) {
    const byId=new Map();
    for(const item of [...(Array.isArray(existing)?existing:[]),...(Array.isArray(incoming)?incoming:[])]){
      if(!item||(item.role!=="user"&&item.role!=="assistant"))continue;
      if(String(item.kind||"TEXT").toUpperCase()==="AUDIO"&&!validUuid(item.audio_message_id))continue;
      if(String(item.kind||"TEXT").toUpperCase()!=="AUDIO"&&!item.text)continue;
      const key=String(item.id||`${item.role}:${item.channel||"WEB"}:${item.at||""}:${item.audio_message_id||item.text||""}`);
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
    const list=Array.isArray(messages)?messages.filter((m)=>(m?.role==="user"||m?.role==="assistant")&&(String(m?.kind||"TEXT").toUpperCase()==="AUDIO"?validUuid(m?.audio_message_id):Boolean(m?.text))):[];
    const signature=historySignature(list);if(!force&&signature===historyFingerprint)return false;
    const log=logNode();if(!log)return false;const previousHeight=log.scrollHeight,previousTop=log.scrollTop;clearNode(log);lastDateKey="";removeTyping();
    if(!list.length){emptyChat();return true;}
    renderOlderControl();
    for(const m of list){
      if(String(m?.kind||"TEXT").toUpperCase()==="AUDIO")appendAudioMessage(m.role,m,m.at,m.id,m.channel||"WEB",{scroll:false});
      else appendMessage(m.role,m.text,m.at,m.id,m.channel||"WEB",{scroll:false});
    }
    historyFingerprint=signature;
    requestAnimationFrame(()=>{
      if(preserveScroll)log.scrollTop=Math.max(0,log.scrollHeight-previousHeight+previousTop);
      else if(scrollToBottom)log.scrollTop=log.scrollHeight;
    });
    return true;
  }
  async function loadThreads({selectFirst=false}={}) {
    const generation=++threadsLoadGeneration;
    try{
      const data=await historyRequest();
      if(generation!==threadsLoadGeneration)return false;
      const source=Array.isArray(data.threads)?data.threads:[];
      const normal=source.find(isNormalThread)||null;
      if(validUuid(normal?.thread_id))primaryChatThreadId=String(normal.thread_id);
      if(!validUuid(primaryChatThreadId)){
        const currentNormal=activeThreadId&&channelForThreadId(activeThreadId)==="CHAT"&&validUuid(activeThreadId)?activeThreadId:null;
        primaryChatThreadId=currentNormal||crypto.randomUUID();
      }
      const chatThread=normal&&validUuid(normal?.thread_id)
        ? {...normal,thread_id:primaryChatThreadId,title:"Chat",channels:["WEB","APP"],channel_view:"CHAT"}
        : {thread_id:primaryChatThreadId,title:"Chat",preview:"",updated_at:null,created_at:null,turn_count:0,channels:["WEB","APP"],channel_view:"CHAT",draft:true};
      const existingWhatsApp=threadCache.find((thread)=>String(thread?.thread_id||"")===VIRTUAL_WHATSAPP_THREAD_ID)||null;
      const existingEmail=threadCache.find((thread)=>String(thread?.thread_id||"")===VIRTUAL_EMAIL_THREAD_ID)||null;
      const whatsappThread={
        thread_id:VIRTUAL_WHATSAPP_THREAD_ID,title:"WhatsApp",preview:String(existingWhatsApp?.preview||""),updated_at:null,
        channels:["WHATSAPP"],channel_view:"WHATSAPP",virtual_channel_thread:true
      };
      const phoneThread={
        thread_id:VIRTUAL_PHONE_THREAD_ID,title:"Telefonprotokoll",preview:"",updated_at:null,
        channels:["PHONE"],channel_view:"PHONE",virtual_channel_thread:true
      };
      const emailThread={
        thread_id:VIRTUAL_EMAIL_THREAD_ID,title:"E-Mail-Protokoll",preview:String(existingEmail?.preview||""),updated_at:null,
        channels:["EMAIL"],channel_view:"EMAIL",virtual_channel_thread:true
      };
      threadCache=[chatThread,whatsappThread,phoneThread,emailThread];
      if(selectFirst&&(!activeThreadId||!threadCache.some((thread)=>thread.thread_id===activeThreadId))){
        activeThreadId=primaryChatThreadId;
      }
      renderThreads();

      void (async()=>{
        const [whatsappResult,phoneResult,emailResult]=await Promise.allSettled([
          channelHistoryRequest("WHATSAPP",{summary:true}),
          channelHistoryRequest("PHONE",{summary:true}),
          channelHistoryRequest("EMAIL",{summary:true})
        ]);
        if(generation!==threadsLoadGeneration)return;
        const next=[chatThread,{...whatsappThread},{...phoneThread},{...emailThread}];
        if(whatsappResult.status==="fulfilled"){
          next[1].preview=String(whatsappResult.value?.whatsapp_number||next[1].preview||"").trim();
        }
        if(phoneResult.status==="fulfilled"&&phoneResult.value?.has_calls!==true){
          next[2].preview="";
        }
        if(emailResult.status==="fulfilled"){
          next[3].preview=String(emailResult.value?.email_address||next[3].preview||"").trim();
        }
        threadCache=next;
        renderThreads();
      })();
      return true;
    }catch{
      if(generation!==threadsLoadGeneration)return false;
      if(!validUuid(primaryChatThreadId))primaryChatThreadId=crypto.randomUUID();
      threadCache=[{
        thread_id:primaryChatThreadId,title:"Chat",preview:"",updated_at:null,
        created_at:null,turn_count:0,channels:["WEB","APP"],channel_view:"CHAT",draft:true
      },{
        thread_id:VIRTUAL_WHATSAPP_THREAD_ID,title:"WhatsApp",preview:"",updated_at:null,
        channels:["WHATSAPP"],channel_view:"WHATSAPP",virtual_channel_thread:true
      },{
        thread_id:VIRTUAL_PHONE_THREAD_ID,title:"Telefonprotokoll",preview:"",updated_at:null,
        channels:["PHONE"],channel_view:"PHONE",virtual_channel_thread:true
      },{
        thread_id:VIRTUAL_EMAIL_THREAD_ID,title:"E-Mail-Protokoll",preview:"",updated_at:null,
        channels:["EMAIL"],channel_view:"EMAIL",virtual_channel_thread:true
      }];
      if(selectFirst&&!activeThreadId)activeThreadId=primaryChatThreadId;
      renderThreads();
      return false;
    }
  }
  async function refreshThread(threadId,{force=false,reset=false}={}) {
    if(!validUuid(threadId)||channelForThreadId(threadId)!=="CHAT")return false;
    try{
      const [data]=await Promise.all([
        historyRequest(threadId,{limit:HISTORY_PAGE_SIZE}),
        refreshRoutedTurns().catch(()=>routedTurnIds)
      ]);
      if(activeThreadId!==threadId)return false;
      const normalMessages=filterRoutedWebAnswers((Array.isArray(data.messages)?data.messages:[]).filter((message)=>NORMAL_CHAT_CHANNELS.has(String(message?.channel||"WEB").toUpperCase())));
      if(reset){historyMessages=mergeHistory([],normalMessages);historyHasMore=data.has_more===true;historyNextBefore=data.next_before||null;historyLoadedOlder=false;}
      else{
        historyMessages=mergeHistory(historyMessages,normalMessages);
        if(!historyLoadedOlder){historyHasMore=data.has_more===true;historyNextBefore=data.next_before||null;}
      }
      renderHistory(historyMessages,{force,scrollToBottom:reset||force});return true;
    } catch { return false; }
  }
  async function refreshChannelView(channel){
    try{
      const data=await channelHistoryRequest(channel);
      historyMessages=mergeHistory([],data.messages);
      historyHasMore=false;historyNextBefore=null;historyLoadedOlder=false;
      if(historyMessages.length)renderHistory(historyMessages,{force:true,scrollToBottom:true});
      else emptyChannelView(channel);
      return true;
    }catch{
      historyMessages=[];historyHasMore=false;historyNextBefore=null;historyLoadedOlder=false;
      emptyChannelView(channel);
      return false;
    }
  }
  async function loadOlderMessages() {
    if(loadingOlder||!activeThreadId||channelForThreadId(activeThreadId)!=="CHAT"||!historyHasMore||!historyNextBefore)return false;
    loadingOlder=true;renderHistory(historyMessages,{force:true,scrollToBottom:false,preserveScroll:true});
    try{
      const threadId=activeThreadId;
      const [data]=await Promise.all([
        historyRequest(threadId,{before:historyNextBefore,limit:HISTORY_PAGE_SIZE}),
        refreshRoutedTurns().catch(()=>routedTurnIds)
      ]);
      if(activeThreadId!==threadId)return false;
      const normalMessages=filterRoutedWebAnswers((Array.isArray(data.messages)?data.messages:[]).filter((message)=>NORMAL_CHAT_CHANNELS.has(String(message?.channel||"WEB").toUpperCase())));
      historyMessages=mergeHistory(normalMessages,historyMessages);
      historyHasMore=data.has_more===true;
      historyNextBefore=data.next_before||null;
      historyLoadedOlder=true;
      return true;
    } catch { return false; }
    finally { loadingOlder=false;renderHistory(historyMessages,{force:true,scrollToBottom:false,preserveScroll:true}); }
  }
  async function selectThread(threadId,{preserveUntilLoaded=false}={}) {
    if(sending)return;
    activeThreadId=threadId;
    const view=channelForThreadId(threadId);
    channelView=view;
    channelViewReadOnly=view!=="CHAT";
    setComposerReady(gatewayReady);
    window.dispatchEvent(new CustomEvent("nahwerk:chat-channel-view",{detail:{channel:view,readOnly:channelViewReadOnly}}));
    resetHistoryState();renderThreads();
    if(!preserveUntilLoaded)emptyChat();
    let loaded=false;
    if(view==="CHAT"&&validUuid(threadId))loaded=await refreshThread(threadId,{force:true,reset:true});
    else if(view==="WHATSAPP"||view==="PHONE"||view==="EMAIL")loaded=await refreshChannelView(view);
    if(preserveUntilLoaded&&!loaded)emptyChat();
    document.getElementById("webConciergeInput")?.focus();
  }
  function newChat() { if(sending)return;activeThreadId=crypto.randomUUID();resetHistoryState();emptyChat();renderThreads();document.getElementById("webConciergeInput")?.focus(); }

  async function resetAllChats(){
    if(sending)return;
    const confirmed=window.confirm("Alle Chats aus Web und App entfernen? Dein WhatsApp-Verlauf auf dem Handy bleibt unverändert.");
    if(!confirmed)return;
    const button=document.getElementById("webConciergeDeleteChats");
    if(button instanceof HTMLButtonElement)button.disabled=true;
    try{
      const result=await gatewayRequest("/web/chats/reset",{method:"POST",body:{scope:"ALL"}});
      if(result?.ok!==true)throw new Error("CHAT_RESET_FAILED");
      activeThreadId=null;threadCache=[];resetHistoryState();emptyChat();renderThreads();
      const loaded=await loadThreads({selectFirst:true});
      if(activeThreadId)await selectThread(activeThreadId);
      else{newChat();if(!loaded)renderThreads();}
    }catch{
      window.alert("Die Chats konnten gerade nicht entfernt werden. Bitte versuche es erneut.");
    }finally{
      if(button instanceof HTMLButtonElement)button.disabled=false;
    }
  }

  function initDeleteAllChats(){
    const newButton=document.getElementById("webConciergeNewChat");
    if(!(newButton instanceof HTMLButtonElement)||document.getElementById("webConciergeDeleteChats"))return;
    const button=document.createElement("button");
    button.type="button";
    button.id="webConciergeDeleteChats";
    button.className="web-concierge-delete-chats";
    button.textContent="Alle Chats löschen";
    button.setAttribute("aria-label","Alle Chats aus Web und App entfernen");
    button.addEventListener("click",()=>{void resetAllChats();});
    newButton.insertAdjacentElement("afterend",button);
  }

  async function syncHistory() {
    if(!gatewayReady||sending||document.hidden)return false;
    const selectedBefore=activeThreadId;
    const loaded=await loadThreads();if(!loaded)return false;
    if(Date.now()-lastPersonaSyncAt>=PERSONA_SYNC_INTERVAL_MS){try{await refreshPersona();}catch{}}
    if(selectedBefore&&threadCache.some((thread)=>thread.thread_id===selectedBefore)){
      const view=channelForThreadId(selectedBefore);
      if(view==="CHAT")return refreshThread(selectedBefore);
      return refreshChannelView(view);
    }
    if(threadCache[0]){
      activeThreadId=threadCache[0].thread_id;
      return selectThread(activeThreadId);
    }
    return true;
  }
  function startLiveSync() {
    if(syncTimer)clearInterval(syncTimer);
    syncTimer=setInterval(()=>{void syncHistory();},SYNC_INTERVAL_MS);
    document.addEventListener("visibilitychange",()=>{if(!document.hidden){void refreshPersona(true).catch(()=>{});void syncHistory();}});
  }

  async function sendTurn() {
    const input=document.getElementById("webConciergeInput");if(!(input instanceof HTMLTextAreaElement)||!gatewayReady||sending||channelViewReadOnly)return;
    const content=input.value.trim();if(!content||content.length>4000)return;
    if(guestMode)lastGuestUserMessage=content;
    if(!activeThreadId)activeThreadId=guestMode?guestThreadId():crypto.randomUUID();
    if(!guestMode){try{await refreshSessionForWrite();}catch{window.SCBAuth?.clearLocalAuth?.();location.replace("/anmelden");return;}}
    const sourceMessageId=crypto.randomUUID(),clientId=`local:${sourceMessageId}`,now=new Date().toISOString();
    appendMessage("user",content,now,clientId,"WEB");input.value="";resizeInput();sending=true;setComposerReady(true);showTyping();
    try{
      if(guestMode){
        let response=null;
        for(let attempt=0;attempt<2;attempt++){
          try{
            response=await gatewayRequest("/web/guest-chat",{method:"POST",auth:false,body:{message:content,source_message_id:sourceMessageId,thread_id:activeThreadId,installation_id:guestInstallationId(),guest_token:guestToken()}});
            break;
          }catch(error){
            const reason=String(error?.message||"");
            if(attempt===0&&/GUEST_SESSION_(?:EXPIRED|INVALID)/i.test(reason)){
              try{sessionStorage.removeItem(GUEST_TOKEN_KEY);}catch{}
              continue;
            }
            throw error;
          }
        }
        if(response?.ok!==true||response?.environment!=="PROD"||response?.authoritative!==true||response?.guest!==true)throw new Error("guest_gateway_response_not_authoritative");
        saveGuestToken(response.guest_token);
        const returnedThreadId=String(response?.thread_id||"");if(validUuid(returnedThreadId)){activeThreadId=returnedThreadId;setGuestThreadId(returnedThreadId);rebindGuestViewThread(returnedThreadId);}
        if(!renderCoreV1Response(response.core,{guestRequest:content}))throw new Error("guest_core_response_not_authoritative");
        const backendAccountAction=Array.isArray(response?.core?.ui_actions)
          && response.core.ui_actions.some((action)=>String(action?.type||"").toUpperCase()==="CREATE_ACCOUNT");
        if(!backendAccountAction&&isExplicitGuestAccountIntent(content)){
          renderGuestAccountActions([{type:"CREATE_ACCOUNT",purpose:"ACCOUNT_REQUEST",label:"Konto erstellen",href:"/registrieren?source=web_guest_chat"}],{request:""});
        }
        return;
      }
      const response=await gatewayRequest("/web/chat",{method:"POST",body:{message:content,source_message_id:sourceMessageId,thread_id:activeThreadId}});
      if(response?.ok!==true||response?.environment!=="PROD"||response?.authoritative!==true||(response?.thread_id&&response?.thread_id!==activeThreadId))throw new Error("gateway_response_not_authoritative");
      const routed=await dispatchWebResponse(String(response?.core?.turn_id||""),sourceMessageId);
      if(routed?.handled===true){
        if(validUuid(String(response?.core?.turn_id||"")))routedTurnIds.add(String(response.core.turn_id));
        routedTurnsLoadedAt=Date.now();
        renderRoutedDelivery(routed.target_channel);
      }else{
        if(!renderCoreV1Response(response.core))throw new Error("core_response_not_authoritative");
        if(response?.connection_offer)renderConnectionOffer(response.connection_offer);
      }
      await refreshPersona(true).catch(()=>{});
      const returnedThreadId=String(response?.thread_id||"");if(validUuid(returnedThreadId))activeThreadId=returnedThreadId;
      await loadThreads();
      if(validUuid(activeThreadId))await refreshThread(activeThreadId,{force:true});
    }catch(error){
      const reason=String(error?.message||error?.name||"TEXT_CHAT_FAILED");
      reportClientDiagnostic(reason);
      if(!guestMode&&/session_(?:required|invalid)|http_401|http_403/i.test(reason)){
        window.SCBAuth?.clearLocalAuth?.();
        location.replace("/anmelden");
        return;
      }
      removeTyping();const row=document.querySelector(`[data-message-id="${CSS.escape(clientId)}"]`);row?.classList.add("is-failed");
      if(row){const state=document.createElement("span");state.className="web-concierge-message-state";state.textContent=guestMode&&/GUEST_(?:DAILY_MESSAGE_LIMIT|SESSION_CREATION_LIMIT)/i.test(reason)?"Kostenloses Gast-Limit erreicht – melde dich an, um weiterzumachen.":`Nicht gesendet – Fehler: ${reason.slice(0,80)}`;row.appendChild(state);}
    }finally{sending=false;setComposerReady(gatewayReady);input.focus();}
  }

  async function checkReadiness() {
    try{
      const readiness=normalizeGatewayReadiness(await gatewayRequest("/health",{auth:false}));if(readiness?.ready!==true)throw new Error("gateway_not_authoritative");
      gatewayReady=true;
      if(!guestMode)void refreshPersona(true).catch(()=>{});
      return true;
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
    topbar.querySelector(".web-concierge-mobile-exit")?.addEventListener("click",()=>{setMobileDrawer(false);location.href=guestMode?"/de/":"/konto";});
    topbar.querySelector(".web-concierge-mobile-chats")?.addEventListener("click",()=>setMobileDrawer(!workspace.classList.contains("is-mobile-sidebar-open")));
    topbar.querySelector(".web-concierge-mobile-new")?.addEventListener("click",()=>{setMobileDrawer(false);newChat();});
    backdrop.addEventListener("click",()=>setMobileDrawer(false));
  }

  async function boot() {
    initThemeToggle();
    initMobileDrawer();
    initDeleteAllChats();
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

    const token=sessionToken();
    guestMode=!token;
    document.body.classList.toggle("web-concierge-guest",guestMode);
    if(guestMode){
      if(isChatPageReload())resetGuestChatSessionForReload();
      else{try{localStorage.removeItem(GUEST_TOKEN_KEY);}catch{}}
      const back=document.querySelector(".web-concierge-back");
      if(back instanceof HTMLAnchorElement){back.href="/de/";back.textContent="Zurück";}
    }
    if(!guestMode){
      // Do not block the chat UI on a duplicate client-side session preflight.
      // Every authenticated gateway request validates the bearer session server-side again.
      void window.SCBAuth?.validateSession?.().catch(()=>false);
      if(new URLSearchParams(location.search).get("resume_guest")==="1"){
        try{
          const handoff=JSON.parse(localStorage.getItem(GUEST_RESUME_KEY)||"null");
          const request=String(handoff?.request||"").trim().slice(0,4000);
          if(request){
            const input=document.getElementById("webConciergeInput");
            if(input instanceof HTMLTextAreaElement){input.value=request;resizeInput();}
            localStorage.removeItem(GUEST_RESUME_KEY);
          }
        }catch{}
      }
    }
    applyPersona(null);
    const status=document.getElementById("webConciergeStatus");
    setComposerReady(false);
    if(status){status.textContent=guestMode?"Kostenloser Gast-Chat":"Verbindung wird hergestellt …";status.classList.remove("is-online");}
    const initialHistoryPromise=(async()=>{
      if(guestMode){
        activeThreadId=guestThreadId();
        guestViewRestored=restoreGuestViewState(activeThreadId);
        if(!guestViewRestored)emptyChat();
        return true;
      }
      const loaded=await loadThreads({selectFirst:true});
      if(activeThreadId)await selectThread(activeThreadId,{preserveUntilLoaded:true});
      else if(!loaded)newChat();
      return loaded;
    })();
    let ready=await checkReadiness();
    if(!ready){
      await new Promise((resolve)=>setTimeout(resolve,650));
      ready=await checkReadiness();
    }
    if(status){status.textContent=ready?(guestMode?"Kostenlos chatten · keine Anmeldung nötig":"Online"):"Verbindung momentan nicht möglich";status.classList.toggle("is-online",ready);}
    setComposerReady(ready);
    await initialHistoryPromise.catch(()=>false);
    if(ready){
      if(guestMode){
        if(!guestViewRestored)appendMessage("assistant","Willkommen bei NAHWERK. Sag mir einfach, wobei du Unterstützung suchst. Ich kann dir zeigen, was NAHWERK für dich oder einen Angehörigen übernehmen kann, Funktionen und Preise erklären oder gemeinsam mit dir den passenden Einstieg finden. Fragen und Beratung sind hier kostenlos und ohne Anmeldung möglich. Ein Konto brauchst du erst, wenn ich wirklich etwas für dich ausführen soll.",new Date().toISOString(),"guest:welcome","WEB");
      }else{
        renderIntegrationReturnNotice();
        void refreshPersona(true).then(async()=>{await loadThreads();renderThreads();}).catch(()=>{});
        startLiveSync();
      }
    }
    document.getElementById("webConciergeNewChat")?.addEventListener("click",newChat);
    document.getElementById("webConciergeSend")?.addEventListener("click",sendTurn);
    document.getElementById("webConciergeInput")?.addEventListener("input",resizeInput);
    document.getElementById("webConciergeInput")?.addEventListener("keydown",(event)=>{if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();sendTurn();}});
  }

  window.NAHWERKWebCustomerConciergeLiveBridge=Object.freeze({
    sessionToken,
    threadId:()=>{
      if(channelView!=="CHAT"||channelViewReadOnly)return null;
      if(!validUuid(primaryChatThreadId))primaryChatThreadId=validUuid(activeThreadId)?activeThreadId:crypto.randomUUID();
      if(!validUuid(activeThreadId)||channelForThreadId(activeThreadId)!=="CHAT")activeThreadId=primaryChatThreadId;
      return activeThreadId;
    },
    isAllowed:()=>gatewayReady&&!guestMode&&!channelViewReadOnly&&channelView==="CHAT"
  });
  window.NAHWERKWebCustomerConciergeTestHooks=Object.freeze({configuredEndpoint,configuredHistoryEndpoint,sessionToken,guestInstallationId,guestToken,guestThreadId,normalizeGatewayReadiness,normalizeCoreV1Response,normalizePersona,applyPersona,appendLinkifiedText,renderCoreV1Response,renderConnectionOffer,renderIntegrationReturnNotice,gatewayRequest,historyRequest,refreshPersona,syncHistory,loadOlderMessages,mergeHistory,CORE_CONTRACT_VERSION,GATEWAY_CONTRACT_VERSION,HISTORY_CONTRACT_VERSION,HISTORY_PAGE_SIZE,SYNC_INTERVAL_MS,PERSONA_SYNC_INTERVAL_MS,GATEWAY_ENDPOINT,HISTORY_ENDPOINT});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
