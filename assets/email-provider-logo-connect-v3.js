(() => {
  "use strict";

  const BASE = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-email-runtime";
  const SESSION_KEY = "scb_web_session";
  const RETURN_TO = "https://nahwerkconcierge.com/email-concierge.html";
  const CAPABILITIES = ["EMAIL_READ", "EMAIL_SEARCH", "EMAIL_ATTACHMENTS", "EMAIL_DRAFT", "EMAIL_MAILBOX", "EMAIL_SEND"];
  const PROVIDERS = Object.freeze([
    { id: "google", name: "Gmail", mode: "google", logo: "gmail", secret: "", help: "Mit deinem Google-Konto anmelden und NAHWERK freigeben." },
    { id: "microsoft", name: "Outlook", mode: "microsoft", logo: "microsoft", secret: "", help: "Mit deinem Microsoft-Konto anmelden und NAHWERK freigeben." },
    { id: "yahoo", name: "Yahoo Mail", mode: "yahoo", logo: "yahoo", secret: "", help: "Mit deinem Yahoo-Konto anmelden und NAHWERK freigeben." },
    { id: "icloud", name: "iCloud Mail", mode: "manual", logo: "icloud", secret: "App-spezifisches Passwort", credentialKind: "app", help: "Apple nutzt für externe Mail-Dienste ein app-spezifisches Passwort.", helpUrl: "https://support.apple.com/de-de/102654", helpAction: "App-Passwort bei Apple erstellen" },
    { id: "gmx", name: "GMX", mode: "manual", logo: "gmx", secret: "Passwort", credentialKind: "mail_first", help: "Gib zuerst einfach deine E-Mail-Adresse und dein normales GMX-Passwort ein. NAHWERK übernimmt die technischen Einstellungen. Nur wenn dein Konto eine zusätzliche Sicherheitsfreigabe verlangt, zeigen wir dir genau diesen Schritt.", helpUrl: "https://hilfe.gmx.net/pop-imap/index.html", helpAction: "GMX-Freigabe öffnen" },
    { id: "webde", name: "WEB.DE", mode: "manual", logo: "webde", secret: "Passwort", credentialKind: "mail_first", help: "Verwende zunächst dein normales WEB.DE-Passwort. Falls WEB.DE eine zusätzliche Sicherheitsfreigabe verlangt, führt dich NAHWERK durch die nächsten Schritte.", helpUrl: "https://hilfe.web.de/pop-imap/einschalten.html", helpAction: "WEB.DE Freigabe öffnen" },
    { id: "telekom", name: "Telekom / T-Online", mode: "manual", logo: "telekom", secret: "Passwort", credentialKind: "guided_mail_program", help: "Gib deine Telekom/T-Online E-Mail-Adresse ein. Für die Verbindung verlangt Telekom ein eigenes E-Mail-Programm-Passwort. NAHWERK führt dich direkt zur richtigen Telekom-Seite und übernimmt danach alle technischen Einstellungen.", helpUrl: "https://www.telekom.de/hilfe/apps-dienste/e-mail/programm-passwort-verwalten", helpAction: "Bei Telekom einmal freigeben" },
    { id: "fastmail", name: "Fastmail", mode: "manual", logo: "fastmail", secret: "App-Passwort", credentialKind: "app", help: "Fastmail benötigt für externe Dienste ein eigenes App-Passwort. IMAP/SMTP muss in deinem Tarif verfügbar sein.", helpUrl: "https://www.fastmail.help/hc/en-us/articles/360058752854-App-passwords", helpAction: "App-Passwort bei Fastmail erstellen" },
    { id: "zoho", name: "Zoho Mail", mode: "manual", logo: "zoho", secret: "App- oder Mail-Passwort", credentialKind: "conditional_app", help: "Bei aktivierter Zwei-Faktor-Authentifizierung nutzt du ein App-Passwort. NAHWERK übernimmt die technischen Mailserver-Einstellungen.", helpUrl: "https://www.zoho.com/de/mail/help/imap-access.html", helpAction: "Zoho-Anleitung öffnen" },
    { id: "ionos", name: "IONOS", mode: "manual", logo: "ionos", secret: "E-Mail-Passwort", credentialKind: "mail", help: "Nutze das Passwort genau dieses IONOS-E-Mail-Postfachs. NAHWERK übernimmt IMAP, SMTP, Ports und Verschlüsselung automatisch.", helpUrl: "https://www.ionos.de/hilfe/e-mail/allgemeine-themen/serverinformationen-fuer-imap-pop3-und-smtp/", helpAction: "IONOS-Hilfe öffnen" },
    { id: "strato", name: "STRATO", mode: "manual", logo: "strato", secret: "E-Mail-Passwort", credentialKind: "mail", help: "Nutze das Passwort genau dieses STRATO-E-Mail-Postfachs. NAHWERK übernimmt IMAP, SMTP, Ports und Verschlüsselung automatisch.", helpUrl: "https://www.strato.de/faq/mail/externes-e-mail-programm-mit-strato-e-mail-adresse-nutzen/", helpAction: "STRATO-Hilfe öffnen" },
    { id: "mailcom", name: "mail.com", mode: "manual", logo: "mailcom", secret: "E-Mail-Passwort", credentialKind: "mail", help: "Nutze dein E-Mail-Passwort. Direkter IMAP-Zugriff ist bei mail.com für entsprechend freigeschaltete Konten vorgesehen." },
    { id: "freenet", name: "freenet", mode: "manual", logo: "freenet", secret: "E-Mail-Passwort", credentialKind: "mail", help: "Nutze dein freenet E-Mail-Passwort. IMAP/SMTP muss im Postfach aktiviert sein; die technischen Daten setzt NAHWERK automatisch." },
    { id: "mailboxorg", name: "mailbox.org", mode: "manual", logo: "mailboxorg", secret: "Passwort / Mail-App-Passwort", credentialKind: "conditional_app", help: "Bei aktivierter Zwei-Faktor-Authentifizierung nutzt du ein Mail-App-Passwort. NAHWERK übernimmt die technischen Einstellungen." },
    { id: "vodafone", name: "Vodafone Mail", mode: "manual", logo: "vodafone", secret: "E-Mail-/IMAP-Passwort", credentialKind: "mail", help: "Nutze deine vollständige E-Mail-Adresse und das zugehörige E-Mail-/IMAP-Passwort. Server und Ports setzt NAHWERK automatisch." },
    { id: "arcor", name: "Arcor Mail", mode: "manual", logo: "arcor", secret: "E-Mail-/IMAP-Passwort", credentialKind: "mail", help: "Nutze deine vollständige E-Mail-Adresse und das E-Mail-/IMAP-Passwort. NAHWERK erkennt die passende Vodafone-Mail-Infrastruktur automatisch." },
    { id: "kabeldeutschland", name: "Kabel Deutschland Mail", mode: "manual", logo: "kabeldeutschland", secret: "E-Mail-/IMAP-Passwort", credentialKind: "mail", help: "Nutze deine vollständige E-Mail-Adresse und das E-Mail-/IMAP-Passwort. NAHWERK setzt die passenden Mailserver automatisch." },
    { id: "unitymedia", name: "Unitymedia Mail", mode: "manual", logo: "unitymedia", secret: "E-Mail-/IMAP-Passwort", credentialKind: "mail", help: "Nutze deine vollständige E-Mail-Adresse und das E-Mail-/IMAP-Passwort. NAHWERK setzt die passenden Mailserver automatisch." },
    { id: "migadu", name: "Migadu", mode: "manual", logo: "migadu", secret: "Mailbox-Passwort", credentialKind: "mail", help: "Nutze die vollständige Mailbox-Adresse und das zugehörige Migadu-Passwort. Die technischen Einstellungen übernimmt NAHWERK." },
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
  const connectErrors = Object.create(null);
  const PROVIDER_BY_DOMAIN = Object.freeze({ "gmail.com":"google", "googlemail.com":"google", "outlook.com":"microsoft", "hotmail.com":"microsoft", "live.com":"microsoft", "yahoo.com":"yahoo", "yahoo.de":"yahoo", "gmx.de":"gmx", "gmx.net":"gmx", "web.de":"webde", "t-online.de":"telekom", "magenta.de":"telekom", "icloud.com":"icloud", "me.com":"icloud", "mac.com":"icloud" });

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
      if (!response.ok || data?.ok === false) throw new Error(String(data?.error?.code || data?.error || "EMAIL_REQUEST_FAILED"));
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
    shell.innerHTML = '<div class="email-logo-connect-heading"><div><div class="eyebrow">E-Mail-Anbieter</div><h4>Verbinde deine Postfächer.</h4></div><p>Du kannst mehrere Konten gleichzeitig verbinden – auch mehrere beim selben Anbieter. Dein Concierge behält die Quellen getrennt und kann sie gemeinsam durchsuchen.</p></div><div class="email-logo-provider-grid" id="emailLogoProviderGrid" aria-label="E-Mail-Anbieter"></div>';
    wrapper.insertBefore(shell, legacyGrid || null);
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
    backdrop.innerHTML = '<section class="email-provider-connect-modal" role="dialog" aria-modal="true" aria-labelledby="emailProviderConnectTitle"><div class="email-provider-connect-head"><div class="email-provider-connect-identity"><span id="emailProviderConnectLogo"></span><div><h3 id="emailProviderConnectTitle">E-Mail verbinden</h3><p id="emailProviderConnectSubtitle">Sicher mit NAHWERK verbinden</p></div></div><button class="email-provider-connect-close" id="emailProviderConnectClose" type="button" aria-label="Schließen">×</button></div><p class="email-provider-connect-copy" id="emailProviderConnectCopy"></p><div class="email-provider-account-list" id="emailProviderAccountList"></div><button class="email-provider-add-account" id="emailProviderAddAccount" type="button" hidden>+ Weiteres Konto verbinden</button><div id="emailProviderCredentialFields"><label class="email-provider-connect-field"><span>E-Mail-Adresse</span><input id="emailProviderConnectEmail" type="email" inputmode="email" autocomplete="email" maxlength="320"></label><label class="email-provider-connect-field"><span id="emailProviderConnectSecretLabel">Passwort</span><input id="emailProviderConnectSecret" type="password" autocomplete="new-password" maxlength="512"></label><div id="emailProviderZohoOptions" hidden><label class="email-provider-connect-field"><span>Zoho-Rechenzentrum</span><select id="emailProviderZohoDc"><option value="com">Global (.com)</option><option value="eu">Europa (.eu)</option><option value="in">Indien (.in)</option><option value="com.au">Australien (.com.au)</option><option value="jp">Japan (.jp)</option><option value="ca">Kanada (.ca)</option><option value="sa">Saudi-Arabien (.sa)</option></select></label><label class="email-provider-connect-field"><span><input id="emailProviderZohoOrganization" type="checkbox"> Organisations-/Business-Postfach</span></label></div><div class="email-provider-credential-guide" id="emailProviderCredentialGuide" hidden><strong id="emailProviderCredentialGuideTitle"></strong><span id="emailProviderCredentialGuideText"></span><a id="emailProviderCredentialHelpLink" href="#" target="_blank" rel="noopener noreferrer" hidden></a></div><p class="email-provider-connect-help" id="emailProviderConnectHelp"></p><p class="email-provider-security-note">NAHWERK trägt Server, Ports und Verschlüsselung automatisch ein. Deine Zugangsdaten werden nicht im Browser dauerhaft gespeichert.</p></div><div class="email-provider-connect-message" id="emailProviderConnectMessage" aria-live="polite"></div><div class="email-provider-connect-actions"><button class="email-provider-connect-secondary" id="emailProviderCancelAdd" type="button" hidden>Abbrechen</button><button class="email-provider-connect-primary" id="emailProviderConnectSubmit" type="button">Verbinden</button></div></section>';
    document.body.appendChild(backdrop);
    backdrop.addEventListener("click", (event) => { if (event.target === backdrop) closeModal(); });
    document.getElementById("emailProviderConnectClose")?.addEventListener("click", closeModal);
    document.getElementById("emailProviderConnectSubmit")?.addEventListener("click", () => void submitManual());
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
    setText(document.getElementById("emailProviderConnectCopy"), rows.length ? "Wähle das Konto, das du trennen möchtest. Weitere Konten kannst du jederzeit zusätzlich verbinden." : (selected.id === "webde" || selected.id === "gmx") ? `Gib deine ${selected.id === "webde" ? "WEB.DE" : "GMX"} E-Mail-Adresse und dein normales Passwort ein. NAHWERK übernimmt die technischen Einstellungen automatisch.` : selected.id === "telekom" ? "Gib deine Telekom/T-Online E-Mail-Adresse ein. Falls du das E-Mail-Programm-Passwort noch nicht eingerichtet hast, führt dich der Button direkt zur Telekom. Danach nur noch Passwort einfügen und verbinden." : "Gib nur deine E-Mail-Adresse und das für Mail-Apps vorgesehene Passwort ein. Server, Ports und technische Einstellungen übernimmt NAHWERK.");
    setText(document.getElementById("emailProviderConnectSecretLabel"), selected.secret || "Passwort");
    setText(document.getElementById("emailProviderConnectHelp"), selected.help);
    const guide = document.getElementById("emailProviderCredentialGuide");
    const guideTitle = document.getElementById("emailProviderCredentialGuideTitle");
    const guideText = document.getElementById("emailProviderCredentialGuideText");
    const helpLink = document.getElementById("emailProviderCredentialHelpLink");
    if (selected.mode === "manual") {
      const kind = String(selected.credentialKind || "mail");
      const title = kind === "guided_mail_program" ? "Einmal bei Telekom freigeben" : kind === "mail_program" ? "Welches Passwort?" : kind === "app" ? "App-Passwort verwenden" : kind === "conditional_app" ? "Passwort prüfen" : kind === "mail_first" ? "Einfach dein normales Passwort" : "E-Mail-Passwort verwenden";
      const text = kind === "guided_mail_program"
        ? "Telekom trennt dein normales Login-Passwort vom Zugriff durch Mail-Dienste. Öffne die Telekom-Seite über den Button, lege dort einmal das Passwort für E-Mail-Programme fest und füge es anschließend hier ein. Server, Ports und Verschlüsselung erledigt NAHWERK."
        : kind === "mail_program"
        ? "Nicht dein normales Kundenkonto-Passwort. Verwende das separate Passwort für E-Mail-Programme."
        : kind === "app"
          ? "Nicht dein normales Login-Passwort. Erstelle beim Anbieter ein separates App-Passwort für NAHWERK."
          : kind === "conditional_app"
            ? "Wenn dein Anbieter Zwei-Faktor-Anmeldung nutzt, brauchst du meist ein separates App-Passwort."
            : kind === "mail_first"
              ? "Versuche zuerst dein normales WEB.DE-Passwort. Zusätzliche Schritte zeigt NAHWERK nur, wenn WEB.DE sie tatsächlich verlangt."
              : "Verwende das Passwort des E-Mail-Postfachs. Technische Serverdaten brauchst du nicht.";
      if (guide) guide.hidden = false;
      setText(guideTitle, title);
      setText(guideText, text);
      if (helpLink) {
        const href = String(selected.helpUrl || "");
        helpLink.hidden = !href;
        helpLink.href = href || "#";
        helpLink.textContent = String(selected.helpAction || "Hilfe beim Anbieter öffnen");
      }
    } else if (guide) {
      guide.hidden = true;
    }
    renderAccounts();

    const fields = document.getElementById("emailProviderCredentialFields");
    const zohoOptions = document.getElementById("emailProviderZohoOptions");
    const add = document.getElementById("emailProviderAddAccount");
    const cancel = document.getElementById("emailProviderCancelAdd");
    const submit = document.getElementById("emailProviderConnectSubmit");
    const showCredentials = selected.mode === "manual" && (addMode || rows.length === 0);
    if (fields) fields.hidden = !showCredentials;
    if (zohoOptions) zohoOptions.hidden = !showCredentials || selected.id !== "zoho";
    if (add) add.hidden = selected.mode !== "manual" || rows.length === 0 || addMode;
    if (cancel) cancel.hidden = !addMode || rows.length === 0;
    if (submit) {
      submit.hidden = !showCredentials;
      submit.disabled = busy;
      submit.textContent = rows.length ? "Weiteres Konto verbinden" : "Verbinden";
    }
  }

  function suggestedProviderForEmail(value) {
    const domain = String(value || "").trim().toLowerCase().split("@").pop();
    return providerById(PROVIDER_BY_DOMAIN[domain] || "");
  }

  function bindProviderDetection() {
    const input = document.getElementById("emailProviderConnectEmail");
    if (!input || input.dataset.providerDetectionBound === "true") return;
    input.dataset.providerDetectionBound = "true";
    input.addEventListener("blur", () => {
      const detected = suggestedProviderForEmail(input.value);
      if (!detected || !selected || detected.id === selected.id) return;
      const message = document.getElementById("emailProviderConnectMessage");
      setText(message, `Diese Adresse gehört zu ${detected.name}. NAHWERK hat den passenden Verbindungsweg erkannt.`);
      selected = detected;
      addMode = providerConnections(detected.id).length === 0;
      renderModal();
    });
  }

  function openManual(provider, adding = false) {
    selected = provider;
    addMode = adding || providerConnections(provider.id).length === 0;
    clearCredentials();
    setText(document.getElementById("emailProviderConnectMessage"), "");
    renderModal();
    const backdrop = document.getElementById("emailProviderConnectBackdrop");
    if (backdrop) backdrop.hidden = false;
    bindProviderDetection();
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

  function connectionErrorMessage(error) {
    const code = String(error?.message || error || "");
    if (code === "provider_authentication_failed" && selected?.id === "webde") return "WEB.DE konnte die Anmeldung noch nicht bestätigen. Öffne die WEB.DE-Freigabe über den Hilfe-Button. Falls du Zwei-Faktor-Anmeldung nutzt, kann WEB.DE zusätzlich ein eigenes Passwort für externe Mail-Dienste verlangen.";
    if (code === "provider_authentication_failed" && selected?.id === "gmx") return "GMX konnte die Anmeldung noch nicht bestätigen. Öffne die GMX-Freigabe über den Hilfe-Button. Falls du Zwei-Faktor-Anmeldung nutzt, verlangt GMX ein separates App-Passwort.";
    if (code === "provider_authentication_failed" && selected?.id === "telekom") return "Telekom konnte die Anmeldung noch nicht bestätigen. Verwende das Passwort für E-Mail-Programme. Über den Hilfe-Button kommst du direkt zur Telekom-Einrichtung.";
    if (code === "provider_authentication_failed") return "Anmeldung abgelehnt. Prüfe E-Mail-Adresse und Passwort/App-Passwort sowie, ob IMAP/SMTP beim Anbieter aktiviert ist.";
    if (code === "provider_tls_connection_failed") return "Die sichere Verbindung zum E-Mail-Anbieter konnte nicht hergestellt werden. Bitte versuche es später erneut.";
    if (code === "provider_connection_failed") return "Der E-Mail-Anbieter ist gerade nicht erreichbar. Bitte versuche es später erneut.";
    if (selected?.id === "webde") return "WEB.DE konnte die Anmeldung gerade nicht bestätigen. Prüfe E-Mail-Adresse und Passwort und versuche es erneut.";
    return "Anmeldung konnte nicht bestätigt werden. Prüfe bitte E-Mail-Adresse und das für Mail-Apps vorgesehene Passwort.";
  }

  async function connectManual() {
    if (!selected || selected.mode !== "manual") return;
    const emailElement = document.getElementById("emailProviderConnectEmail");
    const secretElement = document.getElementById("emailProviderConnectSecret");
    const message = document.getElementById("emailProviderConnectMessage");
    const email = String(emailElement?.value || "").trim();
    const detected = suggestedProviderForEmail(email);
    if (detected && detected.id !== selected.id) {
      selected = detected;
      renderModal();
      setText(message, `NAHWERK hat ${detected.name} erkannt. Bitte prüfe kurz die angezeigte Anmeldung und tippe dann auf Verbinden.`);
      return;
    }
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
    busy = true;
    if (button) { button.disabled = true; button.textContent = "Wird verbunden …"; }
    setText(message, "Verbindung wird sicher geprüft …");
    try { await connectManual(); }
    catch (error) {
      clearCredentials();
      setText(message, connectionErrorMessage(error));
    } finally {
      busy = false;
      if (button) button.disabled = false;
      renderGrid();
      if (selected) renderModal();
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