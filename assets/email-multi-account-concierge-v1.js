(() => {
  "use strict";

  const BASE = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-email-runtime";
  const SESSION_KEY = "scb_web_session";
  let host = null;
  let accounts = [];
  let busy = false;
  let lastResult = null;

  function token() {
    try { return String(JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null")?.session_token || ""); }
    catch { return ""; }
  }
  async function api(path, options = {}) {
    const session = token();
    if (!session) throw new Error("UNAUTHENTICATED");
    const headers = { Authorization: `Bearer ${session}`, ...(options.headers || {}) };
    if (options.body != null) headers["Content-Type"] = "application/json";
    const response = await fetch(BASE + path, { ...options, headers, credentials: "omit" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.ok === false) throw new Error(String(data?.error?.code || data?.error || "EMAIL_REQUEST_FAILED"));
    return data;
  }
  function esc(value) { return String(value ?? "").replace(/[&<>"']/g, (ch) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch])); }
  function accountLabel(account) { return `${account.provider_label || account.provider || "E-Mail"} · ${account.account_display_hint || "Konto"}`; }
  function connected() { return accounts.filter((a) => String(a.state || "").toUpperCase() === "CONNECTED"); }
  function selectedId() { return String(host?.querySelector("#emailMultiAccountScope")?.value || "ALL"); }
  function setBusy(value) {
    busy = value;
    host?.querySelectorAll("button,input,select").forEach((node) => { node.disabled = value; });
  }

  function ensureHost() {
    if (host?.isConnected) return host;
    const accountRoot = document.getElementById("accountEmailCard");
    if (!accountRoot) return null;
    host = document.getElementById("emailMultiAccountConcierge");
    if (!host) {
      host = document.createElement("section");
      host.id = "emailMultiAccountConcierge";
      host.className = "email-multi-account-concierge";
      host.setAttribute("aria-label", "Alle E-Mail-Postfächer");
      host.hidden = true;
      const shell = document.getElementById("emailLogoConnectShell");
      (shell?.parentElement || accountRoot).insertBefore(host, shell?.nextSibling || null);
    }
    return host;
  }

  function renderShell() {
    if (!ensureHost()) return;
    const rows = connected();
    host.hidden = rows.length === 0;
    if (!rows.length) { host.innerHTML = ""; return; }
    const current = selectedId();
    const options = [`<option value="ALL">Alle Postfächer (${rows.length})</option>`, ...rows.map((a) => `<option value="${esc(a.connection_id)}">${esc(accountLabel(a))}</option>`)].join("");
    host.innerHTML = `<div class="email-multi-account-head"><div><div class="eyebrow">E-Mail-Concierge</div><h4>Alle Postfächer im Blick.</h4><p>Durchsuche alle verbundenen E-Mail-Konten gemeinsam oder wähle gezielt ein einzelnes Postfach.</p></div><span class="email-multi-account-count">${rows.length} Konto${rows.length === 1 ? "" : "en"}</span></div>
      <div class="email-multi-account-toolbar"><label class="email-multi-account-field"><span>Postfach</span><select id="emailMultiAccountScope">${options}</select></label><div class="email-multi-account-query"><input id="emailMultiAccountQuery" type="text" maxlength="5000" autocomplete="off" placeholder="z. B. Welche Rechnungen kamen diese Woche?" aria-label="E-Mail-Concierge fragen"><button id="emailMultiAccountSearch" type="button">Suchen</button></div></div>
      <p class="email-multi-account-scope-note">Alle Postfächer können gemeinsam gelesen und durchsucht werden. Antworten, Entwürfe und Versand bleiben immer an ein konkretes Konto gebunden und Versand braucht weiterhin deine Freigabe.</p>
      <div class="email-multi-account-answer" id="emailMultiAccountAnswer" hidden aria-live="polite"></div>
      <div class="email-multi-account-results" id="emailMultiAccountResults"></div>
      <div id="emailMultiAccountDetail"></div>`;
    const scope = host.querySelector("#emailMultiAccountScope");
    if (scope && rows.some((a) => String(a.connection_id) === current)) scope.value = current;
    host.querySelector("#emailMultiAccountSearch")?.addEventListener("click", () => void runQuery());
    host.querySelector("#emailMultiAccountQuery")?.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); void runQuery(); } });
    if (lastResult) renderResult(lastResult);
  }

  function resultSource(message) {
    const account = accounts.find((a) => String(a.connection_id) === String(message.connection_id));
    return [message.provider_label || account?.provider_label || message.provider || account?.provider, message.account_display_hint || account?.account_display_hint].filter(Boolean).join(" · ");
  }

  function renderResult(data) {
    if (!host) return;
    lastResult = data;
    const answer = host.querySelector("#emailMultiAccountAnswer");
    const results = host.querySelector("#emailMultiAccountResults");
    const detail = host.querySelector("#emailMultiAccountDetail");
    if (detail) detail.innerHTML = "";
    if (answer) {
      answer.hidden = !data?.message;
      answer.textContent = String(data?.message || "");
    }
    if (!results) return;
    const messages = Array.isArray(data?.messages) ? data.messages : [];
    if (!messages.length) {
      results.innerHTML = data?.type === "NEEDS_ACCOUNT_SELECTION" ? '<div class="email-multi-account-empty">Wähle oben das gewünschte Postfach und stelle die Anfrage noch einmal. So bleibt die Aktion sicher dem richtigen Konto zugeordnet.</div>' : "";
      if (data?.type === "NEEDS_ACCOUNT_SELECTION") host.querySelector("#emailMultiAccountScope")?.focus?.();
      renderDraft(data?.draft, data?.connection_id || selectedId());
      return;
    }
    results.innerHTML = messages.map((m, index) => `<button class="email-multi-account-message" type="button" data-message-index="${index}"><span><strong>${esc(m.subject || "(kein Betreff)")}</strong><small>${esc(m.from || "")}${m.date ? ` · ${esc(new Date(m.date).toLocaleString("de-DE", {day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}))}` : ""}</small></span><span class="email-multi-account-source">${esc(resultSource(m) || "Postfach")}</span><span class="email-multi-account-snippet">${esc(m.snippet || "")}</span></button>`).join("");
    results.querySelectorAll("[data-message-index]").forEach((button) => button.addEventListener("click", () => {
      const message = messages[Number(button.dataset.messageIndex || -1)];
      if (message) void openMessage(message);
    }));
    renderDraft(data?.draft, data?.connection_id || selectedId());
  }

  function renderDraft(draft, connectionId) {
    if (!host || !draft) return;
    const results = host.querySelector("#emailMultiAccountResults");
    if (!results) return;
    const wrap = document.createElement("div");
    wrap.className = "email-multi-account-detail";
    wrap.innerHTML = `<h5>Antwortentwurf</h5><div class="email-multi-account-detail-meta">${esc(draft.to ? `An ${draft.to}` : "Empfänger aus der ursprünglichen E-Mail")} · ${esc(draft.subject || "(kein Betreff)")}</div><div class="email-multi-account-detail-body">${esc(draft.body_text || "")}</div>`;
    if (draft.approval_id && draft.send_action_id && draft.email_send_action_id && connectionId && connectionId !== "ALL") {
      const send = document.createElement("button");
      send.type = "button";
      send.className = "email-provider-add-account";
      send.textContent = "Freigeben & senden";
      send.addEventListener("click", () => void approveDraft(connectionId, draft, send));
      wrap.appendChild(send);
    }
    results.appendChild(wrap);
  }

  async function runQuery() {
    if (busy || !host) return;
    const input = host.querySelector("#emailMultiAccountQuery");
    const text = String(input?.value || "").trim();
    if (!text) return;
    const connectionId = selectedId();
    setBusy(true);
    try {
      const path = connectionId === "ALL" ? "/email/concierge/query-all" : "/email/concierge/query";
      const body = { text, request_id: crypto.randomUUID() };
      if (connectionId !== "ALL") body.connection_id = connectionId;
      const data = await api(path, { method: "POST", body: JSON.stringify(body) });
      if (connectionId !== "ALL" && Array.isArray(data?.messages)) {
        const account = accounts.find((a) => String(a.connection_id) === connectionId);
        data.messages = data.messages.map((m) => ({ ...m, connection_id: connectionId, provider_label: data.provider_label || account?.provider_label, account_display_hint: data.account_display_hint || account?.account_display_hint }));
      }
      data.connection_id = data.connection_id || (connectionId !== "ALL" ? connectionId : null);
      renderResult(data);
    } catch (error) {
      renderResult({ type: "ERROR", message: error instanceof Error && error.message === "UNAUTHENTICATED" ? "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an." : "Der E-Mail-Concierge konnte die Anfrage gerade nicht ausführen. Bitte versuche es erneut.", messages: [] });
    } finally { setBusy(false); }
  }

  async function openMessage(message) {
    if (busy || !host) return;
    const connectionId = String(message.connection_id || selectedId());
    if (!connectionId || connectionId === "ALL" || !message.id) return;
    setBusy(true);
    try {
      const data = await api("/email/concierge/messages/open", { method: "POST", body: JSON.stringify({ connection_id: connectionId, message_id: String(message.id) }) });
      const detail = host.querySelector("#emailMultiAccountDetail");
      if (!detail) return;
      const m = data?.message || {};
      const source = resultSource({ ...message, provider_label: data.provider_label || message.provider_label, account_display_hint: data.account_display_hint || message.account_display_hint });
      detail.innerHTML = `<section class="email-multi-account-detail"><h5>${esc(m.subject || message.subject || "(kein Betreff)")}</h5><div class="email-multi-account-detail-meta">${esc(m.from || message.from || "")}${source ? ` · ${esc(source)}` : ""}</div><div class="email-multi-account-detail-body">${esc(m.body_text || "Kein Textinhalt verfügbar.")}</div></section>`;
      detail.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch {
      const detail = host.querySelector("#emailMultiAccountDetail");
      if (detail) detail.innerHTML = '<div class="email-multi-account-empty">Diese E-Mail konnte gerade nicht geöffnet werden.</div>';
    } finally { setBusy(false); }
  }

  async function approveDraft(connectionId, draft, button) {
    if (busy || !connectionId || !draft?.approval_id || !draft?.send_action_id) return;
    const ok = window.confirm(`Diese E-Mail jetzt wirklich senden?\n\nAn: ${draft.to || "Empfänger der ursprünglichen E-Mail"}\nBetreff: ${draft.subject || "(kein Betreff)"}\n\nErst mit „OK“ gibst du den Versand ausdrücklich frei.`);
    if (!ok) return;
    setBusy(true);
    try {
      const data = await api("/email/concierge/drafts/approve-send", { method: "POST", body: JSON.stringify({ connection_id: connectionId, email_send_action_id: draft.email_send_action_id, approval_id: draft.approval_id, send_action_id: draft.send_action_id }) });
      renderResult({ type: "SENT", message: data?.message || "Die E-Mail wurde nach deiner Freigabe gesendet.", messages: [] });
    } catch {
      renderResult({ type: "ERROR", message: "Die Freigabe konnte gerade nicht ausgeführt werden. Es wurde nichts automatisch erneut gesendet.", messages: [] });
    } finally { setBusy(false); if (button) button.disabled = false; }
  }

  async function refreshOverview() {
    if (!ensureHost()) return;
    try {
      const data = await api("/email/concierge/accounts-overview");
      accounts = Array.isArray(data?.accounts) ? data.accounts : [];
      renderShell();
    } catch {
      const fallback = eventConnections();
      if (fallback.length) { accounts = fallback; renderShell(); }
    }
  }

  function eventConnections() {
    try {
      const raw = window.__nahwerkEmailConnections;
      return Array.isArray(raw) ? raw : [];
    } catch { return []; }
  }

  window.addEventListener("nahwerk:email-connections-updated", (event) => {
    const rows = Array.isArray(event?.detail?.connections) ? event.detail.connections : [];
    window.__nahwerkEmailConnections = rows;
    if (rows.length) { accounts = rows.map((a) => ({ ...a, provider_id: String(a.provider || "").toLowerCase(), provider_label: a.provider_label || String(a.provider || "E-Mail") })); renderShell(); }
    void refreshOverview();
  });

  function boot(attempt = 0) {
    if (ensureHost()) { void refreshOverview(); return; }
    if (attempt < 20) setTimeout(() => boot(attempt + 1), 150);
  }
  boot();
})();
