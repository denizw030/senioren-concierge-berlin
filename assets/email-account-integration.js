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
      scope_required: body?.scope_required === true,
      google_services: body?.google_services && typeof body.google_services === "object" ? {
        gmail: String(body.google_services.gmail || "NOT_CONNECTED"),
        calendar: String(body.google_services.calendar || "NOT_CONNECTED"),
        contacts: String(body.google_services.contacts || "NOT_CONNECTED")
      } : { gmail: state === "CONNECTED" ? "CONNECTED" : "NOT_CONNECTED", calendar: "PERMISSION_REQUIRED", contacts: "PERMISSION_REQUIRED" }
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

  function connectPathForState(state) {
    const normalized = String(state || "DISCONNECTED").toUpperCase();
    return normalized === "REAUTH_REQUIRED" || normalized === "SCOPE_REQUIRED" ? "/email/reauth" : "/email/connect";
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
    connectPayload,
    connectPathForState
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
  const disconnectButton = document.getElementById("emailDisconnectButton");
  const genericForm = document.getElementById("emailGenericForm");
  const obsoleteReauthButton = document.getElementById("emailReauthButton");
  const obsoleteRetryButton = document.getElementById("emailRetryButton");
  const capabilityInputs = [...root.querySelectorAll("[data-email-capability]")];
  const providerButtons = [...root.querySelectorAll("[data-email-provider]")];
  const providerStatus = Object.fromEntries(providerButtons.map((button) => [button.dataset.emailProvider, button.querySelector("[data-email-provider-status]")]));

  obsoleteReauthButton?.remove();
  obsoleteRetryButton?.remove();

  let providers = [];
  let connection = null;
  let preferences = null;
  let selectedProvider = null;
  let savingPreferences = false;
  let loading = false;
  let loaded = false;
  let productAssetPromise = null;

  function sessionToken() {
    try {
      return String(JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null")?.session_token || "");
    } catch {
      return "";
    }
  }

  function ensureProductAssets() {
    if (globalThis.NAHWERKEmailConciergeProduct) return Promise.resolve(globalThis.NAHWERKEmailConciergeProduct);
    if (productAssetPromise) return productAssetPromise;
    if (!document.getElementById("emailConciergeProductStyles")) {
      const link = document.createElement("link");
      link.id = "emailConciergeProductStyles";
      link.rel = "stylesheet";
      link.href = "/assets/email-concierge-product.css?v=20260920-10";
      document.head.appendChild(link);
    }
    productAssetPromise = new Promise((resolve) => {
      const existing = document.getElementById("emailConciergeProductRuntime");
      if (existing) {
        if (globalThis.NAHWERKEmailConciergeProduct) resolve(globalThis.NAHWERKEmailConciergeProduct);
        else window.addEventListener("nahwerk:email-concierge-product-ready", () => resolve(globalThis.NAHWERKEmailConciergeProduct || null), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.id = "emailConciergeProductRuntime";
      script.src = "/assets/email-concierge-product.js?v=20260920-14";
      script.async = true;
      script.addEventListener("load", () => resolve(globalThis.NAHWERKEmailConciergeProduct || null), { once: true });
      script.addEventListener("error", () => resolve(null), { once: true });
      document.body.appendChild(script);
    });
    return productAssetPromise;
  }

  async function syncProduct(connected) {
    const product = await ensureProductAssets();
    if (product?.setConnectionState) await product.setConnectionState(connected === true);
  }

  function applyCustomerCopy() {
    const capabilityHeading = root.querySelector(".email-capabilities")?.previousElementSibling;
    const providerNote = root.querySelector(".email-provider-note");
    const continuityNote = root.querySelector(".email-continuity-note");
    const sendCopy = root.querySelector('[data-email-capability][value="EMAIL_SEND"]')?.closest(".email-capability")?.querySelector("small");
    if (capabilityHeading) capabilityHeading.textContent = CUSTOMER_COPY.capabilityHeading;
    providerNote?.remove();
    if (continuityNote) continuityNote.textContent = CUSTOMER_COPY.continuity;
    if (sendCopy) sendCopy.textContent = CUSTOMER_COPY.sendApproval;
    if (connectButton) connectButton.textContent = "Verbinden";
    const googleButton = providerButtons.find((button) => String(button.dataset.emailProvider || "").toUpperCase() === "GOOGLE");
    const googleLabel = googleButton?.querySelector("strong");
    if (googleLabel) googleLabel.textContent = "Google";
    if (googleButton) {
      googleButton.disabled = false;
      googleButton.setAttribute("aria-disabled", "false");
      googleButton.setAttribute("aria-pressed", "false");
    }
    if (providerStatus.GOOGLE) providerStatus.GOOGLE.textContent = "Auswählen";
    if (providerStatus.MICROSOFT) providerStatus.MICROSOFT.textContent = "Noch nicht verfügbar";
    if (providerStatus.GENERIC) providerStatus.GENERIC.textContent = "Noch nicht verfügbar";
  }

  applyCustomerCopy();
  root.dataset.emailRuntime = "prod";
  if (!document.getElementById("emailGoogleServiceStyles")) {
    const style = document.createElement("style"); style.id = "emailGoogleServiceStyles";
    style.textContent = ".email-google-services{display:flex;flex-wrap:wrap;gap:7px;margin:10px 0 4px}.email-google-service{font-size:.73rem;padding:6px 9px;border:1px solid rgba(127,127,127,.24);border-radius:999px;opacity:.72}.email-google-service.is-connected{border-color:rgba(200,164,93,.45);opacity:1}";
    document.head.appendChild(style);
  }
  if (genericForm) genericForm.hidden = true;
  runtimeNote.textContent = CUSTOMER_COPY.dataUse;
  statusBadge.textContent = "Wird geladen";
  stateTitle.textContent = "E-Mail-Verbindung wird geprüft …";
  stateMeta.textContent = CUSTOMER_COPY.initialMeta;
  ensureProductAssets();

  function setBusy(value) {
    [connectButton, disconnectButton].forEach((button) => {
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

  function googleSelectable() {
    const row = providerRow("GOOGLE");
    return !row || row.availability !== "UNAVAILABLE" || connection?.provider === "GOOGLE";
  }

  function connectionHasGoogleContext() {
    const state = String(connection?.state || "DISCONNECTED").toUpperCase();
    return connection?.provider === "GOOGLE" && state !== "DISCONNECTED";
  }

  function renderProviders() {
    providerButtons.forEach((button) => {
      const key = String(button.dataset.emailProvider || "").toUpperCase();
      const isGoogle = key === "GOOGLE";
      const selectable = isGoogle && googleSelectable();
      const selected = isGoogle && (selectedProvider === "GOOGLE" || connectionHasGoogleContext());
      const connected = selected && String(connection?.state || "").toUpperCase() === "CONNECTED";

      button.disabled = !selectable;
      button.setAttribute("aria-disabled", String(button.disabled));
      button.setAttribute("aria-pressed", String(selected));
      button.classList.toggle("is-selected", selected);

      if (!providerStatus[key]) return;
      if (isGoogle) {
        providerStatus[key].textContent = connected ? "Verbunden" : selected ? "Ausgewählt" : selectable ? "Auswählen" : "Nicht verfügbar";
      } else {
        providerStatus[key].textContent = "Noch nicht verfügbar";
      }
    });
  }

  function renderCapabilities() {
    const connected = String(connection?.state || "") === "CONNECTED";
    const available = new Set(Array.isArray(connection?.capabilities) ? connection.capabilities : []);
    capabilityInputs.forEach((input) => {
      const key = String(input.value);
      if (!savingPreferences) input.checked = connected ? preferences?.[key] === true : false;
      input.disabled = !connected || !preferences || !available.has(key) || savingPreferences;
      input.closest(".email-capability")?.classList.toggle("is-disabled", input.disabled);
    });
    if (preferencesStatus) {
      preferencesStatus.textContent = !connected
        ? "Nach bestätigter Verbindung kannst du diese Funktionen einzeln ein- oder ausschalten."
        : !preferences
          ? "Deine E-Mail-Funktionen werden geladen …"
          : savingPreferences
            ? "Einstellungen werden sicher gespeichert …"
            : "Änderungen gelten für deinen verbundenen Gmail-Zugang bei NAHWERK.";
    }
  }

  function resetActions() {
    connectButton.hidden = true;
    disconnectButton.hidden = true;
    connectButton.disabled = false;
    disconnectButton.disabled = false;
    connectButton.textContent = "Verbinden";
  }

  function showConnectButton() {
    connectButton.hidden = false;
    selectedProvider = "GOOGLE";
    connectButton.disabled = !sessionToken();
  }

  function renderGoogleServices() {
    let box = document.getElementById("googleServiceStatus");
    if (!box) {
      box = document.createElement("div");
      box.id = "googleServiceStatus";
      box.className = "email-google-services";
      stateMeta.insertAdjacentElement("afterend", box);
    }
    box.replaceChildren();
    const services = connection?.google_services || { gmail: "NOT_CONNECTED", calendar: "PERMISSION_REQUIRED", contacts: "PERMISSION_REQUIRED" };
    [["Gmail", services.gmail], ["Kalender", services.calendar], ["Kontakte", services.contacts]].forEach(([label, state]) => {
      const row = document.createElement("span");
      row.className = "email-google-service";
      row.textContent = label + " · " + (state === "CONNECTED" ? "Verbunden" : state === "PERMISSION_REQUIRED" ? "Berechtigung fehlt" : "Nicht verbunden");
      if (state === "CONNECTED") row.classList.add("is-connected");
      box.append(row);
    });
  }
  function renderConnection() {
    resetActions();
    accountHint.textContent = connection?.account_display_hint || "";
    const state = String(connection?.state || "DISCONNECTED").toUpperCase();
    if (connection?.provider === "GOOGLE" && state === "DISCONNECTED") selectedProvider = "GOOGLE";
    queueMicrotask(() => syncProduct(state === "CONNECTED"));
    renderGoogleServices();

    if (state === "CONNECTED") {
      selectedProvider = "GOOGLE";
      statusBadge.textContent = "Verbunden";
      stateTitle.textContent = "Google ist mit NAHWERK verbunden.";
      stateMeta.textContent = connection?.scope_required
        ? "Gmail ist bereits nutzbar. Für Kalender und Kontakte fehlen noch Google-Berechtigungen."
        : "Gmail, Kalender und Kontakte stehen über dieselbe Google-Verbindung bereit. " + CUSTOMER_COPY.sendApproval;
      disconnectButton.hidden = false;
      if (connection?.scope_required) {
        connectButton.hidden = false;
        connectButton.disabled = !sessionToken();
        connectButton.textContent = "Berechtigungen aktualisieren";
      }
      renderProviders();
      renderCapabilities();
      return;
    }

    if (state === "CONNECTING") {
      selectedProvider = "GOOGLE";
      statusBadge.textContent = "Verbindung läuft";
      stateTitle.textContent = "Google-Verbindung wird bestätigt …";
      stateMeta.textContent = "Deine Verbindung mit Google wird sicher bestätigt.";
      renderProviders();
      renderCapabilities();
      return;
    }

    if (state === "REAUTH_REQUIRED" || state === "SCOPE_REQUIRED") {
      selectedProvider = "GOOGLE";
      statusBadge.textContent = "Nicht verbunden";
      stateTitle.textContent = "Google mit NAHWERK verbinden";
      stateMeta.textContent = "Melde dich bei Google an, um Gmail, Kalender und Kontakte über eine zentrale Verbindung freizugeben.";
      renderProviders();
      showConnectButton();
      renderCapabilities();
      return;
    }

    if (state === "ERROR") {
      statusBadge.textContent = "Nicht verbunden";
      stateTitle.textContent = "Google mit NAHWERK verbinden";
      stateMeta.textContent = "Wähle Gmail aus und starte die Verbindung erneut.";
      renderProviders();
      showConnectButton();
      renderCapabilities();
      return;
    }

    statusBadge.textContent = "Nicht verbunden";
    stateTitle.textContent = "Gmail mit NAHWERK verbinden";
    stateMeta.textContent = selectedProvider === "GOOGLE"
      ? "Google ist ausgewählt. Starte jetzt die sichere Verbindung für Gmail, Kalender und Kontakte."
      : "Wähle oben Google aus.";
    renderProviders();
    showConnectButton();
    renderCapabilities();
  }

  function renderError(error) {
    connection = connection || { state: "ERROR", provider: null, capabilities: [], account_display_hint: null };
    resetActions();
    const code = error instanceof Error ? error.message : "EMAIL_PROVIDER_UNAVAILABLE";
    statusBadge.textContent = code === "UNAUTHENTICATED" ? "Sitzung abgelaufen" : "Nicht verbunden";
    stateTitle.textContent = ERROR_COPY[code] || "Gmail mit NAHWERK verbinden";
    stateMeta.textContent = code === "UNAUTHENTICATED"
      ? "Bitte melde dich erneut bei NAHWERK an."
      : "Wähle Gmail aus und starte die Verbindung erneut. Es wurde keine E-Mail gesendet.";
    accountHint.textContent = "";
    renderProviders();
    if (code !== "UNAUTHENTICATED") {
      connectButton.hidden = false;
      connectButton.disabled = !sessionToken() || selectedProvider !== "GOOGLE";
    }
    renderCapabilities();
    queueMicrotask(() => syncProduct(false));
  }

  async function load(force = false) {
    if (loading || (loaded && !force)) return;
    loading = true;
    setBusy(true);
    try {
      const [providerData, connectionData] = await Promise.all([
        request("/email/providers"),
        request("/email/connection")
      ]);
      providers = normalizeProviderList(providerData);
      connection = normalizeConnection(connectionData) || { state: "ERROR", provider: null, capabilities: [], account_display_hint: null };
      preferences = null;
      let preferenceLoadFailed = false;

      if (connection.state === "CONNECTED") {
        try {
          const preferenceData = await request("/email/preferences");
          preferences = normalizePreferences(preferenceData);
          if (!preferences) throw new Error("EMAIL_REQUEST_INVALID");
        } catch {
          preferences = null;
          preferenceLoadFailed = true;
        }
      }

      renderProviders();
      renderConnection();
      if (preferenceLoadFailed && preferencesStatus) preferencesStatus.textContent = "Deine E-Mail-Funktionen konnten gerade nicht geladen werden.";
      loaded = true;
    } catch (error) {
      renderError(error);
    } finally {
      loading = false;
      setBusy(false);
    }
  }

  async function begin() {
    const state = String(connection?.state || "DISCONNECTED").toUpperCase();
    const hasGoogleSelection = selectedProvider === "GOOGLE" || connection?.provider === "GOOGLE" || connectionHasGoogleContext() || googleSelectable();
    if (!hasGoogleSelection) {
      stateTitle.textContent = "Google auswählen";
      stateMeta.textContent = "Wähle zuerst Google aus.";
      return;
    }
    selectedProvider = "GOOGLE";
    const body = connectPayload("GOOGLE", selectedCapabilities());
    if (!body) {
      renderError(new Error("EMAIL_REQUEST_INVALID"));
      return;
    }
    if (!sessionToken()) {
      renderError(new Error("UNAUTHENTICATED"));
      return;
    }
    setBusy(true);
    connectButton.textContent = "Verbindung wird gestartet …";
    try {
      const path = connection?.scope_required === true ? "/email/reauth" : connectPathForState(state);
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
    if (String(connection?.state || "") !== "CONNECTED" || !preferences || savingPreferences) return;
    if (String(changedInput?.value || "") === "EMAIL_READ" && changedInput.checked === false) {
      for (const input of capabilityInputs) {
        if (input.value === "EMAIL_SEARCH" || input.value === "EMAIL_ATTACHMENTS") input.checked = false;
      }
    }
    const requested = Object.fromEntries(capabilityInputs.map((input) => [String(input.value), input.checked === true]));
    savingPreferences = true;
    renderCapabilities();
    try {
      const data = await request("/email/preferences", { method: "POST", body: { preferences: requested } });
      const next = normalizePreferences(data);
      if (!next) throw new Error("EMAIL_REQUEST_INVALID");
      preferences = next;
      globalThis.NAHWERKEmailConciergeProduct?.refresh?.();
    } catch {
      loaded = false;
      await load(true);
      return;
    } finally {
      savingPreferences = false;
      renderCapabilities();
    }
  }

  capabilityInputs.forEach((input) => input.addEventListener("change", () => savePreferences(input)));

  connectButton.dataset.emailConnectBound = "true";
  connectButton.addEventListener("click", () => begin());
  disconnectButton.addEventListener("click", async () => {
    setBusy(true);
    try {
      await request("/email/disconnect", { method: "POST", body: { mode: "LOCAL" } });
      connection = { state: "DISCONNECTED", provider: "GOOGLE", capabilities: [], account_display_hint: null };
      selectedProvider = "GOOGLE";
      preferences = null;
      loaded = false;
      await syncProduct(false);
      await load(true);
    } catch (error) {
      renderError(error);
    } finally {
      setBusy(false);
    }
  });

  providerButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const key = String(button.dataset.emailProvider || "").toUpperCase();
      if (key !== "GOOGLE" || button.disabled) return;
      selectedProvider = "GOOGLE";
      renderProviders();
      renderConnection();
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
    },
    connect() {
      return begin();
    }
  });

  const emailTabAlreadyActive =
    root.hidden === false ||
    document.getElementById("accountTabEmail")?.getAttribute("aria-selected") === "true";
  if (emailTabAlreadyActive) queueMicrotask(() => load(false));
})();