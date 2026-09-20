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
    EMAIL_CONNECTION_NOT_CONNECTED: "Gmail ist nicht verbunden.",
    EMAIL_PROVIDER_UNAVAILABLE: "Der E-Mail-Concierge ist gerade nicht erreichbar.",
    EMAIL_PROVIDER_BUSY: "Gmail ist gerade kurz ausgelastet. Deine gespeicherten Sortierungen und Regeln bleiben verfügbar; versuche die Gmail-Aktion gleich noch einmal.",
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
      channels: data.channels && typeof data.channels === "object" ? data.channels : {}
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
  globalThis.NAHWERKEmailConciergeProductTestHooks = Object.freeze({ BASE, SETTINGS, QUICK, normalizeDashboard, normalizeClassification, errorCode });

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
  let activityExpanded = false;
  let mailboxFolder = "INBOX";
  let mailboxSearch = "";
  let readerMode = "MESSAGE";
  let selectedMessageId = "";
  let selectedMessageDetail = null;
  let selectedMessageLoading = false;

  function ensureClassificationStyles() {
    if (document.getElementById("nahwerkEmailClassificationStyles")) return;
    const style = document.createElement("style"); style.id = "nahwerkEmailClassificationStyles";
    style.textContent = `
      .ecp-summary{grid-template-columns:repeat(6,minmax(0,1fr))!important}
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
  async function request(path, { method = "GET", body = null } = {}) {
    const token = sessionToken();
    if (!token) throw new Error("UNAUTHENTICATED");
    const headers = { Authorization: "Bearer " + token };
    const init = { method, headers };
    if (body !== null) { headers["Content-Type"] = "application/json"; init.body = JSON.stringify(body); }
    let response;
    try { response = await fetch(BASE + path, init); }
    catch { throw new Error("EMAIL_PROVIDER_UNAVAILABLE"); }
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.ok !== true) throw new Error(errorCode(data));
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
  function mailboxAllMessages() {
    const rows = classification ? classificationMessages() : [...list(dashboard?.highlights), ...list(dashboard?.warnings)];
    const seen = new Set(), out = [];
    for (const row of rows) { const id = String(row?.id || ""); if (!id || seen.has(id)) continue; seen.add(id); out.push(row); }
    return out.sort((a,b)=>Date.parse(String(b?.date||0))-Date.parse(String(a?.date||0)));
  }
  function mailboxFilteredMessages() {
    let rows = mailboxAllMessages();
    if (mailboxFolder === "IMPORTANT") rows = rows.filter((m)=>m.classification === "IMPORTANT");
    else if (mailboxFolder === "UNIMPORTANT") rows = rows.filter((m)=>m.classification === "UNIMPORTANT");
    else if (mailboxFolder === "MARKETING") rows = rows.filter((m)=>m.classification === "MARKETING");
    else if (mailboxFolder === "REPLY") rows = rows.filter((m)=>m.needs_reply === true);
    const q = mailboxSearch.trim().toLowerCase();
    if (q) rows = rows.filter((m)=>[m.from,m.subject,m.snippet].some((v)=>String(v||"").toLowerCase().includes(q)));
    return rows;
  }
  function mailboxFolderTitle() {
    return ({INBOX:"Posteingang",IMPORTANT:"Wichtig",UNIMPORTANT:"Unwichtig",MARKETING:"Werbung / Spam",REPLY:"Antwort nötig"})[mailboxFolder] || "Posteingang";
  }
  function mailboxFolderCount(folder) {
    const all = mailboxAllMessages();
    if (folder === "INBOX") return classification?.total ?? all.length;
    if (folder === "IMPORTANT") return all.filter((m)=>m.classification === "IMPORTANT").length;
    if (folder === "UNIMPORTANT") return all.filter((m)=>m.classification === "UNIMPORTANT").length;
    if (folder === "MARKETING") return all.filter((m)=>m.classification === "MARKETING").length;
    if (folder === "REPLY") return all.filter((m)=>m.needs_reply === true).length;
    if (folder === "DRAFTS") return list(dashboard?.drafts).length;
    return 0;
  }
  async function openMailboxMessage(messageId) {
    if (!messageId) return;
    selectedMessageId = String(messageId); readerMode = "MESSAGE"; selectedMessageLoading = true; selectedMessageDetail = null; render();
    try {
      const data = await request("/email/concierge/messages/open", { method: "POST", body: { message_id: selectedMessageId } });
      if (selectedMessageId === String(messageId)) selectedMessageDetail = data.message || null;
    } catch (error) { showError(error instanceof Error ? error.message : "EMAIL_PROVIDER_UNAVAILABLE"); }
    finally { if (selectedMessageId === String(messageId)) selectedMessageLoading = false; render(); }
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
    if (dashboard) {
      for (const key of ["highlights", "warnings", "hints"]) {
        for (const mail of list(dashboard[key])) if (String(mail?.id || "") === id) mail.classification = value;
      }
    }
  }
  async function setMessageClassification(message, value) {
    if (busy || !message?.id || message.classification === value) return;
    setBusy(true);
    try {
      const saved = await request("/email/concierge/classification/override", { method: "POST", body: { message_id: message.id, thread_id: message.thread_id || null, classification: value } });
      message.classification = value;
      syncVisibleClassification(message.id, value);
      classification = normalizeClassification(await request("/email/concierge/classification/summary"));
      if (saved?.learning_suggestion_ready) {
        const next = normalizeDashboard(await request("/email/concierge/dashboard"));
        if (next) dashboard = next;
      }
    } catch (error) { showError(error instanceof Error ? error.message : "EMAIL_PROVIDER_UNAVAILABLE"); }
    finally { setBusy(false); render(); }
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
    if (!hasUserMessage && !chatMessages.length) log.append(el("div", "ecp-chat-empty", "Sprich hier ganz normal mit deinem E-Mail-Concierge: suchen, wichtig/unwichtig festlegen, archivieren, in den Papierkorb verschieben, Regeln für ähnliche E-Mails anlegen oder Antworten vorbereiten."));
    for (const entry of chatMessages) {
      const msg = el("div", `ecp-msg ecp-msg-${entry.role}${entry.error ? " ecp-msg-error" : ""}`, entry.text);
      log.append(msg);
      for (const mail of list(entry.messages)) log.append(messageCard(mail, true, true));
    }
    const form = el("form", "ecp-chat-form"), input = el("input", "ecp-chat-input"), send = button("Senden", "ecp-primary");
    input.type = "text"; input.name = "emailConciergeQuery"; input.maxLength = 5000; input.autocomplete = "off"; input.placeholder = "z. B. GitHub-Mails sind unwichtig"; input.setAttribute("aria-label", "E-Mail-Concierge fragen"); send.type = "submit";
    form.addEventListener("submit", (event) => { event.preventDefault(); const value = input.value.trim(); if (!value) return; input.value = ""; runQuery(value); });
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
      selectedMessageDetail = null;
      selectedMessageLoading = false;
      readerMode = "MESSAGE";
    }
  }
  function applyQueryResultToMailbox(data) {
    const ids = list(data?.result?.message_ids);
    if (ids.length) removeMailboxMessages(ids);
    const single = String(data?.result?.message_id || data?.result?.result?.message_id || "");
    if (single) removeMailboxMessages([single]);
  }

  async function runQuery(query) {
    if (busy || !query) return;
    chatStarted = true;
    chatMessages.push({ role: "user", text: query }); render(); setBusy(true);
    try {
      const data = await request("/email/concierge/query", { method: "POST", body: { text: query, request_id: crypto.randomUUID() } });
      let resultMessages = list(data.messages);
      if (data.type === "CLASSIFICATION_VIEW" && classification) {
        resultMessages = list(classification.buckets?.[String(data.classification || "")]);
      }
      chatMessages.push({ role: "assistant", text: text(data.message, 2500) || "Erledigt.", messages: resultMessages });
      applyQueryResultToMailbox(data);
      render();
      await loadDashboard(false, true);
    } catch (error) {
      const code = error instanceof Error ? error.message : "EMAIL_PROVIDER_UNAVAILABLE";
      chatMessages.push({ role: "assistant", text: ERROR_COPY[code] || "Das konnte ich gerade nicht ausführen. Bitte versuche es erneut.", error: true });
    } finally { setBusy(false); render(); }
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
    const rows = list(dashboard.drafts);
    if (!rows.length) { card.append(el("div", "ecp-section-empty", "Keine vorbereiteten Entwürfe warten auf dich.")); return; }
    const listNode = el("div", "ecp-list");
    rows.forEach((draft) => {
      const box = el("article", "ecp-draft"), top = el("div", "ecp-draft-top"), title = el("div");
      title.append(el("div", "ecp-draft-title", text(draft.subject, 300) || "(kein Betreff)"), el("div", "ecp-draft-meta", text(draft.to, 260) ? `An ${text(draft.to, 260)}` : "Empfänger wird aus der Antwort übernommen")); top.append(title, badge(draft.send_state === "WAITING_APPROVAL" ? "Wartet auf Freigabe" : String(draft.status || "Entwurf")));
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
      try { await request("/email/concierge/drafts/edit", { method: "POST", body: { email_send_action_id: draft.id, approval_id: draft.approval_id || null, send_action_id: draft.send_action_id || null, subject: subject.value, to: to.value, body_text: body.value } }); await loadDashboard(); }
      catch (error) { showError(error instanceof Error ? error.message : "EMAIL_PROVIDER_UNAVAILABLE"); }
      finally { setBusy(false); }
    });
    editor.append(subject, to, body, save); box.append(editor);
  }
  async function discardDraft(draft) {
    if (busy || !confirm("Diesen Entwurf wirklich verwerfen? Es wird nichts gesendet.")) return;
    setBusy(true);
    try { await request("/email/concierge/drafts/discard", { method: "POST", body: { email_send_action_id: draft.id, approval_id: draft.approval_id || null, send_action_id: draft.send_action_id || null } }); await loadDashboard(); }
    catch (error) { showError(error instanceof Error ? error.message : "EMAIL_PROVIDER_UNAVAILABLE"); }
    finally { setBusy(false); }
  }
  async function approveAndSend(draft) {
    if (busy || !draft.approval_id || !draft.send_action_id) return;
    const ok = confirm(`Diese E-Mail jetzt wirklich senden?\n\nAn: ${text(draft.to, 240) || "Empfänger"}\nBetreff: ${text(draft.subject, 240) || "(kein Betreff)"}\n\nErst mit „OK“ gibst du den Versand ausdrücklich frei.`);
    if (!ok) return;
    setBusy(true);
    try {
      const data = await request("/email/concierge/drafts/approve-send", { method: "POST", body: { email_send_action_id: draft.id, approval_id: draft.approval_id, send_action_id: draft.send_action_id } });
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
      : [["CLASSIFY_ONLY", "Nur als unwichtig einstufen"], ["ARCHIVE", "Künftig automatisch archivieren"], ["TRASH", "Künftig automatisch in den Papierkorb"]];
  }
  function ruleFutureCopy(rule) {
    const action = String(rule?.action || "CLASSIFY_ONLY").toUpperCase();
    if (action === "TRASH") return "Zukünftig: passende E-Mails automatisch in den Gmail-Papierkorb";
    if (action === "ARCHIVE") return "Zukünftig: passende E-Mails automatisch archivieren";
    if (action === "PRIORITIZE") return "Zukünftig: passende E-Mails automatisch hervorheben";
    return rule?.classification === "IMPORTANT"
      ? "Zukünftig: nur als wichtig einstufen · nichts verschieben"
      : "Zukünftig: nur als unwichtig einstufen · nichts verschieben";
  }
  function existingActionCopy(rule, count) {
    const action = String(rule?.action || "").toUpperCase();
    if (action === "TRASH") return `${count} bestehende passende E-Mail${count === 1 ? "" : "s"} in den Gmail-Papierkorb verschieben?`;
    if (action === "ARCHIVE") return `${count} bestehende passende E-Mail${count === 1 ? "" : "s"} archivieren?`;
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
      : [["CLASSIFY_ONLY", "Nur unwichtig"], ["ARCHIVE", "Archivieren"], ["TRASH", "Papierkorb"]];
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
    if (["TRASH", "ARCHIVE", "PRIORITIZE"].includes(action)) {
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
  function renderMailboxSidebar(shell) {
    const side = el("aside", "ecp-tb-sidebar");
    const brand = el("div", "ecp-tb-brand"), mark = el("span", "ecp-tb-brandmark", "✉"), brandCopy = el("div");
    brandCopy.append(el("strong", "", "NAHWERK Mail"), el("span", "", "Google · verbunden")); brand.append(mark, brandCopy); side.append(brand);
    const nav = el("nav", "ecp-tb-nav"); nav.setAttribute("aria-label", "E-Mail-Bereiche");
    const folders = [["INBOX","Posteingang","▣"],["IMPORTANT","Wichtig","★"],["UNIMPORTANT","Unwichtig","○"],["MARKETING","Werbung / Spam","⚑"],["REPLY","Antwort nötig","↩"]];
    for (const item of folders) {
      const value=item[0], label=item[1], icon=item[2];
      const b = button("", "ecp-tb-nav-item" + (mailboxFolder === value && readerMode === "MESSAGE" ? " is-active" : ""));
      b.append(el("span","ecp-tb-nav-icon",icon),el("span","ecp-tb-nav-label",label),el("span","ecp-tb-nav-count",String(mailboxFolderCount(value))));
      b.addEventListener("click",()=>{mailboxFolder=value;readerMode="MESSAGE";selectedMessageId="";selectedMessageDetail=null;render();});
      nav.append(b);
    }
    nav.append(el("div","ecp-tb-nav-separator"));
    const utilities = [["DRAFTS","Entwürfe","✎"],["CONCIERGE","Concierge","◇"],["AUTOMATION","Automatik & Schutz","⚙"],["ACTIVITY","Aktivität","≡"]];
    for (const item of utilities) {
      const mode=item[0], label=item[1], icon=item[2];
      const b = button("", "ecp-tb-nav-item" + (readerMode === mode ? " is-active" : ""));
      b.append(el("span","ecp-tb-nav-icon",icon),el("span","ecp-tb-nav-label",label));
      if (mode === "DRAFTS") b.append(el("span","ecp-tb-nav-count",String(mailboxFolderCount("DRAFTS"))));
      b.addEventListener("click",()=>{readerMode=mode;render();}); nav.append(b);
    }
    side.append(nav);
    const foot = el("div","ecp-tb-sidebar-foot");
    foot.append(el("span","","Der Concierge lernt aus Wichtig / Unwichtig."),el("small","","Automatiken werden erst nach deiner Bestätigung aktiv."));
    side.append(foot); shell.append(side);
  }
  function renderMailboxListPane(shell) {
    const pane = el("section","ecp-tb-list-pane"), top = el("div","ecp-tb-list-top"), titleWrap = el("div");
    const rows = mailboxFilteredMessages();
    titleWrap.append(el("strong","",mailboxFolderTitle()),el("span","",String(rows.length)+" angezeigt")); top.append(titleWrap);
    const refresh = button("↻","ecp-tb-icon-button"); refresh.title="Aktualisieren"; refresh.addEventListener("click",()=>void loadDashboard(false,true)); top.append(refresh); pane.append(top);
    const listNode = el("div","ecp-tb-message-list");
    if (!rows.length && classificationLoading) {
      listNode.append(el("div","ecp-tb-empty","E-Mails werden geladen …"));
    } else if (!rows.length && classificationError) {
      const errorBox=el("div","ecp-tb-empty");
      errorBox.append(el("strong","","E-Mails konnten gerade nicht geladen werden."),el("span","","Die Google-Verbindung ist aktiv. Bitte lade die Übersicht erneut."));
      const retry=button("Erneut laden","ecp-tb-toolbar-button");retry.addEventListener("click",()=>{classificationRetryCount=0;void loadClassification();});
      errorBox.append(retry);listNode.append(errorBox);
    } else if (!rows.length) {
      listNode.append(el("div","ecp-tb-empty","Keine passenden E-Mails in dieser Ansicht."));
    } else {
      rows.forEach((message)=>{
        const row=el("article","ecp-tb-message"+(String(message.id)===selectedMessageId&&readerMode==="MESSAGE"?" is-selected":""));
        row.tabIndex=0; row.setAttribute("role","button"); row.setAttribute("aria-label",(text(message.subject,220)||"(kein Betreff)")+" öffnen");
        const header=el("div","ecp-tb-message-head"),sender=el("strong","ecp-tb-sender",text(message.from,220)||"Unbekannter Absender"),date=el("time","ecp-tb-date",fmtDate(message.date));
        header.append(sender,date); row.append(header,el("div","ecp-tb-subject",text(message.subject,300)||"(kein Betreff)"));
        if(message.snippet)row.append(el("div","ecp-tb-snippet",text(message.snippet,260)));
        if(message.needs_reply)row.append(el("span","ecp-tb-reply-flag","Antwort empfohlen"));
        const actions=classificationControls(message); actions.classList.add("ecp-tb-class-actions"); row.append(actions);
        const open=()=>void openMailboxMessage(String(message.id)); row.addEventListener("click",open); row.addEventListener("keydown",(ev)=>{if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();open();}});
        listNode.append(row);
      });
    }
    pane.append(listNode); shell.append(pane);
  }
  function renderMailboxReader(shell) {
    const pane = el("section","ecp-tb-reader");
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
    const detail = selectedMessageDetail;
    if (!detail) {
      const placeholder=el("div","ecp-tb-reader-empty");placeholder.append(el("strong","","E-Mail auswählen"),el("span","","Wähle eine Nachricht aus. Wichtig / Unwichtig legst du direkt in der mittleren Spalte fest."));pane.append(placeholder);shell.append(pane);return;
    }
    const toolbar=el("div","ecp-tb-reader-toolbar");
    const concierge=button("Mit Concierge bearbeiten","ecp-tb-toolbar-button");concierge.addEventListener("click",()=>{readerMode="CONCIERGE";render();});toolbar.append(concierge);pane.append(toolbar);
    const header=el("div","ecp-tb-reader-message-head");
    header.append(el("h3","",text(detail.subject,500)||"(kein Betreff)"),el("div","ecp-tb-reader-from",text(detail.from,300)||"Unbekannter Absender"),el("div","ecp-tb-reader-date",fmtDate(detail.date)));
    pane.append(header,el("div","ecp-tb-reader-body",text(detail.body_text,12000)||"Kein Textinhalt verfügbar."));
    const attachments=list(detail.attachments);if(attachments.length)pane.append(el("div","ecp-tb-attachments",String(attachments.length)+" Anhang"+(attachments.length===1?"":"e")+" · gefährliche Dateitypen werden nicht automatisch geöffnet"));
    shell.append(pane);
  }
  function render() {
    const root = ensureHost(); if (!root) return;
    ensureClassificationStyles();
    root.hidden = !connected; if (!connected) { root.replaceChildren(); return; }
    root.replaceChildren();
    if (!dashboard) { root.append(el("div", "ecp-loading", "Dein E-Mail-Concierge wird geladen …")); return; }
    const workspace = el("section","ecp-thunderbird"); workspace.setAttribute("aria-label","E-Mail-Arbeitsbereich");
    const toolbar = el("div","ecp-tb-toolbar"), left=el("div","ecp-tb-toolbar-title"), searchWrap=el("label","ecp-tb-search");
    left.append(el("strong","","E-Mail"),el("span","","NAHWERK Concierge"));
    const search=el("input","");search.type="search";search.value=mailboxSearch;search.placeholder="Suchen …";search.setAttribute("aria-label","E-Mails durchsuchen");
    search.addEventListener("change",()=>{mailboxSearch=search.value;render();});
    search.addEventListener("keydown",(ev)=>{if(ev.key==="Enter"){ev.preventDefault();mailboxSearch=search.value;render();}});
    searchWrap.append(el("span","","⌕"),search);
    const status=el("span","ecp-tb-live","Aktiv"); toolbar.append(left,searchWrap,status);workspace.append(toolbar);
    const shell=el("div","ecp-tb-shell");renderMailboxSidebar(shell);renderMailboxListPane(shell);renderMailboxReader(shell);workspace.append(shell);root.append(workspace);
  }
  async function loadClassification() {
    if (!connected || classificationLoading) return;
    classificationLoading = true;
    classificationError = "";
    render();
    try {
      const next = normalizeClassification(await request("/email/concierge/classification/summary"));
      if (!next) throw new Error("EMAIL_PROVIDER_UNAVAILABLE");
      classification = next;
      classificationRetryCount = 0;
      if (!selectedMessageId) { const first = mailboxAllMessages()[0]; if (first?.id) setTimeout(()=>void openMailboxMessage(String(first.id)),0); }
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
        const dashboardData = await request("/email/concierge/dashboard");
        dashboard = normalizeDashboard(dashboardData);
        if (!dashboard) throw new Error("EMAIL_PROVIDER_UNAVAILABLE");
        chatStarted = chatStarted || dashboard.chat?.has_user_message === true;
        dashboardLoadedAt = Date.now();
      } catch (error) { showError(error instanceof Error ? error.message : "EMAIL_PROVIDER_UNAVAILABLE"); }
      render();
      if (dashboard) void loadClassification();
      return dashboard;
    })().finally(() => { dashboardLoadPromise = null; });
    return dashboardLoadPromise;
  }
  function canonicalGoogleConnection(rows = globalThis.__nahwerkEmailConnections) {
    if (!Array.isArray(rows)) return null;
    return rows.some((row) => String(row?.provider || "").toUpperCase() === "GOOGLE" && String(row?.state || row?.status || "").toUpperCase() === "CONNECTED");
  }
  async function setConnectionState(isConnected) {
    const canonical = canonicalGoogleConnection();
    connected = canonical === null ? isConnected === true : canonical;
    ensureHost();
    if (!connected) { dashboard = null; dashboardLoadedAt = 0; classification = null; classificationError = ""; classificationRetryCount = 0; chatMessages = []; chatStarted = false; render(); return; }
    await loadDashboard();
  }
  window.addEventListener("nahwerk:email-connections-updated", (event) => {
    const rows = Array.isArray(event.detail?.connections) ? event.detail.connections : globalThis.__nahwerkEmailConnections;
    const canonical = canonicalGoogleConnection(rows);
    if (canonical !== null) void setConnectionState(canonical);
  });
  globalThis.NAHWERKEmailConciergeProduct = Object.freeze({
    setConnectionState,
    refresh() { return loadDashboard(false, true); }
  });
  ensureHost();
  window.dispatchEvent(new CustomEvent("nahwerk:email-concierge-product-ready"));
})();