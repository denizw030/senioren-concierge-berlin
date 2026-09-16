(() => {
  "use strict";

  const BASE = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-email-runtime";
  const SESSION_KEY = "scb_web_session";

  const PROVIDERS = Object.freeze([
    { id: "google", name: "Gmail", mode: "google", logo: "gmail", secret: "", help: "Mit deinem Google-Konto anmelden und NAHWERK freigeben." },
    { id: "microsoft", name: "Outlook", mode: "microsoft", logo: "microsoft", secret: "", help: "Mit deinem Microsoft-Konto anmelden und NAHWERK freigeben." },
    { id: "yahoo", name: "Yahoo Mail", mode: "manual", logo: "yahoo", secret: "App-Passwort", help: "Yahoo nutzt für verbundene Apps ein eigenes App-Passwort." },
    { id: "icloud", name: "iCloud Mail", mode: "manual", logo: "icloud", secret: "App-spezifisches Passwort", help: "Apple nutzt für Mail-Apps ein app-spezifisches Passwort." },
    { id: "gmx", name: "GMX", mode: "manual", logo: "gmx", secret: "Passwort für E-Mail-Programme", help: "Nutze dein für E-Mail-Programme freigegebenes Passwort." },
    { id: "webde", name: "WEB.DE", mode: "manual", logo: "webde", secret: "Passwort für E-Mail-Programme", help: "Nutze dein für E-Mail-Programme freigegebenes Passwort." },
    { id: "telekom", name: "Telekom Mail", mode: "manual", logo: "telekom", secret: "Passwort für E-Mail-Programme", help: "Nutze das separate Passwort für E-Mail-Programme." },
    { id: "fastmail", name: "Fastmail", mode: "manual", logo: "fastmail", secret: "App-Passwort", help: "Fastmail nutzt für verbundene Apps ein App-Passwort." },
    { id: "zoho", name: "Zoho Mail", mode: "manual", logo: "zoho", secret: "App- oder Mail-Passwort", help: "Nutze das für externe Mail-Apps freigegebene Passwort." },
    { id: "ionos", name: "IONOS", mode: "manual", logo: "ionos", secret: "E-Mail-Passwort", help: "Nutze das Passwort deines IONOS-Postfachs." },
    { id: "strato", name: "STRATO", mode: "manual", logo: "strato", secret: "E-Mail-Passwort", help: "Nutze das Passwort deines STRATO-Postfachs." }
  ]);

  const LOGOS = Object.freeze({
    gmail: '<span class="email-provider-logo email-provider-logo--gmail" aria-hidden="true"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/></svg></span>',
    microsoft: '<span class="email-provider-logo email-provider-logo--microsoft" aria-hidden="true">O</span>',
    yahoo: '<span class="email-provider-logo email-provider-logo--yahoo" aria-hidden="true">Y!</span>',
    icloud: '<span class="email-provider-logo email-provider-logo--icloud" aria-hidden="true"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M13.762 4.29a6.51 6.51 0 0 0-5.669 3.332 3.571 3.571 0 0 0-1.558-.36 3.571 3.571 0 0 0-3.516 3A4.918 4.918 0 0 0 0 14.796a4.918 4.918 0 0 0 4.92 4.914 4.93 4.93 0 0 0 .617-.045h14.42c2.305-.272 4.041-2.258 4.043-4.589v-.009a4.594 4.594 0 0 0-3.727-4.508 6.51 6.51 0 0 0-6.511-6.27z"/></svg></span>',
    gmx: '<span class="email-provider-logo email-provider-logo--gmx" aria-hidden="true">GMX</span>',
    webde: '<span class="email-provider-logo email-provider-logo--webde" aria-hidden="true">WEB.DE</span>',
    telekom: '<span class="email-provider-logo email-provider-logo--telekom" aria-hidden="true">T</span>',
    fastmail: '<span class="email-provider-logo email-provider-logo--fastmail" aria-hidden="true">F</span>',
    zoho: '<span class="email-provider-logo email-provider-logo--zoho" aria-hidden="true">Zoho</span>',
    ionos: '<span class="email-provider-logo email-provider-logo--ionos" aria-hidden="true">IONOS</span>',
    strato: '<span class="email-provider-logo email-provider-logo--strato" aria-hidden="true">STRATO</span>'
  });

  if (typeof document === "undefined") return;
  const root = document.getElementById("accountEmailCard");
  if (!root) return;

  const legacyGrid = root.querySelector(".email-provider-grid");
  const legacyGoogle = root.querySelector('[data-email-provider="GOOGLE"]');
  const legacyGenericForm = document.getElementById("emailGenericForm");
  const legacyConnect = document.getElementById("emailConnectButton");
  const stateTitle = document.getElementById("emailStateTitle");
  const stateMeta = document.getElementById("emailStateMeta");
  const accountHint = document.getElementById("emailAccountHint");
  const runtimeNote = document.getElementById("emailRuntimeNote");

  let catalog = [];
  let connections = [];
  let selected = null;
  let busy = false;

  function sessionToken() {
    try { return String(JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null")?.session_token || ""); }
    catch { return ""; }
  }

  async function api(path, options = {}) {
    const session = sessionToken();
    if (!session) throw new Error("UNAUTHENTICATED");
    const headers = { Authorization: `Bearer ${session}`, ...(options.headers || {}) };
    if (options.body != null) headers["Content-Type"] = "application/json";
    const response = await fetch(BASE + path, { ...options, headers, credentials: "omit" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.ok === false) throw new Error(String(data?.error || "EMAIL_REQUEST_FAILED"));
    return data;
  }

  function catalogRow(id) { return catalog.find((row) => String(row?.id || "").toLowerCase() === id) || null; }
  function connectionFor(id) { return connections.find((row) => String(row?.provider || "").toLowerCase() === id && String(row?.state || "").toUpperCase() === "CONNECTED") || null; }
  function providerById(id) { return PROVIDERS.find((provider) => provider.id === id) || null; }
  function setText(el, value) { if (el && el.textContent !== value) el.textContent = value; }

  function forceTechnicalFieldsHidden() {
    if (legacyGenericForm) legacyGenericForm.hidden = true;
    if (legacyGrid) legacyGrid.hidden = true;
    ["emailGenericImapHost", "emailGenericImapPort", "emailGenericSmtpHost", "emailGenericSmtpPort", "emailGenericImapTls", "emailGenericSmtpTls", "emailGenericCustomLabel", "emailGenericProviderKey", "emailZohoDatacenterWrap"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.hidden = true;
      const field = el?.closest?.(".email-field, .email-tls-row");
      if (field) field.hidden = true;
    });
  }

  function cardStatus(provider) {
    const connection = connectionFor(provider.id);
    if (connection) return connection.account_display_hint ? `Verbunden · ${connection.account_display_hint}` : "Verbunden";
    if (provider.id === "microsoft" && catalogRow("microsoft")?.connection_ready !== true) return "Einrichtung läuft";
    if (provider.id === "google") return "Mit Google verbinden";
    if (provider.id === "microsoft") return "Mit Microsoft verbinden";
    return "Verbinden";
  }

  function renderGrid() {
    const grid = document.getElementById("emailLogoProviderGrid");
    if (!grid) return;
    grid.innerHTML = PROVIDERS.map((provider) => {
      const connection = connectionFor(provider.id);
      const unavailable = provider.id === "microsoft" && catalogRow("microsoft")?.connection_ready !== true;
      return `<button class="email-logo-provider-card${connection ? " is-connected" : ""}${unavailable ? " is-unavailable" : ""}" type="button" data-logo-provider="${provider.id}" aria-label="${provider.name} ${connection ? "verbunden" : "verbinden"}">
        <span class="email-logo-provider-top">${LOGOS[provider.logo]}<span class="email-logo-provider-arrow" aria-hidden="true">›</span></span>
        <span><strong>${provider.name}</strong><span class="email-logo-provider-status">${cardStatus(provider)}</span></span>
      </button>`;
    }).join("");
    grid.querySelectorAll("[data-logo-provider]").forEach((button) => button.addEventListener("click", () => openProvider(String(button.dataset.logoProvider || ""))));
  }

  function ensureShell() {
    if (document.getElementById("emailLogoConnectShell")) return;
    const wrapper = legacyGrid?.parentElement || root;
    const shell = document.createElement("div");
    shell.id = "emailLogoConnectShell";
    shell.className = "email-logo-connect-shell";
    shell.innerHTML = `<div class="email-logo-connect-heading"><div><div class="eyebrow">E-Mail-Anbieter</div><h4>Wähle dein Postfach.</h4></div><p>Anbieter anklicken, anmelden und verbinden. Die technische Einrichtung übernimmt NAHWERK im Hintergrund.</p></div><div class="email-logo-provider-grid" id="emailLogoProviderGrid" aria-label="E-Mail-Anbieter"></div>`;
    wrapper.insertBefore(shell, legacyGrid || null);
  }

  function ensureModal() {
    if (document.getElementById("emailProviderConnectBackdrop")) return;
    const backdrop = document.createElement("div");
    backdrop.id = "emailProviderConnectBackdrop";
    backdrop.className = "email-provider-connect-backdrop";
    backdrop.hidden = true;
    backdrop.innerHTML = `<section class="email-provider-connect-modal" role="dialog" aria-modal="true" aria-labelledby="emailProviderConnectTitle">
      <div class="email-provider-connect-head"><div class="email-provider-connect-identity"><span id="emailProviderConnectLogo"></span><div><h3 id="emailProviderConnectTitle">E-Mail verbinden</h3><p id="emailProviderConnectSubtitle">Sicher mit NAHWERK verbinden</p></div></div><button class="email-provider-connect-close" id="emailProviderConnectClose" type="button" aria-label="Schließen">×</button></div>
      <p class="email-provider-connect-copy" id="emailProviderConnectCopy"></p>
      <div id="emailProviderCredentialFields"><label class="email-provider-connect-field"><span>E-Mail-Adresse</span><input id="emailProviderConnectEmail" type="email" inputmode="email" autocomplete="email" maxlength="320" /></label><label class="email-provider-connect-field"><span id="emailProviderConnectSecretLabel">Passwort</span><input id="emailProviderConnectSecret" type="password" autocomplete="new-password" maxlength="512" /></label><p class="email-provider-connect-help" id="emailProviderConnectHelp"></p></div>
      <div class="email-provider-connect-message" id="emailProviderConnectMessage" aria-live="polite"></div>
      <div class="email-provider-connect-actions"><button class="email-provider-connect-secondary" id="emailProviderDisconnect" type="button" hidden>Verbindung trennen</button><button class="email-provider-connect-primary" id="emailProviderConnectSubmit" type="button">Verbinden</button></div>
    </section>`;
    document.body.appendChild(backdrop);
    backdrop.addEventListener("click", (event) => { if (event.target === backdrop) closeModal(); });
    document.getElementById("emailProviderConnectClose")?.addEventListener("click", closeModal);
    document.getElementById("emailProviderConnectSubmit")?.addEventListener("click", () => void submitManual());
    document.getElementById("emailProviderDisconnect")?.addEventListener("click", () => void disconnectSelected());
    document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !backdrop.hidden) closeModal(); });
  }

  function openModal(provider) {
    selected = provider;
    const backdrop = document.getElementById("emailProviderConnectBackdrop");
    const connection = connectionFor(provider.id);
    const logo = document.getElementById("emailProviderConnectLogo");
    if (logo) logo.innerHTML = LOGOS[provider.logo];
    setText(document.getElementById("emailProviderConnectTitle"), provider.name);
    setText(document.getElementById("emailProviderConnectSubtitle"), connection ? "Mit NAHWERK verbunden" : "Sicher mit NAHWERK verbinden");
    setText(document.getElementById("emailProviderConnectCopy"), connection ? "Dieses Postfach ist bereits verbunden. Du kannst die Verbindung hier bei Bedarf trennen." : "Gib nur deine Anmeldedaten ein. Server, Ports und weitere technische Einstellungen übernimmt NAHWERK automatisch.");
    setText(document.getElementById("emailProviderConnectSecretLabel"), provider.secret || "Passwort");
    setText(document.getElementById("emailProviderConnectHelp"), provider.help);
    setText(document.getElementById("emailProviderConnectMessage"), "");
    const fields = document.getElementById("emailProviderCredentialFields");
    if (fields) fields.hidden = Boolean(connection);
    const email = document.getElementById("emailProviderConnectEmail");
    const secret = document.getElementById("emailProviderConnectSecret");
    if (email) email.value = "";
    if (secret) secret.value = "";
    const submit = document.getElementById("emailProviderConnectSubmit");
    if (submit) { submit.hidden = Boolean(connection); submit.disabled = false; submit.textContent = "Verbinden"; }
    const disconnect = document.getElementById("emailProviderDisconnect");
    if (disconnect) { disconnect.hidden = !connection; disconnect.disabled = false; }
    if (backdrop) backdrop.hidden = false;
    setTimeout(() => (connection ? document.getElementById("emailProviderDisconnect") : email)?.focus?.(), 0);
  }

  function closeModal() {
    const secret = document.getElementById("emailProviderConnectSecret");
    if (secret) secret.value = "";
    const backdrop = document.getElementById("emailProviderConnectBackdrop");
    if (backdrop) backdrop.hidden = true;
    selected = null;
  }

  function openProvider(id) {
    const provider = providerById(id);
    if (!provider) return;
    forceTechnicalFieldsHidden();
    if (provider.mode === "google") {
      setText(stateTitle, "Gmail mit NAHWERK verbinden");
      setText(stateMeta, "Du wirst sicher zu Google weitergeleitet. Dein Google-Passwort wird nicht bei NAHWERK eingegeben.");
      legacyGoogle?.click();
      return;
    }
    if (provider.mode === "microsoft") {
      if (catalogRow("microsoft")?.connection_ready === true) {
        setText(stateTitle, "Outlook mit NAHWERK verbinden");
        setText(stateMeta, "Die Microsoft-Anmeldung ist vorbereitet. Dein Microsoft-Passwort wird nicht bei NAHWERK eingegeben.");
      } else {
        setText(stateTitle, "Microsoft-Anmeldung wird eingerichtet.");
        setText(stateMeta, "Outlook ist bereits im NAHWERK E-Mail-System vorbereitet. Die Microsoft-Freigabe für die Anmeldung steht noch aus.");
      }
      if (legacyConnect) legacyConnect.hidden = true;
      return;
    }
    openModal(provider);
  }

  async function refresh() {
    const [catalogData, connectionsData] = await Promise.all([api("/email/provider-catalog"), api("/email/provider-connections")]);
    catalog = Array.isArray(catalogData?.providers) ? catalogData.providers : [];
    connections = Array.isArray(connectionsData?.connections) ? connectionsData.connections : [];
    renderGrid();
  }

  async function submitManual() {
    if (!selected || selected.mode !== "manual" || busy) return;
    const emailEl = document.getElementById("emailProviderConnectEmail");
    const secretEl = document.getElementById("emailProviderConnectSecret");
    const message = document.getElementById("emailProviderConnectMessage");
    const submit = document.getElementById("emailProviderConnectSubmit");
    const email = String(emailEl?.value || "").trim();
    const secret = String(secretEl?.value || "");
    if (!email.includes("@") || !secret) {
      if (message) { message.className = "email-provider-connect-message is-error"; message.textContent = "Bitte E-Mail-Adresse und Passwort prüfen."; }
      return;
    }
    busy = true;
    if (submit) { submit.disabled = true; submit.textContent = "Wird verbunden …"; }
    if (message) { message.className = "email-provider-connect-message"; message.textContent = "NAHWERK prüft die Verbindung. Es wird keine E-Mail gesendet."; }
    try {
      const payload = { provider: selected.id, provider_email: email, username: email, secret };
      if (selected.id === "zoho") payload.connection_metadata = { zoho_datacenter: "com" };
      const data = await api("/email/connect/manual", { method: "POST", body: JSON.stringify(payload) });
      if (secretEl) secretEl.value = "";
      await refresh();
      if (message) { message.className = "email-provider-connect-message is-success"; message.textContent = `${selected.name} ist verbunden.`; }
      setText(stateTitle, `${selected.name} ist mit NAHWERK verbunden.`);
      setText(stateMeta, "Fertig. Dein Concierge kann dieses Postfach jetzt im Rahmen deiner freigegebenen E-Mail-Funktionen nutzen.");
      setText(accountHint, data?.account_display_hint || "");
      setText(runtimeNote, "NAHWERK nutzt deine E-Mail-Verbindung nur für die Funktionen, die du aktiviert hast. Senden bleibt freigabepflichtig.");
      setTimeout(closeModal, 650);
    } catch (error) {
      if (secretEl) secretEl.value = "";
      if (message) { message.className = "email-provider-connect-message is-error"; message.textContent = "Anmeldung konnte nicht bestätigt werden. Prüfe bitte E-Mail-Adresse und das für Mail-Apps vorgesehene Passwort."; }
    } finally {
      busy = false;
      if (submit) { submit.disabled = false; submit.textContent = "Verbinden"; }
    }
  }

  async function disconnectSelected() {
    if (!selected || busy) return;
    const connection = connectionFor(selected.id);
    if (!connection?.connection_id) return;
    const button = document.getElementById("emailProviderDisconnect");
    const message = document.getElementById("emailProviderConnectMessage");
    busy = true;
    if (button) button.disabled = true;
    try {
      await api("/email/provider/disconnect", { method: "POST", body: JSON.stringify({ connection_id: connection.connection_id }) });
      await refresh();
      if (message) { message.className = "email-provider-connect-message is-success"; message.textContent = "Verbindung wurde getrennt."; }
      setText(stateTitle, `${selected.name} wurde getrennt.`);
      setText(stateMeta, "Die gespeicherten Zugangsdaten dieser Verbindung wurden entfernt.");
      setTimeout(closeModal, 500);
    } catch {
      if (message) { message.className = "email-provider-connect-message is-error"; message.textContent = "Die Verbindung konnte gerade nicht getrennt werden."; }
    } finally { busy = false; if (button) button.disabled = false; }
  }

  ensureShell();
  ensureModal();
  forceTechnicalFieldsHidden();

  const observer = new MutationObserver(forceTechnicalFieldsHidden);
  if (legacyGenericForm) observer.observe(legacyGenericForm, { attributes: true, attributeFilter: ["hidden", "style", "class"] });

  void refresh().catch(() => {
    renderGrid();
    setText(runtimeNote, "Die E-Mail-Anbieter werden gerade geladen. Bestehende Verbindungen bleiben unverändert.");
  });
})();
