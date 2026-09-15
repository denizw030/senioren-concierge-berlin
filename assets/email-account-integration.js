(() => {
  const SESSION_KEY = "scb_web_session";
  const PLATFORM_CONTRACT = "WEBSITE_EMAIL_INTEGRATION_CONTRACT_V1";
  const PLATFORM_CONTRACT_SHA = "d9f91bb488f5895b27a0618e1a94188f1e9ee19b";
  const BASE = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-email-runtime";
  const CAPABILITIES = ["EMAIL_READ", "EMAIL_SEARCH", "EMAIL_ATTACHMENTS", "EMAIL_DRAFT", "EMAIL_MAILBOX", "EMAIL_SEND"];
  const STATES = ["DISCONNECTED", "CONNECTING", "CONNECTED", "REAUTH_REQUIRED", "SCOPE_REQUIRED", "ERROR"];
  const CUSTOMER_COPY = Object.freeze({
    capabilityHeading: "Deine E-Mail-Funktionen",
    dataUse: "NAHWERK verwendet deine Google-Daten nur für die Funktionen, die du aktiviert hast.",
    initialMeta: "Deine Verbindung wird sicher deinem NAHWERK-Konto zugeordnet.",
    providerNote: "Welche E-Mail-Anbieter verfügbar sind, wird sicher über dein NAHWERK-Konto geprüft.",
    continuity: "Deine Gmail-Verbindung steht dir in deinem NAHWERK-Konto über die unterstützten Zugänge zur Verfügung. E-Mails werden nur nach deiner Freigabe gesendet.",
    sendApproval: "E-Mails werden nur nach deiner Freigabe gesendet."
  });
  const ERROR_COPY = {
    UNAUTHENTICATED: "Deine Sitzung ist nicht mehr gültig. Bitte melde dich erneut an.",
    EMAIL_IDENTITY_BINDING_FAILED: "Die E-Mail-Verbindung konnte deinem Konto nicht sicher zugeordnet werden.",
    EMAIL_PROVIDER_UNAVAILABLE: "Gmail ist für dieses Konto derzeit noch nicht freigegeben.",
    EMAIL_PROVIDER_NOT_SUPPORTED: "Dieser E-Mail-Anbieter ist noch nicht verfügbar.",
    EMAIL_OAUTH_FAILED: "Die Google-Anmeldung konnte nicht abgeschlossen werden.",
    EMAIL_REQUEST_INVALID: "Die E-Mail-Anfrage konnte nicht sicher verarbeitet werden."
  };

  function safeGoogleRedirect(value) {
    try {
      const url = new URL(String(value || ""));
      return url.protocol === "https:" && url.hostname === "accounts.google.com" ? url.toString() : null;
    } catch {
      return null;
    }
  }

  function normalizeProviderList(body) {
    if (body?.ok !== true || !Array.isArray(body.providers)) return [];
    return body.providers.flatMap((row) => {
      const provider = String(row?.provider || "").toUpperCase();
      const availability = String(row?.availability || "").toUpperCase();
      if (!["GOOGLE", "MICROSOFT", "GENERIC"].includes(provider)) return [];
      if (!["AVAILABLE", "CONFIGURATION_REQUIRED", "UNAVAILABLE"].includes(availability)) return [];
      return [{
        provider,
        availability,
        label: String(row?.label || "").slice(0, 100),
        capabilities: Array.isArray(row?.capabilities) ? row.capabilities.map(String).filter((v) => CAPABILITIES.includes(v)) : []
      }];
    });
  }

  function normalizeConnection(body) {
    if (body?.ok !== true) return null;
    const state = String(body?.state || "").toUpperCase();
    if (!STATES.includes(state)) return null;
    const provider = body?.provider == null ? null : String(body.provider).toUpperCase();
    if (provider !== null && provider !== "GOOGLE") return null;
    const hint = String(body?.account_display_hint || "").trim();
    return {
      provider,
      state,
      capabilities: Array.isArray(body?.capabilities) ? body.capabilities.map(String).filter((v) => CAPABILITIES.includes(v)) : [],
      account_display_hint: hint && /[•*]/.test(hint) ? hint.slice(0, 180) : null,
      reauth_required: body?.reauth_required === true,
      scope_required: body?.scope_required === true
    };
  }

  function normalizePreferences(body) {
    if (body?.ok !== true || !body.preferences || typeof body.preferences !== "object" || Array.isArray(body.preferences)) return null;
    const available = new Set(Array.isArray(body.available_capabilities) ? body.available_capabilities.map(String).filter((v) => CAPABILITIES.includes(v)) : []);
    const out = Object.fromEntries(CAPABILITIES.map((capability) => [capability, available.has(capability) && body.preferences[capability] === true]));
    if (!out.EMAIL_READ) {
      out.EMAIL_SEARCH = false;
      out.EMAIL_ATTACHMENTS = false;
    }
    return out;
  }

  async function gatewayRequest({ base = BASE, token, method = "GET", path, body = null, fetchImpl = globalThis.fetch }) {
    if (!token) return { ok: false, error: "UNAUTHENTICATED", networkRequestMade: false };
    const headers = { Authorization: "Bearer " + token };
    const init = { method, headers };
    if (body !== null) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }
    let response;
    try {
      response = await fetchImpl(String(base).replace(/\/$/, "") + path, init);
    } catch {
      return { ok: false, error: "EMAIL_PROVIDER_UNAVAILABLE", networkRequestMade: true };
    }
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.ok !== true) {
      return { ok: false, error: String(data?.error?.code || data?.error || "EMAIL_REQUEST_INVALID"), networkRequestMade: true, httpStatus: response.status };
    }
    return { ok: true, data, networkRequestMade: true, httpStatus: response.status };
  }

  function connectPayload(provider = "GOOGLE", requestedCapabilities = CAPABILITIES) {
    const p = String(provider || "").toUpperCase();
    const caps = Array.isArray(requestedCapabilities) ? [...new Set(requestedCapabilities.map(String))].filter((v) => CAPABILITIES.includes(v)) : [];
    if (p !== "GOOGLE" || !caps.length) return null;
    return { provider: "GOOGLE", requested_capabilities: caps };
  }

  globalThis.NAHWERKEmailIntegrationTestHooks = Object.freeze({
    PLATFORM_CONTRACT,
    PLATFORM_CONTRACT_SHA,
    runtimeGatewayBase: BASE,
    CAPABILITIES: CAPABILITIES.slice(),
    STATES: STATES.slice(),
    CUSTOMER_COPY,
    safeGoogleRedirect,
    normalizeProviderList,
    normalizeConnection,
    normalizePreferences,
    gatewayRequest,
    connectPayload
  });

  if (typeof document === "undefined") return;
  const root = document.getElementById("accountEmailCard");
  if (!root) return;

  const statusBadge = document.getElementById("emailConnectionStatus");
  const stateTitle = document.getElementById("emailStateTitle");
  const stateMeta = document.getElementById("emailStateMeta");
  const accountHint = document.getElementById("emailAccountHint");
  const runtimeNote = document.getElementById("emailRuntimeNote");
  const preferencesStatus = document.getElementById("emailPreferencesStatus");
  const connectButton = document.getElementById("emailConnectButton");
  const reauthButton = document.getElementById("emailReauthButton");
  const disconnectButton = document.getElementById("emailDisconnectButton");
  const retryButton = document.getElementById("emailRetryButton");
  const genericForm = document.getElementById("emailGenericForm");
  const capabilityInputs = [...root.querySelectorAll("[data-email-capability]")];
  const providerButtons = [...root.querySelectorAll("[data-email-provider]")];
  const providerStatus = Object.fromEntries(providerButtons.map((button) => [button.dataset.emailProvider, button.querySelector("[data-email-provider-status]")]));

  let providers = [];
  let connection = null;
  let preferences = null;
  let savingPreferences = false;
  let loading = false;
  let loaded = false;

  function applyCustomerCopy() {
    const capabilityHeading = root.querySelector(".email-capabilities")?.previousElementSibling;
    const providerNote = root.querySelector(".email-provider-note");
    const continuityNote = root.querySelector(".email-continuity-note");
    const sendCopy = root.querySelector('[data-email-capability][value="EMAIL_SEND"]')?.closest(".email-capability")?.querySelector("small");
    if (capabilityHeading) capabilityHeading.textContent = CUSTOMER_COPY.capabilityHeading;
    if (providerNote) providerNote.textContent = CUSTOMER_COPY.providerNote;
    if (continuityNote) continuityNote.textContent = CUSTOMER_COPY.continuity;
    if (sendCopy) sendCopy.textContent = CUSTOMER_COPY.sendApproval;
    Object.values(providerStatus).forEach((node) => {
      if (node) node.textContent = "Wird geprüft";
    });
  }

  applyCustomerCopy();
  root.dataset.emailRuntime = "prod";
  if (genericForm) genericForm.hidden = true;
  runtimeNote.textContent = CUSTOMER_COPY.dataUse;
  statusBadge.textContent = "Wird geladen";
  stateTitle.textContent = "E-Mail-Verbindung wird geprüft …";
  stateMeta.textContent = CUSTOMER_COPY.initialMeta;

  function sessionToken() {
    try {
      return String(JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null")?.session_token || "");
    } catch {
      return "";
    }
  }

  function setBusy(value) {
    [connectButton, reauthButton, disconnectButton, retryButton].forEach((button) => {
      if (button && !button.hidden) button.disabled = value;
    });
  }

  function selectedCapabilities() {
    const selected = capabilityInputs.filter((input) => input.checked && !input.disabled).map((input) => String(input.value));
    return selected.length ? selected : CAPABILITIES.slice();
  }

  async function request(path, { method = "GET", body = null } = {}) {
    const outcome = await gatewayRequest({ base: BASE, token: sessionToken(), method, path, body, fetchImpl: globalThis.fetch });
    if (!outcome.ok) throw new Error(outcome.error);
    return outcome.data;
  }

  function providerRow(key) {
    return providers.find((row) => String(row?.provider || "").toUpperCase() === key) || null;
  }

  function googleAvailable() {
    return providerRow("GOOGLE")?.availability === "AVAILABLE";
  }

  function renderProviders() {
    providerButtons.forEach((button) => {
      const key = String(button.dataset.emailProvider || "").toUpperCase();
      const row = providerRow(key);
      const available = row?.availability === "AVAILABLE";
      button.disabled = !available || key !== "GOOGLE";
      button.setAttribute("aria-disabled", String(button.disabled));
      button.setAttribute("aria-pressed", String(key === "GOOGLE" && available));
      button.classList.toggle("is-selected", key === "GOOGLE" && available);
      if (providerStatus[key]) {
        providerStatus[key].textContent = available
          ? "Verfügbar"
          : row?.availability === "CONFIGURATION_REQUIRED"
            ? "Google-Verifizierung läuft"
            : "Noch nicht verfügbar";
      }
    });
  }

  function renderCapabilities() {
    const connected = String(connection?.state || "") === "CONNECTED";
    const available = new Set(Array.isArray(connection?.capabilities) ? connection.capabilities : []);
    capabilityInputs.forEach((input) => {
      const key = String(input.value);
      input.checked = connected ? preferences?.[key] === true : false;
      input.disabled = !connected || !available.has(key) || savingPreferences;
      input.closest(".email-capability")?.classList.toggle("is-disabled", input.disabled);
    });
    if (preferencesStatus) {
      preferencesStatus.textContent = !connected
        ? "Nach bestätigter Verbindung kannst du diese Funktionen einzeln ein- oder ausschalten."
        : savingPreferences
          ? "Einstellungen werden sicher gespeichert …"
          : "Änderungen gelten für deinen verbundenen Gmail-Zugang bei NAHWERK.";
    }
  }

  function resetActions() {
    connectButton.hidden = true;
    reauthButton.hidden = true;
    disconnectButton.hidden = true;
    retryButton.hidden = true;
  }

  function renderConnection() {
    resetActions();
    accountHint.textContent = connection?.account_display_hint || "";
    const state = String(connection?.state || "DISCONNECTED").toUpperCase();

    if (state === "CONNECTED") {
      statusBadge.textContent = "Verbunden";
      stateTitle.textContent = "Gmail ist mit NAHWERK verbunden.";
      stateMeta.textContent = CUSTOMER_COPY.dataUse + " " + CUSTOMER_COPY.sendApproval;
      disconnectButton.hidden = false;
      renderCapabilities(connection?.capabilities);
      return;
    }
    if (state === "REAUTH_REQUIRED" || state === "SCOPE_REQUIRED") {
      statusBadge.textContent = "Erneute Verbindung nötig";
      stateTitle.textContent = "Gmail erneut verbinden";
      stateMeta.textContent = "Google verlangt eine erneute Anmeldung oder Berechtigung. Es wird nichts automatisch gesendet.";
      reauthButton.hidden = !googleAvailable();
      disconnectButton.hidden = false;
      renderCapabilities(connection?.capabilities);
      return;
    }
    if (state === "CONNECTING") {
      statusBadge.textContent = "Verbindung läuft";
      stateTitle.textContent = "Google-Verbindung wird bestätigt …";
      stateMeta.textContent = "Deine Verbindung mit Google wird sicher bestätigt.";
      renderCapabilities();
      return;
    }
    if (state === "ERROR") {
      statusBadge.textContent = "Fehler";
      stateTitle.textContent = "Die Gmail-Verbindung konnte nicht bestätigt werden.";
      stateMeta.textContent = "Du kannst den Status erneut prüfen. Es wurde keine E-Mail gesendet.";
      retryButton.hidden = false;
      disconnectButton.hidden = false;
      renderCapabilities(connection?.capabilities);
      return;
    }

    statusBadge.textContent = "Nicht verbunden";
    stateTitle.textContent = googleAvailable() ? "Gmail mit NAHWERK verbinden" : "Gmail-Verbindung wird für den öffentlichen Start vorbereitet.";
    stateMeta.textContent = googleAvailable()
      ? "Die Verbindung erfolgt direkt über Google OAuth. Dein Google-Passwort wird nicht an NAHWERK übermittelt."
      : "Für dein bereits freigegebenes Konto bleibt eine bestehende Verbindung nutzbar. Neue öffentliche Verbindungen bleiben bis zur Google-Freigabe geschlossen.";
    connectButton.hidden = false;
    connectButton.disabled = !googleAvailable();
    renderCapabilities();
  }

  function renderError(error) {
    resetActions();
    const code = error instanceof Error ? error.message : "EMAIL_PROVIDER_UNAVAILABLE";
    statusBadge.textContent = "Nicht verfügbar";
    stateTitle.textContent = ERROR_COPY[code] || "Die Gmail-Verbindung konnte gerade nicht geladen werden.";
    stateMeta.textContent = "Vertrauliche Zugangsdaten und technische Details werden nicht angezeigt.";
    accountHint.textContent = "";
    retryButton.hidden = code === "UNAUTHENTICATED";
    retryButton.disabled = false;
    renderCapabilities([]);
  }

  async function load(force = false) {
    if (loading || (loaded && !force)) return;
    loading = true;
    setBusy(true);
    try {
      const [providerData, connectionData, preferenceData] = await Promise.all([
        request("/email/providers"),
        request("/email/connection"),
        request("/email/preferences")
      ]);
      providers = normalizeProviderList(providerData);
      connection = normalizeConnection(connectionData) || { state: "ERROR", provider: "GOOGLE", capabilities: [], account_display_hint: null };
      preferences = normalizePreferences(preferenceData);
      if (connection?.state === "CONNECTED" && !preferences) throw new Error("EMAIL_REQUEST_INVALID");
      renderProviders();
      renderConnection();
      loaded = true;
    } catch (error) {
      renderError(error);
    } finally {
      loading = false;
      setBusy(false);
    }
  }

  async function begin(path) {
    if (!googleAvailable()) return;
    const body = connectPayload("GOOGLE", selectedCapabilities());
    if (!body) return;
    setBusy(true);
    try {
      const data = await request(path, { method: "POST", body });
      const redirect = safeGoogleRedirect(data.authorization_redirect_url);
      if (!redirect) throw new Error("EMAIL_OAUTH_FAILED");
      location.assign(redirect);
    } catch (error) {
      renderError(error);
      setBusy(false);
    }
  }

  async function savePreferences(changedInput) {
    if (String(connection?.state || "") !== "CONNECTED" || savingPreferences) return;
    if (String(changedInput?.value || "") === "EMAIL_READ" && changedInput.checked === false) {
      for (const input of capabilityInputs) {
        if (input.value === "EMAIL_SEARCH" || input.value === "EMAIL_ATTACHMENTS") input.checked = false;
      }
    }
    savingPreferences = true;
    renderCapabilities();
    try {
      const requested = Object.fromEntries(capabilityInputs.map((input) => [String(input.value), input.checked === true]));
      const data = await request("/email/preferences", { method: "POST", body: { preferences: requested } });
      const next = normalizePreferences(data);
      if (!next) throw new Error("EMAIL_REQUEST_INVALID");
      preferences = next;
    } catch (error) {
      loaded = false;
      await load(true);
      return;
    } finally {
      savingPreferences = false;
      renderCapabilities();
    }
  }

  capabilityInputs.forEach((input) => input.addEventListener("change", () => savePreferences(input)));

  connectButton.addEventListener("click", () => begin("/email/connect"));
  reauthButton.addEventListener("click", () => begin("/email/reauth"));
  retryButton.addEventListener("click", async () => {
    loaded = false;
    await load(true);
  });
  disconnectButton.addEventListener("click", async () => {
    setBusy(true);
    try {
      await request("/email/disconnect", { method: "POST", body: { mode: "LOCAL" } });
      loaded = false;
      await load(true);
    } catch (error) {
      renderError(error);
    } finally {
      setBusy(false);
    }
  });

  providerButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (String(button.dataset.emailProvider || "").toUpperCase() !== "GOOGLE" || button.disabled) return;
      button.setAttribute("aria-pressed", "true");
    });
  });

  const oauthParams = new URLSearchParams(location.search);
  const hasOAuthReturn = oauthParams.get("email_oauth") === "complete" || oauthParams.get("email_oauth") === "failed";
  if (hasOAuthReturn) {
    ["email_oauth", "provider", "flow", "code"].forEach((key) => oauthParams.delete(key));
    history.replaceState(null, "", location.pathname + (oauthParams.toString() ? "?" + oauthParams.toString() : "") + "#email");
    queueMicrotask(() => document.getElementById("accountTabEmail")?.click());
  }

  window.NAHWERKEmailAccount = Object.freeze({
    activate() {
      return load(false);
    },
    refresh() {
      loaded = false;
      return load(true);
    }
  });
})();