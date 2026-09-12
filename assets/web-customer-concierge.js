(() => {
  "use strict";
  const SESSION_KEY = "scb_web_session";
  const CORE_CONTRACT_VERSION = "core-v1";
  const RESPONSE_STATES = new Set(["ANSWER","QUESTION","ACTION_STARTED","ACTION_PENDING","ACTION_RESULT","ERROR_RESPONSE","HANDOFF","SAFE_TERMINATION"]);

  function sessionToken() {
    try { return String(JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null")?.session_token || ""); }
    catch { return ""; }
  }

  function configuredEndpoint() {
    const raw = String(window.NAHWERK_WEB_CONCIERGE_PROD_ENDPOINT || "").trim();
    if (!raw) return null;
    try {
      const url = new URL(raw);
      if (url.protocol !== "https:") return null;
      if (url.hostname !== "djicahhmnnamtjuqedqd.supabase.co") return null;
      if (!url.pathname.startsWith("/functions/v1/")) return null;
      if (/staging|shadow/i.test(url.href)) return null;
      return url.href;
    } catch { return null; }
  }

  function normalizeCoreV1Response(raw) {
    if (!raw || typeof raw !== "object" || raw.contract_version !== CORE_CONTRACT_VERSION) return null;
    const responseState = String(raw.response_state || "").toUpperCase();
    if (!RESPONSE_STATES.has(responseState)) return null;
    const messages = Array.isArray(raw.messages)
      ? raw.messages.filter((item) => item?.type === "text" && typeof item?.text === "string" && item.text.trim()).map((item) => ({
          type: "text",
          text: item.text.trim(),
          semantic_role: String(item.semantic_role || "core")
        }))
      : [];
    const delivery = raw.delivery_hints && typeof raw.delivery_hints === "object" ? raw.delivery_hints : {};
    const authoritative = delivery.shadow === false && delivery.deliver === true && String(delivery.channel || "").toUpperCase() === "WEB";
    return {
      response_id: String(raw.response_id || ""),
      conversation_id: String(raw.conversation_id || ""),
      turn_id: String(raw.turn_id || ""),
      active_task_id: raw.active_task_id ? String(raw.active_task_id) : null,
      response_state: responseState,
      messages,
      pending_approval: raw.pending_approval && typeof raw.pending_approval === "object" ? raw.pending_approval : null,
      action_refs: Array.isArray(raw.action_refs) ? raw.action_refs : [],
      error: raw.error && typeof raw.error === "object" ? raw.error : null,
      state_version: Number(raw.state_version || 0),
      correlation_id: String(raw.correlation_id || ""),
      authoritative
    };
  }

  function clearNode(node) {
    while (node?.firstChild) node.removeChild(node.firstChild);
  }

  function renderCoreV1Response(raw) {
    const response = normalizeCoreV1Response(raw);
    const log = document.getElementById("webConciergeLog");
    if (!response || !log) return false;
    if (!response.authoritative) return false;

    clearNode(log);
    const summary = document.createElement("div");
    summary.className = "web-concierge-core-state";
    summary.textContent = `Core: ${response.response_state}${response.active_task_id ? " · Aufgabe aktiv" : ""}`;
    log.appendChild(summary);

    for (const message of response.messages) {
      const item = document.createElement("div");
      item.className = "web-concierge-message web-concierge-message-core";
      item.textContent = message.text;
      log.appendChild(item);
    }

    if (response.pending_approval) {
      const approval = document.createElement("div");
      approval.className = "web-concierge-runtime-card";
      const title = document.createElement("strong");
      title.textContent = "Freigabe erforderlich";
      const text = document.createElement("span");
      text.textContent = "Die Freigabe bleibt an die vom Core gelieferte offene Aktion gebunden. Die Website erzeugt keine eigene Approval-Logik.";
      approval.append(title, text);
      log.appendChild(approval);
    }

    if (response.action_refs.length) {
      const actions = document.createElement("div");
      actions.className = "web-concierge-runtime-card";
      const title = document.createElement("strong");
      title.textContent = "Auftragsstatus";
      const text = document.createElement("span");
      text.textContent = `${response.action_refs.length} Core-Aktion${response.action_refs.length === 1 ? "" : "en"} im aktuellen Zustand.`;
      actions.append(title, text);
      log.appendChild(actions);
    }

    if (response.error) {
      const error = document.createElement("div");
      error.className = "web-concierge-runtime-card is-error";
      const title = document.createElement("strong");
      title.textContent = "Auftrag nicht abgeschlossen";
      const text = document.createElement("span");
      text.textContent = String(response.error.customer_safe_message || "Der Core hat einen Fehlerzustand gemeldet.");
      error.append(title, text);
      log.appendChild(error);
    }
    return true;
  }

  async function boot() {
    const valid = window.SCBAuth?.validateSession
      ? await window.SCBAuth.validateSession().catch(() => false)
      : Boolean(sessionToken());
    if (!valid) { location.replace("anmelden.html"); return; }

    const status = document.getElementById("webConciergeStatus");
    const title = document.getElementById("webConciergeStateTitle");
    const meta = document.getElementById("webConciergeStateMeta");
    const input = document.getElementById("webConciergeInput");
    const send = document.getElementById("webConciergeSend");
    const endpoint = configuredEndpoint();

    status.textContent = endpoint ? "PROD-Gateway konfiguriert" : "Shared Gateway fehlt";
    title.textContent = endpoint ? "Web-Concierge wartet auf den veröffentlichten Client-Vertrag" : "Web-Concierge noch nicht verfügbar";
    meta.textContent = endpoint
      ? "Die Website kann die autoritative Core-v1-Ausgabe bereits sicher darstellen. Senden bleibt gesperrt, bis der browserfähige PROD-Gateway seinen verbindlichen Request-Vertrag veröffentlicht."
      : "Die Website ist für die autoritative Core-v1-Ausgabe vorbereitet. Es fehlt noch der browserfähige PROD-Gateway, der deine Web-Sitzung serverseitig auf die kanonische Kundenidentität abbildet und den zentralen Core aufruft.";

    // Absichtlich fail-closed: Die exakte Response-Struktur des aktiven Core v1
    // ist bereits renderbar. Der Browser erfindet aber weder Gateway-Request,
    // Identitätsauflösung noch Approval-/Action-Semantik. Bis der veröffentlichte
    // Gateway-Vertrag existiert, gibt es hier keinen Netzwerkcall.
    input.disabled = true;
    send.disabled = true;
  }

  window.NAHWERKWebCustomerConciergeTestHooks = Object.freeze({
    configuredEndpoint,
    sessionToken,
    normalizeCoreV1Response,
    renderCoreV1Response,
    CORE_CONTRACT_VERSION
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
