(() => {
  const BASE = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-email-runtime";
  const SESSION_KEY = "scb_web_session";
  const PROVIDER_MAP = Object.freeze({
    GMX: "gmx",
    WEBDE: "webde",
    YAHOO: "yahoo",
    TELEKOM: "telekom",
    IONOS: "ionos",
    STRATO: "strato",
    FASTMAIL: "fastmail",
    ICLOUD: "icloud",
    ZOHO: "zoho"
  });
  const PROVIDER_LABELS = Object.freeze({
    gmx: "GMX", webde: "WEB.DE", yahoo: "Yahoo Mail", telekom: "Telekom Mail",
    ionos: "IONOS", strato: "STRATO", fastmail: "Fastmail", icloud: "iCloud Mail", zoho: "Zoho Mail"
  });

  if (typeof document === "undefined") return;
  const root = document.getElementById("accountEmailCard");
  if (!root) return;

  const cards = Object.fromEntries([...root.querySelectorAll("[data-email-provider]")].map((el) => [String(el.dataset.emailProvider || "").toUpperCase(), el]));
  const statusFor = (key) => cards[key]?.querySelector("[data-email-provider-status]") || null;
  const genericForm = document.getElementById("emailGenericForm");
  const providerSelect = document.getElementById("emailGenericProviderKey");
  const usernameInput = document.getElementById("emailGenericUsername");
  const passwordInput = document.getElementById("emailGenericAppPassword");
  const connectButton = document.getElementById("emailConnectButton");
  const disconnectButton = document.getElementById("emailDisconnectButton");
  const stateTitle = document.getElementById("emailStateTitle");
  const stateMeta = document.getElementById("emailStateMeta");
  const accountHint = document.getElementById("emailAccountHint");
  const runtimeNote = document.getElementById("emailRuntimeNote");
  const capabilityNote = document.getElementById("emailPreferencesStatus");

  let selectedMode = null;
  let catalog = [];
  let connections = [];
  let busy = false;
  let restoring = false;

  function token() {
    try { return String(JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null")?.session_token || ""); }
    catch { return ""; }
  }

  async function api(path, options = {}) {
    const session = token();
    if (!session) throw new Error("UNAUTHENTICATED");
    const headers = { Authorization: `Bearer ${session}`, ...(options.headers || {}) };
    if (options.body != null) headers["Content-Type"] = "application/json";
    const response = await fetch(BASE + path, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.ok === false) throw new Error(String(data?.error || "EMAIL_REQUEST_FAILED"));
    return data;
  }

  function providerCatalog(id) { return catalog.find((p) => String(p?.id || "").toLowerCase() === id) || null; }
  function connectedManual() { return connections.find((c) => c?.state === "CONNECTED" && Object.values(PROVIDER_MAP).includes(String(c?.provider || "").toLowerCase())) || null; }

  function setText(el, value) { if (el && el.textContent !== value) el.textContent = value; }
  function setDisabled(el, value) {
    if (!el) return;
    if (el.disabled !== value) el.disabled = value;
    const aria = String(value);
    if (el.getAttribute("aria-disabled") !== aria) el.setAttribute("aria-disabled", aria);
  }

  function restoreProviderCards() {
    if (restoring) return;
    restoring = true;
    try {
      const microsoft = providerCatalog("microsoft");
      const manual = connectedManual();
      if (cards.MICROSOFT) {
        setDisabled(cards.MICROSOFT, false);
        const msStatus = microsoft?.connection_ready === true ? "Auswählen" : "Einrichtung erforderlich";
        setText(statusFor("MICROSOFT"), selectedMode === "microsoft" ? (microsoft?.connection_ready === true ? "Ausgewählt" : "Einrichtung erforderlich") : msStatus);
      }
      if (cards.GENERIC) {
        setDisabled(cards.GENERIC, false);
        setText(statusFor("GENERIC"), selectedMode === "manual" ? (manual ? `${PROVIDER_LABELS[manual.provider] || "Anbieter"} verbunden` : "Ausgewählt") : (manual ? `${PROVIDER_LABELS[manual.provider] || "Anbieter"} verbunden` : "Auswählen"));
      }
    } finally { restoring = false; }
  }

  function markSelected(key) {
    for (const [name, card] of Object.entries(cards)) {
      const on = name === key;
      card.classList.toggle("is-selected", on);
      card.setAttribute("aria-pressed", String(on));
    }
    restoreProviderCards();
  }

  function hideServerFields() {
    ["emailGenericImapHost", "emailGenericImapPort", "emailGenericSmtpHost", "emailGenericSmtpPort"].forEach((id) => {
      const field = document.getElementById(id);
      if (field?.closest(".email-field")) field.closest(".email-field").hidden = true;
    });
    const tlsRow = genericForm?.querySelector(".email-tls-row");
    if (tlsRow) tlsRow.hidden = true;
    const custom = providerSelect?.querySelector('option[value="CUSTOM"]');
    if (custom) custom.remove();
    const customWrap = document.getElementById("emailGenericCustomWrap");
    if (customWrap) customWrap.hidden = true;
    const heading = genericForm?.querySelector("h4");
    setText(heading, "E-Mail-Zugang verbinden");
    const help = genericForm?.querySelector(".email-generic-help");
    setText(help, "Nutze je nach Anbieter dein App-Passwort oder das separate Mailprogramm-Passwort. NAHWERK prüft die Verbindung, ohne eine E-Mail zu senden.");
    const userLabel = usernameInput?.closest(".email-field")?.querySelector("span");
    setText(userLabel, "E-Mail-Adresse");
    const passwordLabel = passwordInput?.closest(".email-field")?.querySelector("span");
    setText(passwordLabel, "App- / Mailprogramm-Passwort");
  }

  function ensureZohoDatacenter() {
    if (!genericForm || document.getElementById("emailZohoDatacenterWrap")) return;
    const label = document.createElement("label");
    label.className = "email-field";
    label.id = "emailZohoDatacenterWrap";
    label.hidden = true;
    label.innerHTML = '<span>Zoho-Rechenzentrum</span><select id="emailZohoDatacenter"><option value="com">Global (.com)</option><option value="eu">Europa (.eu)</option><option value="in">Indien (.in)</option><option value="com.au">Australien (.com.au)</option><option value="jp">Japan (.jp)</option><option value="ca">Kanada (.ca)</option><option value="sa">Saudi-Arabien (.sa)</option></select>';
    const grid = genericForm.querySelector(".email-generic-grid");
    if (grid) grid.insertBefore(label, usernameInput?.closest(".email-field") || null);
  }

  function updateProviderSpecificForm() {
    const zoho = document.getElementById("emailZohoDatacenterWrap");
    if (zoho) zoho.hidden = String(providerSelect?.value || "") !== "ZOHO";
  }

  function showManual() {
    selectedMode = "manual";
    markSelected("GENERIC");
    if (genericForm) genericForm.hidden = false;
    hideServerFields();
    ensureZohoDatacenter();
    updateProviderSpecificForm();
    setText(stateTitle, "E-Mail-Anbieter mit NAHWERK verbinden");
    setText(stateMeta, "Wähle deinen Anbieter und gib die E-Mail-Adresse sowie das dafür vorgesehene App- oder Mailprogramm-Passwort ein.");
    setText(runtimeNote, "NAHWERK prüft den Postfachzugang sicher. Bei der Verbindung wird keine E-Mail gesendet.");
    if (connectButton) {
      connectButton.hidden = false;
      connectButton.textContent = "Anbieter verbinden";
      setDisabled(connectButton, !token() || busy);
    }
    const manual = connectedManual();
    if (disconnectButton) {
      disconnectButton.hidden = !manual;
      disconnectButton.textContent = manual ? `${PROVIDER_LABELS[manual.provider] || "Verbindung"} trennen` : "Verbindung trennen";
    }
    setText(accountHint, manual?.account_display_hint || "");
    setText(capabilityNote, manual ? "Die E-Mail-Funktionen stehen für diese bestätigte Verbindung bereit." : "Nach bestätigter Verbindung werden die verfügbaren E-Mail-Funktionen aktiviert.");
  }

  function showMicrosoft() {
    selectedMode = "microsoft";
    markSelected("MICROSOFT");
    if (genericForm) genericForm.hidden = true;
    const ready = providerCatalog("microsoft")?.connection_ready === true;
    setText(stateTitle, "Microsoft Outlook / Microsoft 365");
    setText(stateMeta, ready ? "Microsoft ist bereit für die sichere Anmeldung." : "Die Microsoft-Anmeldung ist technisch vorbereitet, muss für NAHWERK aber noch serverseitig freigeschaltet werden.");
    setText(runtimeNote, "Dein Microsoft-Passwort wird niemals direkt bei NAHWERK eingegeben.");
    if (connectButton) {
      connectButton.hidden = false;
      connectButton.textContent = ready ? "Mit Microsoft verbinden" : "Microsoft wird freigeschaltet";
      setDisabled(connectButton, !ready || !token() || busy);
    }
    if (disconnectButton) disconnectButton.hidden = true;
  }

  function leaveOverlayForGoogle() {
    selectedMode = null;
    if (genericForm) genericForm.hidden = true;
    restoreProviderCards();
  }

  async function refreshBackendState() {
    const [catalogData, connectionData] = await Promise.all([
      api("/email/provider-catalog"),
      api("/email/provider-connections")
    ]);
    catalog = Array.isArray(catalogData?.providers) ? catalogData.providers : [];
    connections = Array.isArray(connectionData?.connections) ? connectionData.connections : [];
    restoreProviderCards();
  }

  async function connectManual() {
    if (busy) return;
    const provider = PROVIDER_MAP[String(providerSelect?.value || "").toUpperCase()];
    const username = String(usernameInput?.value || "").trim();
    const secret = String(passwordInput?.value || "");
    if (!provider || !username.includes("@") || !secret) {
      setText(stateTitle, "Bitte E-Mail-Adresse und Passwort prüfen");
      setText(stateMeta, "Für die Verbindung werden eine gültige E-Mail-Adresse und das App- bzw. Mailprogramm-Passwort benötigt.");
      return;
    }
    busy = true;
    if (connectButton) { connectButton.textContent = "Verbindung wird geprüft …"; setDisabled(connectButton, true); }
    try {
      const metadata = provider === "zoho" ? { zoho_datacenter: String(document.getElementById("emailZohoDatacenter")?.value || "com") } : {};
      const data = await api("/email/connect/manual", { method: "POST", body: JSON.stringify({ provider, provider_email: username, username, secret, connection_metadata: metadata }) });
      if (passwordInput) passwordInput.value = "";
      await refreshBackendState();
      setText(stateTitle, `${PROVIDER_LABELS[provider] || "E-Mail-Anbieter"} ist mit NAHWERK verbunden.`);
      setText(stateMeta, "Die Verbindung wurde bestätigt. Es wurde keine E-Mail gesendet.");
      setText(accountHint, data?.account_display_hint || "");
      if (connectButton) connectButton.hidden = true;
      if (disconnectButton) { disconnectButton.hidden = false; disconnectButton.textContent = `${PROVIDER_LABELS[provider] || "Verbindung"} trennen`; }
      setText(capabilityNote, "Die verfügbaren E-Mail-Funktionen können jetzt über deinen NAHWERK Concierge genutzt werden.");
    } catch (error) {
      if (passwordInput) passwordInput.value = "";
      setText(stateTitle, "Verbindung konnte nicht bestätigt werden.");
      setText(stateMeta, "Prüfe E-Mail-Adresse und App- bzw. Mailprogramm-Passwort. Es wurde keine E-Mail gesendet.");
    } finally {
      busy = false;
      if (connectButton && !connectButton.hidden) { connectButton.textContent = "Anbieter verbinden"; setDisabled(connectButton, !token()); }
      restoreProviderCards();
    }
  }

  async function disconnectManual() {
    const manual = connectedManual();
    if (!manual || busy) return;
    busy = true;
    setDisabled(disconnectButton, true);
    try {
      await api("/email/provider/disconnect", { method: "POST", body: JSON.stringify({ connection_id: manual.connection_id }) });
      await refreshBackendState();
      setText(stateTitle, `${PROVIDER_LABELS[manual.provider] || "E-Mail-Verbindung"} wurde getrennt.`);
      setText(stateMeta, "Die gespeicherten Zugangsdaten für diese Verbindung wurden entfernt.");
      setText(accountHint, "");
      showManual();
    } catch {
      setText(stateTitle, "Verbindung konnte gerade nicht getrennt werden.");
      setText(stateMeta, "Bitte versuche es erneut.");
    } finally { busy = false; setDisabled(disconnectButton, false); }
  }

  cards.GENERIC?.addEventListener("click", (event) => {
    event.preventDefault(); event.stopImmediatePropagation(); showManual();
  }, true);
  cards.MICROSOFT?.addEventListener("click", (event) => {
    event.preventDefault(); event.stopImmediatePropagation(); showMicrosoft();
  }, true);
  cards.GOOGLE?.addEventListener("click", () => leaveOverlayForGoogle(), true);

  connectButton?.addEventListener("click", (event) => {
    if (selectedMode === "manual") { event.preventDefault(); event.stopImmediatePropagation(); void connectManual(); }
    else if (selectedMode === "microsoft") { event.preventDefault(); event.stopImmediatePropagation(); showMicrosoft(); }
  }, true);
  disconnectButton?.addEventListener("click", (event) => {
    if (selectedMode === "manual" && connectedManual()) { event.preventDefault(); event.stopImmediatePropagation(); void disconnectManual(); }
  }, true);
  providerSelect?.addEventListener("change", updateProviderSpecificForm);

  const observer = new MutationObserver(() => {
    if (selectedMode !== null || cards.MICROSOFT?.disabled || cards.GENERIC?.disabled) queueMicrotask(restoreProviderCards);
  });
  [cards.MICROSOFT, cards.GENERIC].filter(Boolean).forEach((card) => observer.observe(card, { attributes: true, attributeFilter: ["disabled", "aria-disabled"], childList: true, subtree: true }));

  hideServerFields();
  ensureZohoDatacenter();
  void refreshBackendState().catch(() => {
    setDisabled(cards.MICROSOFT, false);
    setDisabled(cards.GENERIC, false);
    setText(statusFor("MICROSOFT"), "Einrichtung erforderlich");
    setText(statusFor("GENERIC"), "Auswählen");
  });
})();
