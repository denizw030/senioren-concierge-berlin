(() => {
  "use strict";

  const BASE = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-email-runtime";
  const SESSION_KEY = "scb_web_session";
  const RETURN_TO = "https://nahwerkconcierge.com/email-concierge.html";
  const CAPABILITIES = ["EMAIL_READ", "EMAIL_SEARCH", "EMAIL_ATTACHMENTS", "EMAIL_DRAFT", "EMAIL_MAILBOX", "EMAIL_SEND"];
  const PROVIDERS = Object.freeze([
    { id: "google", name: "Gmail", mode: "google", logo: "gmail", secret: "", help: "Mit deinem Google-Konto anmelden und NAHWERK freigeben." },
    { id: "microsoft", name: "Outlook", mode: "microsoft", logo: "microsoft", secret: "", help: "Mit deinem Microsoft-Konto anmelden und NAHWERK freigeben." },
    { id: "yahoo", name: "Yahoo Mail", mode: "manual", logo: "yahoo", secret: "Passwort", credentialKind: "password_first", helpUrl: "https://login.yahoo.com/", helpAction: "Bei Yahoo Mail anmelden" },
    { id: "icloud", name: "iCloud Mail", mode: "manual", logo: "icloud", secret: "Passwort", credentialKind: "password_first", helpUrl: "https://account.apple.com/", helpAction: "Bei iCloud anmelden" },
    { id: "gmx", name: "GMX", mode: "manual", logo: "gmx", secret: "Passwort", credentialKind: "password_first", helpUrl: "https://auth.gmx.net/login?prompt=none&state=eyJpZCI6ImE1NzI4OGY4LTY4YzUtNDVmOC1hMGI3LWQ0Zjk5OGQyOGRhYiIsImNsaWVudElkIjoiZ214bmV0X2FsbGlnYXRvcl9saXZlIiwieFVpQXBwIjoiZ214bmV0LmFsbGlnYXRvci8yLjIuMSIsInBheWxvYWQiOiJleUowWVhKblpYUlZVa2tpT2lKb2RIUndjem92TDNkbFlteHBibXN1WjIxNExtNWxkQzl0WVdsc0wzTm9iM2RUZEdGeWRGWnBaWGNpTENKd2NtOWpaWE56U1dRaU9pSnZhVjl3YTJObE1TSjkifQ%3D%3D&authcode-context=u4lA8TiGpA", helpAction: "Bei GMX anmelden" },
    { id: "webde", name: "WEB.DE", mode: "manual", logo: "webde", secret: "Passwort", credentialKind: "password_first", helpUrl: "https://anmelden.web.de/", helpAction: "Bei WEB.DE anmelden & freigeben" },
    { id: "telekom", name: "Telekom Mail", mode: "manual", logo: "telekom", secret: "Passwort", credentialKind: "password_first", helpUrl: "https://www.telekom.de/tech/sam/ess/login", helpAction: "Bei Telekom anmelden" },
    { id: "fastmail", name: "Fastmail", mode: "manual", logo: "fastmail", secret: "Passwort", credentialKind: "password_first", helpUrl: "https://app.fastmail.com/login/", helpAction: "Bei Fastmail anmelden" },
    { id: "zoho", name: "Zoho Mail", mode: "manual", logo: "zoho", secret: "Passwort", credentialKind: "password_first", helpUrl: "https://accounts.zoho.eu/signin?servicename=ZohoMail", helpAction: "Bei Zoho anmelden" },
    { id: "ionos", name: "IONOS", mode: "manual", logo: "ionos", secret: "Passwort", credentialKind: "password_first", helpUrl: "https://id.ionos.de/identifier?client_app=IONOSMAIL", helpAction: "Bei IONOS anmelden" },
    { id: "strato", name: "STRATO", mode: "manual", logo: "strato", secret: "Passwort", credentialKind: "password_first", helpUrl: "https://webmail.strato.de/", helpAction: "Bei STRATO anmelden" },
    { id: "mailcom", name: "mail.com", mode: "manual", logo: "mailcom", secret: "Passwort", credentialKind: "password_first", helpUrl: "https://account.mail.com/ciss/login", helpAction: "Bei mail.com anmelden" },
    { id: "freenet", name: "freenet", mode: "manual", logo: "freenet", secret: "Passwort", credentialKind: "password_first", helpUrl: "https://mail.freenet.de/", helpAction: "Bei freenet anmelden" },
    { id: "mailboxorg", name: "mailbox.org", mode: "manual", logo: "mailboxorg", secret: "Passwort", credentialKind: "password_first", helpUrl: "https://login.mailbox.org/", helpAction: "Bei mailbox.org anmelden" },
    { id: "vodafone", name: "Vodafone Mail", mode: "manual", logo: "vodafone", secret: "Passwort", credentialKind: "password_first", helpUrl: "https://mail.vodafone.de/", helpAction: "Bei Vodafone anmelden" },
    { id: "arcor", name: "Arcor Mail", mode: "manual", logo: "arcor", secret: "Passwort", credentialKind: "password_first", helpUrl: "https://mail.vodafone.de/", helpAction: "Bei Arcor anmelden" },
    { id: "kabeldeutschland", name: "Kabel Deutschland Mail", mode: "manual", logo: "kabeldeutschland", secret: "Passwort", credentialKind: "password_first", helpUrl: "https://mail.vodafone.de/", helpAction: "Bei Kabel Deutschland anmelden" },
    { id: "unitymedia", name: "Unitymedia Mail", mode: "manual", logo: "unitymedia", secret: "Passwort", credentialKind: "password_first", helpUrl: "https://mail.vodafone.de/", helpAction: "Bei Unitymedia anmelden" },
    { id: "migadu", name: "Migadu", mode: "manual", logo: "migadu", secret: "Passwort", credentialKind: "password_first", helpUrl: "https://webmail.migadu.com/", helpAction: "Bei Migadu anmelden" },
    { id: "proton", name: "Proton Mail", mode: "unsupported", logo: "proton", secret: "", help: "Proton Mail benötigt Proton Bridge auf einem lokalen Gerät. Eine direkte serverseitige Verbindung zu NAHWERK wird derzeit nicht unterstützt." },
    { id: "tuta", name: "Tuta Mail", mode: "unsupported", logo: "tuta", secret: "", help: "Tuta bietet keinen normalen IMAP-Zugriff. Eine direkte Verbindung zu NAHWERK wird derzeit nicht unterstützt." }
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
    strato: '<span class="email-provider-logo email-provider-logo--strato" aria-hidden="true">STRATO</span>',
    mailcom: '<span class="email-provider-logo" aria-hidden="true">mail.com</span>',
    freenet: '<span class="email-provider-logo" aria-hidden="true">freenet</span>',
    mailboxorg: '<span class="email-provider-logo" aria-hidden="true">mailbox.org</span>',
    vodafone: '<span class="email-provider-logo" aria-hidden="true">V</span>',
    arcor: '<span class="email-provider-logo" aria-hidden="true">Arcor</span>',
    kabeldeutschland: '<span class="email-provider-logo" aria-hidden="true">Kabel</span>',
    unitymedia: '<span class="email-provider-logo" aria-hidden="true">Unity</span>',
    migadu: '<span class="email-provider-logo" aria-hidden="true">Migadu</span>',
    proton: '<span class="email-provider-logo" aria-hidden="true">Proton</span>',
    tuta: '<span class="email-provider-logo" aria-hidden="true">Tuta</span>'
  });

  if (typeof document === "undefined") return;
  const root = document.getElementById("accountEmailCard");
  if (!root) return;

  const legacyGrid = root.querySelector(".email-provider-grid");
  const legacyForm = document.getElementById("emailGenericForm");
  const runtimeNote = document.getElementById("emailRuntimeNote");
  let catalog = [];
  let connections = [];
  let selected = null;
  let busy = false;
  let addMode = false;
  let webdeGuideSpoken = false;
  let webdeGuideNeeded = false;
  let credentialGuideNeeded = false;
  let credentialGuideCode = "";
  let webdeGuideAudio = null;
  let webdeGuideAudioUrl = "";
  let webdeGuideAudioPrefetch = null;
  let webdeGuideVideoUrl = "";
  let webdeGuideVideoPromise = null;
  const connectErrors = Object.create(null);

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const setText = (element, value) => { if (element && element.textContent !== String(value ?? "")) element.textContent = String(value ?? ""); };

  function token() {
    try { return String(JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null")?.session_token || ""); }
    catch { return ""; }
  }

  async function api(path, options = {}) {
    const session = token();
    if (!session) throw new Error("UNAUTHENTICATED");
    const headers = { Authorization: `Bearer ${session}`, ...(options.headers || {}) };
    if (options.body != null) headers["Content-Type"] = "application/json";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(BASE + path, { ...options, headers, credentials: "omit", signal: controller.signal });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.ok === false) {
        const error = new Error(String(data?.error?.code || data?.error || "EMAIL_REQUEST_FAILED"));
        error.payload = data;
        error.guidance_code = String(data?.guidance_code || "");
        throw error;
      }
      return data;
    } finally {
      clearTimeout(timeout);
    }
  }

  function assets() {
    if (!document.getElementById("emailMultiAccountStyles")) {
      const link = document.createElement("link");
      link.id = "emailMultiAccountStyles";
      link.rel = "stylesheet";
      link.href = "/assets/email-multi-account-v1.css?v=20260921-1";
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

  function retireLegacyControls() {
    if (legacyForm) legacyForm.hidden = true;
    if (legacyGrid) legacyGrid.hidden = true;
    const stateCard = root.querySelector(".email-state-card");
    const actions = root.querySelector(".email-actions");
    if (stateCard) stateCard.hidden = true;
    if (actions) {
      actions.hidden = true;
      actions.setAttribute("aria-hidden", "true");
      actions.style.setProperty("display", "none", "important");
      actions.querySelectorAll("button").forEach((button) => {
        button.hidden = true;
        button.tabIndex = -1;
      });
    }
    if (runtimeNote) runtimeNote.hidden = true;
    const badge = document.getElementById("emailConnectionStatus");
    if (badge) badge.hidden = true;
  }

  const providerById = (id) => PROVIDERS.find((provider) => provider.id === id) || null;
  const catalogRow = (id) => catalog.find((provider) => String(provider?.id || "").toLowerCase() === id) || null;
  const providerConnections = (id) => connections.filter((connection) => String(connection?.provider || "").toLowerCase() === id && String(connection?.state || "").toUpperCase() === "CONNECTED");
  const providerReady = (provider) => {
    if (provider.mode === "unsupported") return false;
    if (provider.id === "google") return true;
    const row = catalogRow(provider.id);
    if (!row) return false;
    return row.backend_ready !== false && row.connection_ready !== false && row.direct_support !== false;
  };

  function ensureShell() {
    if (document.getElementById("emailLogoConnectShell")) return;
    const wrapper = legacyGrid?.parentElement || root;
    const shell = document.createElement("div");
    shell.id = "emailLogoConnectShell";
    shell.className = "email-logo-connect-shell";
    shell.innerHTML = '<div class="email-logo-connect-heading"><div><div class="eyebrow">E-Mail-Konto</div><h4>E-Mail-Adresse eingeben.</h4></div><p>NAHWERK erkennt den Anbieter automatisch und übernimmt Server, Ports und Verschlüsselung. Du musst keine technischen Daten kennen.</p></div><div class="email-provider-auto-connect"><label class="email-provider-connect-field"><span>E-Mail-Adresse</span><input id="emailAutoConnectEmail" type="email" inputmode="email" autocomplete="email" maxlength="320" placeholder="name@anbieter.de"></label><button class="email-provider-connect-primary" id="emailAutoConnectButton" type="button">E-Mail verbinden</button><p class="email-provider-auto-status" id="emailAutoConnectStatus" aria-live="polite"></p></div><div class="email-provider-divider"><span>Oder Anbieter direkt wählen</span></div><div class="email-logo-provider-grid" id="emailLogoProviderGrid" aria-label="E-Mail-Anbieter"></div>';
    wrapper.insertBefore(shell, legacyGrid || null);
    document.getElementById("emailAutoConnectButton")?.addEventListener("click", () => void autoConnectEmail());
    document.getElementById("emailAutoConnectEmail")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") { event.preventDefault(); void autoConnectEmail(); }
    });
  }

  async function autoConnectEmail() {
    if (busy) return;
    const input = document.getElementById("emailAutoConnectEmail");
    const button = document.getElementById("emailAutoConnectButton");
    const status = document.getElementById("emailAutoConnectStatus");
    const email = String(input?.value || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setText(status, "Bitte eine gültige E-Mail-Adresse eingeben.");
      return;
    }
    busy = true;
    if (button) { button.disabled = true; button.textContent = "Anbieter wird erkannt …"; }
    setText(status, "");
    try {
      const data = await api("/email/connect/auto/web", {
        method: "POST",
        body: JSON.stringify({ email, return_to: RETURN_TO })
      });
      const providerId = String(data?.provider || "").toLowerCase();
      const provider = providerById(providerId);
      if (String(data?.state || "").toUpperCase() === "CONNECTING" && data?.authorization_url) {
        if (providerId === "google") await redirectOAuth(data, (host) => host === "accounts.google.com", "EMAIL_OAUTH_FAILED");
        else if (providerId === "microsoft") await redirectOAuth(data, (host) => host.endsWith("microsoftonline.com"), "MICROSOFT_OAUTH_FAILED");
        else if (providerId === "yahoo") await redirectOAuth(data, (host) => host === "api.login.yahoo.com", "YAHOO_OAUTH_FAILED");
        else throw new Error("EMAIL_PROVIDER_UNAVAILABLE");
        return;
      }
      if (String(data?.state || "").toUpperCase() === "CREDENTIALS_REQUIRED" && provider?.mode === "manual") {
        selected = provider;
        addMode = true;
        webdeGuideSpoken = false;
        webdeGuideNeeded = false;
        credentialGuideNeeded = false;
        credentialGuideCode = "";
        clearCredentials();
        renderModal();
        const backdrop = document.getElementById("emailProviderConnectBackdrop");
        if (backdrop) backdrop.hidden = false;
        const emailField = document.getElementById("emailProviderConnectEmail");
        if (emailField) emailField.value = email;
        setText(document.getElementById("emailProviderConnectMessage"), `${data?.provider_label || provider.name} wurde automatisch erkannt. Gib jetzt dein normales Passwort ein.`);
        return;
      }
      throw new Error("EMAIL_PROVIDER_UNAVAILABLE");
    } catch (error) {
      const code = String(error?.message || "EMAIL_REQUEST_FAILED");
      if (code === "email_provider_not_directly_supported") {
        setText(status, "Dieser Anbieter unterstützt keine direkte Server-Verbindung mit NAHWERK.");
      } else if (code === "email_provider_selection_required") {
        setText(status, "Anbieter konnte nicht eindeutig erkannt werden. Wähle ihn unten direkt aus.");
      } else if (code === "UNAUTHENTICATED") {
        setText(status, "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.");
      } else {
        setText(status, "Die Verbindung konnte gerade nicht gestartet werden. Bitte versuche es erneut.");
      }
    } finally {
      busy = false;
      if (button) { button.disabled = !token(); button.textContent = "E-Mail verbinden"; }
      if (selected) renderModal();
      renderGrid();
    }
  }

  function renderGrid() {
    const grid = document.getElementById("emailLogoProviderGrid");
    if (!grid) return;
    grid.innerHTML = PROVIDERS.filter((provider) => provider.mode !== "unsupported").map((provider) => {
      const rows = providerConnections(provider.id);
      const connected = rows.length > 0;
      const ready = providerReady(provider);
      const row = catalogRow(provider.id);
      const googleApprovalPending = provider.id === "google" && !!row && (row.backend_ready === false || row.connection_ready === false || row.direct_support === false);
      const connectError = String(connectErrors[provider.id] || "");
      const status = connected
        ? `${rows.length} Konto${rows.length === 1 ? "" : "en"} verbunden`
        : connectError || (googleApprovalPending ? "Sicher vorgesehen · Google-Freigabe ausstehend" : (!ready ? "Noch nicht verfügbar" : ""));
      const primary = `<button class="email-provider-add-account email-provider-card-primary" type="button" data-provider-primary="${provider.id}"${!ready && !connected ? " disabled" : ""}>${connected ? "Trennen" : "Verbinden"}</button>`;
      return `<article class="email-logo-provider-card${connected ? " is-connected" : ""}${!ready ? " is-unavailable" : ""}" data-logo-provider="${provider.id}">
        <span class="email-logo-provider-top">${LOGOS[provider.logo]}</span>
        <span><strong>${esc(provider.name)}</strong>${status ? `<span class="email-logo-provider-status">${esc(status)}</span>` : ""}</span>
        <div class="email-provider-card-actions">
          ${primary}
          ${connected && ready ? `<button class="email-provider-connect-secondary email-provider-card-secondary" type="button" data-provider-add="${provider.id}">+ Weiteres Konto</button>` : ""}
        </div>
      </article>`;
    }).join("");

    grid.querySelectorAll("[data-provider-primary]").forEach((button) => button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      void primaryAction(String(button.dataset.providerPrimary || ""));
    }));
    grid.querySelectorAll("[data-provider-add]").forEach((button) => button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      void addAccount(String(button.dataset.providerAdd || ""));
    }));
  }

  function ensureModal() {
    if (document.getElementById("emailProviderConnectBackdrop")) return;
    const backdrop = document.createElement("div");
    backdrop.id = "emailProviderConnectBackdrop";
    backdrop.className = "email-provider-connect-backdrop";
    backdrop.hidden = true;
    backdrop.innerHTML = '<section class="email-provider-connect-modal" role="dialog" aria-modal="true" aria-labelledby="emailProviderConnectTitle"><div class="email-provider-connect-head"><div class="email-provider-connect-identity"><span id="emailProviderConnectLogo"></span><div><h3 id="emailProviderConnectTitle">E-Mail verbinden</h3><p id="emailProviderConnectSubtitle">Sicher mit NAHWERK verbinden</p></div></div><button class="email-provider-connect-close" id="emailProviderConnectClose" type="button" aria-label="Schließen">×</button></div><p class="email-provider-connect-copy" id="emailProviderConnectCopy"></p><div class="email-provider-account-list" id="emailProviderAccountList"></div><button class="email-provider-add-account" id="emailProviderAddAccount" type="button" hidden>+ Weiteres Konto verbinden</button><div id="emailProviderCredentialFields"><label class="email-provider-connect-field"><span>E-Mail-Adresse</span><input id="emailProviderConnectEmail" type="email" inputmode="email" autocomplete="email" maxlength="320"></label><label class="email-provider-connect-field"><span id="emailProviderConnectSecretLabel">Passwort</span><input id="emailProviderConnectSecret" type="password" autocomplete="current-password" maxlength="512"></label><div id="emailProviderZohoOptions" hidden><label class="email-provider-connect-field"><span>Zoho-Rechenzentrum</span><select id="emailProviderZohoDc"><option value="com">Global (.com)</option><option value="eu">Europa (.eu)</option><option value="in">Indien (.in)</option><option value="com.au">Australien (.com.au)</option><option value="jp">Japan (.jp)</option><option value="ca">Kanada (.ca)</option><option value="sa">Saudi-Arabien (.sa)</option></select></label><label class="email-provider-connect-field"><span><input id="emailProviderZohoOrganization" type="checkbox"> Organisations-/Business-Postfach</span></label></div><button class="email-provider-connect-primary email-provider-connect-inline-submit" id="emailProviderConnectSubmit" type="button">Verbinden</button><div class="email-provider-webde-guide" id="emailProviderCredentialGuide" hidden><strong id="emailProviderCredentialGuideTitle"></strong><ol id="emailProviderCredentialGuideSteps"></ol><div class="email-provider-webde-guide-actions"><a class="email-provider-webde-login" id="emailProviderCredentialHelpLink" href="#" target="_blank" rel="noopener noreferrer" hidden></a></div><div class="email-provider-webde-video"><button class="email-provider-webde-video-toggle" id="emailProviderCredentialVideoToggle" type="button" disabled aria-expanded="false"><span class="email-provider-webde-video-play" aria-hidden="true">▶</span><span><strong>Video-Anleitung ansehen</strong><small id="emailProviderCredentialVideoHint">Video folgt</small></span></button><video id="emailProviderCredentialVideo" class="email-provider-webde-video-player" preload="none" playsinline muted controls hidden></video></div><span class="email-provider-webde-return" id="emailProviderCredentialReturn"></span></div><div class="email-provider-webde-guide" id="emailProviderWebdeGuide" hidden><strong>WEB.DE einmal freigeben</strong><ol><li>Bei WEB.DE anmelden.</li><li>E-Mail-Einstellungen → POP3/IMAP öffnen.</li><li>„POP3- und IMAP-Zugriff erlauben“ einschalten.</li></ol><div class="email-provider-webde-guide-actions"><button class="email-provider-connect-secondary" id="emailProviderWebdeSpeak" type="button">Lena anhören</button><a class="email-provider-webde-login" id="emailProviderWebdeLogin" href="https://auth.web.de/login?prompt=none&amp;state=eyJpZCI6IjczMWU1ZjhhLTgxNTItNGIyZC05YWQzLTlkZTkzZjM2YTY0MiIsImNsaWVudElkIjoid2ViZGVfYWxsaWdhdG9yX2xpdmUiLCJ4VWlBcHAiOiJ3ZWJkZS5hbGxpZ2F0b3IvMi4yLjEiLCJwYXlsb2FkIjoiZXlKMFlYSm5aWFJWVWtraU9pSm9kSFJ3Y3pvdkwzZGxZbXhwYm1zdWQyVmlMbVJsTDIxaGFXd3ZjMmh2ZDFOMFlYSjBWbWxsZHlJc0luQnliMk5sYzNOSlpDSTZJbTlwWDNCclkyVXhJbjA9In0%3D&amp;authcode-context=VD0Cgr9WhV" target="_blank" rel="noopener noreferrer">Bei WEB.DE anmelden</a></div><div class="email-provider-webde-video"><button class="email-provider-webde-video-toggle" id="emailProviderWebdeVideoToggle" type="button" aria-expanded="false"><span class="email-provider-webde-video-play" aria-hidden="true">▶</span><span><strong>Video-Anleitung ansehen</strong><small>So aktivierst du POP3/IMAP bei WEB.DE</small></span></button><video id="emailProviderWebdeVideo" class="email-provider-webde-video-player" preload="none" playsinline muted controls hidden></video></div><span class="email-provider-webde-return">Danach zu NAHWERK zurückkehren, Passwort eingeben und verbinden.</span></div><p class="email-provider-connect-help" id="emailProviderConnectHelp"></p><p class="email-provider-security-note">NAHWERK trägt Server, Ports und Verschlüsselung automatisch ein. Deine Zugangsdaten werden nicht im Browser dauerhaft gespeichert.</p></div><div class="email-provider-connect-message" id="emailProviderConnectMessage" aria-live="polite"></div><div class="email-provider-connect-actions" id="emailProviderConnectActions"><button class="email-provider-connect-secondary" id="emailProviderCancelAdd" type="button" hidden>Abbrechen</button></div></section>';
    document.body.appendChild(backdrop);
    backdrop.addEventListener("click", (event) => { if (event.target === backdrop) closeModal(); });
    document.getElementById("emailProviderConnectClose")?.addEventListener("click", closeModal);
    document.getElementById("emailProviderConnectSubmit")?.addEventListener("click", () => void submitManual());
    document.getElementById("emailProviderWebdeSpeak")?.addEventListener("click", speakWebdeGuide);
    document.getElementById("emailProviderWebdeLogin")?.addEventListener("click", copyWebdeEmailForLogin);
    document.getElementById("emailProviderCredentialHelpLink")?.addEventListener("click", copyProviderEmailForHelpLink);
    document.getElementById("emailProviderWebdeVideoToggle")?.addEventListener("click", () => void toggleWebdeGuideVideo());
    document.getElementById("emailProviderAddAccount")?.addEventListener("click", () => { addMode = true; renderModal(); });
    document.getElementById("emailProviderCancelAdd")?.addEventListener("click", () => { addMode = false; clearCredentials(); renderModal(); });
    document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !backdrop.hidden) closeModal(); });
  }

  function clearCredentials() {
    const email = document.getElementById("emailProviderConnectEmail");
    const secret = document.getElementById("emailProviderConnectSecret");
    const zohoDc = document.getElementById("emailProviderZohoDc");
    const zohoOrg = document.getElementById("emailProviderZohoOrganization");
    if (email) email.value = "";
    if (secret) secret.value = "";
    if (zohoDc) zohoDc.value = "com";
    if (zohoOrg) zohoOrg.checked = false;
  }

  function clearSecretOnly() {
    const secret = document.getElementById("emailProviderConnectSecret");
    if (secret) secret.value = "";
  }

  function legacyCopyText(value) {
    const text = String(value || "");
    if (!text) return false;
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.setAttribute("aria-hidden", "true");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    let copied = false;
    try { copied = document.execCommand("copy"); } catch {}
    textarea.remove();
    return copied;
  }

  function copyProviderEmailForHelpLink() {
    if (!selected || selected.mode !== "manual" || selected.id === "webde") return;
    const email = String(document.getElementById("emailProviderConnectEmail")?.value || "").trim();
    if (!email) return;
    const message = document.getElementById("emailProviderConnectMessage");
    let copied = legacyCopyText(email);
    const label = selected?.name || "Anbieter";
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      void navigator.clipboard.writeText(email)
        .then(() => {
          copied = true;
          setText(message, `E-Mail-Adresse kopiert. Bei ${label} einfach einfügen.`);
        })
        .catch(() => {
          if (!copied) copied = legacyCopyText(email);
          setText(message, copied ? `E-Mail-Adresse kopiert. Bei ${label} einfach einfügen.` : `${label} wird geöffnet. Kopiere deine E-Mail-Adresse bei Bedarf aus dem Feld oben.`);
        });
    } else {
      setText(message, copied ? `E-Mail-Adresse kopiert. Bei ${label} einfach einfügen.` : `${label} wird geöffnet. Kopiere deine E-Mail-Adresse bei Bedarf aus dem Feld oben.`);
    }
  }
  function copyWebdeEmailForLogin() {
    if (selected?.id !== "webde") return;
    const email = String(document.getElementById("emailProviderConnectEmail")?.value || "").trim();
    if (!email) return;
    const message = document.getElementById("emailProviderConnectMessage");
    let copied = legacyCopyText(email);
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      void navigator.clipboard.writeText(email)
        .then(() => {
          copied = true;
          setText(message, "E-Mail-Adresse kopiert. Bei WEB.DE einfach einfügen.");
        })
        .catch(() => {
          if (!copied) copied = legacyCopyText(email);
          setText(message, copied ? "E-Mail-Adresse kopiert. Bei WEB.DE einfach einfügen." : "WEB.DE wird geöffnet. Kopiere deine E-Mail-Adresse bei Bedarf aus dem Feld oben.");
        });
    } else {
      setText(message, copied ? "E-Mail-Adresse kopiert. Bei WEB.DE einfach einfügen." : "WEB.DE wird geöffnet. Kopiere deine E-Mail-Adresse bei Bedarf aus dem Feld oben.");
    }
  }

  async function fetchWebdeGuideAudioBlob() {
    const session = token();
    if (!session) throw new Error("UNAUTHENTICATED");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(BASE + "/email/guidance/webde/audio", {
        method: "GET",
        headers: { Authorization: `Bearer ${session}` },
        credentials: "omit",
        signal: controller.signal
      });
      if (!response.ok) throw new Error("LENA_AUDIO_FAILED");
      const blob = await response.blob();
      if (!blob.size || !String(blob.type || "").startsWith("audio/")) throw new Error("LENA_AUDIO_INVALID");
      return blob;
    } finally {
      clearTimeout(timeout);
    }
  }

  function prefetchWebdeGuideAudio() {
    if (selected?.id !== "webde") return;
    webdeGuideAudioPrefetch = fetchWebdeGuideAudioBlob().catch(() => null);
  }

  async function ensureWebdeGuideVideoUrl() {
    if (webdeGuideVideoUrl) return webdeGuideVideoUrl;
    if (!webdeGuideVideoPromise) {
      webdeGuideVideoPromise = fetch("/assets/webde-guide-video.b64?v=20260922-1", { credentials: "same-origin" })
        .then((response) => {
          if (!response.ok) throw new Error("WEBDE_VIDEO_FAILED");
          return response.text();
        })
        .then((base64) => {
          const binary = atob(String(base64 || "").trim());
          const bytes = new Uint8Array(binary.length);
          for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
          webdeGuideVideoUrl = URL.createObjectURL(new Blob([bytes], { type: "video/mp4" }));
          return webdeGuideVideoUrl;
        })
        .finally(() => { webdeGuideVideoPromise = null; });
    }
    return webdeGuideVideoPromise;
  }

  function resetWebdeGuideVideo(revoke = false) {
    const video = document.getElementById("emailProviderWebdeVideo");
    const button = document.getElementById("emailProviderWebdeVideoToggle");
    if (video) {
      try { video.pause(); video.currentTime = 0; } catch {}
      video.hidden = true;
      if (revoke) video.removeAttribute("src");
    }
    if (button) {
      button.disabled = false;
      button.setAttribute("aria-expanded", "false");
      const strong = button.querySelector("strong");
      if (strong) strong.textContent = "Video-Anleitung ansehen";
    }
    if (revoke && webdeGuideVideoUrl) {
      try { URL.revokeObjectURL(webdeGuideVideoUrl); } catch {}
      webdeGuideVideoUrl = "";
    }
    if (revoke) webdeGuideVideoPromise = null;
  }

  async function toggleWebdeGuideVideo() {
    if (selected?.id !== "webde" || !webdeGuideNeeded) return;
    const video = document.getElementById("emailProviderWebdeVideo");
    const button = document.getElementById("emailProviderWebdeVideoToggle");
    if (!video || !button) return;
    const strong = button.querySelector("strong");

    if (!video.hidden) {
      video.pause();
      video.hidden = true;
      button.setAttribute("aria-expanded", "false");
      if (strong) strong.textContent = "Video-Anleitung ansehen";
      return;
    }

    button.disabled = true;
    if (strong) strong.textContent = "Video wird geladen …";
    try {
      const url = await ensureWebdeGuideVideoUrl();
      if (!video.src) video.src = url;
      video.hidden = false;
      button.setAttribute("aria-expanded", "true");
      if (strong) strong.textContent = "Video ausblenden";
      await video.play().catch(() => {});
      video.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch {
      if (strong) strong.textContent = "Video konnte nicht geladen werden";
    } finally {
      button.disabled = false;
    }
  }

  function stopWebdeGuideAudio() {
    if (webdeGuideAudio) {
      try { webdeGuideAudio.pause(); webdeGuideAudio.currentTime = 0; } catch {}
      webdeGuideAudio = null;
    }
    if (webdeGuideAudioUrl) {
      try { URL.revokeObjectURL(webdeGuideAudioUrl); } catch {}
      webdeGuideAudioUrl = "";
    }
    const button = document.getElementById("emailProviderWebdeSpeak");
    if (button) { button.disabled = false; button.textContent = "Lena anhören"; }
  }

  async function speakWebdeGuide() {
    if (selected?.id !== "webde") return;
    if (webdeGuideAudio && !webdeGuideAudio.paused) {
      stopWebdeGuideAudio();
      return;
    }
    const button = document.getElementById("emailProviderWebdeSpeak");
    if (button) { button.disabled = true; button.textContent = "Lena wird geladen …"; }
    try {
      const prefetched = webdeGuideAudioPrefetch ? await webdeGuideAudioPrefetch : null;
      webdeGuideAudioPrefetch = null;
      const blob = prefetched || await fetchWebdeGuideAudioBlob();
      stopWebdeGuideAudio();
      webdeGuideAudioUrl = URL.createObjectURL(blob);
      const audio = new Audio(webdeGuideAudioUrl);
      audio.preload = "auto";
      audio.addEventListener("ended", stopWebdeGuideAudio, { once: true });
      audio.addEventListener("error", stopWebdeGuideAudio, { once: true });
      webdeGuideAudio = audio;
      await audio.play();
      if (button) { button.disabled = false; button.textContent = "Lena stoppen"; }
    } catch {
      webdeGuideAudioPrefetch = null;
      stopWebdeGuideAudio();
    }
  }

  function maybeSpeakWebdeGuide() {
    if (selected?.id !== "webde" || webdeGuideSpoken) return;
    webdeGuideSpoken = true;
    setTimeout(() => void speakWebdeGuide(), 80);
  }


  function renderAccounts() {
    const list = document.getElementById("emailProviderAccountList");
    if (!list || !selected) return;
    const rows = providerConnections(selected.id);
    list.innerHTML = rows.map((connection) => `<div class="email-provider-account-row"><div><strong>${esc(connection.account_display_hint || "Verbundenes Konto")}</strong><span>Verbunden</span></div><button type="button" data-disconnect-connection="${esc(connection.connection_id || "")}">Trennen</button></div>`).join("");
    list.hidden = rows.length === 0;
    list.querySelectorAll("[data-disconnect-connection]").forEach((button) => button.addEventListener("click", () => void disconnect(String(button.dataset.disconnectConnection || ""), false)));
  }

  function renderModal() {
    if (!selected) return;
    const rows = providerConnections(selected.id);
    const logo = document.getElementById("emailProviderConnectLogo");
    if (logo) logo.innerHTML = LOGOS[selected.logo];
    setText(document.getElementById("emailProviderConnectTitle"), selected.name);
    setText(document.getElementById("emailProviderConnectSubtitle"), rows.length ? `${rows.length} Konto${rows.length === 1 ? "" : "en"} verbunden` : "Sicher verbinden");
    setText(document.getElementById("emailProviderConnectCopy"), rows.length ? "Wähle das Konto, das du trennen möchtest. Weitere Konten kannst du jederzeit zusätzlich verbinden." : "Gib deine E-Mail-Adresse und dein normales Passwort ein. NAHWERK übernimmt Server, Ports und technische Einstellungen automatisch.");
    setText(document.getElementById("emailProviderConnectSecretLabel"), "Passwort");
    setText(document.getElementById("emailProviderConnectHelp"), "");
    const guide = document.getElementById("emailProviderCredentialGuide");
    const guideTitle = document.getElementById("emailProviderCredentialGuideTitle");
    const guideSteps = document.getElementById("emailProviderCredentialGuideSteps");
    const helpLink = document.getElementById("emailProviderCredentialHelpLink");
    const guideVideoHint = document.getElementById("emailProviderCredentialVideoHint");
    const guideReturn = document.getElementById("emailProviderCredentialReturn");
    const webdeGuide = document.getElementById("emailProviderWebdeGuide");
    if (selected.mode === "manual" && credentialGuideNeeded && selected.id !== "webde") {
      const guidance = providerCredentialFailureGuide(selected, { guidance_code: credentialGuideCode });
      if (guide) guide.hidden = false;
      setText(guideTitle, guidance.title);
      if (guideSteps) guideSteps.innerHTML = guidance.steps.map((step) => `<li>${esc(step)}</li>`).join("");
      setText(guideVideoHint, guidance.videoHint);
      setText(guideReturn, guidance.returnText);
      if (helpLink) {
        const href = String(selected.helpUrl || "");
        helpLink.hidden = !href;
        helpLink.href = href || "#";
        helpLink.textContent = String(selected.helpAction || `Bei ${selected.name} anmelden`);
      }
    } else {
      if (guide) guide.hidden = true;
      if (guideSteps) guideSteps.innerHTML = "";
      if (helpLink) helpLink.hidden = true;
    }
    renderAccounts();

    const fields = document.getElementById("emailProviderCredentialFields");
    const zohoOptions = document.getElementById("emailProviderZohoOptions");
    const add = document.getElementById("emailProviderAddAccount");
    const cancel = document.getElementById("emailProviderCancelAdd");
    const actions = document.getElementById("emailProviderConnectActions");
    const submit = document.getElementById("emailProviderConnectSubmit");
    const showCredentials = selected.mode === "manual" && (addMode || rows.length === 0);
    if (webdeGuide) {
      const showWebdeGuide = selected.id === "webde" && showCredentials && webdeGuideNeeded;
      webdeGuide.hidden = !showWebdeGuide;
      if (!showWebdeGuide) resetWebdeGuideVideo();
    }
    if (fields) fields.hidden = !showCredentials;
    if (zohoOptions) zohoOptions.hidden = !showCredentials || selected.id !== "zoho";
    if (add) add.hidden = selected.mode !== "manual" || rows.length === 0 || addMode;
    if (cancel) cancel.hidden = !addMode || rows.length === 0;
    if (actions) actions.hidden = !addMode || rows.length === 0;
    if (submit) {
      submit.hidden = !showCredentials;
      submit.disabled = busy;
      submit.textContent = rows.length ? "Weiteres Konto verbinden" : "Verbinden";
    }
  }

  function openManual(provider, adding = false) {
    selected = provider;
    addMode = adding || providerConnections(provider.id).length === 0;
    webdeGuideSpoken = false;
    webdeGuideNeeded = false;
    credentialGuideNeeded = false;
    credentialGuideCode = "";
    clearCredentials();
    setText(document.getElementById("emailProviderConnectMessage"), "");
    renderModal();
    const backdrop = document.getElementById("emailProviderConnectBackdrop");
    if (backdrop) backdrop.hidden = false;
    setTimeout(() => document.getElementById("emailProviderConnectEmail")?.focus?.(), 0);
  }

  function openManage(provider) {
    selected = provider;
    addMode = false;
    clearCredentials();
    setText(document.getElementById("emailProviderConnectMessage"), "");
    renderModal();
    const backdrop = document.getElementById("emailProviderConnectBackdrop");
    if (backdrop) backdrop.hidden = false;
  }

  function closeModal() {
    clearCredentials();
    webdeGuideSpoken = false;
    webdeGuideNeeded = false;
    credentialGuideNeeded = false;
    credentialGuideCode = "";
    webdeGuideAudioPrefetch = null;
    resetWebdeGuideVideo(true);
    stopWebdeGuideAudio();
    const backdrop = document.getElementById("emailProviderConnectBackdrop");
    if (backdrop) backdrop.hidden = true;
    selected = null;
    addMode = false;
  }

  async function refresh() {
    const [catalogResponse, connectionResponse] = await Promise.all([api("/email/provider-catalog"), api("/email/provider-connections")]);
    catalog = Array.isArray(catalogResponse?.providers) ? catalogResponse.providers : [];
    connections = Array.isArray(connectionResponse?.connections) ? connectionResponse.connections : [];
    window.__nahwerkEmailConnections = connections.slice();
    renderGrid();
    if (selected) renderModal();
    window.dispatchEvent(new CustomEvent("nahwerk:email-connections-updated", { detail: { connections: connections.slice() } }));
  }

  async function redirectOAuth(data, hostTest, errorCode) {
    const raw = String(data?.authorization_url || data?.authorization_redirect_url || "");
    const url = new URL(raw);
    if (url.protocol !== "https:" || !hostTest(url.hostname)) throw new Error(errorCode);
    window.location.assign(url.toString());
  }

  async function startGoogle() {
    const data = await api("/email/connect", { method: "POST", body: JSON.stringify({ provider: "GOOGLE", requested_capabilities: CAPABILITIES }) });
    await redirectOAuth(data, (host) => host === "accounts.google.com", "EMAIL_OAUTH_FAILED");
  }

  function oauthConnectErrorMessage(provider, error) {
    const code = String(error?.message || error || "EMAIL_REQUEST_FAILED");
    if (error?.name === "AbortError") return "Die Verbindung hat zu lange gedauert. Bitte versuche es erneut.";
    if (code === "UNAUTHENTICATED") return "Deine Sitzung ist abgelaufen. Bitte melde dich erneut bei NAHWERK an.";
    if (code === "EMAIL_IDENTITY_BINDING_FAILED") return "Dein NAHWERK-Konto konnte nicht eindeutig zugeordnet werden. Bitte melde dich erneut an.";
    if (code === "EMAIL_PROVIDER_UNAVAILABLE") return provider?.id === "google"
      ? "Google konnte gerade nicht verbunden werden. Bitte versuche es erneut."
      : "Dieser Anbieter konnte gerade nicht verbunden werden. Bitte versuche es erneut.";
    if (code === "EMAIL_OAUTH_FAILED") return provider?.id === "google"
      ? "Die sichere Google-Anmeldung konnte nicht gestartet werden. Bitte versuche es erneut."
      : "Die sichere Anmeldung konnte nicht gestartet werden. Bitte versuche es erneut.";
    return "Die Verbindung konnte nicht gestartet werden. Bitte versuche es erneut.";
  }

  async function startMicrosoft() {
    const data = await api("/email/connect/microsoft/web", { method: "POST", body: JSON.stringify({ return_to: RETURN_TO }) });
    await redirectOAuth(data, (host) => host.endsWith("microsoftonline.com"), "MICROSOFT_OAUTH_FAILED");
  }

  async function startYahoo() {
    const data = await api("/email/connect/yahoo/web", { method: "POST", body: JSON.stringify({ return_to: RETURN_TO }) });
    await redirectOAuth(data, (host) => host === "api.login.yahoo.com", "YAHOO_OAUTH_FAILED");
  }

  async function connectProvider(provider) {
    if (busy || provider.mode === "unsupported" || !providerReady(provider)) return;
    if (provider.mode === "manual") { openManual(provider, true); return; }
    delete connectErrors[provider.id];
    busy = true;
    renderGrid();
    try {
      if (provider.mode === "google") await startGoogle();
      else if (provider.mode === "microsoft") await startMicrosoft();
      else if (provider.mode === "yahoo") await startYahoo();
    } catch (error) {
      connectErrors[provider.id] = oauthConnectErrorMessage(provider, error);
      window.dispatchEvent(new CustomEvent("nahwerk:email-provider-connect-error", {
        detail: { provider: provider.id, code: String(error?.message || "EMAIL_REQUEST_FAILED") }
      }));
    } finally {
      busy = false;
      renderGrid();
    }
  }

  async function primaryAction(id) {
    const provider = providerById(id);
    if (!provider || busy || provider.mode === "unsupported") return;
    const rows = providerConnections(id);
    if (!rows.length) { await connectProvider(provider); return; }
    if (rows.length === 1) {
      const confirmed = window.confirm(`${provider.name} wirklich trennen?`);
      if (confirmed) await disconnect(String(rows[0].connection_id || ""), true);
      return;
    }
    openManage(provider);
  }

  async function addAccount(id) {
    const provider = providerById(id);
    if (!provider || busy || provider.mode === "unsupported") return;
    await connectProvider(provider);
  }

  function providerCredentialFailureGuide(provider, error) {
    const code = String(error?.guidance_code || error?.payload?.guidance_code || "");
    const id = String(provider?.id || "").toLowerCase();
    const name = String(provider?.name || "deinem Anbieter");
    if (id === "gmx" && code === "CHECK_MAILBOX_PASSWORD") {
      return {
        code,
        title: "GMX Passwort prüfen",
        steps: ["Bei GMX anmelden und prüfen, ob das normale Postfach-Passwort funktioniert.", "Das Passwort des GMX-Postfachs erneut bei NAHWERK eingeben.", "Falls Zwei-Faktor-Schutz die Anmeldung blockiert, die GMX-Sicherheitseinstellungen prüfen."],
        videoHint: "So prüfst du deinen GMX Mail-Zugang",
        returnText: "Danach zu NAHWERK zurückkehren und erneut verbinden."
      };
    }
    const guides = {
      gmx: {
        title: "GMX einmal freigeben",
        steps: ["Bei GMX anmelden.", "E-Mail-Einstellungen → POP3/IMAP öffnen.", "„POP3- und IMAP-Zugriff erlauben“ einschalten."],
        videoHint: "So aktivierst du POP3/IMAP bei GMX"
      },
      yahoo: {
        title: "Yahoo App-Passwort erstellen",
        steps: ["Bei Yahoo anmelden.", "Account-Sicherheit → Externe Verbindungen öffnen.", "App-Passwort erstellen und anschließend hier verwenden."],
        videoHint: "So erstellst du ein Yahoo App-Passwort"
      },
      telekom: {
        title: "Telekom Passwort für E-Mail-Programme",
        steps: ["Bei Telekom anmelden.", "Im E-Mail Center ein „Passwort für E-Mail-Programme“ einrichten.", "Dieses Passwort anschließend hier verwenden."],
        videoHint: "So richtest du das E-Mail-Programm-Passwort ein"
      },
      icloud: {
        title: "iCloud App-Passwort erstellen",
        steps: ["Bei deinem Apple Account anmelden.", "Anmeldung & Sicherheit → App-spezifische Passwörter öffnen.", "App-spezifisches Passwort erstellen und anschließend hier verwenden."],
        videoHint: "So erstellst du ein iCloud App-Passwort"
      },
      fastmail: {
        title: "Fastmail App-Passwort erstellen",
        steps: ["Bei Fastmail anmelden.", "Einstellungen → Datenschutz & Sicherheit → App-Passwörter öffnen.", "App-Passwort erstellen; Fastmail Basic unterstützt kein IMAP/SMTP."],
        videoHint: "So erstellst du ein Fastmail App-Passwort"
      },
      zoho: {
        title: "Zoho IMAP-Zugriff freigeben",
        steps: ["Bei Zoho anmelden.", "In Zoho Mail den IMAP-Zugriff aktivieren.", "Bei MFA ein anwendungsspezifisches Passwort erstellen und anschließend hier verwenden."],
        videoHint: "So aktivierst du IMAP bei Zoho"
      },
      ionos: {
        title: "IONOS Zugang prüfen",
        steps: ["Bei IONOS Webmail anmelden.", "E-Mail-Adresse und Passwort dieses Postfachs prüfen.", "Danach mit demselben Postfach-Passwort bei NAHWERK erneut verbinden."],
        videoHint: "So prüfst du deinen IONOS Mail-Zugang"
      },
      strato: {
        title: "STRATO Zugang prüfen",
        steps: ["Bei STRATO Webmail anmelden.", "E-Mail-Adresse und Passwort dieses Postfachs prüfen.", "Danach mit demselben E-Mail-Passwort bei NAHWERK erneut verbinden."],
        videoHint: "So prüfst du deinen STRATO Mail-Zugang"
      },
      mailcom: {
        title: "mail.com IMAP-Zugriff prüfen",
        steps: ["Bei mail.com anmelden.", "Prüfen, ob dein Tarif POP3/IMAP unterstützt – das ist eine Premium-Funktion.", "Bei Premium mit dem E-Mail-Passwort erneut bei NAHWERK verbinden."],
        videoHint: "So prüfst du POP3/IMAP bei mail.com"
      },
      freenet: {
        title: "freenet E-Mail-Zugriff aktivieren",
        steps: ["Bei freenet anmelden.", "POP3/IMAP/SMTP für externe E-Mail-Programme aktivieren.", "Danach mit demselben E-Mail-Passwort erneut verbinden."],
        videoHint: "So aktivierst du den E-Mail-Zugriff bei freenet"
      },
      mailboxorg: {
        title: "mailbox.org App-Passwort prüfen",
        steps: ["Bei mailbox.org anmelden.", "Bei aktiver 2FA unter Sicherheit ein E-Mail-App-Passwort für IMAP/SMTP erstellen.", "Dieses App-Passwort anschließend hier verwenden."],
        videoHint: "So erstellst du ein mailbox.org E-Mail-App-Passwort"
      },
      vodafone: {
        title: "Vodafone Mail-Zugang prüfen",
        steps: ["Bei Vodafone Mail anmelden.", "Vollständige E-Mail-Adresse und E-Mail-/IMAP-Passwort prüfen.", "Danach mit diesen Zugangsdaten bei NAHWERK erneut verbinden."],
        videoHint: "So prüfst du deinen Vodafone Mail-Zugang"
      },
      arcor: {
        title: "Arcor Mail-Zugang prüfen",
        steps: ["Bei Vodafone Mail für Arcor anmelden.", "Vollständige Arcor-Adresse und E-Mail-/IMAP-Passwort prüfen.", "Danach mit diesen Zugangsdaten bei NAHWERK erneut verbinden."],
        videoHint: "So prüfst du deinen Arcor Mail-Zugang"
      },
      kabeldeutschland: {
        title: "Kabel Deutschland Mail-Zugang prüfen",
        steps: ["Bei Vodafone Mail anmelden.", "Vollständige Kabel-Deutschland-Adresse und E-Mail-/IMAP-Passwort prüfen.", "Danach mit diesen Zugangsdaten bei NAHWERK erneut verbinden."],
        videoHint: "So prüfst du deinen Kabel Deutschland Mail-Zugang"
      },
      unitymedia: {
        title: "Unitymedia Mail-Zugang prüfen",
        steps: ["Bei Vodafone Mail anmelden.", "Vollständige Unitymedia-Adresse und E-Mail-/IMAP-Passwort prüfen.", "Danach mit diesen Zugangsdaten bei NAHWERK erneut verbinden."],
        videoHint: "So prüfst du deinen Unitymedia Mail-Zugang"
      },
      migadu: {
        title: "Migadu Zugang prüfen",
        steps: ["Bei Migadu Webmail anmelden.", "Vollständige Mailbox-Adresse und Mailbox-Passwort prüfen.", "Danach mit demselben Mailbox-Passwort bei NAHWERK erneut verbinden."],
        videoHint: "So prüfst du deinen Migadu Mail-Zugang"
      }
    };
    const codeFallbacks = {
      ENABLE_POP_IMAP_THEN_RETRY: ["Beim Anbieter anmelden.", "POP3/IMAP für externe E-Mail-Programme aktivieren.", "Danach mit demselben Passwort erneut verbinden."],
      ENABLE_POP_IMAP_SMTP_THEN_RETRY: ["Beim Anbieter anmelden.", "POP3/IMAP/SMTP für externe E-Mail-Programme aktivieren.", "Danach mit demselben Passwort erneut verbinden."],
      ENABLE_IMAP_THEN_RETRY: ["Beim Anbieter anmelden.", "IMAP für externe E-Mail-Programme aktivieren.", "Danach erneut verbinden."],
      ENABLE_POP_IMAP_PREMIUM_REQUIRED: ["Beim Anbieter anmelden.", "Prüfen, ob der Tarif POP3/IMAP unterstützt.", "Danach erneut verbinden."],
      CREATE_MAIL_PROGRAM_PASSWORD: ["Beim Anbieter anmelden.", "Ein separates Passwort für E-Mail-Programme erstellen.", "Dieses Passwort anschließend hier verwenden."],
      CREATE_YAHOO_APP_PASSWORD: ["Bei Yahoo anmelden.", "Ein App-Passwort für externe Mail-Apps erstellen.", "Dieses Passwort anschließend hier verwenden."],
      CREATE_ICLOUD_APP_SPECIFIC_PASSWORD: ["Beim Apple Account anmelden.", "Ein app-spezifisches Passwort erstellen.", "Dieses Passwort anschließend hier verwenden."],
      CREATE_FASTMAIL_APP_PASSWORD: ["Bei Fastmail anmelden.", "Ein App-Passwort erstellen.", "Dieses Passwort anschließend hier verwenden."],
      CREATE_APP_PASSWORD_IF_2FA: ["Beim Anbieter anmelden.", "Bei aktiver 2FA ein App-Passwort für E-Mail erstellen.", "Dieses Passwort anschließend hier verwenden."],
      USE_EMAIL_IMAP_PASSWORD: ["Beim Anbieter anmelden.", "E-Mail-/IMAP-Passwort prüfen.", "Danach mit diesem Passwort erneut verbinden."],
      CHECK_MAILBOX_PASSWORD: ["Beim Anbieter anmelden.", "Passwort des E-Mail-Postfachs prüfen.", "Danach mit diesem Passwort erneut verbinden."]
    };
    const guide = guides[id] || {
      title: `${name} Anmeldung prüfen`,
      steps: codeFallbacks[code] || ["Beim Anbieter anmelden.", "E-Mail-Adresse und Passwort des Postfachs prüfen.", "Danach erneut bei NAHWERK verbinden."],
      videoHint: `Anleitung für ${name} folgt`
    };
    return {
      code,
      title: guide.title,
      steps: guide.steps.slice(0, 3),
      videoHint: guide.videoHint,
      returnText: "Danach zu NAHWERK zurückkehren und mit dem passenden Passwort erneut verbinden."
    };
  }
  function connectionErrorMessage(error) {
    const code = String(error?.message || error || "");
    const stage = String(error?.payload?.verification_stage || "").toUpperCase();
    if (selected?.id === "gmx") {
      if (stage === "CREDENTIAL_LOAD") return "NAHWERK konnte die Zugangsdaten für die Prüfung nicht sicher laden. Bitte verbinde das GMX-Konto erneut.";
      if (stage === "IMAP_CONNECT" && code === "provider_authentication_failed") return "GMX hat den IMAP-Zugriff nicht bestätigt. Prüfe bei GMX die POP3/IMAP-Freigabe und dein Passwort und versuche es erneut.";
      if (stage === "IMAP_INBOX") return "Die Anmeldung bei GMX hat funktioniert, aber der Posteingang konnte nicht geöffnet werden. Prüfe die POP3/IMAP-Freigabe bei GMX und versuche es erneut.";
      if (stage === "SMTP_VERIFY" && code === "provider_authentication_failed") return "Der GMX-Posteingang ist erreichbar, aber die Anmeldung zum Senden wurde nicht bestätigt. Prüfe dein GMX-Passwort und versuche es erneut.";
    }
    if (code === "provider_authentication_failed" && selected?.id === "webde") return "WEB.DE konnte die Anmeldung mit diesem Passwort nicht bestätigen. Prüfe zuerst, ob der Zugriff für E-Mail-Programme in WEB.DE aktiviert ist.";
    if (code === "provider_authentication_failed") return "Die Anmeldung mit diesem Passwort wurde nicht bestätigt. NAHWERK zeigt dir jetzt den passenden nächsten Schritt.";
    if (code === "provider_tls_connection_failed") return "Die sichere Verbindung zum E-Mail-Anbieter konnte nicht hergestellt werden. Bitte versuche es später erneut.";
    if (code === "provider_connection_failed") return "Der E-Mail-Anbieter ist gerade nicht erreichbar. Bitte versuche es später erneut.";
    if (selected?.id === "webde") return "WEB.DE konnte die Anmeldung gerade nicht bestätigen. Prüfe E-Mail-Adresse und Passwort und versuche es erneut.";
    return "Anmeldung konnte nicht bestätigt werden. Prüfe bitte E-Mail-Adresse und Passwort.";
  }

  async function connectManual() {
    if (!selected || selected.mode !== "manual") return;
    const emailElement = document.getElementById("emailProviderConnectEmail");
    const secretElement = document.getElementById("emailProviderConnectSecret");
    const message = document.getElementById("emailProviderConnectMessage");
    const email = String(emailElement?.value || "").trim();
    const secret = String(secretElement?.value || "");
    if (!email.includes("@") || !secret) { setText(message, "Bitte E-Mail-Adresse und Passwort prüfen."); return; }
    const payload = { provider: selected.id, provider_email: email, username: email, secret };
    if (selected.id === "zoho") {
      const dc = String(document.getElementById("emailProviderZohoDc")?.value || "com");
      const organization = Boolean(document.getElementById("emailProviderZohoOrganization")?.checked);
      payload.connection_metadata = { zoho_datacenter: dc, zoho_organization: organization };
    }
    await api("/email/connect/manual", { method: "POST", body: JSON.stringify(payload) });
    if (secretElement) secretElement.value = "";
    await refresh();
    addMode = false;
    setText(message, `${selected.name} ist verbunden.`);
    renderModal();
  }

  async function submitManual() {
    if (!selected || selected.mode !== "manual" || busy) return;
    const message = document.getElementById("emailProviderConnectMessage");
    const button = document.getElementById("emailProviderConnectSubmit");
    let speakWebdeAfterFailure = false;
    const isWebdeAttempt = selected?.id === "webde";
    if (isWebdeAttempt) prefetchWebdeGuideAudio();
    busy = true;
    if (button) button.disabled = true;
    try {
      await connectManual();
      if (isWebdeAttempt) webdeGuideAudioPrefetch = null;
    }
    catch (error) {
      clearSecretOnly();
      try { await refresh(); } catch {}
      setText(message, connectionErrorMessage(error));
      if (selected?.id === "webde") {
        webdeGuideNeeded = true;
        webdeGuideSpoken = false;
        speakWebdeAfterFailure = true;
      } else {
        credentialGuideNeeded = true;
        credentialGuideCode = String(error?.guidance_code || error?.payload?.guidance_code || "");
      }
    } finally {
      busy = false;
      renderModal();
      renderGrid();
      if (speakWebdeAfterFailure) maybeSpeakWebdeGuide();
    }
  }

  async function disconnect(id, closeAfter) {
    if (!id || busy) return;
    const message = document.getElementById("emailProviderConnectMessage");
    const row = connections.find((connection) => String(connection?.connection_id || "") === id);
    const provider = String(row?.provider || "").toLowerCase();
    const path = provider === "yahoo" ? "/email/yahoo/disconnect/web" : "/email/connections/disconnect";
    busy = true;
    renderGrid();
    try {
      await api(path, { method: "POST", body: JSON.stringify({ connection_id: id }) });
      await refresh();
      if (closeAfter) closeModal();
      else {
        setText(message, "Dieses Postfach wurde getrennt.");
        if (selected && providerConnections(selected.id).length === 0) closeModal();
        else renderModal();
      }
    } catch {
      setText(message, "Dieses Postfach konnte gerade nicht getrennt werden. Bitte versuche es erneut.");
    } finally {
      busy = false;
      renderGrid();
    }
  }


  function ensureAccountEmailChrome() {
    const heading = document.querySelector('.account-panel-heading[data-account-panel="email"]');
    const providerShell = document.getElementById("emailLogoConnectShell");
    if (!heading || !providerShell || document.getElementById("emailTopActions")) return;

    const actions = document.createElement("div");
    actions.id = "emailTopActions";
    actions.className = "email-page-actions";
    const settingsButton = document.createElement("button");
    settingsButton.id = "emailTopSettingsButton";
    settingsButton.className = "email-page-action";
    settingsButton.type = "button";
    settingsButton.textContent = "Einstellungen";
    const connectTopButton = document.createElement("button");
    connectTopButton.id = "emailTopConnectButton";
    connectTopButton.className = "email-page-action email-page-action--primary";
    connectTopButton.type = "button";
    connectTopButton.textContent = "Verbinden";
    actions.append(settingsButton, connectTopButton);
    heading.append(actions);

    const makeOverlay = (id, title, copy) => {
      const backdrop = document.createElement("div");
      backdrop.id = id;
      backdrop.className = "email-account-overlay";
      backdrop.hidden = true;
      const panel = document.createElement("section");
      panel.className = "email-account-overlay-panel";
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-modal", "true");
      const head = document.createElement("div");
      head.className = "email-account-overlay-head";
      const textWrap = document.createElement("div");
      const eyebrow = document.createElement("div");
      eyebrow.className = "eyebrow";
      eyebrow.textContent = "E-Mail";
      const h3 = document.createElement("h3");
      h3.textContent = title;
      const p = document.createElement("p");
      p.textContent = copy;
      textWrap.append(eyebrow, h3, p);
      const close = document.createElement("button");
      close.className = "email-account-overlay-close";
      close.type = "button";
      close.setAttribute("aria-label", "Schließen");
      close.textContent = "×";
      head.append(textWrap, close);
      const body = document.createElement("div");
      body.className = "email-account-overlay-body";
      panel.append(head, body);
      backdrop.append(panel);
      root.append(backdrop);
      const closeOverlay = () => { backdrop.hidden = true; };
      close.addEventListener("click", closeOverlay);
      backdrop.addEventListener("click", (event) => { if (event.target === backdrop) closeOverlay(); });
      return { backdrop, body, close: closeOverlay };
    };

    const settingsOverlay = makeOverlay(
      "emailSettingsOverlay",
      "Einstellungen",
      "Lege fest, welche E-Mail-Funktionen dein persönlicher NAHWERK Concierge verwenden darf."
    );
    const connectOverlay = makeOverlay(
      "emailConnectOverlay",
      "E-Mail-Konto verbinden",
      "Wähle einen von NAHWERK sicher unterstützten E-Mail-Anbietern."
    );

    const capabilities = root.querySelector(".email-capabilities");
    const capabilitySection = capabilities?.parentElement || null;
    const continuity = root.querySelector(".email-continuity-note");
    if (capabilitySection) settingsOverlay.body.append(capabilitySection);
    if (continuity) settingsOverlay.body.append(continuity);

    connectOverlay.body.append(providerShell);

    const legacyProviderWrapper = legacyGrid?.parentElement;
    if (legacyProviderWrapper && legacyProviderWrapper !== connectOverlay.body && !legacyProviderWrapper.contains(providerShell)) {
      legacyProviderWrapper.hidden = true;
    }
    const innerHead = root.querySelector(".email-account-head");
    if (innerHead) innerHead.hidden = true;

    settingsButton.addEventListener("click", () => { settingsOverlay.backdrop.hidden = false; });
    connectTopButton.addEventListener("click", () => { connectOverlay.backdrop.hidden = false; });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      settingsOverlay.close();
      connectOverlay.close();
    });
  }

  assets();
  ensureShell();
  ensureModal();
  retireLegacyControls();
  ensureAccountEmailChrome();
  const legacyActions = root.querySelector(".email-actions");
  if (legacyActions) {
    legacyActions.hidden = true;
    legacyActions.setAttribute("aria-hidden", "true");
    legacyActions.querySelectorAll("button").forEach((button) => { button.hidden = true; button.tabIndex = -1; });
  }
  renderGrid();
  void refresh().catch(() => { renderGrid(); });
})();