(() => {
  "use strict";

  const BASE = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-email-runtime";
  const SESSION_KEY = "scb_web_session";
  const CAPABILITIES = ["EMAIL_READ", "EMAIL_SEARCH", "EMAIL_ATTACHMENTS", "EMAIL_DRAFT", "EMAIL_MAILBOX", "EMAIL_SEND"];

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
  const legacyGenericForm = document.getElementById("emailGenericForm");
  const stateTitle = document.getElementById("emailStateTitle");
  const stateMeta = document.getElementById("emailStateMeta");
  const runtimeNote = document.getElementById("emailRuntimeNote");

  let catalog = [];
  let connections = [];
  let selected = null;
  let busy = false;
  let addMode = false;

  function ensureMultiAccountAssets() {
    if (!document.getElementById("emailMultiAccountStyles")) {
      const link = document.createElement("link");
      link.id = "emailMultiAccountStyles";
      link.rel = "stylesheet";
      link.href = "/assets/email-multi-account-v1.css?v=20260917-1";
      document.head.appendChild(link);
    }
    if (!document.getElementById("emailMultiAccountConciergeRuntime")) {
      const script = document.createElement("script");
      script.id = "emailMultiAccountConciergeRuntime";
      script.src = "/assets/email-multi-account-concierge-v1.js?v=20260917-1";
      script.async = true;
      document.body.appendChild(script);
    }
  }

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
    if (!response.ok || data?.ok === false) throw new Error(String(data?.error?.code || data?.error || "EMAIL_REQUEST_FAILED"));
    return data;
  }

  function catalogRow(id) { return catalog.find((row) => String(row?.id || "").toLowerCase() === id) || null; }
  function providerById(id) { return PROVIDERS.find((provider) => provider.id === id) || null; }
  function providerConnections(id) { return connections.filter((row) => String(row?.provider || "").toLowerCase() === id && String(row?.state || "").toUpperCase() === "CONNECTED"); }
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
    const count = providerConnections(provider.id).length;
    if (count === 1) return "1 Konto verbunden";
    if (count > 1) return `${count} Konten verbunden`;
    if (provider.id === "microsoft" && catalogRow("microsoft")?.connection_ready !== true) return "Einrichtung läuft";
    if (provider.id === "google") return "Mit Google verbinden";
    if (provider.id === "microsoft") return "Mit Microsoft verbinden";
    return "Verbinden";
  }

  function renderGrid() {
    const grid = document.getElementById("emailLogoProviderGrid");
    if (!grid) return;
    grid.innerHTML = PROVIDERS.map((provider) => {
      const count = providerConnections(provider.id).length;
      const unavailable = provider.id === "microsoft" && catalogRow("microsoft")?.connection_ready !== true;
      return `<button class="email-logo-provider-card${count ? " is-connected" : ""}${unavailable ? " is-unavailable" : ""}" type="button" data-logo-provider="${provider.id}" aria-label="${provider.name}: ${cardStatus(provider)}">
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
    shell.innerHTML = `<div class="email-logo-connect-heading"><div><div class="eyebrow">E-Mail-Anbieter</div><h4>Verbinde deine Postfächer.</h4></div><p>Du kannst mehrere Konten gleichzeitig verbinden – auch mehrere beim selben Anbieter. Dein Concierge behält die Quellen getrennt und kann sie gemeinsam durchsuchen.</p></div><div class="email-logo-provider-grid" id="emailLogoProviderGrid" aria-label="E-Mail-Anbieter"></div>`;
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
      <div class="email-provider-account-list" id="emailProviderAccountList"></div>
      <button class="email-provider-add-account" id="emailProviderAddAccount" type="button" hidden>+ Weiteres Konto verbinden</button>
      <div id="emailProviderCredentialFields"><label class="email-provider-connect-field"><span>E-Mail-Adresse</span><input id="emailProviderConnectEmail" type="email" inputmode="email" autocomplete="email" maxlength="320" /></label><label class="email-provider-connect-field"><span id="emailProviderConnectSecretLabel">Passwort</span><input id="emailProviderConnectSecret" type="password" autocomplete="new-password" maxlength="512" /></label><p class="email-provider-connect-help" id="emailProviderConnectHelp"></p></div>
      <div class="email-provider-connect-message" id="emailProviderConnectMessage" aria-live="polite"></div>
      <div class="email-provider-connect-actions"><button class="email-provider-connect-secondary" id="emailProviderCancelAdd" type="button" hidden>Abbrechen</button><button class="email-provider-connect-primary" id="emailProviderConnectSubmit" type="button">Verbinden</button></div>
    </section>`;
    document.body.appendChild(backdrop);
    backdrop.addEventListener("click", (event) => { if (event.target === backdrop) closeModal(); });
    document.getElementById("emailProviderConnectClose")?.addEventListener("click", closeModal);
    document.getElementById("emailProviderConnectSubmit")?.addEventListener("click", () => void submitSelected());
    document.getElementById("emailProviderAddAccount")?.addEventListener("click", () => { addMode = true; renderModal(); });
    document.getElementById("emailProviderCancelAdd")?.addEventListener("click", () => { addMode = false; clearCredentials(); renderModal(); });
    document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !backdrop.hidden) closeModal(); });
  }

  function clearCredentials() {
    const email = document.getElementById("emailProviderConnectEmail");
    const secret = document.getElementById("emailProviderConnectSecret");
    if (email) email.value = "";
    if (secret) secret.value = "";
  }

  function renderAccountList() {
    const list = document.getElementById("emailProviderAccountList");
    if (!list || !selected) return;
    const rows = providerConnections(selected.id);
    list.innerHTML = rows.map((connection) => `<div class="email-provider-account-row"><div><strong>${connection.account_display_hint || "Verbundenes Konto"}</strong><span>Verbunden</span></div><button type="button" data-disconnect-connection="${String(connection.connection_id || "")}">Trennen</button></div>`).join("");
    list.hidden = rows.length === 0;
    list.querySelectorAll("[data-disconnect-connection]").forEach((button) => button.addEventListener("click", () => void disconnectConnection(String(button.dataset.disconnectConnection || ""))));
  }

  function renderModal() {
    if (!selected) return;
    const rows = providerConnections(selected.id);
    const ready = selected.id !== "microsoft" || catalogRow("microsoft")?.connection_ready === true;
    const logo = document.getElementById("emailProviderConnectLogo");
    if (logo) logo.innerHTML = LOGOS[selected.logo];
    setText(document.getElementById("emailProviderConnectTitle"), selected.name);
    setText(document.getElementById("emailProviderConnectSubtitle"), rows.length ? `${rows.length} Konto${rows.length === 1 ? "" : "en"} mit NAHWERK verbunden` : "Sicher mit NAHWERK verbinden");
    setText(document.getElementById("emailProviderConnectCopy"), rows.length ? "Du kannst jedes Postfach einzeln trennen oder ein weiteres Konto hinzufügen. Der Concierge hält alle Quellen sauber getrennt." : (selected.mode === "manual" ? "Gib nur deine E-Mail-Adresse und das für Mail-Apps vorgesehene Passwort ein. Server, Ports und technische Einstellungen übernimmt NAHWERK." : "Du meldest dich direkt beim Anbieter an. Dein Anbieter-Passwort wird nicht bei NAHWERK eingegeben."));
    setText(document.getElementById("emailProviderConnectSecretLabel"), selected.secret || "Passwort");
    setText(document.getElementById("emailProviderConnectHelp"), selected.help);
    renderAccountList();

    const credentials = document.getElementById("emailProviderCredentialFields");
    const add = document.getElementById("emailProviderAddAccount");
    const cancel = document.getElementById("emailProviderCancelAdd");
    const submit = document.getElementById("emailProviderConnectSubmit");
    const showConnect = addMode || rows.length === 0;
    if (credentials) credentials.hidden = selected.mode !== "manual" || !showConnect;
    if (add) add.hidden = rows.length === 0 || addMode || !ready;
    if (cancel) cancel.hidden = !addMode || rows.length === 0;
    if (submit) {
      submit.hidden = !showConnect;
      submit.disabled = busy || !ready;
      if (selected.mode === "google") submit.textContent = rows.length ? "Weiteres Gmail-Konto verbinden" : "Mit Google verbinden";
      else if (selected.mode === "microsoft") submit.textContent = ready ? (rows.length ? "Weiteres Outlook-Konto verbinden" : "Mit Microsoft verbinden") : "Microsoft wird freigeschaltet";
      else submit.textContent = rows.length ? "Weiteres Konto verbinden" : "Verbinden";
    }
    if (!ready) setText(document.getElementById("emailProviderConnectMessage"), "Microsoft Outlook ist vorbereitet. Die Microsoft-Anmeldung muss für NAHWERK noch freigeschaltet werden.");
  }

  function openProvider(id) {
    const provider = providerById(id);
    if (!provider) return;
    forceTechnicalFieldsHidden();
    selected = provider;
    addMode = providerConnections(provider.id).length === 0;
    clearCredentials();
    setText(document.getElementById("emailProviderConnectMessage"), "");
    renderModal();
    const backdrop = document.getElementById("emailProviderConnectBackdrop");
    if (backdrop) backdrop.hidden = false;
    setTimeout(() => document.getElementById(provider.mode === "manual" && addMode ? "emailProviderConnectEmail" : "emailProviderConnectSubmit")?.focus?.(), 0);
  }

  function closeModal() {
    clearCredentials();
    const backdrop = document.getElementById("emailProviderConnectBackdrop");
    if (backdrop) backdrop.hidden = true;
    selected = null;
    addMode = false;
  }

  async function refresh() {
    const [catalogData, connectionsData] = await Promise.all([api("/email/provider-catalog"), api("/email/provider-connections")]);
    catalog = Array.isArray(catalogData?.providers) ? catalogData.providers : [];
    connections = Array.isArray(connectionsData?.connections) ? connectionsData.connections : [];
    renderGrid();
    if (selected) renderModal();
    window.dispatchEvent(new CustomEvent("nahwerk:email-connections-updated", { detail: { connections: connections.slice() } }));
  }

  async function connectGoogle() {
    const data = await api("/email/connect", { method: "POST", body: JSON.stringify({ provider: "GOOGLE", requested_capabilities: CAPABILITIES }) });
    const raw = String(data?.authorization_redirect_url || "");
    let url = null;
    try { const parsed = new URL(raw); if (parsed.protocol === "https:" && parsed.hostname === "accounts.google.com") url = parsed.toString(); } catch {}
    if (!url) throw new Error("EMAIL_OAUTH_FAILED");
    window.location.assign(url);
  }

  async function connectMicrosoft() {
    const data = await api("/email/connect/microsoft/web", { method: "POST", body: "{}" });
    const raw = String(data?.authorization_url || "");
    let url = null;
    try { const parsed = new URL(raw); if (parsed.protocol === "https:" && parsed.hostname.endsWith("microsoftonline.com")) url = parsed.toString(); } catch {}
    if (!url) throw new Error("MICROSOFT_OAUTH_FAILED");
    window.location.assign(url);
  }

  async function submitManual() {
    if (!selected || selected.mode !== "manual" || busy) return;
    const emailEl = document.getElementById("emailProviderConnectEmail");
    const secretEl = document.getElementById("emailProviderConnectSecret");
    const message = document.getElementById("emailProviderConnectMessage");
    const email = String(emailEl?.value || "").trim();
    const secret = String(secretEl?.value || "");
    if (!email.includes("@") || !secret) { if (message) message.textContent = "Bitte E-Mail-Adresse und Passwort prüfen."; return; }
    const payload = { provider: selected.id, provider_email: email, username: email, secret };
    if (selected.id === "zoho") payload.connection_metadata = { zoho_datacenter: "com" };
    await api("/email/connect/manual", { method: "POST", body: JSON.stringify(payload) });
    if (secretEl) secretEl.value = "";
    await refresh();
    addMode = false;
    setText(message, `${selected.name} ist verbunden.`);
    setText(stateTitle, `${selected.name} ist mit NAHWERK verbunden.`);
    setText(stateMeta, "Fertig. Dieses Postfach gehört jetzt zu deiner gemeinsamen E-Mail-Übersicht.");
    setText(runtimeNote, "Dein Concierge kann alle verbundenen Postfächer gemeinsam berücksichtigen. Antworten und Versand bleiben immer dem richtigen Konto zugeordnet.");
    renderModal();
  }

  async function submitSelected() {
    if (!selected || busy) return;
    const message = document.getElementById("emailProviderConnectMessage");
    const submit = document.getElementById("emailProviderConnectSubmit");
    busy = true;
    if (submit) submit.disabled = true;
    try {
      if (selected.mode === "google") { setText(message, "Google-Anmeldung wird geöffnet …"); await connectGoogle(); return; }
      if (selected.mode === "microsoft") { setText(message, "Microsoft-Anmeldung wird geöffnet …"); await connectMicrosoft(); return; }
      await submitManual();
    } catch (error) {
      clearCredentials();
      setText(message, selected?.mode === "manual" ? "Anmeldung konnte nicht bestätigt werden. Prüfe bitte E-Mail-Adresse und das für Mail-Apps vorgesehene Passwort." : "Die Anbieter-Anmeldung konnte gerade nicht gestartet werden.");
    } finally {
      busy = false;
      if (submit) submit.disabled = false;
    }
  }

  async function disconnectConnection(connectionId) {
    if (!connectionId || busy) return;
    const message = document.getElementById("emailProviderConnectMessage");
    busy = true;
    try {
      await api("/email/connections/disconnect", { method: "POST", body: JSON.stringify({ connection_id: connectionId }) });
      await refresh();
      setText(message, "Dieses Postfach wurde getrennt.");
      setText(stateTitle, "E-Mail-Verbindung wurde getrennt.");
      setText(stateMeta, "Nur dieses ausgewählte Postfach wurde entfernt. Deine anderen Verbindungen bleiben aktiv.");
      if (selected && providerConnections(selected.id).length === 0) addMode = true;
      renderModal();
    } catch {
      setText(message, "Dieses Postfach konnte gerade nicht getrennt werden. Bitte versuche es erneut.");
    } finally { busy = false; }
  }

  ensureMultiAccountAssets();
  ensureShell();
  ensureModal();
  forceTechnicalFieldsHidden();
  renderGrid();

  const observer = new MutationObserver(forceTechnicalFieldsHidden);
  if (legacyGenericForm) observer.observe(legacyGenericForm, { attributes: true, attributeFilter: ["hidden", "style", "class"] });

  void refresh().catch(() => {
    renderGrid();
    setText(runtimeNote, "Die E-Mail-Anbieter werden gerade geladen. Bestehende Verbindungen bleiben unverändert.");
  });
})();
