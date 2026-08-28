(() => {
  "use strict";

  const WEBHOOK_URL = "https://denizw.app.n8n.cloud/webhook/senioren-concierge/anmelden";
  const LOGIN_URL = "https://denizw.app.n8n.cloud/webhook/senioren-concierge/web/login/password";
  const SESSION_KEY = "scb_web_session";
  const DRAFT_KEY = "scb_onboarding";
  const PROFILES = window.NAHWERK_CONCIERGE_PROFILES;
  const LANGUAGES = window.NAHWERK_SUPPORTED_LANGUAGES;
  const form = document.getElementById("signupForm");

  if (!form) return;
  if (!PROFILES || Object.keys(PROFILES).length !== 23) throw new Error("NAHWERK persona catalog unavailable");
  if (!LANGUAGES || !Object.keys(LANGUAGES).length) throw new Error("NAHWERK language catalog unavailable");

  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const requestedProduct = params.get("produkt");
  const product = requestedProduct === "senioren" || (!requestedProduct && sessionStorage.getItem("nahwerk_product") === "senioren") ? "senioren" : "prime";
  const productLabel = product === "senioren" ? "Senioren Concierge" : "Persönlicher Concierge";

  const PLAN_ALIASES = {
    kostenlos: "free",
    "premium-plus": "superior",
    premium_plus: "superior"
  };

  const PLANS = {
    free: {
      code: "FREE",
      title: "FREE · 0 € / MONAT",
      price: "0 €",
      usage: "50 Nachrichten/Monat",
      bookable: true,
      benefits: [
        "50 Nachrichten pro Monat",
        "1 Bildgenerierung",
        "2 Dokument-Digitalisierungen",
        "10 Erinnerungen",
        "15 Voice-Minuten",
        "Direkt in WhatsApp",
        "Text- und Sprachnachrichten"
      ]
    },
    standard: {
      code: "STANDARD",
      title: "STANDARD · 19,99 € / MONAT",
      price: "19,99 €",
      usage: "200 Nachrichten/Monat",
      bookable: false,
      benefits: [
        "200 Nachrichten pro Monat",
        "3 Bildgenerierungen",
        "10 Dokument-Digitalisierungen",
        "30 Erinnerungen",
        "60 Voice-Minuten"
      ]
    },
    komfort: {
      code: "KOMFORT",
      title: "KOMFORT · 34,99 € / MONAT",
      price: "34,99 €",
      usage: "350 Nachrichten/Monat",
      bookable: false,
      benefits: [
        "350 Nachrichten pro Monat",
        "8 Bildgenerierungen",
        "25 Dokument-Digitalisierungen",
        "100 Erinnerungen",
        "180 Voice-Minuten"
      ]
    },
    premium: {
      code: "PREMIUM",
      title: "PREMIUM · 59,99 € / MONAT",
      price: "59,99 €",
      usage: "600 Nachrichten/Monat",
      bookable: false,
      benefits: [
        "600 Nachrichten pro Monat",
        "15 Bildgenerierungen",
        "40 Dokument-Digitalisierungen",
        "250 Erinnerungen",
        "300 Voice-Minuten"
      ]
    },
    superior: {
      code: "SUPERIOR",
      title: "SUPERIOR · 99,99 € / MONAT",
      price: "99,99 €",
      usage: "1.000 Nachrichten/Monat",
      bookable: false,
      benefits: [
        "1.000 Nachrichten pro Monat",
        "30 Bildgenerierungen",
        "75 Dokument-Digitalisierungen",
        "500 Erinnerungen",
        "600 Voice-Minuten",
        "30 Outbound-Voice-Minuten"
      ]
    }
  };

  const requestedPlanRaw = (params.get("paket") || "free").toLowerCase();
  let currentPlanKey = PLAN_ALIASES[requestedPlanRaw] || requestedPlanRaw;
  if (!Object.hasOwn(PLANS, currentPlanKey)) currentPlanKey = "free";

  const selectedPlan = () => PLANS[currentPlanKey];
  const planBookable = () => selectedPlan().bookable;
  const recipientIds = ["recipientSalutation", "recipientFirstName", "recipientLastName", "relationship", "recipientPhone"];

  const fullName = (first, last) => [first.trim(), last.trim()].filter(Boolean).join(" ");
  const isSelf = () => form.querySelector('input[name="setupFor"]:checked')?.value === "self";
  const conciergeValue = () => {
    const value = form.querySelector('input[name="conciergeChoice"]:checked')?.value;
    return Object.hasOwn(PROFILES, value) ? value : "nilo";
  };
  const concierge = () => PROFILES[conciergeValue()].name;
  const languageValue = () => Object.hasOwn(LANGUAGES, $("preferredLanguage").value) ? $("preferredLanguage").value : "de";
  const language = () => LANGUAGES[languageValue()];

  function injectPlanStyles() {
    if ($("nahwerkPlanSelectionStyles")) return;
    const style = document.createElement("style");
    style.id = "nahwerkPlanSelectionStyles";
    style.textContent = `
      .registration-plan-section{margin:0 0 24px;padding:0;border:0}
      .registration-plan-section legend{font:700 25px/1.2 Georgia,serif;margin-bottom:8px}
      .registration-plan-intro{margin:0 0 16px;color:var(--muted,#a8a8a4);line-height:1.55}
      .registration-plan-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .registration-plan-option{position:relative;display:block;cursor:pointer}
      .registration-plan-option>input{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
      .registration-plan-card{display:grid;gap:5px;height:100%;padding:18px;border:1px solid var(--line,#303030);border-radius:16px;background:var(--panel,#0f0f10);transition:.18s ease}
      .registration-plan-card strong{font-size:17px;color:#fff}
      .registration-plan-price{color:var(--gold2,#f3cf73);font-weight:800}
      .registration-plan-usage{color:var(--muted,#aaa8a2);font-size:13px;line-height:1.4}
      .registration-plan-option:hover .registration-plan-card{transform:translateY(-2px);border-color:rgba(215,169,52,.55)}
      .registration-plan-option>input:checked+.registration-plan-card{border-color:var(--gold,#d7a934);box-shadow:0 0 0 2px rgba(215,169,52,.14)}
      .registration-plan-option>input:focus-visible+.registration-plan-card{outline:3px solid rgba(215,169,52,.4);outline-offset:3px}
      .registration-plan-status{margin-top:12px;font-size:13px;line-height:1.5;color:var(--muted,#aaa8a2)}
      .registration-plan-status a{color:var(--gold2,#f3cf73);text-decoration:underline}
      @media(max-width:700px){.registration-plan-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function setupPlanSelection() {
    injectPlanStyles();
    let section = $("registrationPlanSection");
    if (!section) {
      section = document.createElement("fieldset");
      section.id = "registrationPlanSection";
      section.className = "registration-plan-section";
      section.innerHTML = `
        <legend>Welchen Tarif möchten Sie?</legend>
        <p class="registration-plan-intro">Tarif und Concierge werden unabhängig voneinander gewählt. Sie können den Tarif hier ändern, auch wenn Sie über eine Concierge-Auswahl auf diese Seite gekommen sind.</p>
        <div class="registration-plan-grid" id="registrationPlanGrid" role="radiogroup" aria-label="NAHWERK Tarif auswählen"></div>
        <div class="registration-plan-status" id="registrationPlanStatus"></div>`;
      $("selectedPlanBox").before(section);
    }

    const grid = $("registrationPlanGrid");
    grid.innerHTML = Object.entries(PLANS).map(([key, plan]) => `
      <label class="registration-plan-option">
        <input type="radio" name="planChoice" value="${key}"${key === currentPlanKey ? " checked" : ""} aria-label="${plan.code} auswählen">
        <span class="registration-plan-card">
          <strong>${plan.code}</strong>
          <span class="registration-plan-price">${plan.price} / Monat</span>
          <span class="registration-plan-usage">${plan.usage}</span>
        </span>
      </label>`).join("");

    grid.addEventListener("change", (event) => {
      if (event.target.name !== "planChoice") return;
      selectPlan(event.target.value);
    });
    updatePlanUi();
  }

  function selectPlan(key) {
    if (!Object.hasOwn(PLANS, key)) return;
    currentPlanKey = key;
    const url = new URL(location.href);
    url.searchParams.set("paket", key);
    history.replaceState(null, "", url);
    updatePlanUi();
  }

  function updatePlanUi() {
    const plan = selectedPlan();
    $("selectedPlanName").textContent = plan.title;
    $("selectedPlanBenefits").innerHTML = plan.benefits.map((benefit) => `<li>${benefit}</li>`).join("");
    $("selectedPlanBox").classList.toggle("selected-paid-plan", !plan.bookable);

    const status = $("registrationPlanStatus");
    const note = $("planSelectionNote");
    const submit = $("registrationSubmit");

    if (plan.bookable) {
      status.innerHTML = "FREE kann aktuell direkt registriert werden.";
      note.innerHTML = "<strong>FREE ist ausgewählt.</strong><br>Keine automatische kostenpflichtige Umwandlung.";
      submit.disabled = false;
      submit.removeAttribute("aria-disabled");
      submit.textContent = "Kostenlosen Zugang registrieren";
    } else {
      status.innerHTML = `<strong>${plan.code} ist ausgewählt.</strong> Die Tarifauswahl ist vorbereitet; der verbindliche Kauf wird erst freigeschaltet, sobald der sichere Checkout-/Zahlungsprozess GREEN ist. <a href="pakete.html">Tarife ansehen</a>.`;
      note.innerHTML = `<strong>${plan.code} · ${plan.price} / Monat</strong><br>Dieser Tarif ist auswählbar, aber noch nicht verbindlich buchbar. Es wird keine kostenpflichtige Registrierung ohne realen Checkout erzeugt.`;
      submit.disabled = true;
      submit.setAttribute("aria-disabled", "true");
      submit.textContent = `${plan.code} ausgewählt · Checkout noch nicht aktiv`;
    }
  }

  function setupLanguageSelection() {
    $("preferredLanguage").innerHTML = Object.entries(LANGUAGES)
      .map(([code, item]) => `<option value="${code}">${item.label}</option>`)
      .join("");
    $("preferredLanguage").value = "de";
  }

  function setupConciergeSelection() {
    const choice = form.querySelector(".concierge-choice");
    choice.innerHTML = Object.entries(PROFILES).map(([value, profile], index) => `
      <label class="concierge-option">
        <input type="radio" name="conciergeChoice" value="${value}"${index === 0 ? " checked" : ""} aria-label="${profile.name} auswählen" />
        <span class="concierge-card-content">
          <img src="${profile.image}" alt="Portrait von ${profile.name}, NAHWERK Concierge" loading="lazy" />
          <span class="concierge-card-copy"><strong>${profile.name}</strong><span>${profile.description}</span><span class="concierge-check" aria-hidden="true">✓</span></span>
        </span>
      </label>`).join("");
    const requestedConcierge = params.get("concierge");
    if (requestedConcierge && Object.hasOwn(PROFILES, requestedConcierge)) {
      const input = choice.querySelector(`input[value="${CSS.escape(requestedConcierge)}"]`);
      if (input) input.checked = true;
    }
  }

  function person() {
    return isSelf()
      ? { sal: $("ownerSalutation").value, first: $("ownerFirstName").value.trim(), last: $("ownerLastName").value.trim(), phone: $("ownerPhone").value.trim() }
      : { sal: $("recipientSalutation").value, first: $("recipientFirstName").value.trim(), last: $("recipientLastName").value.trim(), phone: $("recipientPhone").value.trim() };
  }

  function updateContextTexts() {
    const name = concierge();
    $("recipientHeading").textContent = `Wen darf ${name} unterstützen?`;
    $("ownerPhoneHint").textContent = `Nur nötig, wenn Sie ${name} selbst über WhatsApp nutzen.`;
    $("notePrompt").textContent = `Was sollte ${name} am Anfang wissen?`;
    $("addressingLabel").textContent = `Wie soll ${name} die unterstützte Person ansprechen?`;
    $("safetyConciergeName").textContent = name;
  }

  function render() {
    const p = person();
    const informal = $("addressing").value === "du";
    const greeting = informal && p.first ? `Hallo ${p.first}` : p.sal && p.last ? `Hallo ${p.sal} ${p.last}` : p.last ? `Hallo ${p.last}` : p.first ? `Hallo ${p.first}` : "Hallo";
    const owner = fullName($("ownerFirstName").value, $("ownerLastName").value);
    const introduction = !isSelf() && owner ? `<br>${owner} hat diesen Zugang für ${informal ? "dich" : "Sie"} eingerichtet.` : "";
    updateContextTexts();
    $("messagePreview").innerHTML = `<strong>${greeting} 👋</strong><br><br>Willkommen bei ${productLabel}.${introduction}<br><br>Ich bin ${concierge()}, ${informal ? "dein" : "Ihr"} persönlicher KI-Concierge.<br><br>Gewählte Sprache: ${language().label}. Ich erkläre die Bedienung verständlich und helfe ${informal ? "dir" : "Ihnen"} bei Organisation, Informationen, Dokumenten und vielem mehr.`;
  }

  function syncSelf() {
    const self = isSelf();
    form.querySelectorAll(".setup-choice label").forEach((label) => label.classList.toggle("selected", label.querySelector("input")?.checked));
    $("recipientBlock").hidden = self;
    $("selfHint").hidden = !self;
    $("consentRow").hidden = self;
    $("ownerPhoneField").hidden = !self;
    $("ownerPhone").required = self;
    $("ownerPhone").disabled = !self;
    $("consent").required = !self;
    recipientIds.forEach((id) => { $(id).disabled = self; });
    $("recipientFirstName").required = !self;
    $("recipientLastName").required = !self;
    $("recipientPhone").required = !self;
    if (self) $("consent").checked = true;
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

  async function login(email, password) {
    const response = await fetch(LOGIN_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    const body = await response.json().catch(() => ({}));
    if (!(response.ok && body.ok && body.status === "logged_in" && body.session_token)) return false;
    localStorage.setItem(SESSION_KEY, JSON.stringify({ session_token: body.session_token, customer_account_id: body.customer_account_id, person_id: body.person_id, role: body.role, expires_at: body.expires_at }));
    return true;
  }

  setupLanguageSelection();
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
    if (!planBookable()) return show(`<strong>${selectedPlan().code} ist ausgewählt, aber der Checkout ist noch nicht freigegeben.</strong><br>Es wird keine kostenpflichtige Registrierung ohne realen Zahlungsprozess erzeugt. Sie können den Tarif oben ändern oder aktuell FREE registrieren.`, true);
    const password = $("webPassword").value;
    if (password.length < 10 || password.length > 128) return show("<strong>Das Passwort muss zwischen 10 und 128 Zeichen lang sein.</strong>", true);
    if (!form.reportValidity()) return;

    const self = isSelf();
    const p = person();
    const safety = $("safetyEnabled").checked;
    const selectedLanguage = language();
    const request = {
      product,
      concierge_choice: conciergeValue(),
      language: languageValue(),
      language_code: languageValue(),
      language_locale: selectedLanguage.locale,
      package: selectedPlan().code,
      registration_type: self ? "self" : "other",
      account_holder_name: fullName($("ownerFirstName").value, $("ownerLastName").value),
      account_holder_salutation: $("ownerSalutation").value,
      account_holder_first_name: $("ownerFirstName").value.trim(),
      account_holder_last_name: $("ownerLastName").value.trim(),
      email: $("ownerEmail").value.trim(),
      phone: self ? $("ownerPhone").value.trim() : "",
      supported_person_name: fullName(p.first, p.last),
      supported_person_salutation: p.sal,
      supported_person_first_name: p.first,
      supported_person_last_name: p.last,
      relationship: self ? "Ich selbst" : $("relationship").selectedOptions[0].textContent.trim(),
      supported_whatsapp: p.phone,
      form_of_address: $("addressing").value.toUpperCase(),
      initial_notes: $("note").value.trim(),
      contact_consent: self || $("consent").checked,
      safety_enabled: safety,
      checkin_times: safety ? $("checkinTimes").value.trim() : "",
      trusted_contact_name: safety ? $("trustedContactName").value.trim() : "",
      trusted_contact_phone: safety ? $("trustedContactPhone").value.trim() : "",
      account_holder_web_only: !self,
      web_password: password,
      web_password_repeat: password
    };
    const { web_password: _password, web_password_repeat: _passwordRepeat, ...persistableRequest } = request;
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...persistableRequest, createdAt: new Date().toISOString(), source: "website" }));

    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    submit.textContent = "Zugang wird angelegt …";
    show("<strong>Wird eingerichtet …</strong><br>Bitte lassen Sie diese Seite kurz geöffnet.");
    try {
      const response = await fetch(WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request) });
      const body = await response.json().catch(() => ({}));
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
  syncSelf();
  syncSafety();
})();