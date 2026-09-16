(() => {
  "use strict";

  const SESSION_KEY = "scb_web_session";
  const CORE_CONTRACT_VERSION = "core-v1";
  const GATEWAY_CONTRACT_VERSION = "web-gateway-v1";
  const GATEWAY_ENDPOINT = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-web-gateway";
  const RESPONSE_STATES = new Set(["ANSWER","QUESTION","ACTION_STARTED","ACTION_PENDING","ACTION_RESULT","ERROR_RESPONSE","HANDOFF","SAFE_TERMINATION"]);

  let gatewayReady = false;

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
      service:String(raw.service || ""),
      contract_version:String(raw.contract_version || ""),
      production:raw.production === true,
      web_route_authoritative:raw.web_route_authoritative === true,
      cao_web_authoritative:raw.cao_web_authoritative === true,
      fail_safe:String(raw.fail_safe || ""),
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
      link.href = `/payg#quote-${encodeURIComponent(quoteId)}`;
      link.textContent = "Preis prüfen und freigeben";
      actions.appendChild(link);
    } else {
      const hint = document.createElement("span");
      hint.textContent = "Antworte im Chat mit deiner Entscheidung. Die Freigabe bleibt an die offene Core-Freigabe gebunden.";
      actions.appendChild(hint);
    }
    card.appendChild(actions);
  }

  function renderCoreV1Response(raw) {
    const response = normalizeCoreV1Response(raw);
    const log = document.getElementById("webConciergeLog");
    if (!response || !log || !response.authoritative) return false;
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

  async function gatewayRequest(path,{ method="GET",body=null,auth=true } = {}) {
    const endpoint = configuredEndpoint();
    if (!endpoint) throw new Error("gateway_not_configured");
    const headers = {};
    if (auth) {
      const token = sessionToken();
      if (!token) throw new Error("session_required");
      headers.Authorization = `Bearer ${token}`;
    }
    if (body !== null) headers["Content-Type"] = "application/json";
    const response = await fetch(`${endpoint}${path}`,{
      method,
      headers,
      body:body === null ? undefined : JSON.stringify(body),
      cache:"no-store",
      credentials:"omit"
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) throw new Error(String(payload?.error || `http_${response.status}`));
    return payload;
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

  async function sendTurn() {
    const input = document.getElementById("webConciergeInput");
    if (!(input instanceof HTMLTextAreaElement) || !gatewayReady) return;
    const content = input.value.trim();
    if (!content || content.length > 4000) return;
    setComposerReady(false);
    try {
      const response = await gatewayRequest("/web/chat",{
        method:"POST",
        body:{ message:content, source_message_id:crypto.randomUUID() }
      });
      if (response?.ok !== true || response?.environment !== "PROD" || response?.authoritative !== true) throw new Error("gateway_response_not_authoritative");
      if (!renderCoreV1Response(response.core)) throw new Error("core_response_not_authoritative");
      input.value = "";
    } catch {
      customerError("Die Nachricht wurde nicht als autoritative WEB-Core-Antwort bestätigt. Es wird kein Erfolg angezeigt.");
    } finally {
      setComposerReady(gatewayReady);
      input.focus();
    }
  }

  async function checkReadiness() {
    try {
      const readiness = normalizeGatewayReadiness(await gatewayRequest("/health",{ auth:false }));
      if (readiness?.ready !== true) throw new Error("gateway_not_authoritative");
      const me = await gatewayRequest("/web/me");
      const identity = me?.identity && typeof me.identity === "object" ? me.identity : {};
      if (me?.ok !== true || me?.environment !== "PROD" || me?.authoritative !== true) throw new Error("gateway_identity_not_authoritative");
      if (![identity.person_id,identity.customer_account_id,identity.customer_member_id].every(validUuid)) throw new Error("gateway_identity_invalid");
      gatewayReady = true;
      return true;
    } catch {
      gatewayReady = false;
      return false;
    }
  }

  async function boot() {
    const valid = window.SCBAuth?.validateSession ? await window.SCBAuth.validateSession().catch(() => false) : false;
    if (!valid) { location.replace("/anmelden"); return; }
    const status = document.getElementById("webConciergeStatus");
    const title = document.getElementById("webConciergeStateTitle");
    const meta = document.getElementById("webConciergeStateMeta");
    setComposerReady(false);
    const ready = await checkReadiness();
    if (status) status.textContent = ready ? "PROD · autoritativ" : "PROD-Gateway nicht erreichbar";
    if (title) title.textContent = ready ? "Web-Concierge ist verbunden" : "Web-Concierge noch nicht verfügbar";
    if (meta) meta.textContent = ready
      ? "Deine Web-Sitzung ist serverseitig auf deine kanonische Kundenidentität gebunden. Antworten werden nur bei autoritativer WEB-Core-v1-Auslieferung angezeigt."
      : "Die Website ist auf web-gateway-v1 vorbereitet. Senden bleibt gesperrt, bis der PROD-Gateway, die autoritative WEB-Route und deine serverseitig validierte Kundensitzung gemeinsam bestätigt sind.";
    setComposerReady(ready);
    document.getElementById("webConciergeSend")?.addEventListener("click",sendTurn);
    document.getElementById("webConciergeInput")?.addEventListener("keydown",(event) => {
      if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendTurn(); }
    });
  }

  window.NAHWERKWebCustomerConciergeTestHooks = Object.freeze({ configuredEndpoint,sessionToken,normalizeGatewayReadiness,normalizeCoreV1Response,renderCoreV1Response,gatewayRequest,CORE_CONTRACT_VERSION,GATEWAY_CONTRACT_VERSION,GATEWAY_ENDPOINT });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",boot,{ once:true });
  else boot();
})();
