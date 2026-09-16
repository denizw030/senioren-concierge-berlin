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
    ACTIVITY_DIGEST: ["Aktivitätsübersicht", "Zeigt kompakt, was dein E-Mail-Concierge für dich erledigt hat."]
  });
  const QUICK = [
    "Zeig mir wichtige neue E-Mails.",
    "Zeig mir ungelesene E-Mails.",
    "Welche Rechnungen habe ich diese Woche bekommen?",
    "Welche E-Mails brauchen wahrscheinlich eine Antwort?"
  ];
  const ERROR_COPY = Object.freeze({
    UNAUTHENTICATED: "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.",
    EMAIL_CONNECTION_NOT_CONNECTED: "Gmail ist nicht verbunden.",
    EMAIL_PROVIDER_UNAVAILABLE: "Der E-Mail-Concierge ist gerade nicht erreichbar.",
    EMAIL_QUERY_INVALID: "Diese Anfrage konnte nicht verarbeitet werden.",
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
      channels: data.channels && typeof data.channels === "object" ? data.channels : {}
    };
  }
  function errorCode(data, fallback = "EMAIL_PROVIDER_UNAVAILABLE") {
    return String(data?.error?.code || data?.error || fallback);
  }
  globalThis.NAHWERKEmailConciergeProductTestHooks = Object.freeze({ BASE, SETTINGS, QUICK, normalizeDashboard, errorCode });

  if (typeof document === "undefined") return;
  let connected = false;
  let host = null;
  let dashboard = null;
  let busy = false;
  let chatMessages = [];
  let activityExpanded = false;

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
      accountRoot.appendChild(host);
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
  function stat(value, label) {
    const box = el("div", "ecp-stat"); box.append(el("strong", "", String(value)), el("span", "", label)); return box;
  }
  function sectionCard(title, intro = "") {
    const card = el("section", "ecp-card");
    const head = el("div", "ecp-card-head"), titleWrap = el("div");
    titleWrap.append(el("h3", "", title)); if (intro) titleWrap.append(el("p", "ecp-card-intro", intro)); head.append(titleWrap); card.append(head);
    return { card, head };
  }
  function badge(label, warning = false) { return el("span", "ecp-badge" + (warning ? " ecp-badge-warning" : ""), label); }
  function messageCard(message, allowOpen = true) {
    const row = el("article", "ecp-mail"), main = el("div", "ecp-mail-main");
    main.append(el("span", "ecp-mail-title", text(message.subject, 300) || "(kein Betreff)"));
    main.append(el("span", "ecp-mail-meta", [text(message.from, 220), fmtDate(message.date)].filter(Boolean).join(" · ")));
    if (message.snippet) main.append(el("p", "ecp-mail-snippet", text(message.snippet, 500)));
    const badges = el("div", "ecp-badges");
    if (message.unread) badges.append(badge("Ungelesen"));
    if (message.needs_reply) badges.append(badge("Antwort empfohlen"));
    if (message.amount) badges.append(badge(String(message.amount)));
    if (message.risk?.level && message.risk.level !== "low") badges.append(badge("Auffällig", true));
    list(message.categories).slice(0, 3).forEach((category) => badges.append(badge(String(category).replaceAll("_", " ").toLowerCase())));
    if (badges.childElementCount) main.append(badges);
    row.append(main);
    if (allowOpen && message.id) {
      const open = button("Öffnen", "ecp-open"); open.dataset.messageId = String(message.id); open.addEventListener("click", () => openMessage(String(message.id), row)); row.append(open);
    }
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
      const attachments = list(data.message?.attachments); if (attachments.length) detail.append(el("p", "ecp-footer-note", `${attachments.length} Anhang${attachments.length === 1 ? "" : "e"} erkannt. Gefährliche Dateitypen werden nicht automatisch geöffnet.`));
      afterNode.insertAdjacentElement("afterend", detail);
    } catch (error) { showError(error instanceof Error ? error.message : "EMAIL_PROVIDER_UNAVAILABLE"); }
    finally { setBusy(false); }
  }
  function renderChat(card) {
    const log = el("div", "ecp-chat-log"); log.id = "emailConciergeChatLog"; log.setAttribute("aria-live", "polite");
    if (!chatMessages.length) log.append(el("div", "ecp-chat-empty", "Frag deinen E-Mail-Concierge in normaler Sprache. Er kann deine E-Mails suchen, öffnen und Antwortentwürfe vorbereiten."));
    for (const entry of chatMessages) {
      const msg = el("div", `ecp-msg ecp-msg-${entry.role}${entry.error ? " ecp-msg-error" : ""}`, entry.text);
      log.append(msg);
      for (const mail of list(entry.messages)) log.append(messageCard(mail));
    }
    const quick = el("div", "ecp-quick");
    QUICK.forEach((label) => { const chip = button(label, "ecp-chip"); chip.addEventListener("click", () => runQuery(label)); quick.append(chip); });
    const form = el("form", "ecp-chat-form"), input = el("input", "ecp-chat-input"), send = button("Senden", "ecp-primary");
    input.type = "text"; input.name = "emailConciergeQuery"; input.maxLength = 5000; input.autocomplete = "off"; input.placeholder = "z. B. Such die letzte Mail von OpenAI"; input.setAttribute("aria-label", "E-Mail-Concierge fragen"); send.type = "submit";
    form.addEventListener("submit", (event) => { event.preventDefault(); const value = input.value.trim(); if (!value) return; input.value = ""; runQuery(value); });
    form.append(input, send); card.append(log, quick, form);
  }
  async function runQuery(query) {
    if (busy || !query) return;
    chatMessages.push({ role: "user", text: query }); render(); setBusy(true);
    try {
      const data = await request("/email/concierge/query", { method: "POST", body: { text: query, request_id: crypto.randomUUID() } });
      chatMessages.push({ role: "assistant", text: text(data.message, 2500) || "Erledigt.", messages: list(data.messages) });
      await loadDashboard(false);
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
    const rows = list(dashboard.highlights);
    if (!rows.length) { card.append(el("div", "ecp-section-empty", "Keine wichtigen Nachrichten in der aktuellen Übersicht.")); return; }
    const listNode = el("div", "ecp-list"); rows.forEach((row) => listNode.append(messageCard(row))); card.append(listNode);
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
  function renderSettings(card) {
    const current = dashboard.settings || {};
    Object.entries(SETTINGS).forEach(([key, meta]) => {
      const row = el("label", "ecp-setting"), copy = el("span"); copy.append(el("strong", "", meta[0]), el("small", "", meta[1]));
      const toggle = el("span", "ecp-switch"), input = el("input"); input.type = "checkbox"; input.checked = current[key] === true; input.setAttribute("aria-label", meta[0]); toggle.append(input, el("span"));
      input.addEventListener("change", async () => {
        const desired = input.checked; input.disabled = true;
        try { const data = await request("/email/concierge/settings", { method: "POST", body: { settings: { [key]: desired } } }); dashboard.settings = data.settings || dashboard.settings; }
        catch (error) { input.checked = !desired; showError(error instanceof Error ? error.message : "EMAIL_PROVIDER_UNAVAILABLE"); }
        finally { input.disabled = false; render(); }
      });
      row.append(copy, toggle); card.append(row);
    });
    card.append(el("p", "ecp-footer-note", "Diese Einstellungen steuern, was dein E-Mail-Concierge hervorhebt und protokolliert. Nachrichten werden nicht allein wegen Spam- oder Betrugsverdacht gelöscht. E-Mails werden nur nach deiner ausdrücklichen Freigabe gesendet."));
  }
  function render() {
    const root = ensureHost(); if (!root) return;
    root.hidden = !connected; if (!connected) { root.replaceChildren(); return; }
    root.replaceChildren();
    if (!dashboard) { root.append(el("div", "ecp-loading", "Dein E-Mail-Concierge wird geladen …")); return; }
    const head = el("div", "ecp-head"), copy = el("div"); copy.append(el("p", "ecp-eyebrow", "E-Mail-Concierge"), el("h2", "ecp-title", "Deine E-Mails. Von NAHWERK im Blick behalten."), el("p", "ecp-subtitle", "Suchen, verstehen, schützen und Antworten vorbereiten – direkt in deinem Kundenkonto. Du entscheidest, was aktiv ist und was gesendet wird.")); head.append(copy, el("div", "ecp-status", "Aktiv")); root.append(head);
    const s = dashboard.summary, summary = el("div", "ecp-summary"); summary.append(stat(s.important, "Wichtig"), stat(s.unread, "Ungelesen"), stat(s.today, "Heute"), stat(s.needs_reply, "Antwort empfohlen"), stat(s.invoices, "Rechnungen")); root.append(summary);
    if (s.text) root.append(el("p", "ecp-digest", s.text));
    const layout = el("div", "ecp-layout"), main = el("div", "ecp-stack"), side = el("div", "ecp-stack");
    let c = sectionCard("Mein E-Mail-Concierge", "Frag einfach, was du über deine E-Mails wissen oder vorbereiten möchtest."); renderChat(c.card); main.append(c.card);
    c = sectionCard("Wichtige E-Mails", "Keine vollständige Mailbox – nur das, was wahrscheinlich relevant ist."); renderHighlights(c.card); main.append(c.card);
    c = sectionCard("Von NAHWERK vorbereitet", "Entwürfe werden niemals ohne deine ausdrückliche Freigabe gesendet."); renderDrafts(c.card); main.append(c.card);
    c = sectionCard("Spam- & Betrugsschutz", "Ruhiger Schutz im Hintergrund – ohne automatisches Löschen."); renderProtection(c.card); side.append(c.card);
    c = sectionCard("Hinweise", "Nur Dinge, bei denen sich ein Blick wahrscheinlich lohnt."); renderHints(c.card); side.append(c.card);
    c = sectionCard("Was dein E-Mail-Concierge erledigt hat", "Kompakt statt einer technischen Ereignisliste."); renderActivities(c.card, c.head); side.append(c.card);
    c = sectionCard("Deine Kanäle", "Der E-Mail-Concierge funktioniert eigenständig im Web. Weitere Zugänge sind optional."); renderChannels(c.card); side.append(c.card);
    c = sectionCard("Automatik & Schutz", "Du bestimmst, was NAHWERK für dich hervorhebt."); renderSettings(c.card); side.append(c.card);
    layout.append(main, side); root.append(layout);
  }
  async function loadDashboard(showLoading = true) {
    if (!connected || busy) return;
    if (showLoading) { dashboard = null; render(); }
    try { dashboard = normalizeDashboard(await request("/email/concierge/dashboard")); if (!dashboard) throw new Error("EMAIL_PROVIDER_UNAVAILABLE"); }
    catch (error) { showError(error instanceof Error ? error.message : "EMAIL_PROVIDER_UNAVAILABLE"); }
    render();
  }
  async function setConnectionState(isConnected) {
    connected = isConnected === true;
    ensureHost();
    if (!connected) { dashboard = null; chatMessages = []; render(); return; }
    await loadDashboard();
  }
  globalThis.NAHWERKEmailConciergeProduct = Object.freeze({
    setConnectionState,
    refresh() { return loadDashboard(false); }
  });
  ensureHost();
  window.dispatchEvent(new CustomEvent("nahwerk:email-concierge-product-ready"));
})();