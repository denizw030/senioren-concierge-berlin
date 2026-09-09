(() => {
  const SESSION_KEY = "scb_web_session";
  const PENDING_SUBMIT_STORAGE_KEY = "nw_telephone_reception_pending_submit_v1";
  const PLATFORM_CONTRACT_SHA = "b9cae952e1c9cdae45a238d9cd902a9f2d798452";
  const PREPARED_NUMBER_ONBOARDING_ENDPOINT = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-telephone-reception-onboarding/number/submit";
  const RECEPTION_PROFILE_URL = "https://btqklftjmwtqqqdmwlnk.supabase.co/functions/v1/nahwerk-customer-portal-staging/portal/telephone-reception";
  // Runtime safety boundary. Keep null until the Platform function is actually deployed and separately approved.
  const NUMBER_ONBOARDING_ENDPOINT = null;
  const ACTIVE_STATES = new Set(["ROUTING_ACTIVE", "PORTING_ACTIVE"]);
  const STATE_LABELS = Object.freeze({
    NUMBER_SUBMITTED: "Nummer eingereicht",
    OWNERSHIP_PENDING: "Inhaberprüfung ausstehend",
    OWNERSHIP_VERIFIED: "Inhaber bestätigt",
    PROVIDER_SETUP_PENDING: "Provider-Einrichtung ausstehend",
    ROUTING_PENDING: "Routing wird eingerichtet",
    PORTING_PENDING: "Portierung wird vorbereitet",
    ROUTING_ACTIVE: "Routing aktiv",
    PORTING_ACTIVE: "Portierung aktiv",
    ROUTING_FAILED: "Einrichtung fehlgeschlagen"
  });
  const ALLOWED_PAYLOAD_FIELDS = Object.freeze([
    "productScope",
    "billingMode",
    "existingLandline",
    "currentProvider",
    "handlerMode",
    "telephoneAgent",
    "callbackNumber"
  ]);
  const TERMINAL_PENDING_ERRORS = new Set(["idempotency_conflict", "number_already_submitted"]);

  function sessionToken(storage = globalThis.sessionStorage) {
    try {
      const row = JSON.parse(storage?.getItem(SESSION_KEY) || "null");
      return row && row.session_token ? String(row.session_token) : "";
    } catch {
      return "";
    }
  }

  function sanitizePayload(input = {}) {
    return {
      productScope: String(input.productScope ?? "").trim(),
      billingMode: String(input.billingMode ?? "").trim(),
      existingLandline: String(input.existingLandline ?? "").trim(),
      currentProvider: String(input.currentProvider ?? "").trim(),
      handlerMode: String(input.handlerMode ?? "").trim(),
      telephoneAgent: String(input.telephoneAgent ?? "").trim(),
      callbackNumber: String(input.callbackNumber ?? "").trim()
    };
  }

  function stableJson(value) {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
    return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + stableJson(value[key])).join(",") + "}";
  }

  async function sha256Hex(value, cryptoImpl = globalThis.crypto) {
    if (!cryptoImpl?.subtle) throw new Error("crypto_unavailable");
    const digest = await cryptoImpl.subtle.digest("SHA-256", new TextEncoder().encode(value));
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function createIdempotencyKey(cryptoImpl = globalThis.crypto) {
    if (!cryptoImpl?.randomUUID) throw new Error("crypto_unavailable");
    return "nwtr:" + cryptoImpl.randomUUID();
  }

  function readPending(storage) {
    try {
      const raw = storage?.getItem(PENDING_SUBMIT_STORAGE_KEY);
      if (!raw) return null;
      const row = JSON.parse(raw);
      if (!row || row.version !== 1 || typeof row.fingerprint !== "string" || typeof row.key !== "string") return null;
      return row;
    } catch {
      return null;
    }
  }

  function writePending(storage, row) {
    storage?.setItem(PENDING_SUBMIT_STORAGE_KEY, JSON.stringify(row));
  }

  function clearPending(storage, fingerprint, key) {
    try {
      const row = readPending(storage);
      if (row?.fingerprint === fingerprint && row?.key === key) storage?.removeItem(PENDING_SUBMIT_STORAGE_KEY);
    } catch {}
  }

  async function pendingSubmission(payload, storage, cryptoImpl = globalThis.crypto) {
    if (!storage?.getItem || !storage?.setItem) throw new Error("idempotency_storage_unavailable");
    const fingerprint = await sha256Hex(stableJson(payload), cryptoImpl);
    const existing = readPending(storage);
    if (existing?.fingerprint === fingerprint && existing?.key) {
      return {
        fingerprint,
        key: existing.key,
        terminal: TERMINAL_PENDING_ERRORS.has(existing.terminal) ? existing.terminal : null,
        reused: true
      };
    }
    const key = createIdempotencyKey(cryptoImpl);
    writePending(storage, { version: 1, fingerprint, key, terminal: null });
    return { fingerprint, key, terminal: null, reused: false };
  }

  function markPendingTerminal(storage, fingerprint, key, terminal) {
    const row = readPending(storage);
    if (row?.fingerprint !== fingerprint || row?.key !== key) return;
    writePending(storage, { ...row, terminal });
  }

  function roleAllowed({ productScope, handlerMode, personalConciergeAllowed }) {
    if (productScope === "STANDALONE") return handlerMode === "TELEPHONE_AGENT";
    if (productScope === "CONCIERGE_BUNDLE" && handlerMode === "PERSONAL_CONCIERGE") {
      return personalConciergeAllowed === true;
    }
    return productScope === "CONCIERGE_BUNDLE" && handlerMode === "TELEPHONE_AGENT";
  }

  function validateCanonicalSuccess(httpStatus, body) {
    const common =
      body?.ok === true &&
      body?.status === "number_submitted" &&
      body?.state === "NUMBER_SUBMITTED" &&
      body?.routing_active === false &&
      body?.porting_active === false &&
      body?.provider_called === false;
    if (!common) return false;
    if (httpStatus === 201) return body?.duplicate === false;
    if (httpStatus === 200) return body?.duplicate === true;
    return false;
  }

  async function submitNumber({
    endpoint,
    token,
    payload,
    fetchImpl = globalThis.fetch,
    storage = globalThis.sessionStorage,
    cryptoImpl = globalThis.crypto
  }) {
    if (!endpoint) return { kind: "endpoint_not_deployed", networkRequestMade: false };
    if (!token) return { kind: "session_required", networkRequestMade: false };

    const cleanPayload = sanitizePayload(payload);
    if (!roleAllowed({
      productScope: cleanPayload.productScope,
      handlerMode: cleanPayload.handlerMode,
      personalConciergeAllowed: cleanPayload.handlerMode !== "PERSONAL_CONCIERGE" || payload?.personalConciergeAllowed === true
    })) {
      return { kind: "handler_not_entitled", networkRequestMade: false };
    }

    let pending;
    try {
      pending = await pendingSubmission(cleanPayload, storage, cryptoImpl);
    } catch (error) {
      return { kind: error?.message === "idempotency_storage_unavailable" ? "idempotency_storage_unavailable" : "crypto_unavailable", networkRequestMade: false };
    }

    if (pending.terminal) {
      return {
        kind: pending.terminal,
        networkRequestMade: false,
        idempotencyKey: pending.key,
        blockedReplay: true
      };
    }

    let response;
    try {
      response = await fetchImpl(endpoint, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
          "Idempotency-Key": pending.key
        },
        body: JSON.stringify(cleanPayload)
      });
    } catch {
      return {
        kind: "uncertain_network_error",
        networkRequestMade: true,
        idempotencyKey: pending.key,
        retryUsesSameKey: true
      };
    }

    const body = await response.json().catch(() => null);

    if (response.status === 409 && (body?.status === "idempotency_conflict" || body?.status === "number_already_submitted")) {
      markPendingTerminal(storage, pending.fingerprint, pending.key, body.status);
      return {
        kind: body.status,
        networkRequestMade: true,
        idempotencyKey: pending.key,
        retryUsesSameKey: true
      };
    }

    if (response.status !== 200 && response.status !== 201) {
      return {
        kind: body?.status ? "http_error:" + String(body.status) : "http_error",
        networkRequestMade: true,
        idempotencyKey: pending.key,
        retryUsesSameKey: true
      };
    }

    if (!validateCanonicalSuccess(response.status, body)) {
      return {
        kind: "invalid_canonical_submit_response",
        networkRequestMade: true,
        idempotencyKey: pending.key,
        retryUsesSameKey: true
      };
    }

    clearPending(storage, pending.fingerprint, pending.key);
    return {
      kind: "number_submitted",
      networkRequestMade: true,
      idempotencyKey: pending.key,
      duplicate: body.duplicate === true,
      state: "NUMBER_SUBMITTED",
      body
    };
  }

  globalThis.NAHWERKTelephoneReceptionTestHooks = Object.freeze({
    ALLOWED_PAYLOAD_FIELDS,
    PLATFORM_CONTRACT_SHA,
    PREPARED_NUMBER_ONBOARDING_ENDPOINT,
    runtimeEndpoint: NUMBER_ONBOARDING_ENDPOINT,
    sanitizePayload,
    roleAllowed,
    validateCanonicalSuccess,
    submitNumber
  });

  function initAgentGallery() {
    const triggers = [...document.querySelectorAll("[data-tr-show-agents]")];
    const extraCards = [...document.querySelectorAll("[data-agent-extra]")];
    const section = document.getElementById("agenten");
    if (!triggers.length || !extraCards.length) return;
    const reveal = (trigger) => {
      extraCards.forEach((card) => { card.hidden = false; });
      triggers.forEach((item) => item.setAttribute("aria-expanded", "true"));
      document.querySelector(".tr-agent-actions")?.setAttribute("hidden", "");
      if (trigger?.tagName === "A") {
        section?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
      }
    };
    triggers.forEach((trigger) => trigger.addEventListener("click", (event) => {
      if (trigger.tagName === "A") event.preventDefault();
      reveal(trigger);
    }));
  }

  initAgentGallery();

  const form = document.getElementById("telephoneReceptionSetupForm");
  if (!form) return;
  const $ = (id) => document.getElementById(id);
  const productInputs = [...form.querySelectorAll('input[name="productScope"]')];
  const handlerAgent = $("handlerTelephoneAgent");
  const handlerPersonal = $("handlerPersonalConcierge");
  const agentField = $("telephoneAgentField");
  const entitlementNote = $("handlerEntitlementNote");
  const serverNote = $("serverContractNote");
  const result = $("telephoneReceptionSetupResult");
  const resultTitle = $("telephoneReceptionSetupResultTitle");
  const resultBody = $("telephoneReceptionSetupResultBody");
  const setupButton = $("telephoneReceptionSetupButton");
  let personalConciergeAllowed = false;

  function selectedProductScope() {
    return form.querySelector('input[name="productScope"]:checked')?.value || "STANDALONE";
  }
  function setResult(title, body, kind = "pending") {
    result.hidden = false;
    result.className = "tr-result" + (kind === "active" ? " is-active" : kind === "error" ? " is-error" : "");
    resultTitle.textContent = title;
    resultBody.textContent = body;
  }
  function syncHandlerAuthority() {
    const standalone = selectedProductScope() === "STANDALONE";
    const allowPersonal = !standalone && personalConciergeAllowed;
    handlerPersonal.disabled = !allowPersonal;
    if (!allowPersonal && handlerPersonal.checked) handlerAgent.checked = true;
    if (standalone) handlerAgent.checked = true;
    agentField.hidden = !handlerAgent.checked;
    entitlementNote.textContent = standalone
      ? "Im Standalone-Modell übernimmt ein Telefonagent Ihre Anrufe."
      : allowPersonal
        ? "Sie können zwischen Telefonagent und persönlichem Concierge wählen."
        : "Für diese Auswahl bleibt der Telefonagent voreingestellt.";
  }
  function extractPersonalConciergeAccess(body) {
    const candidates = [body?.product_access, body?.entitlement, body?.reception?.product_access, body?.reception?.entitlement];
    return candidates.some((value) => value?.personal_concierge_allowed === true && value?.allowed !== false);
  }
  async function loadServerAuthority() {
    if (!NUMBER_ONBOARDING_ENDPOINT) {
      personalConciergeAllowed = false;
      serverNote.textContent = "";
      syncHandlerAuthority();
      return;
    }
    const token = sessionToken();
    if (!token) {
      serverNote.textContent = "";
      syncHandlerAuthority();
      return;
    }
    try {
      const response = await fetch(RECEPTION_PROFILE_URL, { method: "GET", headers: { Authorization: "Bearer " + token } });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.ok !== true) throw new Error("profile_unavailable");
      personalConciergeAllowed = extractPersonalConciergeAccess(body);
      serverNote.textContent = "";
    } catch {
      personalConciergeAllowed = false;
      serverNote.textContent = "";
    }
    syncHandlerAuthority();
  }
  function validPhone(value) {
    const digits = String(value || "").replace(/\D/g, "");
    return digits.length >= 7 && digits.length <= 15;
  }
  function formPayload() {
    return sanitizePayload({
      productScope: selectedProductScope(),
      billingMode: form.querySelector('input[name="billingMode"]:checked')?.value || "",
      existingLandline: $("existingLandline").value,
      currentProvider: $("currentProvider").value,
      handlerMode: form.querySelector('input[name="handlerMode"]:checked')?.value || "",
      telephoneAgent: $("telephoneAgent").value,
      callbackNumber: $("callbackNumber").value
    });
  }

  productInputs.forEach((input) => input.addEventListener("change", syncHandlerAuthority));
  [handlerAgent, handlerPersonal].forEach((input) => input.addEventListener("change", syncHandlerAuthority));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    if (!validPhone($("existingLandline").value) || !validPhone($("callbackNumber").value)) {
      setResult("Bitte Telefonnummern prüfen", "Bitte prüfen Sie beide Telefonnummern und versuchen Sie es erneut.", "error");
      return;
    }

    const payload = formPayload();
    void window.NahwerkAnalytics?.track("telephone_reception_setup_attempt", {
      funnel_name: "telephone_reception",
      funnel_step: "number_onboarding",
      product_scope: payload.productScope,
      billing_mode: payload.billingMode,
      handler_mode: payload.handlerMode
    });

    if (!roleAllowed({
      productScope: payload.productScope,
      handlerMode: payload.handlerMode,
      personalConciergeAllowed
    })) {
      setResult("Auswahl nicht verfügbar", "Bitte wählen Sie für diese Einrichtung den Telefonagenten.", "error");
      syncHandlerAuthority();
      return;
    }

    const token = sessionToken();
    if (!token) {
      setResult("Bitte anmelden", "Melden Sie sich bitte mit Ihrem NAHWERK Zugang an, um mit der Einrichtung fortzufahren.");
      return;
    }

    setupButton.disabled = true;
    let outcome;
    try {
      outcome = await submitNumber({
        endpoint: NUMBER_ONBOARDING_ENDPOINT,
        token,
        payload: { ...payload, personalConciergeAllowed },
        fetchImpl: globalThis.fetch,
        storage: globalThis.sessionStorage,
        cryptoImpl: globalThis.crypto
      });
    } finally {
      setupButton.disabled = false;
    }

    if (outcome.kind === "endpoint_not_deployed") {
      setResult("Einrichtung abstimmen", "Bitte kontaktieren Sie NAHWERK, damit wir die Einrichtung Ihrer Telefonannahme gemeinsam mit Ihnen abstimmen.");
      return;
    }
    if (outcome.kind === "number_submitted") {
      setResult("Nummer eingereicht", "Die Nummer ist noch nicht aktiv. Inhaberschaft und technische Einrichtung folgen separat.");
      return;
    }
    if (outcome.kind === "idempotency_conflict") {
      setResult("Einrichtung nicht abgeschlossen", "Der Vorgang konnte nicht sicher abgeschlossen werden. Bitte versuchen Sie es später erneut oder kontaktieren Sie NAHWERK.", "error");
      return;
    }
    if (outcome.kind === "number_already_submitted") {
      setResult("Nummer bereits erfasst", "Für diese Rufnummer liegt bereits ein Einrichtungsstand vor. Bitte kontaktieren Sie NAHWERK, wenn Sie Unterstützung benötigen.");
      return;
    }
    if (outcome.kind === "uncertain_network_error") {
      setResult("Einrichtung nicht bestätigt", "Der Vorgang konnte nicht sicher bestätigt werden. Bitte versuchen Sie es später erneut oder kontaktieren Sie NAHWERK.", "error");
      return;
    }
    if (outcome.kind === "invalid_canonical_submit_response") {
      setResult("Einrichtung nicht bestätigt", "Der Vorgang konnte nicht sicher bestätigt werden. Bitte kontaktieren Sie NAHWERK, bevor Sie fortfahren.", "error");
      return;
    }
    setResult("Einrichtung nicht abgeschlossen", "Der Vorgang konnte nicht abgeschlossen werden. Bitte versuchen Sie es später erneut oder kontaktieren Sie NAHWERK.", "error");
  });

  window.NAHWERKTelephoneReceptionContract = Object.freeze({
    platform_commit: PLATFORM_CONTRACT_SHA,
    prepared_endpoint: PREPARED_NUMBER_ONBOARDING_ENDPOINT,
    active_states: [...ACTIVE_STATES],
    state_labels: STATE_LABELS,
    number_onboarding_endpoint_ready: Boolean(NUMBER_ONBOARDING_ENDPOINT),
    runtime_inert: !NUMBER_ONBOARDING_ENDPOINT
  });
  setupButton.dataset.nextState = "NUMBER_SUBMITTED";
  syncHandlerAuthority();
  void loadServerAuthority();
})();
