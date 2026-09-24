(() => {
  const SESSION_KEY = "scb_web_session";
  const BASE = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-email-runtime";
  const SETTINGS = Object.freeze({
    FRAUD_PROTECTION: ["Betrugsschutz", "Warnt bei auffälligen Absendern, Links und Zahlungsaufforderungen."],
    SPAM_PROTECTION: ["Spam-Schutz", "Ordnet wahrscheinlich unerwünschte oder werbliche Nachrichten ein."],
    IMPORTANT: ["Wichtige E-Mails", "Hebt Nachrichten hervor, die wahrscheinlich deine Aufmerksamkeit brauchen."],
    INVOICES: ["Rechnungen", "Erkennt Rechnungen, Zahlungsinformationen und Mahnungen."],
    APPOINTMENTS: ["Termine", "Erkennt Termine, Reservierungen und Fristen."],
    TRAVEL: ["Reisen", "Erkennt Reise-, Flug-, Bahn- und Hotelinformationen."],
    ORDERS: ["Bestellungen", "Erkennt Bestellungen, Versand und Lieferungen."],
    PERSONAL: ["Persönliche Nachrichten", "Hebt persönliche Nachrichten getrennt hervor."],
    SUPPORT_CONTRACTS: ["Verträge & Support", "Erkennt Vertrags-, Anbieter- und Supportthemen."],
    REPLY_ASSISTANT: ["Antwort-Assistent", "Bereitet auf Wunsch Antworten vor. Gesendet wird nur nach deiner Freigabe."],
    PROACTIVE_HINTS: ["Wichtige Hinweise", "Zeigt dezent Fristen, Risiken und Nachrichten mit Handlungsbedarf."],
    ACTIVITY_DIGEST: ["Aktivitätsübersicht", "Zeigt kompakt, was dein E-Mail-Concierge für dich erledigt hat."],
    UNIMPORTANT_AUTO_TRASH: ["Unwichtige automatisch in Papierkorb", "Nur nach deiner Bestätigung. Neue eindeutig unwichtige E-Mails werden sofort und zusätzlich minütlich geprüft und in den Gmail-Papierkorb verschoben."]
  });
  const QUICK = [
    "Zeig mir wichtige neue E-Mails.",
    "Zeig mir alle unwichtigen.",
    "Zeig mir ungelesene E-Mails.",
    "Welche Rechnungen habe ich diese Woche bekommen?",
    "Welche E-Mails brauchen wahrscheinlich eine Antwort?"
  ];
  const ERROR_COPY = Object.freeze({
    UNAUTHENTICATED: "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.",
    EMAIL_CONNECTION_NOT_CONNECTED: "Das E-Mail-Konto ist nicht verbunden.",
    EMAIL_PROVIDER_UNAVAILABLE: "Der E-Mail-Concierge ist gerade nicht vollständig erreichbar. Deine verbundenen Postfächer bleiben verfügbar.",
    EMAIL_PROVIDER_BUSY: "Der E-Mail-Anbieter ist gerade kurz ausgelastet. Deine gespeicherten Sortierungen und Regeln bleiben verfügbar; versuche es gleich noch einmal.",
    EMAIL_QUERY_INVALID: "Diese Anfrage konnte nicht verarbeitet werden.",
    EMAIL_CLASSIFICATION_INVALID: "Diese Sortierung konnte nicht gespeichert werden.",
    MESSAGE_ID_REQUIRED: "Diese E-Mail konnte nicht geöffnet werden.",
    APPROVAL_BINDING_REQUIRED: "Für diesen Entwurf fehlt eine gültige Versandfreigabe.",
    APPROVAL_BINDING_MISMATCH: "Die Versandfreigabe passt nicht mehr zu diesem Entwurf. Bitte aktualisiere die Ansicht."
  });

  function sessionToken() {
    try { return String(JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null")?.session_token || ""); }
    catch { return ""; }
  }
  function number(value) { const n = Number(value); return Number.isFinite(n) && n >= 0 ? n : 0; }
  function list(value) { return Array.isArray(value) ? value : []; }
  function text(value, max = 4000) { return String(value ?? "").trim().slice(0, max); }
  function normalizeDashboard(data) {
    if (data?.ok !== true) return null;
    const summary = data.summary && typeof data.summary === "object" ? data.summary : {};
    return {
      product: data.product || { name: "E-Mail-Concierge", state: "ACTIVE" },
      connection: data.connection && typeof data.connection === "object" ? data.connection : {},
      chat: data.chat && typeof data.chat === "object" ? data.chat : { has_user_message: false },
      summary: {
        recent: number(summary.recent), today: number(summary.today), unread: number(summary.unread),
        important: number(summary.important), needs_reply: number(summary.needs_reply), invoices: number(summary.invoices),
        appointments: number(summary.appointments), travel: number(summary.travel), orders: number(summary.orders),
        support_contracts: number(summary.support_contracts), spam_likely: number(summary.spam_likely),
        suspicious: number(summary.suspicious), text: text(summary.text, 1000)
      },
      protection: data.protection && typeof data.protection === "object" ? data.protection : {},
      settings: data.settings && typeof data.settings === "object" ? data.settings : {},
      highlights: list(data.highlights), warnings: list(data.warnings), hints: list(data.hints),
      drafts: list(data.drafts), activities: list(data.activities),
      rules: list(data.rules), suggestions: list(data.suggestions),
      classification_review: data.classification_review && typeof data.classification_review === "object" ? {
        mode: text(data.classification_review.mode, 60),
        auto_preselected: data.classification_review.auto_preselected === true,
        inbox_unchanged_until_explicit_action: data.classification_review.inbox_unchanged_until_explicit_action === true,
        virtual_views: data.classification_review.virtual_views === true,
        examples: list(data.classification_review.examples).slice(0, 4)
      } : null,
      notification_preference: data.notification_preference && typeof data.notification_preference === "object"
        ? { enabled: data.notification_preference.enabled === true, target_channel: text(data.notification_preference.target_channel, 30) || "PORTAL" }
        : { enabled: false, target_channel: "PORTAL" },
      channels: data.channels && typeof data.channels === "object" ? data.channels : {}
    };
  }
  function bootstrapDashboard() {
    return {
      product: { name: "E-Mail-Concierge", state: "ACTIVE" },
      connection: {},
      chat: { has_user_message: false },
      summary: { recent:0,today:0,unread:0,important:0,needs_reply:0,invoices:0,appointments:0,travel:0,orders:0,support_contracts:0,spam_likely:0,suspicious:0,text:"" },
      protection: {},
      settings: {},
      highlights: [], warnings: [], hints: [], drafts: [], activities: [], rules: [], suggestions: [],
      classification_review: null,
      notification_preference: { enabled:false, target_channel:"PORTAL" },
      channels: {}
    };
  }
  function normalizeClassification(data) {
    if (data?.ok !== true) return null;
    const counts = data.counts && typeof data.counts === "object" ? data.counts : {}, buckets = data.buckets && typeof data.buckets === "object" ? data.buckets : {};
    return {
      total: number(data.total), sorted_count: number(data.sorted_count), complete: data.complete === true, limit: number(data.limit),
      counts: { IMPORTANT: number(counts.IMPORTANT), UNIMPORTANT: number(counts.UNIMPORTANT), MARKETING: number(counts.MARKETING) },
      buckets: { IMPORTANT: list(buckets.IMPORTANT), UNIMPORTANT: list(buckets.UNIMPORTANT), MARKETING: list(buckets.MARKETING) }
    };
  }
  function errorCode(data, fallback = "EMAIL_PROVIDER_UNAVAILABLE") {
    return String(data?.error?.code || data?.error || fallback);
  }
  globalThis.NAHWERKEmailConciergeProductTestHooks = Object.freeze({ BASE, SETTINGS, QUICK, normalizeDashboard, normalizeClassification, errorCode, CANONICAL_FOLDERS:["INBOX","SPAM","SENT","DRAFTS","TRASH"] });

  if (typeof document === "undefined") return;
  let connected = false;
  let host = null;
  let dashboard = null;
  let dashboardLoadPromise = null;
  let dashboardLoadedAt = 0;
  const DASHBOARD_DEDUPE_MS = 10000;
  let classification = null;
  let classificationBucket = "UNIMPORTANT";
  let classificationLoading = false;
  let classificationError = "";
  let classificationRetryCount = 0;
  let busy = false;
  let chatMessages = [];
  let chatStarted = false;
  let chatDraft = "";
  let chatScrollTop = 0;
  let mailboxListScrollTop = 0;
  let mailboxSidebarScrollTop = 0;
  let mailboxSidebarScrollLeft = 0;
  let readerScrollTop = 0;
  let preservePageScrollUntil = 0;
  let preservePageScrollY = 0;
  let chatSelectionStart = 0;
  let chatSelectionEnd = 0;
  let chatAutoScrollNext = false;
  let pendingBackgroundRender = false;
  const onboardingExampleSelections = new Map();
  const classificationSavingIds = new Set();
  let activityExpanded = false;
  let emailConnections = [];
  let activeConnectionId = "";
  let mailboxScope = "ALL";
  let mailboxFolder = "INBOX";
  let mailboxSearch = "";
  let mailboxFolderRows = [];
  let mailboxFolderLoading = false;
  let mailboxFolderError = "";
  let mailboxFolderCounts = {};
  let classificationKnownCounts = {};
  let classificationFolderCache = {};
  let mailboxLoadSerial = 0;
  const mailboxIndexWarmStarted = new Set();
  const remoteFolderCache = new Map();
  const remoteFolderInflight = new Map();
  const REMOTE_FOLDER_CACHE_MS = 15000;
  let allDrafts = [];
  let draftsLoading = false;
  let readerMode = "MESSAGE";
  let selectedMessageId = "";
  let selectedMessageConnectionId = "";
  let selectedMessageDetail = null;
  let selectedMessageLoading = false;
  let composeState = null;
  let composeSaving = false;

  function ensureClassificationStyles() {
    if (document.getElementById("nahwerkEmailClassificationStyles")) return;
    const style = document.createElement("style"); style.id = "nahwerkEmailClassificationStyles";
    style.textContent = `
      .ecp-summary{grid-template-columns:repeat(6,minmax(0,1fr))!important}
      .ecp-tb-compose-button{width:calc(100% - 24px);margin:0 12px 10px;min-height:42px;border:1px solid rgba(212,175,55,.34);border-radius:12px;background:rgba(212,175,55,.10);color:inherit;font:inherit;font-weight:750;cursor:pointer}
      .ecp-tb-compose-button:hover{background:rgba(212,175,55,.16)}
      .ecp-compose{display:grid;gap:14px;padding:18px 20px 24px}
      .ecp-compose-field{display:grid;gap:6px}
      .ecp-compose-field>span{font-size:.69rem;font-weight:750;opacity:.58}
      .ecp-compose input,.ecp-compose select,.ecp-compose textarea{width:100%;border:1px solid rgba(127,127,127,.22);border-radius:10px;background:rgba(127,127,127,.025);color:inherit;font:inherit;padding:11px 12px}
      .ecp-compose textarea{min-height:260px;resize:vertical;line-height:1.55}
      .ecp-compose-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;padding-top:4px}
      .ecp-compose-status{font-size:.75rem;line-height:1.4;opacity:.68}
      .ecp-compose-note{font-size:.72rem;line-height:1.45;opacity:.58}
      .ecp-tb-reader-toolbar{flex-wrap:wrap}
      @media(max-width:640px){.ecp-compose{padding:14px}.ecp-compose-actions>*{flex:1 1 auto}}
      .ecp-stat-button{appearance:none;color:inherit;font:inherit;text-align:left;cursor:pointer;width:100%;transition:transform .16s ease,background .16s ease,border-color .16s ease}
      .ecp-stat-button:hover{background:rgba(127,127,127,.09);border-color:rgba(127,127,127,.34)}
      .ecp-stat-button:active{transform:scale(.985)}
      .ecp-mail-side{display:grid;justify-items:end;gap:8px;min-width:max-content}
      .ecp-class-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:5px}
      .ecp-class-btn{appearance:none;border:1px solid rgba(127,127,127,.24);background:transparent;color:inherit;border-radius:999px;padding:5px 8px;font:inherit;font-size:.68rem;cursor:pointer;white-space:nowrap}
      .ecp-class-btn:hover{background:rgba(127,127,127,.1)}
      .ecp-class-btn[aria-pressed="true"]{border-color:rgba(47,125,255,.45);background:rgba(47,125,255,.12);font-weight:650}
      .ecp-sort-tabs{display:flex;flex-wrap:wrap;gap:7px;margin:0 0 12px}
      .ecp-sort-tab{appearance:none;border:1px solid rgba(127,127,127,.24);background:transparent;color:inherit;border-radius:999px;padding:8px 11px;font:inherit;font-size:.78rem;cursor:pointer}
      .ecp-sort-tab[aria-pressed="true"]{border-color:rgba(47,125,255,.45);background:rgba(47,125,255,.12);font-weight:650}
      .ecp-class-reason{margin:7px 0 0;font-size:.72rem;line-height:1.4;opacity:.55}
      .ecp-sort-scope{margin:12px 0 0;font-size:.74rem;line-height:1.45;opacity:.58}
      .ecp-detail .ecp-class-actions{justify-content:flex-start;margin-top:12px}
      .ecp-rule-heading{margin:18px 0 10px;font-size:.72rem;font-weight:750;letter-spacing:.06em;text-transform:uppercase;opacity:.62}
      .ecp-rule{min-width:0}
      .ecp-rule-suggestion{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:13px 0;border-top:1px solid rgba(127,127,127,.14)}
      .ecp-rule-personal{display:grid;grid-template-columns:1fr;gap:14px;margin:10px 0 0;padding:17px;border:1px solid rgba(127,127,127,.15);border-radius:18px;background:linear-gradient(145deg,rgba(127,127,127,.035),rgba(127,127,127,.018));box-shadow:inset 0 1px 0 rgba(255,255,255,.018)}
      .ecp-rule-copy{display:grid;gap:5px;min-width:0}
      .ecp-rule-title-row{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;min-width:0}
      .ecp-rule-title-row>strong{min-width:0;font-size:.92rem;line-height:1.35;letter-spacing:-.012em;overflow-wrap:break-word;word-break:normal}
      .ecp-rule small{display:block;font-size:.7rem;line-height:1.4;opacity:.58;overflow-wrap:break-word}.ecp-rule-match{opacity:.48!important}
      .ecp-rule-future{display:flex;align-items:center;gap:9px;min-width:0;margin-top:5px;padding:9px 11px;border-radius:12px;background:rgba(127,127,127,.045)}
      .ecp-rule-future-label{flex:0 0 auto;padding:4px 7px;border-radius:999px;background:rgba(127,127,127,.09);font-size:.65rem;font-weight:750}
      .ecp-rule-future strong{min-width:0;font-size:.73rem;line-height:1.35;font-weight:650}
      .ecp-rule-actions{display:flex;flex-wrap:wrap;gap:7px;justify-content:flex-end;align-items:center}
      .ecp-rule-controls{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:end;min-width:0;padding-top:2px}
      .ecp-rule-action-block{display:grid;gap:6px;min-width:0}
      .ecp-rule-control-label{font-size:.66rem;font-weight:700;opacity:.55}
      .ecp-rule-select{width:100%;max-width:none;min-width:0;min-height:44px;border:1px solid rgba(127,127,127,.22);border-radius:12px;background:rgba(127,127,127,.025);color:inherit;padding:0 12px;font:inherit;font-size:.75rem}
      .ecp-rule-select:focus{outline:none;border-color:rgba(127,127,127,.5);box-shadow:0 0 0 3px rgba(127,127,127,.06)}
      .ecp-rule-toggle{display:inline-flex;flex:0 0 auto;gap:7px;align-items:center;min-height:28px;padding:3px 0;font-size:.72rem;white-space:nowrap}.ecp-rule-toggle input{accent-color:currentColor}
      .ecp-rule-delete{justify-self:end;min-height:40px;padding:8px 13px}
      .ecp-rule-existing{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px 12px;align-items:center;padding-top:12px;border-top:1px solid rgba(127,127,127,.12)}
      .ecp-rule-existing-copy{display:grid;gap:3px;min-width:0}
      .ecp-rule-existing-copy strong{font-size:.75rem}
      .ecp-rule-existing-copy span,.ecp-rule-existing-status{font-size:.68rem;line-height:1.4;opacity:.58}
      .ecp-rule-existing-button{justify-self:end;white-space:nowrap}
      .ecp-rule-existing-status{grid-column:1/-1;min-height:0}
      .ecp-rule-existing-confirm{grid-column:1/-1;display:grid;gap:10px;padding:12px;border:1px solid rgba(215,169,52,.22);border-radius:13px;background:rgba(215,169,52,.045)}
      .ecp-rule-existing-confirm p{margin:0;font-size:.73rem;line-height:1.45}
      .ecp-rule-existing-confirm-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
      .ecp-settings-details{margin-top:16px;border-top:1px solid rgba(127,127,127,.16);padding-top:12px}.ecp-settings-details>summary{cursor:pointer;font-size:.76rem;font-weight:650}
      @media(max-width:1180px){.ecp-layout{grid-template-columns:1fr}.ecp-summary{grid-template-columns:repeat(3,minmax(0,1fr))!important}.ecp-rule-suggestion{grid-template-columns:1fr}.ecp-rule-actions{justify-content:flex-start}}
      @media(max-width:640px){.ecp-rule-personal{padding:14px}.ecp-rule-title-row{gap:10px}.ecp-rule-controls,.ecp-rule-existing{grid-template-columns:1fr}.ecp-rule-delete,.ecp-rule-existing-button{justify-self:stretch;width:100%}.ecp-rule-actions{justify-content:flex-start}.ecp-rule-select{width:100%}.ecp-rule-future{align-items:flex-start;flex-direction:column;gap:6px}.ecp-rule-existing-confirm-actions>*{flex:1 1 auto}}
      @media(max-width:640px){.ecp-summary{grid-template-columns:repeat(2,minmax(0,1fr))!important}.ecp-mail-side{justify-items:start;min-width:0}.ecp-class-actions{justify-content:flex-start}}
    `;
    document.head.append(style);
  }
  function el(tag, className = "", value = "") {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== "") node.textContent = value;
    return node;
  }
  function button(label, className = "ecp-action") {
    const node = el("button", className, label); node.type = "button"; return node;
  }
  function fmtDate(value) {
    if (!value) return "";
    const date = new Date(value); if (!Number.isFinite(date.getTime())) return "";
    return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
  }
  async function request(path, { method = "GET", body = null, connectionId = "", allowBare = false } = {}) {
    const token = sessionToken();
    if (!token) throw new Error("UNAUTHENTICATED");
    const headers = { Authorization: "Bearer " + token };
    const init = { method, headers };
    const conciergeScoped = path.includes("/email/concierge/") && !path.includes("/query-all") && !path.includes("/accounts-overview");
    const scopedId = String(connectionId || (conciergeScoped ? activeConnectionId : "") || "");
    let requestPath = path, requestBody = body;
    if (scopedId) {
      if (method === "GET") {
        const join = requestPath.includes("?") ? "&" : "?";
        requestPath += join + "connection_id=" + encodeURIComponent(scopedId);
      } else {
        requestBody = { ...(body && typeof body === "object" ? body : {}), connection_id: scopedId };
      }
    }
    if (requestBody !== null) { headers["Content-Type"] = "application/json"; init.body = JSON.stringify(requestBody); }
    let response;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 18000);
    init.signal = controller.signal;
    try { response = await fetch(BASE + requestPath, init); }
    catch { throw new Error("EMAIL_PROVIDER_UNAVAILABLE"); }
    finally { clearTimeout(timeout); }
    const data = await response.json().catch(() => null);
    if (!response.ok || (!allowBare && data?.ok !== true)) throw new Error(errorCode(data));
    return data;
  }
  function ensureHost() {
    if (host?.isConnected) return host;
    const accountRoot = document.getElementById("accountEmailCard");
    if (!accountRoot) return null;
    host = document.getElementById("emailConciergeProduct");
    if (!host) {
      host = el("section", "email-concierge-product");
      host.id = "emailConciergeProduct";
      host.setAttribute("aria-label", "E-Mail-Concierge");
      host.hidden = true;
      const accountHead = accountRoot.querySelector(".email-account-head");
      if (accountHead) accountHead.insertAdjacentElement("afterend", host);
      else accountRoot.prepend(host);
    }
    return host;
  }
  function captureTransientUiState(root) {
    const chatLog=root?.querySelector?.("#emailConciergeChatLog");
    if(chatLog) chatScrollTop=chatLog.scrollTop;
    const listNode=root?.querySelector?.(".ecp-tb-message-list");
    if(listNode) mailboxListScrollTop=listNode.scrollTop;
    const sidebarNav=root?.querySelector?.(".ecp-tb-nav");
    if(sidebarNav){mailboxSidebarScrollTop=sidebarNav.scrollTop;mailboxSidebarScrollLeft=sidebarNav.scrollLeft;}
    const reader=root?.querySelector?.(".ecp-tb-reader");
    if(reader) readerScrollTop=reader.scrollTop;
    const input=root?.querySelector?.(".ecp-chat-input");
    const chatFocused=Boolean(input&&document.activeElement===input);
    const pageScrollX=Number(globalThis.scrollX||0),pageScrollY=Number(globalThis.scrollY||0);
    if(input){
      chatDraft=input.value;
      if(chatFocused){
        chatSelectionStart=Number(input.selectionStart??input.value.length);
        chatSelectionEnd=Number(input.selectionEnd??chatSelectionStart);
      }
    }
    return {chatFocused,pageScrollX,pageScrollY};
  }
  function restoreTransientUiState(root,state={chatFocused:false,pageScrollX:0,pageScrollY:0}) {
    const chatLog=root?.querySelector?.("#emailConciergeChatLog");
    if(chatLog){
      chatLog.scrollTop=chatAutoScrollNext?chatLog.scrollHeight:chatScrollTop;
      chatAutoScrollNext=false;
    }
    const listNode=root?.querySelector?.(".ecp-tb-message-list");
    if(listNode) listNode.scrollTop=mailboxListScrollTop;
    const sidebarNav=root?.querySelector?.(".ecp-tb-nav");
    if(sidebarNav){
      sidebarNav.scrollTop=mailboxSidebarScrollTop;sidebarNav.scrollLeft=mailboxSidebarScrollLeft;
      const top=mailboxSidebarScrollTop,left=mailboxSidebarScrollLeft;
      requestAnimationFrame(()=>{if(sidebarNav.isConnected){sidebarNav.scrollTop=top;sidebarNav.scrollLeft=left;}});
    }
    const reader=root?.querySelector?.(".ecp-tb-reader");
    if(reader) reader.scrollTop=readerScrollTop;
    const input=root?.querySelector?.(".ecp-chat-input");
    if(input){
      input.value=chatDraft;
      if(state.chatFocused){
        try{input.focus({preventScroll:true});input.setSelectionRange(Math.min(chatSelectionStart,input.value.length),Math.min(chatSelectionEnd,input.value.length));}
        catch{input.focus();}
      }
    }
    if(Number.isFinite(state.pageScrollY)){
      const x=Number.isFinite(state.pageScrollX)?state.pageScrollX:0,y=state.pageScrollY;
      requestAnimationFrame(()=>{ try{globalThis.scrollTo({left:x,top:y,behavior:"auto"});}catch{globalThis.scrollTo(x,y);} });
    }
  }
  function flushPendingBackgroundRender() {
    if(!pendingBackgroundRender) return;
    setTimeout(()=>{
      if(!pendingBackgroundRender) return;
      const form=host?.querySelector?.(".ecp-chat-form");
      if(form?.matches?.(":focus-within")) return;
      pendingBackgroundRender=false;
      render(true);
    },0);
  }
  function setBusy(value) {
    busy = value;
    host?.querySelectorAll("button,input,textarea").forEach((node) => { if (!node.closest(".ecp-switch") || node.tagName !== "INPUT") node.disabled = value; });
  }
  function showError(code) {
    if (!host) return;
    const box = el("div", "ecp-error", ERROR_COPY[code] || "Der E-Mail-Concierge konnte gerade nicht geladen werden. Bitte versuche es erneut.");
    host.prepend(box);
    setTimeout(() => box.remove(), 7000);
  }
  function stat(value, label, onClick = null) {
    const box = el(onClick ? "button" : "div", "ecp-stat" + (onClick ? " ecp-stat-button" : ""));
    if (onClick) { box.type = "button"; box.addEventListener("click", onClick); }
    box.append(el("strong", "", String(value)), el("span", "", label)); return box;
  }
  function sectionCard(title, intro = "") {
    const card = el("section", "ecp-card");
    const head = el("div", "ecp-card-head"), titleWrap = el("div");
    titleWrap.append(el("h3", "", title)); if (intro) titleWrap.append(el("p", "ecp-card-intro", intro)); head.append(titleWrap); card.append(head);
    return { card, head };
  }
  function badge(label, warning = false) { return el("span", "ecp-badge" + (warning ? " ecp-badge-warning" : ""), label); }
  function classificationLabel(value) { return value === "IMPORTANT" ? "Wichtig" : value === "UNIMPORTANT" ? "Unwichtig" : value === "MARKETING" ? "Werbung / Spam" : ""; }
  function classificationMessages() { return classification ? [...classification.buckets.IMPORTANT, ...classification.buckets.UNIMPORTANT, ...classification.buckets.MARKETING] : []; }
  function classificationMessageById(id) { return classificationMessages().find((row) => String(row?.id || "") === String(id || "")) || null; }
  function connectionById(id) { return emailConnections.find((row) => String(row.connection_id || "") === String(id || "")) || null; }
  function connectionEmail(id) {
    const row = connectionById(id);
    return text(row?.account_email || row?.account_display_hint || row?.provider_label || "Postfach", 320);
  }
  const CANONICAL_MAILBOX_FOLDERS = Object.freeze(["INBOX","SPAM","SENT","DRAFTS","TRASH"]);
  function remoteFolderMode() { return mailboxScope === "ALL" || CANONICAL_MAILBOX_FOLDERS.includes(mailboxFolder); }
  function folderBackedMode() { return remoteFolderMode(); }
  function setFolderCount(connectionId, folder, meta) {
    const id=String(connectionId||""); if(!id) return;
    if(!mailboxFolderCounts[id]) mailboxFolderCounts[id]={};
    mailboxFolderCounts[id][folder]={ total:number(meta?.messages_total), unread:number(meta?.messages_unread) };
  }
  function physicalFolderUnread(connectionId, folder) {
    const value=mailboxFolderCounts?.[String(connectionId||"")]?.[folder]?.unread;
    return Number.isFinite(value) && value>0 ? value : "";
  }
  function folderProviderTruth(connectionId, folder = "INBOX") {
    const meta=mailboxFolderCounts?.[String(connectionId||"")]?.[folder];
    if(!meta || !Number.isFinite(meta.total) || !Number.isFinite(meta.unread)) return null;
    return {messages_total:Math.max(0,Number(meta.total)||0),messages_unread:Math.max(0,Number(meta.unread)||0)};
  }
  function inboxProviderTruth(connectionId) { return folderProviderTruth(connectionId,"INBOX"); }
  function formatMailboxNumber(value) {
    return Math.max(0,Number(value)||0).toLocaleString("de-DE");
  }
  function mailboxProviderTruthLabel() {
    if(mailboxScope==="ALL"){
      const truths=emailConnections.map((row)=>inboxProviderTruth(row.connection_id));
      if(!emailConnections.length || truths.some((row)=>!row)) return "Postfachzahlen werden aktualisiert …";
      const total=truths.reduce((sum,row)=>sum+row.messages_total,0),unread=truths.reduce((sum,row)=>sum+row.messages_unread,0);
      return `Alle Posteingänge · ${formatMailboxNumber(total)} E-Mails insgesamt · ${formatMailboxNumber(unread)} ungelesen`;
    }
    const address=connectionEmail(activeConnectionId),truth=folderProviderTruth(activeConnectionId,mailboxFolder);
    if(!truth) return `${address} · Postfachzahlen werden aktualisiert …`;
    return `${address} · ${formatMailboxNumber(truth.messages_total)} E-Mails in diesem Bereich · ${formatMailboxNumber(truth.messages_unread)} ungelesen`;
  }
  function decorateRemoteMessage(message, connection) {
    return {
      ...message,
      snippet: text(message?.snippet || message?.text, 600),
      _connection_id: String(connection?.connection_id || ""),
      _account_email: text(connection?.account_email || connection?.account_display_hint || connection?.provider_label || "", 320),
      _provider: String(connection?.provider || "")
    };
  }
  function mailboxAllMessages() {
    if (folderBackedMode()) return list(mailboxFolderRows);
    const rows = classification ? classificationMessages() : [...list(dashboard?.highlights), ...list(dashboard?.warnings)];
    const seen = new Set(), out = [];
    for (const row of rows) { const id = String(row?.id || ""); if (!id || seen.has(id)) continue; seen.add(id); out.push({ ...row, _connection_id: activeConnectionId, _account_email: connectionEmail(activeConnectionId) }); }
    return out.sort((a,b)=>Date.parse(String(b?.date||0))-Date.parse(String(a?.date||0)));
  }
  function mailboxFilteredMessages() {
    let rows = mailboxAllMessages();
    const q = mailboxSearch.trim().toLowerCase();
    if (q) rows = rows.filter((m)=>[m.from,m.subject,m.snippet,m._account_email].some((v)=>String(v||"").toLowerCase().includes(q)));
    return rows;
  }
  function mailboxFolderTitle() {
    if (mailboxScope === "ALL") return "Alle Posteingänge";
    const label = ({INBOX:"Posteingang",SPAM:"Spam",SENT:"Gesendet",DRAFTS:"Entwürfe",TRASH:"Papierkorb"})[mailboxFolder] || "Posteingang";
    const account = connectionEmail(activeConnectionId);
    return account ? `${label} · ${account}` : label;
  }
  function mailboxFolderCount(folder, connectionId = activeConnectionId) {
    if (folder === "ALL") {
      const unread=emailConnections.reduce((sum,row)=>sum+(Number(mailboxFolderCounts?.[String(row.connection_id||"")]?.INBOX?.unread)||0),0);
      return unread>0?unread:"";
    }
    const id=String(connectionId||"");
    if (CANONICAL_MAILBOX_FOLDERS.includes(folder)) return physicalFolderUnread(id,folder);
    return "";
  }
  function mailboxRowKey(row) {
    return String(row?._connection_id||"")+"|"+String(row?.id||"");
  }
  function mergeMailboxRows(existing,incoming) {
    const map=new Map();
    for(const row of [...list(existing),...list(incoming)]) {
      const key=mailboxRowKey(row); if(key && !key.endsWith("|")) map.set(key,row);
    }
    return [...map.values()].sort((a,b)=>(Date.parse(String(b?.date||""))||0)-(Date.parse(String(a?.date||""))||0));
  }
  async function searchRemoteFolder(connection, folder, maxResults = 30, pageToken = "", force = false) {
    const connectionId=String(connection.connection_id || ""),key=`${connectionId}|${folder}|${pageToken||""}|${maxResults}`,now=Date.now();
    const cached=remoteFolderCache.get(key);
    if(!force && cached && now-cached.at<REMOTE_FOLDER_CACHE_MS) return cached.data;
    if(remoteFolderInflight.has(key)) return remoteFolderInflight.get(key);
    const pending=(async()=>{
      const data = await request("/email/concierge/folder", {
        method: "POST",
        body: { folder, max_results: maxResults, page_token: pageToken || null },
        connectionId
      });
      const normalized={
        messages:list(data?.messages).map((message)=>decorateRemoteMessage(message,connection)),
        folder_meta:{
          messages_total:number(data?.messages_total??data?.folder_meta?.messages_total),
          messages_unread:number(data?.messages_unread??data?.folder_meta?.messages_unread)
        },
        next_page_token:String(data?.next_page_token||"")
      };
      remoteFolderCache.set(key,{at:Date.now(),data:normalized});
      return normalized;
    })().finally(()=>remoteFolderInflight.delete(key));
    remoteFolderInflight.set(key,pending);
    return pending;
  }
  async function streamRemoteFolder(connection, folder, serial, onPage, force = false) {
    const data=await searchRemoteFolder(connection,folder,30,"",force);
    if(serial!==mailboxLoadSerial) return;
    setFolderCount(connection.connection_id,folder,data.folder_meta);
    onPage(data.messages,0);
    render();
  }
  async function loadClassificationFolder(connection, serial) {
    const id=String(connection?.connection_id||""),cacheKey=id+"|"+mailboxFolder;
    let rows=list(classificationFolderCache[cacheKey]),offset=0,page=0;
    do {
      const params=new URLSearchParams({classification:mailboxFolder,limit:"100",offset:String(offset)});
      const data=await request("/email/concierge/classification/view?"+params.toString(), { connectionId:id });
      if(serial!==mailboxLoadSerial) return rows;
      if(!classificationKnownCounts[id]) classificationKnownCounts[id]={};
      classificationKnownCounts[id][mailboxFolder]=number(data?.known_total||data?.count);
      const incoming=list(data?.messages).map((message)=>decorateRemoteMessage(message,connection));
      rows=mergeMailboxRows(rows,incoming);
      classificationFolderCache[cacheKey]=rows;
      mailboxFolderRows=rows;
      render();
      const next=Number(data?.next_offset);
      if(!Number.isFinite(next)||next<=offset) break;
      offset=next; page++;
    } while(serial===mailboxLoadSerial && page<100);
    return rows;
  }
  async function loadReplyNeededFolder(connection, serial) {
    const id=String(connection?.connection_id||"");
    let rows=[],offset=0,page=0;
    do {
      const params=new URLSearchParams({limit:"100",offset:String(offset)});
      const data=await request("/email/concierge/reply-needed?"+params.toString(), { connectionId:id });
      if(serial!==mailboxLoadSerial) return rows;
      const incoming=list(data?.messages).map((message)=>decorateRemoteMessage(message,connection));
      rows=mergeMailboxRows(rows,incoming);
      mailboxFolderRows=rows;
      render();
      const next=Number(data?.next_offset);
      if(!Number.isFinite(next)||next<=offset) break;
      offset=next;page++;
    } while(serial===mailboxLoadSerial&&page<100);
    return rows;
  }
  async function loadMailboxFolder(force = false) {
    if (!connected) return;
    const serial=++mailboxLoadSerial;
    if (!folderBackedMode()) { mailboxFolderRows = []; mailboxFolderError = ""; mailboxFolderLoading=false; render(); return; }
    const previousRows = mailboxFolderRows.slice();
    mailboxFolderLoading = true; mailboxFolderError = ""; render();
    try {
      if (mailboxScope === "ALL") {
        const connectedRows = emailConnections.filter((row) => String(row?.state || "").toUpperCase() === "CONNECTED");
        const byConnection=new Map();
        await Promise.allSettled(connectedRows.map((row)=>streamRemoteFolder(row,"INBOX",serial,(messages)=>{
          byConnection.set(String(row.connection_id||""),mergeMailboxRows(byConnection.get(String(row.connection_id||""))||[],messages));
          mailboxFolderRows=[...byConnection.values()].flat().sort((a,b)=>(Date.parse(String(b?.date||""))||0)-(Date.parse(String(a?.date||""))||0));
        },force)));
        if(serial!==mailboxLoadSerial)return;
        if(!mailboxFolderRows.length && previousRows.length) mailboxFolderRows=previousRows;
      } else {
        const connection = connectionById(activeConnectionId);
        if (!connection) throw new Error("EMAIL_CONNECTION_NOT_CONNECTED");
        let accumulated=[];
        await streamRemoteFolder(connection,mailboxFolder,serial,(messages)=>{
          accumulated=mergeMailboxRows(accumulated,messages);
          if(serial===mailboxLoadSerial) mailboxFolderRows=accumulated;
        },force);
        if(serial!==mailboxLoadSerial)return;
        if(!mailboxFolderRows.length && previousRows.length) mailboxFolderRows=previousRows;
      }
    } catch (error) {
      if(serial!==mailboxLoadSerial)return;
      if (previousRows.length) mailboxFolderRows = previousRows;
      mailboxFolderError = error instanceof Error ? error.message : "EMAIL_PROVIDER_UNAVAILABLE";
    } finally {
      if(serial===mailboxLoadSerial){mailboxFolderLoading = false; render();}
    }
  }
  async function warmMailboxIndex(connection) {
    const id=String(connection?.connection_id||"");
    if(!id || mailboxIndexWarmStarted.has(id) || String(connection?.provider||"").toUpperCase()!=="GOOGLE") return;
    mailboxIndexWarmStarted.add(id);
    try{
      const status=await request("/email/concierge/index/status",{connectionId:id});
      if(status?.index_state?.status!=="READY"){
        await request("/email/concierge/index/warm",{method:"POST",body:{},connectionId:id});
      }
    }catch{
      mailboxIndexWarmStarted.delete(id);
    }
  }
  async function loadConnections() {
    const data = await request("/email/connections");
    emailConnections = list(data?.connections).filter((row) => String(row?.state || "").toUpperCase() === "CONNECTED");
    if (!activeConnectionId || !connectionById(activeConnectionId)) activeConnectionId = String(emailConnections[0]?.connection_id || "");
    for(const connection of emailConnections) setTimeout(()=>void warmMailboxIndex(connection),800);
    return emailConnections;
  }
  async function selectMailboxFolder(connectionId, folder) {
    preservePageScrollY = Number(window.scrollY || window.pageYOffset || 0);
    preservePageScrollUntil = Date.now() + 1800;
    const nextConnectionId = String(connectionId || activeConnectionId || "");
    const switchingConnection = Boolean(activeConnectionId && nextConnectionId && activeConnectionId !== nextConnectionId);
    activeConnectionId = nextConnectionId;
    mailboxScope = "ACCOUNT"; mailboxFolder = folder; readerMode = "MESSAGE";
    selectedMessageId = ""; selectedMessageConnectionId = ""; selectedMessageDetail = null;
    if (switchingConnection) { classification = null; classificationError = ""; }
    mailboxFolderRows = [];
    render();
    void loadMailboxFolder();
  }
  async function selectAllInboxes() {
    preservePageScrollY = Number(window.scrollY || window.pageYOffset || 0);
    preservePageScrollUntil = Date.now() + 1800;
    mailboxScope = "ALL"; mailboxFolder = "INBOX"; readerMode = "MESSAGE";
    selectedMessageId = ""; selectedMessageConnectionId = ""; selectedMessageDetail = null;
    mailboxFolderRows = []; render(); void loadMailboxFolder();
  }
  async function openMailboxMessage(message) {
    const messageId = String(message?.id || message || "");
    const connectionId = String(message?._connection_id || activeConnectionId || "");
    if (!messageId || !connectionId) return;
    activeConnectionId = connectionId;
    selectedMessageId = messageId; selectedMessageConnectionId = connectionId; readerMode = "MESSAGE"; selectedMessageLoading = true; selectedMessageDetail = null; render();
    try {
      const data = await request("/email/concierge/messages/open", { method: "POST", body: { message_id: selectedMessageId }, connectionId });
      if (selectedMessageId === messageId && selectedMessageConnectionId === connectionId) selectedMessageDetail = { ...(data.message || {}), _connection_id: connectionId, _account_email: connectionEmail(connectionId) };
    } catch (error) { showError(error instanceof Error ? error.message : "EMAIL_PROVIDER_UNAVAILABLE"); }
    finally { if (selectedMessageId === messageId && selectedMessageConnectionId === connectionId) selectedMessageLoading = false; render(); }
  }
  function classificationControls(message) {
    const wrap = el("div", "ecp-class-actions");
    [["IMPORTANT", "Wichtig"], ["UNIMPORTANT", "Unwichtig"]].forEach(([value, label]) => {
      const b = button(label, "ecp-class-btn"); b.setAttribute("aria-pressed", String(message?.classification === value)); b.title = message?.classification === value ? `${label} – aktuelle Einstufung` : `Als ${label} markieren`;
      b.addEventListener("click", (event) => { event.stopPropagation(); void setMessageClassification(message, value); }); wrap.append(b);
    });
    return wrap;
  }
  function syncVisibleClassification(messageId, value) {
    const id = String(messageId || "");
    if (!id) return;
    for (const entry of chatMessages) {
      for (const mail of list(entry.messages)) if (String(mail?.id || "") === id) mail.classification = value;
    }
    for (const mail of mailboxFolderRows) if (String(mail?.id || "") === id) mail.classification = value;
    if (dashboard) {
      for (const key of ["highlights", "warnings", "hints"]) {
        for (const mail of list(dashboard[key])) if (String(mail?.id || "") === id) mail.classification = value;
      }
    }
  }
  function applyLocalClassification(messageId, value) {
    if (!classification) return;
    const messageKey = String(messageId || "");
    let moved = null, previousBucket = "";
    for (const key of ["IMPORTANT","UNIMPORTANT","MARKETING"]) {
      const rows = list(classification.buckets[key]);
      const hit = rows.find((row)=>String(row?.id||"")===messageKey);
      if (hit && !moved) { moved = { ...hit, classification:value, classification_source:"CUSTOMER", classification_reason:"Von dir korrigiert." }; previousBucket = key; }
      classification.buckets[key] = rows.filter((row)=>String(row?.id||"")!==messageKey);
    }
    if (moved && classification.buckets[value]) classification.buckets[value].unshift(moved);
    for (const key of ["IMPORTANT","UNIMPORTANT","MARKETING"]) classification.counts[key] = list(classification.buckets[key]).length;
    const connectionKey=String(activeConnectionId||""),known=classificationKnownCounts[connectionKey];
    if(known && previousBucket && previousBucket!==value){
      if(Number.isFinite(known[previousBucket])) known[previousBucket]=Math.max(0,known[previousBucket]-1);
      if(Number.isFinite(known[value])) known[value]=known[value]+1;
    }
    if(connectionKey){
      for(const bucket of ["IMPORTANT","UNIMPORTANT"]){
        const cacheKey=connectionKey+"|"+bucket,rows=list(classificationFolderCache[cacheKey]).filter((row)=>String(row?.id||"")!==messageKey);
        if(bucket===value&&moved) rows.unshift({...moved,_connection_id:connectionKey,_account_email:connectionEmail(connectionKey)});
        classificationFolderCache[cacheKey]=rows;
      }
    }
  }
  async function setMessageClassification(message, value) {
    const messageId=String(message?.id||"");
    if (busy || !messageId || message.classification === value || classificationSavingIds.has(messageId)) return;
    const previous = message.classification || null;
    classificationSavingIds.add(messageId);
    message.classification = value;
    syncVisibleClassification(messageId, value);
    applyLocalClassification(messageId, value);
    render(true);
    try {
      const connectionId = String(message?._connection_id || activeConnectionId || "");
      const saved = await request("/email/concierge/classification/override", { method: "POST", body: { message_id: messageId, thread_id: message.thread_id || null, classification: value, message_snapshot: { thread_id: message.thread_id || null, from: message.from || "", subject: message.subject || "", snippet: message.snippet || "", date: message.date || null } }, connectionId });
      if (saved?.learning_suggestion_ready) {
        const next = normalizeDashboard(await request("/email/concierge/dashboard", { connectionId }));
        if (next) dashboard = next;
      }
    } catch (error) {
      message.classification = previous;
      syncVisibleClassification(messageId, previous);
      if (classification) void loadClassification();
      showError(error instanceof Error ? error.message : "EMAIL_PROVIDER_UNAVAILABLE");
      render(true);
    } finally {
      classificationSavingIds.delete(messageId);
    }
  }
  function messageCard(message, allowOpen = true, allowClassify = true) {
    const row = el("article", "ecp-mail"), main = el("div", "ecp-mail-main");
    main.append(el("span", "ecp-mail-title", text(message.subject, 300) || "(kein Betreff)"));
    main.append(el("span", "ecp-mail-meta", [text(message.from, 220), fmtDate(message.date)].filter(Boolean).join(" · ")));
    if (message.snippet) main.append(el("p", "ecp-mail-snippet", text(message.snippet, 500)));
    const badges = el("div", "ecp-badges");
    if (message.classification) badges.append(badge(classificationLabel(message.classification)));
    if (message.unread) badges.append(badge("Ungelesen"));
    if (message.needs_reply) badges.append(badge("Antwort empfohlen"));
    if (message.amount) badges.append(badge(String(message.amount)));
    if (message.risk?.level && message.risk.level !== "low") badges.append(badge("Auffällig", true));
    list(message.categories).slice(0, 3).forEach((category) => badges.append(badge(String(category).replaceAll("_", " ").toLowerCase())));
    if (badges.childElementCount) main.append(badges);
    if (message.classification_reason) main.append(el("p", "ecp-class-reason", text(message.classification_reason, 500)));
    row.append(main);
    const side = el("div", "ecp-mail-side");
    if (allowOpen && message.id) {
      const open = button("Öffnen", "ecp-open"); open.dataset.messageId = String(message.id); open.addEventListener("click", () => openMessage(String(message.id), row)); side.append(open);
    }
    if (allowClassify && message.id) side.append(classificationControls(message));
    if (side.childElementCount) row.append(side);
    return row;
  }
  async function openMessage(messageId, afterNode) {
    if (busy) return;
    setBusy(true);
    try {
      const data = await request("/email/concierge/messages/open", { method: "POST", body: { message_id: messageId } });
      host?.querySelectorAll(".ecp-detail").forEach((n) => n.remove());
      const detail = el("section", "ecp-detail"), head = el("div", "ecp-detail-head"), left = el("div");
      left.append(el("strong", "", text(data.message?.subject, 300) || "(kein Betreff)"), el("div", "ecp-mail-meta", text(data.message?.from, 300)));
      const close = button("Schließen", "ecp-open"); close.addEventListener("click", () => detail.remove()); head.append(left, close); detail.append(head);
      detail.append(el("div", "ecp-detail-body", text(data.message?.body_text, 12000) || "Kein Textinhalt verfügbar."));
      const sorted = classificationMessageById(messageId);
      const classifiable = sorted || (data.message?.id ? {
        id: String(data.message.id),
        thread_id: data.message.thread_id || data.message.threadId || null,
        from: data.message.from || "",
        subject: data.message.subject || "",
        classification: data.message.classification || null
      } : null);
      if (classifiable) detail.append(classificationControls(classifiable));
      const attachments = list(data.message?.attachments); if (attachments.length) detail.append(el("p", "ecp-footer-note", `${attachments.length} Anhang${attachments.length === 1 ? "" : "e"} erkannt. Gefährliche Dateitypen werden nicht automatisch geöffnet.`));
      afterNode.insertAdjacentElement("afterend", detail);
    } catch (error) { showError(error instanceof Error ? error.message : "EMAIL_PROVIDER_UNAVAILABLE"); }
    finally { setBusy(false); }
  }
  function renderChat(card) {
    const log = el("div", "ecp-chat-log"); log.id = "emailConciergeChatLog"; log.setAttribute("aria-live", "polite");
    const hasUserMessage = chatStarted || chatMessages.some((entry) => entry.role === "user");
    if (!hasUserMessage && !chatMessages.length) {
      const intro=el("div","ecp-chat-empty");
      intro.append(el("strong","","Beispiel: So lernt dein E-Mail-Concierge."));
      intro.append(el("div","","NAHWERK erkennt intern, was wichtig oder unwichtig ist. Du kannst die Einschätzung korrigieren, E-Mails in den Papierkorb verschieben oder Antworten vorbereiten. Die sichtbaren Mailbereiche bleiben Posteingang, Spam, Gesendet, Entwürfe und Papierkorb."));
      log.append(intro);
      const examples=list(dashboard?.classification_review?.examples);
      examples.forEach((example,index)=>{
        const row=el("article","ecp-mail ecp-onboarding-example"),main=el("div","ecp-mail-main"),side=el("div","ecp-mail-side"),key=String(index);
        main.append(el("span","ecp-mail-title",text(example?.subject,300)||"(kein Betreff)"));
        main.append(el("span","ecp-mail-meta",text(example?.from,220)||"Beispiel-Absender"));
        if(example?.snippet)main.append(el("p","ecp-mail-snippet",text(example.snippet,500)));
        const initial=["IMPORTANT","UNIMPORTANT"].includes(String(example?.suggested_classification||""))?String(example.suggested_classification):"UNIMPORTANT";
        const actions=el("div","ecp-class-actions"),selected=onboardingExampleSelections.get(key)||initial;
        [["IMPORTANT","Wichtig"],["UNIMPORTANT","Unwichtig"]].forEach(([value,label])=>{
          const b=button(label,"ecp-class-btn");b.setAttribute("aria-pressed",String(selected===value));b.title="Beispiel: als "+label+" markieren";
          b.addEventListener("click",(event)=>{
            event.preventDefault();event.stopPropagation();onboardingExampleSelections.set(key,value);
            actions.querySelectorAll(".ecp-class-btn").forEach((node)=>node.setAttribute("aria-pressed",String(node===b)));
          });
          actions.append(b);
        });
        side.append(el("span","ecp-badge","Beispiel"),actions);row.append(main,side);log.append(row);
      });
    }
    for (const entry of chatMessages) {
      const msg = el("div", `ecp-msg ecp-msg-${entry.role}${entry.error ? " ecp-msg-error" : ""}`, entry.text);
      log.append(msg);
      for (const mail of list(entry.messages)) log.append(messageCard(mail, true, true));
    }
    const form = el("form", "ecp-chat-form"), input = el("input", "ecp-chat-input"), send = button("Senden", "ecp-primary");
    input.type = "text"; input.name = "emailConciergeQuery"; input.maxLength = 5000; input.autocomplete = "off"; input.placeholder = "z. B. GitHub-Mails sind unwichtig"; input.setAttribute("aria-label", "E-Mail-Concierge fragen"); input.value=chatDraft; send.type = "submit";
    const captureDraft=()=>{chatDraft=input.value;chatSelectionStart=Number(input.selectionStart??input.value.length);chatSelectionEnd=Number(input.selectionEnd??chatSelectionStart);};
    input.addEventListener("input",captureDraft);
    input.addEventListener("compositionend",captureDraft);
    input.addEventListener("select",()=>{chatSelectionStart=Number(input.selectionStart??0);chatSelectionEnd=Number(input.selectionEnd??chatSelectionStart);});
    input.addEventListener("blur",flushPendingBackgroundRender);
    form.addEventListener("submit", (event) => { event.preventDefault(); const value = input.value.trim(); if (!value) return; chatDraft=""; input.value = ""; chatAutoScrollNext=true; runQuery(value); });
    form.append(input, send);
    card.append(log);
    if (!hasUserMessage) {
      const quick = el("div", "ecp-quick");
      QUICK.forEach((label) => { const chip = button(label, "ecp-chip"); chip.addEventListener("click", () => runQuery(label)); quick.append(chip); });
      card.append(quick);
    }
    card.append(form);
  }
  function removeMailboxMessages(messageIds) {
    const ids = new Set(list(messageIds).map((id) => String(id || "")).filter(Boolean));
    if (!ids.size) return;
    mailboxFolderRows = mailboxFolderRows.filter((row) => !ids.has(String(row?.id || "")));
    if (classification) {
      let removed = 0;
      for (const key of ["IMPORTANT", "UNIMPORTANT", "MARKETING"]) {
        const before = list(classification.buckets[key]);
        const after = before.filter((row) => !ids.has(String(row?.id || "")));
        removed += before.length - after.length;
        classification.buckets[key] = after;
        classification.counts[key] = after.length;
      }
      classification.sorted_count = Math.max(0, classification.sorted_count - removed);
      classification.total = Math.max(0, classification.total - removed);
    }
    if (selectedMessageId && ids.has(String(selectedMessageId))) {
      selectedMessageId = "";
      selectedMessageConnectionId = "";
      selectedMessageDetail = null;
      selectedMessageLoading = false;
      readerMode = "MESSAGE";
    }
  }
  function applyQueryResultToMailbox(data) {
    const ids = list(data?.result?.message_ids).map(String);
    if (ids.length) removeMailboxMessages(ids);
    const single = String(data?.result?.message_id || data?.result?.result?.message_id || "");
    if (single) removeMailboxMessages([single]);
  }

  async function runQuery(query) {
    if (busy || !query) return;
    chatStarted = true;
    chatMessages.push({ role: "user", text: query }); chatAutoScrollNext=true; render(true); setBusy(true);
    try {
      const data = await request("/email/concierge/query", { method: "POST", body: { text: query, request_id: crypto.randomUUID() } });
      let resultMessages = list(data.messages);
      if (data.type === "CLASSIFICATION_VIEW" && classification) {
        resultMessages = list(classification.buckets?.[String(data.classification || "")]);
      }
      chatMessages.push({ role: "assistant", text: text(data.message, 2500) || "Erledigt.", messages: resultMessages });
      applyQueryResultToMailbox(data);
      chatAutoScrollNext=true;
      render(true);
      await loadDashboard(false, true);
      if (mailboxScope === "ALL" || mailboxScope === "ACCOUNT") await loadMailboxFolder();
    } catch (error) {
      const code = error instanceof Error ? error.message : "EMAIL_PROVIDER_UNAVAILABLE";
      chatMessages.push({ role: "assistant", text: ERROR_COPY[code] || "Das konnte ich gerade nicht ausführen. Bitte versuche es erneut.", error: true });
    } finally { setBusy(false); render(true); }
  }
  function renderProtection(card) {
    const grid = el("div", "ecp-protection-grid"), p = dashboard.protection || {};
    const items = [
      ["Betrugsschutz", p.fraud?.enabled, `${number(p.fraud?.checked)} geprüft · ${number(p.fraud?.suspicious)} auffällig`],
      ["Spam-Schutz", p.spam?.enabled, `${number(p.spam?.classified)} wahrscheinlich unerwünscht`],
      ["Antwort-Assistent", p.reply_assistant?.enabled, `${number(p.reply_assistant?.pending_drafts)} Entwurf${number(p.reply_assistant?.pending_drafts) === 1 ? "" : "e"} offen`]
    ];
    for (const [name, enabled, info] of items) { const box = el("div", "ecp-protection"); box.append(el("strong", "", name), el("span", enabled ? "ecp-on" : "", enabled ? "Aktiv" : "Aus"), el("span", "", info)); grid.append(box); }
    card.append(grid);
  }
  function renderHints(card) {
    const rows = list(dashboard.hints);
    if (!rows.length) { card.append(el("div", "ecp-section-empty", "Aktuell gibt es keine dringenden Hinweise.")); return; }
    const listNode = el("div", "ecp-list");
    rows.forEach((row) => { const box = el("article", "ecp-hint" + (row.kind === "WARNING" ? " ecp-hint-warning" : "")); box.append(el("strong", "", text(row.title, 200)), el("p", "", text(row.text, 800))); listNode.append(box); }); card.append(listNode);
  }
  function renderHighlights(card) {
    const rows = classification ? classification.buckets.IMPORTANT : list(dashboard.highlights);
    if (!rows.length) { card.append(el("div", "ecp-section-empty", "Keine wichtigen Nachrichten in der aktuellen Übersicht.")); return; }
    const listNode = el("div", "ecp-list"); rows.slice(0, 10).forEach((row) => listNode.append(messageCard(row, true, true))); card.append(listNode);
    if (classification && rows.length > 10) card.append(el("p", "ecp-sort-scope", `${rows.length - 10} weitere wichtige E-Mails findest du unten unter „Sortierung prüfen“.`));
  }
  function focusClassification(bucket) {
    classificationBucket = bucket; render();
    setTimeout(() => document.getElementById("emailClassificationReview")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }
  function renderClassificationReview(card) {
    card.id = "emailClassificationReview";
    if (!classification) { card.append(el("div", "ecp-section-empty", classificationLoading ? "Die Sortierung wird im Hintergrund vorbereitet. Der restliche E-Mail-Concierge ist bereits nutzbar." : "Die Sortierung konnte gerade nicht geladen werden. Der restliche E-Mail-Concierge bleibt verfügbar.")); return; }
    const tabs = el("div", "ecp-sort-tabs");
    [["IMPORTANT", `Wichtig (${classification.counts.IMPORTANT})`], ["UNIMPORTANT", `Unwichtig (${classification.counts.UNIMPORTANT})`], ["MARKETING", `Werbung / Spam (${classification.counts.MARKETING})`]].forEach(([value, label]) => {
      const tab = button(label, "ecp-sort-tab"); tab.setAttribute("aria-pressed", String(classificationBucket === value)); tab.addEventListener("click", () => { classificationBucket = value; render(); }); tabs.append(tab);
    }); card.append(tabs);
    const rows = list(classification.buckets[classificationBucket]);
    if (!rows.length) card.append(el("div", "ecp-section-empty", classificationBucket === "UNIMPORTANT" ? "Aktuell wurde nichts als unwichtig einsortiert." : classificationBucket === "MARKETING" ? "Aktuell wurde keine Werbung oder Spam einsortiert." : "Aktuell gibt es keine wichtigen E-Mails in der Sortierübersicht."));
    else { const listNode = el("div", "ecp-list"); rows.forEach((row) => listNode.append(messageCard(row, true, true))); card.append(listNode); }
    const scope = classification.complete ? `Alle ${classification.sorted_count} aktuellen Inbox-Konversationen sind in dieser Sortierübersicht berücksichtigt.` : `Zur Performance werden die ${classification.sorted_count} neuesten von insgesamt ${classification.total} Inbox-Konversationen sortiert angezeigt. Ältere E-Mails bleiben in Gmail unverändert erhalten.`;
    card.append(el("p", "ecp-sort-scope", scope));
  }
  function renderDrafts(card) {
    const rows = list(allDrafts.length || draftsLoading ? allDrafts : dashboard.drafts);
    if (!rows.length) { card.append(el("div", "ecp-section-empty", "Keine vorbereiteten Entwürfe warten auf dich.")); return; }
    const listNode = el("div", "ecp-list");
    rows.forEach((draft) => {
      const box = el("article", "ecp-draft"), top = el("div", "ecp-draft-top"), title = el("div");
      title.append(el("div", "ecp-draft-title", text(draft.subject, 300) || "(kein Betreff)"), el("div", "ecp-draft-meta", [draft._account_email ? text(draft._account_email, 260) : "", text(draft.to, 260) ? `An ${text(draft.to, 260)}` : "Empfänger wird aus der Antwort übernommen"].filter(Boolean).join(" · "))); top.append(title, badge(draft.send_state === "WAITING_APPROVAL" ? "Wartet auf Freigabe" : String(draft.status || "Entwurf")));
      box.append(top, el("div", "ecp-draft-body", text(draft.body_text, 1200)));
      const actions = el("div", "ecp-draft-actions"), edit = button("Bearbeiten"), discard = button("Verwerfen", "ecp-action ecp-action-danger"), send = button("Freigeben & senden", "ecp-action ecp-action-send");
      send.disabled = !draft.approval_id || !draft.send_action_id;
      edit.addEventListener("click", () => showDraftEditor(box, draft));
      discard.addEventListener("click", () => discardDraft(draft));
      send.addEventListener("click", () => approveAndSend(draft));
      actions.append(edit, discard, send); box.append(actions); listNode.append(box);
    }); card.append(listNode);
  }
  function showDraftEditor(box, draft) {
    box.querySelector(".ecp-editor")?.remove();
    const editor = el("div", "ecp-editor"), subject = el("input"), to = el("input"), body = el("textarea"), save = button("Änderungen speichern", "ecp-action");
    subject.value = text(draft.subject, 500); subject.placeholder = "Betreff"; to.value = text(draft.to, 300); to.placeholder = "Empfänger"; body.value = text(draft.body_text, 10000); body.placeholder = "Antworttext";
    save.addEventListener("click", async () => {
      if (!body.value.trim() || busy) return;
      setBusy(true);
      try { await request("/email/concierge/drafts/edit", { method: "POST", body: { email_send_action_id: draft.id, approval_id: draft.approval_id || null, send_action_id: draft.send_action_id || null, subject: subject.value, to: to.value, body_text: body.value }, connectionId: String(draft._connection_id || activeConnectionId || "") }); await loadDashboard(false, true); }
      catch (error) { showError(error instanceof Error ? error.message : "EMAIL_PROVIDER_UNAVAILABLE"); }
      finally { setBusy(false); }
    });
    editor.append(subject, to, body, save); box.append(editor);
  }
  async function discardDraft(draft) {
    if (busy || !confirm("Diesen Entwurf wirklich verwerfen? Es wird nichts gesendet.")) return;
    setBusy(true);
    try { await request("/email/concierge/drafts/discard", { method: "POST", body: { email_send_action_id: draft.id, approval_id: draft.approval_id || null, send_action_id: draft.send_action_id || null }, connectionId: String(draft._connection_id || activeConnectionId || "") }); await loadDashboard(false, true); }
    catch (error) { showError(error instanceof Error ? error.message : "EMAIL_PROVIDER_UNAVAILABLE"); }
    finally { setBusy(false); }
  }
  async function approveAndSend(draft) {
    if (busy || !draft.approval_id || !draft.send_action_id) return;
    const ok = confirm(`Diese E-Mail jetzt wirklich senden?\n\nAn: ${text(draft.to, 240) || "Empfänger"}\nBetreff: ${text(draft.subject, 240) || "(kein Betreff)"}\n\nErst mit „OK“ gibst du den Versand ausdrücklich frei.`);
    if (!ok) return;
    setBusy(true);
    try {
      const data = await request("/email/concierge/drafts/approve-send", { method: "POST", body: { email_send_action_id: draft.id, approval_id: draft.approval_id, send_action_id: draft.send_action_id }, connectionId: String(draft._connection_id || activeConnectionId || "") });
      chatMessages.push({ role: "assistant", text: text(data.message, 1000) || "Die E-Mail wurde nach deiner Freigabe gesendet." }); await loadDashboard(false);
    } catch (error) { showError(error instanceof Error ? error.message : "EMAIL_PROVIDER_UNAVAILABLE"); }
    finally { setBusy(false); render(); }
  }
  function renderActivities(card, head) {
    const more = button(activityExpanded ? "Weniger anzeigen" : "Alle Aktivitäten", "ecp-action ecp-refresh");
    more.addEventListener("click", async () => {
      if (activityExpanded) { activityExpanded = false; render(); return; }
      setBusy(true);
      try { const data = await request("/email/concierge/activity?limit=50"); dashboard.activities = list(data.activities); activityExpanded = true; render(); }
      catch (error) { showError(error instanceof Error ? error.message : "EMAIL_PROVIDER_UNAVAILABLE"); }
      finally { setBusy(false); }
    }); head.append(more);
    const rows = list(dashboard.activities);
    if (!rows.length) { card.append(el("div", "ecp-section-empty", "Sobald dein E-Mail-Concierge etwas für dich erledigt, erscheint es hier dezent und nachvollziehbar.")); return; }
    const listNode = el("div", "ecp-list");
    rows.forEach((row) => { const item = el("article", "ecp-activity"); item.append(el("strong", "", text(row.title, 250)), el("p", "", text(row.summary, 900)), el("span", "ecp-activity-time", fmtDate(row.occurred_at))); listNode.append(item); }); card.append(listNode);
  }
  function renderChannels(card) {
    const channels = dashboard.channels || {}, items = [
      ["Web-Kundenkonto", "Hier kannst du deinen E-Mail-Concierge vollständig nutzen.", "Aktiv", true],
      ["WhatsApp", channels.whatsapp?.state === "CONNECTED" ? "Dein E-Mail-Concierge kann dich auch über WhatsApp begleiten." : "Verbinde WhatsApp, um wichtige Hinweise und E-Mail-Aufträge auch dort zu nutzen.", channels.whatsapp?.state === "CONNECTED" ? "Verbunden" : "Nicht verbunden", channels.whatsapp?.state === "CONNECTED"],
      ["App", "Wird als zusätzlicher Zugang vorbereitet.", "Geplant", false],
      ["Telefon", "Wird als zusätzlicher Zugang vorbereitet.", "Geplant", false]
    ];
    items.forEach(([name, desc, state, active], index) => {
      const row = el("div", "ecp-channel"), copy = el("div"); copy.append(el("strong", "", name), el("small", "", desc));
      const right = el("div"); right.append(el("div", "ecp-channel-state" + (active ? " ecp-on" : ""), state));
      if (index === 1 && !active) { const nav = button("WhatsApp verbinden", "ecp-link-button"); nav.addEventListener("click", () => { const target = document.getElementById("accountTabConcierge") || document.getElementById("accountTabZugaenge"); if (target) target.click(); else location.hash = "concierge"; }); right.append(nav); }
      row.append(copy, right); card.append(row);
    });
  }
  function ruleActionChoices(rule) {
    return rule.classification === "IMPORTANT"
      ? [["PRIORITIZE", "Künftig automatisch hervorheben"], ["CLASSIFY_ONLY", "Nur als wichtig einstufen"]]
      : [["CLASSIFY_ONLY", "Nur intern als unwichtig einstufen"], ["TRASH", "Künftig automatisch in den Papierkorb"]];
  }
  function ruleFutureCopy(rule) {
    const action = String(rule?.action || "CLASSIFY_ONLY").toUpperCase();
    if (action === "TRASH") return "Zukünftig: passende E-Mails automatisch in den Gmail-Papierkorb";
    if (action === "PRIORITIZE") return "Zukünftig: passende E-Mails automatisch hervorheben";
    return rule?.classification === "IMPORTANT"
      ? "Zukünftig: nur als wichtig einstufen · nichts verschieben"
      : "Zukünftig: nur als unwichtig einstufen · nichts verschieben";
  }
  function existingActionCopy(rule, count) {
    const action = String(rule?.action || "").toUpperCase();
    if (action === "TRASH") return `${count} bestehende passende E-Mail${count === 1 ? "" : "s"} in den Gmail-Papierkorb verschieben?`;
    if (action === "PRIORITIZE") return `${count} bestehende passende E-Mail${count === 1 ? "" : "s"} hervorheben?`;
    return "";
  }
  async function refreshRules() {
    const next = normalizeDashboard(await request("/email/concierge/dashboard"));
    if (next) dashboard = next;
    classification = normalizeClassification(await request("/email/concierge/classification/summary"));
    render();
  }
  function renderRuleSuggestion(card, suggestion) {
    const box = el("div", "ecp-rule ecp-rule-suggestion"), copy = el("div");
    copy.append(el("strong", "", text(suggestion.title, 220) || "Wiederkehrendes Muster"), el("small", "", text(suggestion.text, 700) || "Soll ich daraus eine persönliche Automatik machen?"));
    if (suggestion.matcher_label) copy.append(el("small", "ecp-rule-match", suggestion.matcher_label));
    const actions = el("div", "ecp-rule-actions");
    const choices = suggestion.classification === "IMPORTANT"
      ? [["PRIORITIZE", "Hervorheben"], ["CLASSIFY_ONLY", "Nur wichtig"]]
      : [["CLASSIFY_ONLY", "Nur intern unwichtig"], ["TRASH", "Papierkorb"]];
    choices.filter(([value]) => list(suggestion.suggested_actions).includes(value)).forEach(([value, label]) => {
      const b = button(label, "ecp-action"); b.addEventListener("click", async () => {
        if (busy) return; setBusy(true);
        try { await request("/email/concierge/rules/suggestion", { method: "POST", body: { candidate_id: suggestion.candidate_id, decision: "CONFIRM", action: value } }); await refreshRules(); }
        catch (error) { showError(error instanceof Error ? error.message : "EMAIL_PROVIDER_UNAVAILABLE"); }
        finally { setBusy(false); }
      }); actions.append(b);
    });
    const reject = button("Nein", "ecp-link-button"); reject.addEventListener("click", async () => {
      if (busy) return; setBusy(true);
      try { await request("/email/concierge/rules/suggestion", { method: "POST", body: { candidate_id: suggestion.candidate_id, decision: "REJECT" } }); await refreshRules(); }
      catch (error) { showError(error instanceof Error ? error.message : "EMAIL_PROVIDER_UNAVAILABLE"); }
      finally { setBusy(false); }
    }); actions.append(reject);
    box.append(copy, actions); card.append(box);
  }
  function renderPersonalRule(card, rule) {
    const row = el("div", "ecp-rule ecp-rule-personal"), copy = el("div", "ecp-rule-copy"), titleRow = el("div", "ecp-rule-title-row");
    const toggle = el("label", "ecp-rule-toggle"), input = el("input"); input.type = "checkbox"; input.checked = rule.active === true; input.setAttribute("aria-label", "Regel aktiv");
    input.addEventListener("change", async () => { input.disabled = true; try { await request("/email/concierge/rules/update", { method: "POST", body: { rule_id: rule.id, active: input.checked } }); await refreshRules(); } catch (error) { input.checked = !input.checked; showError(error instanceof Error ? error.message : "EMAIL_PROVIDER_UNAVAILABLE"); } finally { input.disabled = false; } });
    toggle.append(input, el("span", "", rule.active ? "Aktiv" : "Aus"));
    titleRow.append(el("strong", "", text(rule.title, 220) || "Persönliche Regel"), toggle);
    copy.append(titleRow);
    if (rule.matcher_label) copy.append(el("small", "ecp-rule-match", rule.matcher_label));
    if (rule.last_applied_at) copy.append(el("small", "ecp-rule-meta", "Zuletzt angewandt: " + fmtDate(rule.last_applied_at) + (number(rule.hit_count) ? " · " + number(rule.hit_count) + " Treffer" : "")));

    const future = el("div", "ecp-rule-future");
    future.append(el("span", "ecp-rule-future-label", rule.classification_label || (rule.classification === "IMPORTANT" ? "Wichtig" : "Unwichtig")), el("strong", "", ruleFutureCopy(rule)));
    copy.append(future);

    const controls = el("div", "ecp-rule-controls"), actionBlock = el("label", "ecp-rule-action-block");
    actionBlock.append(el("span", "ecp-rule-control-label", "Für zukünftige passende E-Mails"));
    const select = el("select", "ecp-rule-select"); select.setAttribute("aria-label", "Zukünftige Behandlung für " + text(rule.title, 160));
    ruleActionChoices(rule).forEach(([value, label]) => { const option = el("option", "", label); option.value = value; option.selected = rule.action === value; select.append(option); });
    select.addEventListener("change", async () => { select.disabled = true; try { await request("/email/concierge/rules/update", { method: "POST", body: { rule_id: rule.id, action: select.value } }); await refreshRules(); } catch (error) { showError(error instanceof Error ? error.message : "EMAIL_PROVIDER_UNAVAILABLE"); } finally { select.disabled = false; } });
    actionBlock.append(select);

    const remove = button("Regel löschen", "ecp-link-button ecp-rule-delete"); remove.addEventListener("click", async () => {
      if (!confirm("Diese persönliche E-Mail-Regel wirklich löschen?")) return;
      try { await request("/email/concierge/rules/delete", { method: "POST", body: { rule_id: rule.id } }); await refreshRules(); }
      catch (error) { showError(error instanceof Error ? error.message : "EMAIL_PROVIDER_UNAVAILABLE"); }
    });
    controls.append(actionBlock, remove);
    row.append(copy, controls);

    const action = String(rule.action || "CLASSIFY_ONLY").toUpperCase();
    if (["TRASH", "PRIORITIZE"].includes(action)) {
      const existing = el("div", "ecp-rule-existing"), existingCopy = el("div", "ecp-rule-existing-copy");
      existingCopy.append(el("strong", "", "Bestehende passende E-Mails"), el("span", "", "Nur nach separater Bestätigung. Zukünftige E-Mails folgen der Regel automatisch."));
      const applyExisting = button(action === "TRASH" ? "Bestehende prüfen" : "Bestehende ebenfalls anwenden", "ecp-link-button ecp-rule-existing-button");
      const feedback = el("span", "ecp-rule-existing-status"); feedback.setAttribute("aria-live", "polite");
      applyExisting.addEventListener("click", async () => {
        if (busy) return;
        applyExisting.disabled = true; feedback.textContent = "Passende E-Mails werden geprüft …";
        try {
          const preview = await request("/email/concierge/rules/backfill/preview", { method: "POST", body: { rule_id: rule.id } });
          const count = number(preview.count), truncated = preview.truncated === true;
          if (!count) { feedback.textContent = "Keine bestehenden passenden E-Mails gefunden."; return; }
          const confirmation = el("div", "ecp-rule-existing-confirm");
          const message = existingActionCopy(rule, count);
          const scopeNote = truncated ? " Es gibt weitere Treffer; mit dieser Bestätigung werden höchstens die 500 gerade geprüften E-Mails bearbeitet." : "";
          confirmation.append(el("p", "", (action === "TRASH" ? message + " Sie werden nicht endgültig gelöscht." : message) + scopeNote));
          const buttons = el("div", "ecp-rule-existing-confirm-actions");
          const cancel = button("Abbrechen", "ecp-link-button");
          const confirmApply = button(action === "TRASH" ? "In Papierkorb verschieben" : "Jetzt anwenden", "ecp-action");
          cancel.addEventListener("click", () => { confirmation.remove(); feedback.textContent = ""; applyExisting.disabled = false; });
          confirmApply.addEventListener("click", async () => {
            cancel.disabled = true; confirmApply.disabled = true; feedback.textContent = "Wird angewendet …";
            try {
              const applied = await request("/email/concierge/rules/backfill/apply", { method: "POST", body: { rule_id: rule.id, confirmed: true } });
              const changed = number(applied.changed), more = applied.truncated === true;
              feedback.textContent = changed
                ? `${changed} bestehende E-Mail${changed === 1 ? "" : "s"} wurden bearbeitet.${more ? " Weitere passende E-Mails sind vorhanden – du kannst sie separat erneut prüfen." : ""}`
                : "Keine bestehende E-Mail musste geändert werden.";
              confirmation.remove();
            } catch (error) { feedback.textContent = "Konnte gerade nicht angewendet werden."; showError(error instanceof Error ? error.message : "EMAIL_PROVIDER_UNAVAILABLE"); }
            finally { applyExisting.disabled = false; }
          });
          buttons.append(cancel, confirmApply); confirmation.append(buttons);
          existing.querySelector(".ecp-rule-existing-confirm")?.remove();
          existing.append(confirmation);
          feedback.textContent = `${truncated ? "Mindestens " : ""}${count} bestehende passende E-Mail${count === 1 ? "" : "s"} gefunden.`;
        } catch (error) {
          feedback.textContent = "Bestehende E-Mails konnten gerade nicht geprüft werden.";
          showError(error instanceof Error ? error.message : "EMAIL_PROVIDER_UNAVAILABLE");
        } finally {
          if (!existing.querySelector(".ecp-rule-existing-confirm")) applyExisting.disabled = false;
        }
      });
      existing.append(existingCopy, applyExisting, feedback); row.append(existing);
    }

    card.append(row);
  }
  function renderSettings(card) {
    const pref = dashboard.notification_preference || { enabled: false, target_channel: "PORTAL" };
    const notify = el("section", "ecp-notify-setting"), notifyCopy = el("div", "ecp-notify-copy"), notifyControls = el("div", "ecp-notify-controls");
    notifyCopy.append(el("strong", "", "Bei vorbereitetem Antwortentwurf benachrichtigen"), el("small", "", "Nur wenn du das aktivierst, informiert dich der Concierge über den von dir gewählten Kanal."));
    const enabledLabel = el("label", "ecp-rule-toggle"), enabled = el("input"); enabled.type = "checkbox"; enabled.checked = pref.enabled === true; enabled.setAttribute("aria-label", "Benachrichtigungen für Antwortentwürfe");
    enabledLabel.append(enabled, el("span", "", enabled.checked ? "Aktiv" : "Aus"));
    const channel = el("select", "ecp-rule-select"); channel.setAttribute("aria-label", "Benachrichtigungskanal für Antwortentwürfe");
    [["PORTAL","Kundenkonto"],["WHATSAPP","WhatsApp"],["CALL","Telefon"],["EMAIL","E-Mail"]].forEach(([value,label]) => { const option=el("option","",label); option.value=value; option.selected=String(pref.target_channel||"PORTAL").toUpperCase()===value; channel.append(option); });
    channel.disabled = !enabled.checked;
    const saveNotification = async () => {
      enabled.disabled = true; channel.disabled = true;
      try {
        const data = await request("/email/concierge/notification-preference", { method: "POST", body: { enabled: enabled.checked, target_channel: channel.value } });
        dashboard.notification_preference = data.notification_preference || { enabled: enabled.checked, target_channel: channel.value };
      } catch (error) { showError(error instanceof Error ? error.message : "EMAIL_PROVIDER_UNAVAILABLE"); }
      finally { enabled.disabled = false; channel.disabled = !enabled.checked; render(); }
    };
    enabled.addEventListener("change",()=>void saveNotification());
    channel.addEventListener("change",()=>void saveNotification());
    notifyControls.append(enabledLabel, channel); notify.append(notifyCopy, notifyControls); card.append(notify);
    const suggestions = list(dashboard.suggestions), rules = list(dashboard.rules);
    if (suggestions.length) {
      card.append(el("p", "ecp-rule-heading", "Vorschläge deines Concierges"));
      suggestions.forEach((suggestion) => renderRuleSuggestion(card, suggestion));
    }
    card.append(el("p", "ecp-rule-heading", "Deine persönlichen Regeln"));
    if (!rules.length) card.append(el("div", "ecp-section-empty", "Noch keine Automatik aktiv. Du kannst E-Mails einfach als wichtig oder unwichtig markieren – dein Concierge lernt daraus."));
    else rules.forEach((rule) => renderPersonalRule(card, rule));
    card.append(el("p", "ecp-footer-note", "Neue Regeln gelten nur für zukünftige passende E-Mails. Bereits vorhandene Nachrichten werden nie automatisch nachträglich verändert. Papierkorb bedeutet Gmail-Papierkorb; endgültiges Löschen bleibt deaktiviert."));
    const current = dashboard.settings || {};
    const details = el("details", "ecp-settings-details"), summary = el("summary", "", "Weitere E-Mail-Einstellungen");
    details.append(summary);
    Object.entries(SETTINGS).forEach(([key, meta]) => {
      const row = el("label", "ecp-setting"), copy = el("span"); copy.append(el("strong", "", meta[0]), el("small", "", meta[1]));
      const toggle = el("span", "ecp-switch"), input = el("input"); input.type = "checkbox"; input.checked = current[key] === true; input.setAttribute("aria-label", meta[0]); toggle.append(input, el("span"));
      input.addEventListener("change", async () => {
        const desired = input.checked;
        if (key === "UNIMPORTANT_AUTO_TRASH" && desired) {
          const approved = confirm("Unwichtige E-Mails künftig automatisch in den Gmail-Papierkorb verschieben?\n\nDer Concierge prüft neue E-Mails sofort beim Eingang und zusätzlich minütlich. Endgültig gelöscht wird nichts.");
          if (!approved) { input.checked = false; return; }
        }
        input.disabled = true;
        try { const data = await request("/email/concierge/settings", { method: "POST", body: { settings: { [key]: desired } } }); dashboard.settings = data.settings || dashboard.settings; }
        catch (error) { input.checked = !desired; showError(error instanceof Error ? error.message : "EMAIL_PROVIDER_UNAVAILABLE"); }
        finally { input.disabled = false; render(); }
      });
      row.append(copy, toggle); details.append(row);
    });
    details.append(el("p", "ecp-footer-note", "E-Mails werden nur nach deiner ausdrücklichen Freigabe gesendet. Spam- oder Betrugsverdacht allein löscht keine Nachricht."));
    card.append(details);
  }
  function classificationDigest(s) {
    if (!classification) return s.text;
    const c = classification.counts;
    if (classification.complete) return `${classification.total} E-Mails insgesamt im Posteingang. NAHWERK hat sie in dieser Übersicht in ${c.IMPORTANT} wichtig, ${c.UNIMPORTANT} unwichtig und ${c.MARKETING} Werbung / Spam eingeordnet. ${s.unread} sind ungelesen, ${s.today} heute eingegangen.`;
    return `${classification.total} E-Mails insgesamt im Posteingang. Von den ${classification.sorted_count} neuesten hat NAHWERK ${c.IMPORTANT} als wichtig, ${c.UNIMPORTANT} als unwichtig und ${c.MARKETING} als Werbung / Spam eingeordnet. ${s.unread} sind ungelesen, ${s.today} heute eingegangen.`;
  }
  function composeAddresses(value) {
    return [...new Set((String(value || "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []).map((v)=>v.toLowerCase()))];
  }
  function composeSubject(prefix, subject) {
    const raw=text(subject,500)||"(kein Betreff)";
    if(prefix==="RE") return /^re:/i.test(raw)?raw:`Re: ${raw}`;
    if(prefix==="FWD") return /^(?:fwd?|wg):/i.test(raw)?raw:`Fwd: ${raw}`;
    return raw;
  }
  function replyAllRecipients(detail) {
    const own=composeAddresses(connectionEmail(String(detail?._connection_id||activeConnectionId||"")));
    const all=[...composeAddresses(detail?.from),...composeAddresses(detail?.to)];
    return [...new Set(all.filter((address)=>!own.includes(address)))].join(", ");
  }
  function startComposer(mode="NEW", detail=null) {
    const normalized=String(mode||"NEW").toUpperCase();
    const connectionId=String(detail?._connection_id||activeConnectionId||emailConnections[0]?.connection_id||"");
    if(!connectionId){showError("EMAIL_CONNECTION_NOT_CONNECTED");return}
    activeConnectionId=connectionId;
    const reply=normalized==="REPLY"||normalized==="REPLY_ALL";
    const forward=normalized==="FORWARD";
    composeState={
      mode:normalized,
      connection_id:connectionId,
      from:connectionEmail(connectionId),
      source_message_id:reply?String(detail?.id||""):"",
      thread_id:reply?String(detail?.thread_id||""):"",
      to:normalized==="REPLY"?composeAddresses(detail?.from).join(", "):normalized==="REPLY_ALL"?replyAllRecipients(detail):"",
      subject:reply?composeSubject("RE",detail?.subject):forward?composeSubject("FWD",detail?.subject):"",
      body_text:forward?`\n\n---------- Weitergeleitete Nachricht ----------\nVon: ${text(detail?.from,300)}\nDatum: ${fmtDate(detail?.date)}\nBetreff: ${text(detail?.subject,500)}\nAn: ${text(detail?.to,300)}\n\n${text(detail?.body_text,12000)}`:"",
      savedDraft:null,dirty:true,status:""
    };
    readerMode="COMPOSE";render(true);
  }
  async function saveComposerDraft() {
    if(!composeState||composeSaving)return null;
    const state=composeState,to=String(state.to||"").trim(),subject=String(state.subject||"").trim(),bodyText=String(state.body_text||"");
    if(!to.includes("@")){state.status="Bitte einen gültigen Empfänger eintragen.";render(true);return null}
    if(!bodyText.trim()){state.status="Bitte Nachrichtentext eingeben.";render(true);return null}
    composeSaving=true;state.status="Entwurf wird gespeichert …";render(true);
    try{
      let data;
      if(state.savedDraft){
        data=await request("/email/concierge/drafts/edit",{method:"POST",body:{
          email_send_action_id:state.savedDraft.email_send_action_id,
          approval_id:state.savedDraft.approval_id||null,
          send_action_id:state.savedDraft.send_action_id||null,
          to,subject,body_text:bodyText
        },connectionId:state.connection_id});
      }else{
        data=await request("/email/concierge/drafts/create",{method:"POST",body:{
          compose_mode:state.mode,to,subject,body_text:bodyText,
          source_message_id:state.source_message_id||null,
          thread_id:state.thread_id||null
        },connectionId:state.connection_id});
      }
      state.savedDraft=data?.draft||state.savedDraft;
      state.dirty=false;state.status="Im echten Entwürfe-Ordner gespeichert.";
      remoteFolderCache.clear();
      return state.savedDraft;
    }catch(error){state.status=ERROR_COPY[error instanceof Error?error.message:""]||"Entwurf konnte gerade nicht gespeichert werden.";return null}
    finally{composeSaving=false;render(true)}
  }
  async function sendComposer() {
    if(!composeState||composeSaving)return;
    const draft=await saveComposerDraft();if(!draft)return;
    if(!confirm(`Diese E-Mail jetzt wirklich senden?\n\nAn: ${composeState.to}\nBetreff: ${composeState.subject||"(kein Betreff)"}`))return;
    composeSaving=true;composeState.status="E-Mail wird nach deiner Freigabe gesendet …";render(true);
    try{
      await request("/email/concierge/drafts/approve-send",{method:"POST",body:{
        email_send_action_id:draft.email_send_action_id,
        approval_id:draft.approval_id,
        send_action_id:draft.send_action_id
      },connectionId:composeState.connection_id});
      const connectionId=composeState.connection_id;
      composeState=null;activeConnectionId=connectionId;mailboxScope="ACCOUNT";mailboxFolder="SENT";readerMode="MESSAGE";
      selectedMessageId="";selectedMessageConnectionId="";selectedMessageDetail=null;mailboxFolderRows=[];remoteFolderCache.clear();
      render(true);void loadMailboxFolder(true);
    }catch(error){composeState.status=ERROR_COPY[error instanceof Error?error.message:""]||"Die E-Mail konnte gerade nicht gesendet werden."}
    finally{composeSaving=false;render(true)}
  }
  function renderComposer(pane) {
    const state=composeState;if(!state){startComposer("NEW");return}
    const head=el("div","ecp-tb-reader-head");
    const title=state.mode==="REPLY"?"Antworten":state.mode==="REPLY_ALL"?"Allen antworten":state.mode==="FORWARD"?"Weiterleiten":"Neue Nachricht";
    head.append(el("strong","",title),el("span","ecp-tb-reader-kicker",state.savedDraft?"Entwurf gespeichert":"Noch nicht gesendet"));pane.append(head);
    const form=el("div","ecp-compose");
    const fromField=el("label","ecp-compose-field"),fromSelect=el("select");
    fromField.append(el("span","","Von"));
    for(const row of emailConnections){const option=el("option");option.value=String(row.connection_id||"");option.textContent=text(row.account_email||row.account_display_hint||row.provider_label,320);option.selected=option.value===state.connection_id;fromSelect.append(option)}
    fromSelect.disabled=state.mode==="REPLY"||state.mode==="REPLY_ALL"||Boolean(state.savedDraft);
    fromSelect.addEventListener("change",()=>{state.connection_id=fromSelect.value;state.from=connectionEmail(fromSelect.value);state.dirty=true});
    fromField.append(fromSelect);
    const field=(label,value,kind="input")=>{const wrap=el("label","ecp-compose-field"),control=kind==="textarea"?el("textarea"):el("input");wrap.append(el("span","",label));control.value=value||"";return {wrap,control}};
    const toField=field("An",state.to),subjectField=field("Betreff",state.subject),bodyField=field("Nachricht",state.body_text,"textarea");
    toField.control.addEventListener("input",()=>{state.to=toField.control.value;state.dirty=true;state.status=""});
    subjectField.control.addEventListener("input",()=>{state.subject=subjectField.control.value;state.dirty=true;state.status=""});
    bodyField.control.addEventListener("input",()=>{state.body_text=bodyField.control.value;state.dirty=true;state.status=""});
    form.append(fromField,toField.wrap,subjectField.wrap,bodyField.wrap);
    form.append(el("div","ecp-compose-note","Speichern legt einen echten Provider-Entwurf an. Gesendet wird erst nach deiner ausdrücklichen Freigabe."));
    if(state.status)form.append(el("div","ecp-compose-status",state.status));
    const actions=el("div","ecp-compose-actions"),cancel=button("Abbrechen","ecp-tb-toolbar-button"),save=button("Als Entwurf speichern","ecp-tb-toolbar-button"),send=button("Senden","ecp-primary");
    cancel.disabled=composeSaving;save.disabled=composeSaving;send.disabled=composeSaving;
    cancel.addEventListener("click",()=>{composeState=null;readerMode="MESSAGE";render(true)});
    save.addEventListener("click",()=>void saveComposerDraft());
    send.addEventListener("click",()=>void sendComposer());
    actions.append(cancel,save,send);form.append(actions);pane.append(form);
  }

  function renderMailboxSidebar(shell) {
    const side = el("aside", "ecp-tb-sidebar");
    const brand = el("div", "ecp-tb-brand"), mark = el("span", "ecp-tb-brandmark"), brandCopy = el("div");
    mark.setAttribute("aria-hidden","true");
    const svgNs="http://www.w3.org/2000/svg",mailSvg=document.createElementNS(svgNs,"svg"),mailRect=document.createElementNS(svgNs,"rect"),mailPath=document.createElementNS(svgNs,"path");
    mailSvg.setAttribute("viewBox","0 0 24 24");mailSvg.setAttribute("focusable","false");mailSvg.setAttribute("aria-hidden","true");
    mailRect.setAttribute("x","3.25");mailRect.setAttribute("y","5.25");mailRect.setAttribute("width","17.5");mailRect.setAttribute("height","13.5");mailRect.setAttribute("rx","2.25");
    mailPath.setAttribute("d","M4.5 7.25 12 13l7.5-5.75");mailSvg.append(mailRect,mailPath);mark.append(mailSvg);
    brandCopy.append(el("strong", "", "NAHWERK Mail"), el("span", "", emailConnections.length === 1 ? "1 Postfach verbunden" : `${emailConnections.length} Postfächer verbunden`)); brand.append(mark, brandCopy); side.append(brand);
    const composeButton=button("＋ Neue Nachricht","ecp-tb-compose-button");composeButton.addEventListener("click",()=>startComposer("NEW"));side.append(composeButton);
    const nav = el("nav", "ecp-tb-nav"); nav.setAttribute("aria-label", "E-Mail-Bereiche");
    nav.addEventListener("scroll",()=>{mailboxSidebarScrollTop=nav.scrollTop;mailboxSidebarScrollLeft=nav.scrollLeft;},{passive:true});
    const appendNav = (label, icon, active, count, onClick, extraClass="") => {
      const b = button("", "ecp-tb-nav-item" + (extraClass ? " " + extraClass : "") + (active ? " is-active" : ""));
      b.append(el("span","ecp-tb-nav-icon",icon),el("span","ecp-tb-nav-label",label));
      if (count !== "" && count !== null && count !== undefined) b.append(el("span","ecp-tb-nav-count",String(count)));
      b.addEventListener("click", onClick); nav.append(b); return b;
    };
    appendNav("Alle Posteingänge","▣",mailboxScope==="ALL"&&readerMode==="MESSAGE",mailboxFolderCount("ALL"),()=>void selectAllInboxes(),"ecp-tb-nav-global");
    nav.append(el("div","ecp-tb-nav-separator"));
    const folders = [["INBOX","Posteingang","▣"],["SPAM","Spam","⚑"],["SENT","Gesendet","➤"],["DRAFTS","Entwürfe","✎"],["TRASH","Papierkorb","⌫"]];
    for (const account of emailConnections) {
      const id=String(account.connection_id||""), accountTitle=button("","ecp-tb-account");
      accountTitle.type="button";
      accountTitle.setAttribute("aria-label",(text(account.account_email||account.account_display_hint||account.provider_label||"Postfach",320))+" öffnen");
      accountTitle.append(el("span","ecp-tb-account-dot",""),el("strong","",text(account.account_email||account.account_display_hint||account.provider_label||"Postfach",320)));
      accountTitle.addEventListener("click",()=>void selectMailboxFolder(id,"INBOX"));
      nav.append(accountTitle);
      for (const [value,label,icon] of folders) {
        const active=mailboxScope==="ACCOUNT"&&activeConnectionId===id&&mailboxFolder===value&&readerMode==="MESSAGE";
        appendNav(label,icon,active,mailboxFolderCount(value,id),()=>void selectMailboxFolder(id,value),"ecp-tb-nav-subitem");
      }
    }
    nav.append(el("div","ecp-tb-nav-separator"));
    const utilities = [["CONCIERGE","Concierge","◇"],["AUTOMATION","Automatik & Schutz","⚙"],["ACTIVITY","Aktivität","≡"]];
    for (const [mode,label,icon] of utilities) appendNav(label,icon,readerMode===mode,"",()=>{readerMode=mode;render();});
    side.append(nav);
    const foot = el("div","ecp-tb-sidebar-foot");
    foot.append(el("span","","Wichtig / Unwichtig wird intern gelernt – nicht als Ordner."),el("small","","Antwortentwürfe liegen im echten Entwürfe-Ordner und werden nie ohne deine Freigabe gesendet."));
    side.append(foot); shell.append(side);
  }
  function renderMailboxListPane(shell) {
    const pane = el("section","ecp-tb-list-pane"), top = el("div","ecp-tb-list-top"), titleWrap = el("div");
    const rows = mailboxFilteredMessages();
    const truthLabel=mailboxProviderTruthLabel();
    titleWrap.append(el("strong","",mailboxFolderTitle()),el("span","",mailboxFolderLoading ? truthLabel+" · weitere werden geladen …" : truthLabel)); top.append(titleWrap);
    const refresh = button("↻","ecp-tb-icon-button"); refresh.title="Aktualisieren"; refresh.addEventListener("click",()=>{if(folderBackedMode())void loadMailboxFolder(true);else void loadDashboard(false,true);}); top.append(refresh); pane.append(top);
    const listNode = el("div","ecp-tb-message-list");
    const loading = folderBackedMode() ? mailboxFolderLoading : classificationLoading;
    const loadError = folderBackedMode() ? mailboxFolderError : classificationError;
    if (!rows.length && loading) {
      listNode.append(el("div","ecp-tb-empty","E-Mails werden geladen …"));
    } else if (!rows.length && loadError) {
      const errorBox=el("div","ecp-tb-empty ecp-tb-error-state");
      errorBox.append(el("strong","","E-Mails konnten gerade nicht geladen werden."),el("span","","Das Postfach konnte nicht gelesen werden. Bitte versuche es erneut."));
      const retry=button("Erneut laden","ecp-tb-toolbar-button");retry.addEventListener("click",()=>{if(folderBackedMode())void loadMailboxFolder(true);else{classificationRetryCount=0;void loadClassification();}});
      errorBox.append(retry);listNode.append(errorBox);
    } else if (!rows.length) {
      listNode.append(el("div","ecp-tb-empty","Keine passenden E-Mails in dieser Ansicht."));
    } else {
      rows.forEach((message)=>{
        const messageConnection=String(message?._connection_id||activeConnectionId||"");
        const row=el("article","ecp-tb-message"+(String(message.id)===selectedMessageId&&messageConnection===selectedMessageConnectionId&&readerMode==="MESSAGE"?" is-selected":""));
        row.tabIndex=0; row.setAttribute("role","button"); row.setAttribute("aria-label",(text(message.subject,220)||"(kein Betreff)")+" öffnen");
        const header=el("div","ecp-tb-message-head"),sender=el("strong","ecp-tb-sender",text(message.from,220)||"Unbekannter Absender"),date=el("time","ecp-tb-date",fmtDate(message.date));
        header.append(sender,date); row.append(header,el("div","ecp-tb-subject",text(message.subject,300)||"(kein Betreff)"));
        if(message.snippet)row.append(el("div","ecp-tb-snippet",text(message.snippet,260)));
        if(message.needs_reply)row.append(el("span","ecp-tb-reply-flag","Antwort empfohlen"));
        if(message.mailbox_location==="TRASH")row.append(el("span","ecp-tb-location-flag","Papierkorb"));
        const allowClassify=mailboxScope==="ACCOUNT"&&mailboxFolder==="INBOX"&&String(connectionById(messageConnection)?.provider||"GOOGLE").toUpperCase()==="GOOGLE";
        if(allowClassify){const actions=classificationControls(message); actions.classList.add("ecp-tb-class-actions"); row.append(actions);}
        if(message._account_email&&mailboxScope==="ALL")row.append(el("span","ecp-tb-account-chip",text(message._account_email,220)));
        const open=()=>void openMailboxMessage(message); row.addEventListener("click",open); row.addEventListener("keydown",(ev)=>{if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();open();}});
        listNode.append(row);
      });
    }
    pane.append(listNode); shell.append(pane);
  }
  function renderMailboxReader(shell) {
    const pane = el("section","ecp-tb-reader");
    if (readerMode === "COMPOSE") { renderComposer(pane); shell.append(pane); return; }
    if (readerMode === "CONCIERGE") {
      const head=el("div","ecp-tb-reader-head");head.append(el("strong","","E-Mail-Concierge"),el("span","ecp-tb-reader-kicker","Befehle & Antworten"));pane.append(head);
      const card=el("section","ecp-card ecp-tb-embedded-card");renderChat(card);pane.append(card);shell.append(pane);return;
    }
    if (readerMode === "AUTOMATION") {
      const head=el("div","ecp-tb-reader-head");head.append(el("strong","","Automatik & Schutz"),el("span","ecp-tb-reader-kicker","Persönlich & reversibel"));pane.append(head);
      const protection=el("section","ecp-card ecp-tb-embedded-card");renderProtection(protection);pane.append(protection);
      const settings=el("section","ecp-card ecp-tb-embedded-card");renderSettings(settings);pane.append(settings);shell.append(pane);return;
    }
    if (readerMode === "ACTIVITY") {
      const head=el("div","ecp-tb-reader-head"),title=el("strong","","Aktivität");head.append(title);pane.append(head);
      const holder=el("div"), card=el("section","ecp-card ecp-tb-embedded-card");renderActivities(card,holder);if(holder.childElementCount)pane.append(holder);pane.append(card);shell.append(pane);return;
    }
    if (readerMode === "DRAFTS") {
      const head=el("div","ecp-tb-reader-head");head.append(el("strong","","Entwürfe"),el("span","ecp-tb-reader-kicker","Versand nur nach Freigabe"));pane.append(head);
      const card=el("section","ecp-card ecp-tb-embedded-card");renderDrafts(card);pane.append(card);shell.append(pane);return;
    }
    if (selectedMessageLoading) { pane.append(el("div","ecp-tb-reader-empty","E-Mail wird geöffnet …")); shell.append(pane); return; }
    const currentRows=mailboxFilteredMessages();
    const selectionStillVisible=currentRows.some((row)=>String(row?.id||"")===String(selectedMessageId||"")&&String(row?._connection_id||activeConnectionId||"")===String(selectedMessageConnectionId||activeConnectionId||""));
    if(!selectionStillVisible){selectedMessageId="";selectedMessageConnectionId="";selectedMessageDetail=null;selectedMessageLoading=false;}
    const detail = selectedMessageDetail;
    if (!detail) {
      const placeholder=el("div","ecp-tb-reader-empty");placeholder.append(el("strong","","E-Mail auswählen"),el("span","","Wähle eine Nachricht aus. Wichtig / Unwichtig bleibt eine interne Concierge-Einschätzung und erzeugt keine Ordner."));pane.append(placeholder);shell.append(pane);return;
    }
    const toolbar=el("div","ecp-tb-reader-toolbar");
    const reply=button("Antworten","ecp-tb-toolbar-button"),replyAll=button("Allen antworten","ecp-tb-toolbar-button"),forward=button("Weiterleiten","ecp-tb-toolbar-button"),concierge=button("Mit Concierge bearbeiten","ecp-tb-toolbar-button");
    reply.addEventListener("click",()=>startComposer("REPLY",detail));
    replyAll.addEventListener("click",()=>startComposer("REPLY_ALL",detail));
    forward.addEventListener("click",()=>startComposer("FORWARD",detail));
    concierge.addEventListener("click",()=>{readerMode="CONCIERGE";render();});
    toolbar.append(reply,replyAll,forward,concierge);pane.append(toolbar);
    const header=el("div","ecp-tb-reader-message-head");
    header.append(el("h3","",text(detail.subject,500)||"(kein Betreff)"),el("div","ecp-tb-reader-from",text(detail.from,300)||"Unbekannter Absender"),detail._account_email?el("div","ecp-tb-reader-account",text(detail._account_email,300)):el("span"),el("div","ecp-tb-reader-date",fmtDate(detail.date)));
    pane.append(header,el("div","ecp-tb-reader-body",text(detail.body_text,12000)||"Kein Textinhalt verfügbar."));
    const attachments=list(detail.attachments);if(attachments.length)pane.append(el("div","ecp-tb-attachments",String(attachments.length)+" Anhang"+(attachments.length===1?"":"e")+" · gefährliche Dateitypen werden nicht automatisch geöffnet"));
    shell.append(pane);
  }
  function render(force = false) {
    const root = ensureHost(); if (!root) return;
    const transient=captureTransientUiState(root);
    if(transient.chatFocused && chatDraft.length>0){
      pendingBackgroundRender=true;
      return;
    }
    if(!force && transient.chatFocused){
      pendingBackgroundRender=true;
      return;
    }
    pendingBackgroundRender=false;
    ensureClassificationStyles();
    root.hidden = !connected; if (!connected) { root.replaceChildren(); return; }
    root.replaceChildren();
    if (!dashboard) { root.append(el("div", "ecp-loading", "Dein E-Mail-Concierge wird geladen …")); restoreTransientUiState(root,transient); return; }
    const workspace = el("section","ecp-thunderbird"); workspace.setAttribute("aria-label","E-Mail-Arbeitsbereich");
    const toolbar = el("div","ecp-tb-toolbar"), left=el("div","ecp-tb-toolbar-title"), searchWrap=el("label","ecp-tb-search");
    left.append(el("strong","","E-Mail"),el("span","","NAHWERK Concierge"));
    const search=el("input","");search.type="search";search.value=mailboxSearch;search.placeholder="Suchen …";search.setAttribute("aria-label","E-Mails durchsuchen");
    search.addEventListener("change",()=>{mailboxSearch=search.value;render(true);});
    search.addEventListener("keydown",(ev)=>{if(ev.key==="Enter"){ev.preventDefault();mailboxSearch=search.value;render(true);}});
    searchWrap.append(el("span","","⌕"),search);
    const providerTruth=mailboxProviderTruthLabel(),status=el("span","ecp-tb-live ecp-tb-provider-truth",providerTruth);status.title=providerTruth;
    const composeTop=button("＋ Neue Nachricht","ecp-tb-toolbar-button");composeTop.addEventListener("click",()=>startComposer("NEW"));
    toolbar.append(left,composeTop,searchWrap,status);workspace.append(toolbar);
    const shell=el("div","ecp-tb-shell");renderMailboxSidebar(shell);renderMailboxListPane(shell);renderMailboxReader(shell);workspace.append(shell);root.append(workspace);
    restoreTransientUiState(root,transient);
    if (Date.now() < preservePageScrollUntil) requestAnimationFrame(() => window.scrollTo({ top: preservePageScrollY, left: 0, behavior: "auto" }));
  }
  async function loadClassification() {
    if (!connected || classificationLoading) return;
    const active = connectionById(activeConnectionId);
    if (active && String(active.provider || "").toUpperCase() !== "GOOGLE") {
      classification = null;
      classificationError = "";
      render();
      return;
    }
    classificationLoading = true;
    classificationError = "";
    render();
    try {
      const next = normalizeClassification(await request("/email/concierge/classification/summary"));
      if (!next) throw new Error("EMAIL_PROVIDER_UNAVAILABLE");
      classification = next;
      classificationRetryCount = 0;
    } catch (error) {
      classification = null;
      classificationError = error instanceof Error ? error.message : "EMAIL_PROVIDER_UNAVAILABLE";
      if (connected && classificationRetryCount < 1) {
        classificationRetryCount += 1;
        setTimeout(()=>{ if (connected && !classificationLoading) void loadClassification(); },1600);
      }
    } finally { classificationLoading = false; render(); }
  }
  async function loadDashboard(showLoading = true, force = false) {
    if (!connected) return;
    if (dashboardLoadPromise) return dashboardLoadPromise;
    if (!force && dashboard && Date.now() - dashboardLoadedAt < DASHBOARD_DEDUPE_MS) { render(); return dashboard; }
    dashboardLoadPromise = (async () => {
      if (showLoading && !dashboard) { classification = null; render(); }
      try {
        const googleConnection = emailConnections.find((row) => String(row?.provider || "").toUpperCase() === "GOOGLE" && String(row?.state || "").toUpperCase() === "CONNECTED");
        if (googleConnection) {
          const dashboardData = await request("/email/concierge/dashboard", { connectionId: String(googleConnection.connection_id || "") });
          dashboard = normalizeDashboard(dashboardData);
          if (!dashboard) throw new Error("EMAIL_PROVIDER_UNAVAILABLE");
          chatStarted = chatStarted || dashboard.chat?.has_user_message === true;
        } else {
          dashboard = bootstrapDashboard();
        }
        dashboardLoadedAt = Date.now();
      } catch (error) {
        dashboard = bootstrapDashboard();
        dashboardLoadedAt = Date.now();
        showError(error instanceof Error ? error.message : "EMAIL_PROVIDER_UNAVAILABLE");
      }
      render();
      return dashboard;
    })().finally(() => { dashboardLoadPromise = null; });
    return dashboardLoadPromise;
  }
  function canonicalConnectedState(rows = globalThis.__nahwerkEmailConnections) {
    if (!Array.isArray(rows)) return null;
    return rows.some((row) => String(row?.state || row?.status || "").toUpperCase() === "CONNECTED");
  }
  async function setConnectionState(isConnected) {
    const canonical = canonicalConnectedState();
    connected = canonical === null ? isConnected === true : canonical;
    ensureHost();
    if (!connected) {
      dashboard = null; dashboardLoadedAt = 0; classification = null; classificationError = ""; classificationRetryCount = 0;
      emailConnections = []; activeConnectionId = ""; mailboxScope = "ALL"; mailboxFolderRows = []; mailboxFolderCounts = {}; classificationKnownCounts = {}; classificationFolderCache = {}; mailboxLoadSerial++; mailboxIndexWarmStarted.clear(); remoteFolderCache.clear(); remoteFolderInflight.clear(); allDrafts = [];
      composeState=null;composeSaving=false;
      chatMessages = []; chatStarted = false; chatDraft=""; chatScrollTop=0; mailboxListScrollTop=0; mailboxSidebarScrollTop=0; mailboxSidebarScrollLeft=0; readerScrollTop=0; pendingBackgroundRender=false; onboardingExampleSelections.clear(); render(true); return;
    }
    try { await loadConnections(); } catch (error) { showError(error instanceof Error ? error.message : "EMAIL_PROVIDER_UNAVAILABLE"); }
    if (!emailConnections.length) { connected = false; render(); return; }
    await loadDashboard();
    await loadMailboxFolder();
  }
  window.addEventListener("nahwerk:email-connections-updated", (event) => {
    const rows = Array.isArray(event.detail?.connections) ? event.detail.connections : globalThis.__nahwerkEmailConnections;
    const canonical = canonicalConnectedState(rows);
    if (canonical !== null) void setConnectionState(canonical);
    else if (connected) void loadConnections().then(()=>loadMailboxFolder());
  });
  async function refreshLiveMailbox() {
    if(!connected || busy || document.hidden) return;
    try { await loadConnections(); await loadMailboxFolder(); }
    catch { /* current rows stay visible */ }
  }
  setInterval(()=>{ void refreshLiveMailbox(); },120000);
  document.addEventListener("visibilitychange",()=>{ if(!document.hidden) void refreshLiveMailbox(); });

  globalThis.NAHWERKEmailConciergeProduct = Object.freeze({
    setConnectionState,
    refresh() { return loadConnections().then(()=>loadDashboard(false, true)).then(()=>loadMailboxFolder()); }
  });
  ensureHost();
  window.dispatchEvent(new CustomEvent("nahwerk:email-concierge-product-ready"));
})();