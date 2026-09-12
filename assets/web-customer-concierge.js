(() => {
  "use strict";

  const SESSION_KEY = "scb_web_session";
  const CORE_CONTRACT_VERSION = "core-v1";
  const GATEWAY_CONTRACT_VERSION = "web-concierge-gateway-v1";
  const GATEWAY_ENDPOINT = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/web-concierge-gateway";
  const RESPONSE_STATES = new Set(["ANSWER","QUESTION","ACTION_STARTED","ACTION_PENDING","ACTION_RESULT","ERROR_RESPONSE","HANDOFF","SAFE_TERMINATION"]);
  const POLLABLE_STATES = new Set(["ACTION_STARTED","ACTION_PENDING"]);

  let gatewayReady = false;
  let lastResponse = null;
  let pollTimer = null;
  let pollCount = 0;

  function sessionToken() {
    try { return String(JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null")?.session_token || ""); }
    catch { return ""; }
  }

  function configuredEndpoint() {
    try {
      const url = new URL(GATEWAY_ENDPOINT);
      if (url.protocol !== "https:") return null;
      if (url.hostname !== "djicahhmnnamtjuqedqd.supabase.co") return null;
      if (url.pathname !== "/functions/v1/web-concierge-gateway") return null;
      if (/staging|shadow/i.test(url.href)) return null;
      return url.href;
    } catch { return null; }
  }

  function normalizeGatewayReadiness(raw) {
    if (!raw || typeof raw !== "object") return null;
    const ready = raw.ok === true && raw.contract_version === GATEWAY_CONTRACT_VERSION && raw.core_contract_version === CORE_CONTRACT_VERSION && String(raw.channel || "").toUpperCase() === "WEB" && raw.authoritative === true && raw.cao_authoritative === true && raw.shadow === false;
    return Object.freeze({
      contract_version: String(raw.contract_version || ""),
      core_contract_version: String(raw.core_contract_version || ""),
      channel: String(raw.channel || "").toUpperCase(),
      authoritative: raw.authoritative === true,
      cao_authoritative: raw.cao_authoritative === true,
      shadow: raw.shadow === true,
      ready
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
      response_id:String(raw.response_id || ""),
      conversation_id:String(raw.conversation_id || ""),
      turn_id:String(raw.turn_id || ""),
      active_task_id:raw.active_task_id ? String(raw.active_task_id) : null,
      response_state:responseState,
      messages,
      pending_approval:raw.pending_approval && typeof raw.pending_approval === "object" ? raw.pending_approval : null,
      action_refs:Array.isArray(raw.action_refs) ? raw.action_refs : [],
      error:raw.error && typeof raw.error === "object" ? raw.error : null,
      state_version:Number(raw.state_version || 0),
      correlation_id:String(raw.correlation_id || ""),
      authoritative
    };
  }

  function clearNode(node) { while (node?.firstChild) node.removeChild(node.firstChild); }

  function addRuntimeCard(log, titleText, bodyText, className = "") {
    const card = document.createElement("div");
    card.className = `web-concierge-runtime-card${className ? ` ${className}` : ""}`;
    const title = document.createElement("strong");
    title.textContent = titleText;
    const text = document.createElement("span");
    text.textContent = bodyText;
    card.append(title,text);
    log.appendChild(card);
    return card;
  }

  function validUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
  }

  function paygQuoteIdOf(pending) {
    const values = [pending?.payg_quote_id,pending?.metadata?.payg_quote_id];
    return values.map((v) => String(v || "")).find(validUuid) || null;
  }

  function renderApproval(log, pending) {
    const approvalId = String(pending?.approval_id || "");
    if (!validUuid(approvalId)) {
      addRuntimeCard(log,"Freigabe erforderlich","Der Core meldet eine Freigabe ohne gültige Approval-Bindung. Die Website führt nichts aus.","is-error");
      return;
    }
    const card = addRuntimeCard(log,"Freigabe erforderlich",String(pending?.prompt_text || pending?.message || "Der Core wartet auf deine gebundene Freigabe."));
    const actions = document.createElement("div");
    actions.className = "web-concierge-approval-actions";
    const quoteId = paygQuoteIdOf(pending);
    if (quoteId) {
      const link = document.createElement("a");
      link.className = "btn red";
      link.href = `payg.html#quote-${encodeURIComponent(quoteId)}`;
      link.textContent = "Preis prüfen und freigeben";
      actions.appendChild(link);
    } else {
      for (const [decision,label,klass] of [["APPROVE","Freigeben","btn red"],["DENY","Ablehnen","btn light"]]) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = klass;
        button.dataset.webApproval = decision;
        button.dataset.approvalId = approvalId;
        button.textContent = label;
        actions.appendChild(button);
      }
    }
    card.appendChild(actions);
  }

  function renderCoreV1Response(raw) {
    const response = normalizeCoreV1Response(raw);
    const log = document.getElementById("webConciergeLog");
    if (!response || !log || !response.authoritative) return false;
    lastResponse = response;
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
    if (response.pending_approval) renderApproval(log,response.pending_approval);
    if (response.action_refs.length) addRuntimeCard(log,"Auftragsstatus",`${response.action_refs.length} Core-Aktion${response.action_refs.length === 1 ? "" : "en"} im autoritativen Zustand.`);
    if (response.error) addRuntimeCard(log,"Auftrag nicht abgeschlossen",String(response.error.customer_safe_message || "Der Core hat einen Fehlerzustand gemeldet."),"is-error");
    return true;
  }

  async function gateway(action,payload = {}) {
    const token = sessionToken();
    const endpoint = configuredEndpoint();
    if (!token || !endpoint) throw new Error("gateway_not_ready");
    const response = await fetch(endpoint,{
      method:"POST",
      headers:{ "Authorization":`Bearer ${token}`, "Content-Type":"application/json" },
      body:JSON.stringify({ action,...payload }),
      cache:"no-store",
      credentials:"omit"
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body?.ok === false) throw new Error(String(body?.status || `http_${response.status}`));
    return body;
  }

  function setComposerReady(ready) {
    const input = document.getElementById("webConciergeInput");
    const send = document.getElementById("webConciergeSend");
    if (input) { input.disabled = !ready; input.setAttribute("aria-disabled",ready ? "false" : "true"); }
    if (send) send.disabled = !ready;
  }

  function customerError(message) {
    const log = document.getElementById("webConciergeLog");
    if (log) addRuntimeCard(log,"Web Concierge nicht verfügbar",message,"is-error");
  }

  function scheduleSync() {
    clearTimeout(pollTimer);
    if (!lastResponse?.conversation_id || !POLLABLE_STATES.has(lastResponse.response_state) || pollCount >= 15) return;
    pollTimer = setTimeout(async () => {
      try {
        pollCount += 1;
        const response = await gateway("sync",{ conversation_id:lastResponse.conversation_id });
        if (renderCoreV1Response(response)) scheduleSync();
      } catch {}
    },2000);
  }

  async function sendTurn() {
    const input = document.getElementById("webConciergeInput");
    if (!(input instanceof HTMLTextAreaElement) || !gatewayReady) return;
    const content = input.value.trim();
    if (!content || content.length > 4000) return;
    setComposerReady(false);
    try {
      const response = await gateway("turn",{ source_message_id:crypto.randomUUID(), content });
      if (!renderCoreV1Response(response)) throw new Error("non_authoritative_response");
      input.value = "";
      pollCount = 0;
      scheduleSync();
    } catch {
      customerError("Die Nachricht wurde nicht als autoritative WEB-Core-Antwort bestätigt. Es wird kein Erfolg angezeigt.");
    } finally {
      setComposerReady(gatewayReady);
      input.focus();
    }
  }

  async function decideApproval(button) {
    if (!gatewayReady || !(button instanceof HTMLButtonElement)) return;
    const approvalId = String(button.dataset.approvalId || "");
    const decision = String(button.dataset.webApproval || "");
    if (!validUuid(approvalId) || !["APPROVE","DENY"].includes(decision)) return;
    button.disabled = true;
    try {
      const response = await gateway("approval",{ source_message_id:crypto.randomUUID(), approval_id:approvalId, decision });
      if (!renderCoreV1Response(response)) throw new Error("non_authoritative_response");
      pollCount = 0;
      scheduleSync();
    } catch {
      customerError("Die Freigabe wurde nicht autoritativ vom Core bestätigt. Es wird kein Ausführungserfolg angezeigt.");
    }
  }

  async function checkReadiness() {
    try {
      const readiness = normalizeGatewayReadiness(await gateway("readiness"));
      gatewayReady = readiness?.ready === true;
      return gatewayReady;
    } catch {
      gatewayReady = false;
      return false;
    }
  }

  async function boot() {
    const valid = window.SCBAuth?.validateSession ? await window.SCBAuth.validateSession().catch(() => false) : Boolean(sessionToken());
    if (!valid) { location.replace("anmelden.html"); return; }
    const status = document.getElementById("webConciergeStatus");
    const title = document.getElementById("webConciergeStateTitle");
    const meta = document.getElementById("webConciergeStateMeta");
    setComposerReady(false);
    const ready = await checkReadiness();
    if (status) status.textContent = ready ? "PROD · autoritativ" : "Shared Gateway noch gesperrt";
    if (title) title.textContent = ready ? "Web-Concierge ist verbunden" : "Web-Concierge noch nicht verfügbar";
    if (meta) meta.textContent = ready
      ? "Deine Web-Sitzung wird serverseitig auf deine kanonische Kundenidentität gebunden. Antworten werden nur bei autoritativer WEB-Core-v1-Auslieferung angezeigt."
      : "Die Website ist vollständig für web-concierge-gateway-v1 vorbereitet. Solange WEB→Core-v1→CAO in PROD nicht autoritativ freigegeben ist, bleibt Senden gesperrt.";
    setComposerReady(ready);
    document.getElementById("webConciergeSend")?.addEventListener("click",sendTurn);
    document.getElementById("webConciergeInput")?.addEventListener("keydown",(event) => {
      if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendTurn(); }
    });
    document.getElementById("webConciergeLog")?.addEventListener("click",(event) => {
      const button = event.target instanceof Element ? event.target.closest("button[data-web-approval]") : null;
      if (button instanceof HTMLButtonElement) decideApproval(button);
    });
  }

  window.NAHWERKWebCustomerConciergeTestHooks = Object.freeze({ configuredEndpoint,sessionToken,normalizeGatewayReadiness,normalizeCoreV1Response,renderCoreV1Response,CORE_CONTRACT_VERSION,GATEWAY_CONTRACT_VERSION,GATEWAY_ENDPOINT });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",boot,{ once:true });
  else boot();
})();
