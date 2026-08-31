(() => {
  const WEBHOOK_URL = "https://denizw.app.n8n.cloud/webhook/senioren-concierge/anmelden";
  const LOGIN_URL = "https://denizw.app.n8n.cloud/webhook/senioren-concierge/web/login/password";
  const SESSION_KEY = "scb_web_session";
  const form = document.getElementById("signupForm");
  if (!form) return;

  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const requestedProduct = params.get("produkt");
  const product = requestedProduct === "senioren" || (!requestedProduct && sessionStorage.getItem("nahwerk_product") === "senioren") ? "senioren" : "prime";
  const productLabel = product === "senioren" ? "Senioren Concierge" : "Persönlicher Concierge";
  const PLAN_ALIASES = {
    kostenlos: "free",
    standard: "plus",
    premium: "familie",
    "premium-plus": "familie",
    superior: "familie"
  };
  const PLANS = {
    free: {
      code: "FREE",
      title: "FREE · 0 € / MONAT",
      price: "0 € / Monat",
      usage: "50 Dialoge pro Monat",
      state: "Verfügbar",
      bookable: true,
      benefits: [
        "Dauerhaft kostenlos",
        "50 Dialoge pro Monat",
        "Direkt in WhatsApp",
        "Text- und Sprachnachrichten",
        "Keine Zahlungsdaten und keine automatische kostenpflichtige Umwandlung"
      ]
    },
    plus: {
      code: "PLUS",
      title: "PLUS · 19,99 € / MONAT",
      price: "19,99 € / Monat",
      usage: "200 Dialoge pro Monat",
      state: "Checkout folgt",
      bookable: false,
      benefits: [
        "200 Dialoge pro Monat",
        "Für regelmäßige Concierge-Nutzung",
        "Preis, Laufzeit und Zahlung werden vor dem Checkout klar angezeigt",
        "Keine Bestellung ohne ausdrückliche Bestätigung"
      ]
    },
    komfort: {
      code: "KOMFORT",
      title: "KOMFORT · 34,99 € / MONAT",
      price: "34,99 € / Monat",
      usage: "350 Dialoge pro Monat",
      state: "Checkout folgt",
      bookable: false,
      benefits: [
        "350 Dialoge pro Monat",
        "Für intensive Concierge-Nutzung",
        "Preis, Laufzeit und Zahlung werden vor dem Checkout klar angezeigt",
        "Keine Bestellung ohne ausdrückliche Bestätigung"
      ]
    },
    familie: {
      code: "FAMILIE",
      title: "FAMILIE · 59,99 € / MONAT",
      price: "59,99 € / Monat",
      usage: "600 Dialoge gemeinsam",
      state: "Checkout folgt",
      bookable: false,
      benefits: [
        "600 gemeinsam nutzbare Dialoge pro Monat",
        "Für Familien und unterstützte Angehörige",
        "Berechtigungen und Privatsphäre bleiben getrennt",
        "Keine Bestellung ohne ausdrückliche Bestätigung"
      ]
    }
  };
  const requestedPlan = (params.get("paket") || "free").toLowerCase();
  let currentPlanKey = PLAN_ALIASES[requestedPlan] || requestedPlan;
  if (!Object.hasOwn(PLANS, currentPlanKey)) currentPlanKey = "free";
  const selectedPlan = () => PLANS[currentPlanKey];
  const planBookable = () => selectedPlan().bookable;
  const conciergeProfiles = window.NAHWERKCarousel?.byKey || {};
  const recipientIds = ["recipientSalutation", "recipientFirstName", "recipientLastName", "relationship", "recipientPhone", "familyMessage"];
  const fullName = (first, last) => [first.trim(), last.trim()].filter(Boolean).join(" ");
  const isSelf = () => form.querySelector('input[name="setupFor"]:checked')?.value === "self";
  const conciergeValue = () => {
    const value = form.querySelector('[name="conciergeChoice"]')?.value;
    return conciergeProfiles[value] ? value : "nilo";
  };
  const concierge = () => conciergeProfiles[conciergeValue()].name;
  const escapeHtml = (value) => String(value || "").replace(/[&<>"']/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));
  const familyMessageValue = () => $("familyMessage")?.value.trim() || "";

  function setPlanPicker(open) {
    const picker = $("registrationPlanPicker");
    const button = $("planChangeButton");
    picker.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
    button.textContent = open ? "Auswahl schließen" : "Tarif ändern";
  }

  function updatePlanUi() {
    const plan = selectedPlan();
    const submit = $("registrationSubmit");
    $("selectedPlanName").textContent = plan.title;
    $("selectedPlanBenefits").innerHTML = plan.benefits.map((benefit) => `<li>${benefit}</li>`).join("");
    $("selectedPlanBox").classList.toggle("selected-paid-plan", !plan.bookable);

    form.querySelectorAll('input[name="planChoice"]').forEach((input) => {
      input.checked = input.value === currentPlanKey;
    });

    if (plan.bookable) {
      $("planSelectionNote").innerHTML = "<strong>Direkt registrierbar.</strong><br>Für FREE werden keine Zahlungsdaten benötigt.";
      submit.disabled = false;
      submit.removeAttribute("aria-disabled");
      submit.textContent = "Kostenlosen Zugang registrieren";
      return;
    }

    $("planSelectionNote").innerHTML = `<strong>${plan.code} ist ausgewählt.</strong><br>Der verbindliche Checkout wird erst aktiviert, wenn Preise, Leistungen, Zahlung, Widerruf und Kündigung vollständig freigegeben sind. Bis dahin wird nichts kostenpflichtig bestellt.`;
    submit.disabled = true;
    submit.setAttribute("aria-disabled", "true");
    submit.textContent = `${plan.code} ausgewählt · Checkout folgt`;
  }

  function selectPlan(key) {
    if (!Object.hasOwn(PLANS, key)) return;
    currentPlanKey = key;
    const url = new URL(location.href);
    url.searchParams.set("paket", key);
    history.replaceState(null, "", url);
    updatePlanUi();
  }

  function setupPlanSelection() {
    $("registrationPlanOptions").innerHTML = Object.entries(PLANS).map(([key, plan]) => `
      <label class="plan-option">
        <input type="radio" name="planChoice" value="${key}"${key === currentPlanKey ? " checked" : ""} />
        <span class="plan-option-card">
          <span class="plan-option-name">${plan.code}</span>
          <span class="plan-option-price">${plan.price}</span>
          <span class="plan-option-usage">${plan.usage}</span>
          <span class="plan-option-state">${plan.state}</span>
        </span>
      </label>`).join("");
    $("planChangeButton").addEventListener("click", () => {
      setPlanPicker($("registrationPlanPicker").hidden);
    });
    form.querySelectorAll('input[name="planChoice"]').forEach((input) => {
      input.addEventListener("change", () => selectPlan(input.value));
    });
    updatePlanUi();
    if (!planBookable()) setPlanPicker(true);
  }

  function injectConciergeStyles() {
    if ($("conciergeSelectionStyles")) return;
    const style = document.createElement("style");
    style.id = "conciergeSelectionStyles";
    style.textContent = `
      .concierge-choice { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; margin:14px 0 10px; }
      .concierge-choice .concierge-option { position:relative; display:block; min-width:0; cursor:pointer; }
      .concierge-choice .concierge-option > input { position:absolute; width:1px; height:1px; opacity:0; pointer-events:none; }
      .concierge-card-content { height:100%; overflow:hidden; border:1px solid var(--line,#ddd4ca); border-radius:14px; background:rgba(255,255,255,.72); transition:border-color .18s ease,box-shadow .18s ease,background .18s ease,transform .18s ease; }
      .concierge-card-content img { display:block; width:100%; aspect-ratio:4/3; object-fit:cover; object-position:center top; background:#eee8e0; }
      .concierge-card-copy { position:relative; padding:15px 44px 16px 16px; min-height:92px; }
      .concierge-card-copy strong { display:block; margin:0 0 5px; font-size:18px; line-height:1.2; color:var(--ink,#201d19); }
      .concierge-card-copy span { display:block; font-size:13px; line-height:1.45; color:var(--muted,#6e6861); }
      .concierge-check { position:absolute; right:14px; top:14px; width:24px; height:24px; border-radius:50%; display:grid; place-items:center; border:1px solid rgba(173,132,42,.5); color:transparent; background:rgba(255,255,255,.9); font-weight:900; }
      .concierge-option:hover .concierge-card-content { transform:translateY(-1px); box-shadow:0 10px 28px rgba(44,35,24,.08); }
      .concierge-option > input:checked + .concierge-card-content { border:2px solid var(--gold,#b68b32); background:rgba(182,139,50,.08); box-shadow:0 0 0 2px rgba(182,139,50,.12); }
      .concierge-option > input:checked + .concierge-card-content .concierge-check { color:#fff; background:var(--gold,#b68b32); border-color:var(--gold,#b68b32); }
      .concierge-option > input:focus-visible + .concierge-card-content { outline:3px solid rgba(182,139,50,.42); outline-offset:3px; }
      .concierge-selection-title { display:block; margin-bottom:6px; font-weight:800; font-size:18px; line-height:1.3; }
      .concierge-selection-intro { margin:0 0 6px; color:var(--muted,#6e6861); font-size:13px; line-height:1.55; }
      @media (max-width:700px) { .concierge-choice { grid-template-columns:1fr; } .concierge-card-content { display:grid; grid-template-columns:112px 1fr; } .concierge-card-content img { height:100%; min-height:120px; aspect-ratio:auto; } }
    `;
    document.head.appendChild(style);
  }

  function setupConciergeSelection() {
    const choice = form.querySelector(".concierge-choice");
    if (!choice) return;
    const requestedConcierge = params.get("concierge");
    if (conciergeProfiles[requestedConcierge]) choice.dataset.selected = requestedConcierge;
    const field = choice.closest(".field");
    const heading = field?.querySelector(":scope > legend, :scope > label");
    if (heading) {
      heading.classList.add("concierge-selection-title");
      heading.textContent = "Wer darf Sie begleiten?";
    }
    let intro = field?.querySelector(".concierge-intro, .concierge-selection-intro");
    if (!intro && field) {
      intro = document.createElement("p");
      intro.className = "concierge-intro concierge-selection-intro";
      choice.before(intro);
    }
    if (intro) intro.textContent = "Wählen Sie den Concierge, dessen Auftreten und Kommunikationsstil am besten zu Ihnen passt. Die grundlegenden Möglichkeiten bleiben bei allen Profilen gleich.";
    window.NAHWERKCarousel?.mount(choice, { variant: "selection", inputName: "conciergeChoice", selected: choice.dataset.selected || "nilo" });
    const oldHint = field?.querySelector(".tiny");
    if (oldHint) oldHint.textContent = "Die Auswahl gilt für diesen Zugang und kann später in den Concierge-Einstellungen geändert werden.";
  }

  function person() {
    return isSelf()
      ? { sal: $("ownerSalutation").value, first: $("ownerFirstName").value.trim(), last: $("ownerLastName").value.trim(), phone: $("ownerPhone").value.trim() }
      : { sal: $("recipientSalutation").value, first: $("recipientFirstName").value.trim(), last: $("recipientLastName").value.trim(), phone: $("recipientPhone").value.trim() };
  }

  function updateContextTexts() {
    const name = concierge();
    const ownerPhoneHint = $("ownerPhoneField")?.querySelector(".tiny");
    if (ownerPhoneHint) ownerPhoneHint.textContent = `Nur nötig, wenn Sie ${name} selbst über WhatsApp nutzen.`;
    const recipientHeading = $("recipientBlock")?.querySelector("h2");
    if (recipientHeading) recipientHeading.textContent = `Wen darf ${name} unterstützen?`;
    const noteLabel = document.querySelector('label[for="note"]');
    if (noteLabel) noteLabel.innerHTML = `Was sollte ${name} am Anfang wissen? <span class="tiny">(optional)</span>`;
    const addressingLabel = document.querySelector('label[for="addressing"]');
    if (addressingLabel) addressingLabel.textContent = `Wie soll ${name} die unterstützte Person ansprechen?`;
    const safetyCopy = $("safetyToggleRow")?.querySelector("span");
    if (safetyCopy) safetyCopy.innerHTML = `<strong>Optionale Sicherheitsfunktion einrichten</strong><br>Standardmäßig deaktiviert. ${name} kann zu vereinbarten Zeiten nachfragen, ob alles in Ordnung ist.`;
  }

  function render() {
    const p = person();
    const informal = $("addressing").value === "du";
    const greeting = informal && p.first ? `Hallo ${p.first}` : p.sal && p.last ? `Hallo ${p.sal} ${p.last}` : p.last ? `Hallo ${p.last}` : p.first ? `Hallo ${p.first}` : "Hallo";
    const owner = fullName($("ownerFirstName").value, $("ownerLastName").value);
    const introduction = !isSelf() && owner ? `<br>${escapeHtml(owner)} hat diesen Zugang für ${informal ? "dich" : "Sie"} eingerichtet.` : "";
    const familyMessage = !isSelf() ? familyMessageValue() : "";
    const familyMessagePreview = familyMessage ? `<br><br><em>Persönliche Nachricht von ${escapeHtml(owner || "Ihrer Familie")}:</em><br>„${escapeHtml(familyMessage).replace(/\n/g,"<br>")}“` : "";
    updateContextTexts();
    const welcomeMessage = product === "senioren"
      ? `<strong>${greeting} 👋</strong><br><br>Willkommen bei NAHWERK Concierge.${introduction}<br><br>Ich bin ${concierge()}, ${informal ? "dein" : "Ihr"} persönlicher KI-Concierge.<br><br>Ich helfe ${informal ? "dir" : "Ihnen"} dabei, Fragen verständlich zu klären, Technik Schritt für Schritt zu bedienen und wichtige Erinnerungen im Blick zu behalten.<br><br>Auf Wunsch erstelle ich Bilder, ordne Fotos ein, vergleiche Möglichkeiten und fasse Informationen übersichtlich zusammen.`
      : `<strong>${greeting} 👋</strong><br><br>Willkommen bei ${productLabel}.${introduction}<br><br>Ich bin ${concierge()}, ${informal ? "dein" : "Ihr"} persönlicher KI-Concierge.<br><br>Ich erkläre die Bedienung verständlich und helfe ${informal ? "dir" : "Ihnen"} bei Organisation, Informationen, Dokumenten und vielem mehr.`;
    $("messagePreview").innerHTML = welcomeMessage + familyMessagePreview;
  }

  function syncSelf() {
    const self = isSelf();
    const consentRow = $("consentRow");
    const consent = $("consent");
    form.querySelectorAll('.choice label').forEach((label) => label.classList.toggle("selected", label.querySelector("input")?.checked));
    $("recipientBlock").hidden = self;
    $("selfHint").hidden = !self;
    consentRow.hidden = self;
    consentRow.setAttribute("aria-hidden", String(self));
    $("ownerPhoneField").hidden = !self;
    $("ownerPhone").required = self;
    $("ownerPhone").disabled = !self;
    consent.required = !self;
    consent.disabled = self;
    recipientIds.forEach((id) => { $(id).disabled = self; });
    $("recipientFirstName").required = !self;
    $("recipientLastName").required = !self;
    $("recipientPhone").required = !self;
    if (self) consent.checked = false;
    render();
  }

  function syncSafety() {
    const enabled = $("safetyEnabled").checked;
    $("safetyFields").hidden = !enabled;
    $("checkinTimes").required = enabled;
    $("trustedContactPhone").required = enabled;
  }

  function show(message, error = false) {
    $("status").style.display = "block";
    $("status").style.borderLeftColor = error ? "#a84b4b" : "var(--gold)";
    $("status").innerHTML = message;
  }

  let pendingVerification = null;

  function ensureVerificationUi() {
    let panel = $("webVerificationPanel");
    if (panel) return panel;
    panel = document.createElement("div");
    panel.className = "field";
    panel.id = "webVerificationPanel";
    panel.hidden = true;
    panel.innerHTML = `
      <label for="webVerificationCode"><strong>Bestätigungscode</strong></label>
      <input id="webVerificationCode" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" placeholder="6-stelliger Code" aria-describedby="webVerificationHint" />
      <span class="tiny" id="webVerificationHint">Der Code wurde per WhatsApp gesendet und ist 10 Minuten gültig.</span>
      <button class="btn red" type="button" id="webVerificationSubmit">Code bestätigen</button>
    `;
    $("registrationSubmit").before(panel);
    $("webVerificationSubmit").addEventListener("click", submitVerification);
    $("webVerificationCode").addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        submitVerification();
      }
    });
    return panel;
  }

  function beginVerification(body, request, password) {
    pendingVerification = { request_id: String(body.request_id || ""), request, password };
    const panel = ensureVerificationUi();
    panel.hidden = false;
    $("registrationSubmit").hidden = true;
    const input = $("webVerificationCode");
    input.value = "";
    show("<strong>Bestätigung erforderlich.</strong><br>Wir haben einen sechsstelligen Code per WhatsApp gesendet. Bitte geben Sie ihn hier ein.");
    input.focus();
  }

  function resetVerificationUi() {
    pendingVerification = null;
    const panel = $("webVerificationPanel");
    if (panel) panel.hidden = true;
    $("registrationSubmit").hidden = false;
    updatePlanUi();
  }

  async function submitVerification() {
    if (!pendingVerification) return;
    const input = $("webVerificationCode");
    const button = $("webVerificationSubmit");
    const code = String(input.value || "").replace(/\s+/g, "");
    if (!/^\d{6}$/.test(code)) {
      return show("<strong>Bitte geben Sie den sechsstelligen Bestätigungscode ein.</strong>", true);
    }

    const { request_id, request, password } = pendingVerification;
    const verificationRequest = {
      request_id,
      verification_code: code,
      email: request.email,
      web_password: password,
      web_password_repeat: password,
      phone: request.phone || request.supported_whatsapp,
      first_name: request.supported_person_first_name || request.account_holder_first_name,
      last_name: request.supported_person_last_name || request.account_holder_last_name
    };

    button.disabled = true;
    button.textContent = "Code wird geprüft …";
    show("<strong>Code wird geprüft …</strong><br>Bitte lassen Sie diese Seite kurz geöffnet.");

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(verificationRequest)
      });
      const body = await response.json().catch(() => ({}));

      if (response.status === 201 && body.ok && body.status === "web_account_linked") {
        localStorage.setItem("scb_onboarding_sent", "1");
        localStorage.setItem("scb_onboarding_result", JSON.stringify(body));
        if (await login(request.email, password)) {
          show("<strong>Fertig.</strong><br>Die WhatsApp-Identität wurde bestätigt und der Web-Zugang wurde angelegt. Sie werden zum Kundenbereich weitergeleitet.");
          return setTimeout(() => { location.href = "konto.html"; }, 500);
        }
        show("<strong>Der Web-Zugang wurde angelegt.</strong><br>Bitte melden Sie sich jetzt mit Ihrer E-Mail-Adresse und Ihrem Passwort an.", true);
        return setTimeout(() => { location.href = "anmelden.html"; }, 1800);
      }

      if (response.status === 401 && body.status === "verification_failed") {
        input.select();
        return show("<strong>Der Bestätigungscode ist nicht gültig.</strong><br>Bitte prüfen Sie den sechsstelligen Code aus der WhatsApp-Nachricht und versuchen Sie es erneut.", true);
      }
      if (response.status === 429 && body.status === "verification_rate_limited") {
        return show("<strong>Zu viele Bestätigungsversuche.</strong><br>Bitte versuchen Sie es später erneut.", true);
      }
      if (response.status === 400 && body.status === "invalid_verification_request") {
        return show("<strong>Die Bestätigungsanfrage ist nicht vollständig.</strong><br>Bitte prüfen Sie den Code und versuchen Sie es erneut.", true);
      }
      if (response.status === 409 && body.status === "web_access_exists") {
        resetVerificationUi();
        return show('<strong>Für diese Person besteht bereits ein Web-Zugang.</strong><br><a href="anmelden.html">Zur Anmeldung</a>', true);
      }
      if (response.status === 409 && body.status === "email_in_use") {
        resetVerificationUi();
        return show('<strong>Für diese E-Mail-Adresse besteht bereits ein Konto.</strong><br><a href="anmelden.html">Zur Anmeldung</a>', true);
      }
      if (response.status === 409 && body.status === "identity_link_failed") {
        resetVerificationUi();
        return show("<strong>Die Bestätigung war erfolgreich, die Verknüpfung konnte aber nicht abgeschlossen werden.</strong><br>Bitte starten Sie die Registrierung erneut.", true);
      }
      if (body.status === "auth_setup_failed") {
        resetVerificationUi();
        return show("<strong>Die Identität wurde bestätigt, der Web-Zugang konnte aber nicht vollständig angelegt werden.</strong><br>Bitte starten Sie die Registrierung erneut.", true);
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (_) {
      show("<strong>Der Bestätigungscode konnte gerade nicht geprüft werden.</strong><br>Bitte versuchen Sie es erneut.", true);
    } finally {
      button.disabled = false;
      button.textContent = "Code bestätigen";
    }
  }

  async function login(email, password) {
    const response = await fetch(LOGIN_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    const body = await response.json().catch(() => ({}));
    if (!(response.ok && body.ok && body.status === "logged_in" && body.session_token)) return false;
    localStorage.setItem(SESSION_KEY, JSON.stringify({ session_token: body.session_token, customer_account_id: body.customer_account_id, person_id: body.person_id, role: body.role, expires_at: body.expires_at }));
    return true;
  }

  ensureVerificationUi();
  setupConciergeSelection();
  setupPlanSelection();
  sessionStorage.setItem("nahwerk_product", product);
  $("registrationTitle").textContent = `${productLabel} Zugang registrieren`;
  $("productLabel").textContent = productLabel;
  document.title = `${productLabel} registrieren | NAHWERK`;
  form.addEventListener("input", render);
  form.addEventListener("change", (event) => {
    if (event.target.name === "setupFor") syncSelf();
    if (event.target.id === "safetyEnabled") syncSafety();
    render();
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!planBookable()) return show(`<strong>${selectedPlan().code} ist ausgewählt, aber der sichere Checkout ist noch nicht freigegeben.</strong><br>Bitte wählen Sie FREE oder ändern Sie den Tarif oben. Es wurde nichts kostenpflichtig bestellt.`, true);
    const password = $("webPassword").value;
    if (password.length < 10 || password.length > 128) return show("<strong>Das Passwort muss zwischen 10 und 128 Zeichen lang sein.</strong>", true);
    if (!form.reportValidity()) return;
    const self = isSelf();
    const p = person();
    const safety = $("safetyEnabled").checked;
    const request = {
      product, concierge_profile: product === "senioren" ? "SENIOR_MARTIN" : "PRIME_MARTIN", concierge_choice: conciergeValue(), package: selectedPlan().code,
      registration_type: self ? "self" : "other", account_holder_name: fullName($("ownerFirstName").value, $("ownerLastName").value), account_holder_salutation: $("ownerSalutation").value,
      account_holder_first_name: $("ownerFirstName").value.trim(), account_holder_last_name: $("ownerLastName").value.trim(), email: $("ownerEmail").value.trim(), phone: self ? $("ownerPhone").value.trim() : "",
      supported_person_name: fullName(p.first, p.last), supported_person_salutation: p.sal, supported_person_first_name: p.first, supported_person_last_name: p.last,
      relationship: self ? "Ich selbst" : $("relationship").selectedOptions[0].textContent.trim(), supported_whatsapp: p.phone, form_of_address: $("addressing").value.toUpperCase(), initial_notes: (() => {
        const notes = $("note").value.trim();
        const personal = self ? "" : familyMessageValue();
        const parts = [];
        if (notes) parts.push(notes);
        if (personal) parts.push(`Persönliche Nachricht der einrichtenden Person, die beim ersten Kontakt zusätzlich zur NAHWERK-Begrüßung übermittelt werden soll: "${personal}"`);
        return parts.join("\n\n");
      })(),
      contact_consent: self || $("consent").checked, safety_enabled: safety, checkin_times: safety ? $("checkinTimes").value.trim() : "", trusted_contact_name: safety ? $("trustedContactName").value.trim() : "", trusted_contact_phone: safety ? $("trustedContactPhone").value.trim() : "",
      account_holder_web_only: !self, web_password: password, web_password_repeat: password
    };
    const draft = { ...request, web_password: undefined, web_password_repeat: undefined, createdAt: new Date().toISOString(), source: "website" };
    localStorage.setItem("scb_onboarding", JSON.stringify(draft));
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    submit.textContent = "Zugang wird angelegt …";
    show("<strong>Wird eingerichtet …</strong><br>Bitte lassen Sie diese Seite kurz geöffnet.");
    try {
      const response = await fetch(WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request) });
      const body = await response.json().catch(() => ({}));
      if (response.ok && body.ok === true && body.status === "verification_required" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(body.request_id || ""))) {
        beginVerification(body, request, password);
        return;
      }
      if (response.status === 201 && body.ok) {
        localStorage.setItem("scb_onboarding_sent", "1");
        localStorage.setItem("scb_onboarding_result", JSON.stringify(body));
        if (await login(request.email, password)) {
          show("<strong>Fertig.</strong><br>Der Zugang wurde angelegt. Sie werden zum Kundenbereich weitergeleitet.");
          return setTimeout(() => { location.href = "konto.html"; }, 500);
        }
        show("<strong>Der Zugang wurde angelegt.</strong><br>Bitte melden Sie sich jetzt an.", true);
        return setTimeout(() => { location.href = "anmelden.html"; }, 1800);
      }
      if (response.status === 409 && body.status === "email_in_use") return show('<strong>Für diese E-Mail-Adresse besteht bereits ein Konto.</strong><br><a href="anmelden.html">Zur Anmeldung</a>', true);
      if (response.status === 400 || body.status === "validation_error") return show("<strong>Bitte prüfen Sie Ihre Angaben.</strong>", true);
      throw new Error(`HTTP ${response.status}`);
    } catch (_) {
      show("<strong>Die Registrierung konnte gerade nicht übertragen werden.</strong><br>Bitte versuchen Sie es in Kürze erneut.", true);
    } finally {
      submit.disabled = false;
      updatePlanUi();
    }
  });
  if (params.get("fuer") === "andere") {
    const otherSetup = form.querySelector('input[name="setupFor"][value="other"]');
    if (otherSetup) otherSetup.checked = true;
  }
  syncSelf(); syncSafety();
})();
