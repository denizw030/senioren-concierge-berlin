(() => {
  const SESSION_KEY = "scb_web_session";
  const BASE = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-email-runtime";
  const CAPABILITIES = ["EMAIL_READ", "EMAIL_SEARCH", "EMAIL_ATTACHMENTS", "EMAIL_DRAFT", "EMAIL_SEND"];
  const ERROR_COPY = {
    UNAUTHENTICATED: "Deine Sitzung ist nicht mehr gültig. Bitte melde dich erneut an.",
    EMAIL_IDENTITY_BINDING_FAILED: "Die E-Mail-Verbindung konnte deinem Konto nicht sicher zugeordnet werden.",
    EMAIL_PROVIDER_UNAVAILABLE: "Gmail ist für dieses Konto derzeit noch nicht freigegeben.",
    EMAIL_PROVIDER_NOT_SUPPORTED: "Dieser E-Mail-Anbieter ist noch nicht verfügbar.",
    EMAIL_OAUTH_FAILED: "Die Google-Anmeldung konnte nicht abgeschlossen werden.",
    EMAIL_REQUEST_INVALID: "Die E-Mail-Anfrage konnte nicht sicher verarbeitet werden."
  };

  const root = document.getElementById("accountEmailCard");
  if (!root) return;

  const statusBadge = document.getElementById("emailConnectionStatus");
  const stateTitle = document.getElementById("emailStateTitle");
  const stateMeta = document.getElementById("emailStateMeta");
  const accountHint = document.getElementById("emailAccountHint");
  const runtimeNote = document.getElementById("emailRuntimeNote");
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
  let loading = false;
  let loaded = false;

  root.dataset.emailRuntime = "prod";
  if (genericForm) genericForm.hidden = true;
  runtimeNote.textContent = "PROD · Verbindungsstatus und Berechtigungen werden ausschließlich serverseitig geprüft.";
  statusBadge.textContent = "Wird geladen";
  stateTitle.textContent = "E-Mail-Verbindung wird geprüft …";
  stateMeta.textContent = "Dein bestehender NAHWERK-Kontokontext bleibt die einzige Authority.";

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

  function errorCode(body, fallback = "EMAIL_REQUEST_INVALID") {
    return String(body?.error?.code || body?.error || fallback);
  }

  async function request(path, { method = "GET", body = null } = {}) {
    const token = sessionToken();
    if (!token) throw new Error("UNAUTHENTICATED");
    const headers = { Authorization: "Bearer " + token };
    const init = { method, headers };
    if (body !== null) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }
    let response;
    try {
      response = await fetch(BASE + path, init);
    } catch {
      throw new Error("EMAIL_PROVIDER_UNAVAILABLE");
    }
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.ok !== true) throw new Error(errorCode(data));
    return data;
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

  function renderCapabilities(values = CAPABILITIES) {
    const allowed = new Set(Array.isArray(values) && values.length ? values : CAPABILITIES);
    capabilityInputs.forEach((input) => {
      input.checked = allowed.has(String(input.value));
      input.disabled = connection?.state === "CONNECTED" || !googleAvailable();
    });
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
      stateMeta.textContent = "Dein Concierge kann E-Mails lesen und suchen, Entwürfe vorbereiten und nur nach der vorgesehenen Freigabe senden.";
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
      stateMeta.textContent = "Der endgültige Status wird serverseitig geprüft.";
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
      : "Für dein bereits freigegebenes Owner-Konto bleibt eine bestehende Verbindung nutzbar. Neue öffentliche Verbindungen bleiben bis zur Google-Freigabe geschlossen.";
    connectButton.hidden = false;
    connectButton.disabled = !googleAvailable();
    renderCapabilities();
  }

  function renderError(error) {
    resetActions();
    const code = error instanceof Error ? error.message : "EMAIL_PROVIDER_UNAVAILABLE";
    statusBadge.textContent = "Nicht verfügbar";
    stateTitle.textContent = ERROR_COPY[code] || "Die Gmail-Verbindung konnte gerade nicht geladen werden.";
    stateMeta.textContent = "Es werden keine Provider-Geheimnisse oder internen Fehlermeldungen angezeigt.";
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
      const [providerData, connectionData] = await Promise.all([
        request("/email/providers"),
        request("/email/connection")
      ]);
      providers = Array.isArray(providerData.providers) ? providerData.providers : [];
      connection = connectionData;
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

  function safeGoogleRedirect(value) {
    try {
      const url = new URL(String(value || ""));
      return url.protocol === "https:" && url.hostname === "accounts.google.com" ? url.toString() : null;
    } catch {
      return null;
    }
  }

  async function begin(path) {
    if (!googleAvailable()) return;
    setBusy(true);
    try {
      const data = await request(path, {
        method: "POST",
        body: { provider: "GOOGLE", requested_capabilities: selectedCapabilities() }
      });
      const redirect = safeGoogleRedirect(data.authorization_redirect_url);
      if (!redirect) throw new Error("EMAIL_OAUTH_FAILED");
      location.assign(redirect);
    } catch (error) {
      renderError(error);
      setBusy(false);
    }
  }

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
