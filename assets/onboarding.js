(() => {
  const WEBHOOK_URL = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/web-registration-secure";
  const LOGIN_URL = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/web-login-secure";
  const SESSION_URL = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/web-session-secure";
  const MFA_MANAGE_URL = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/web-mfa-manage";
  const SESSION_KEY = "scb_web_session";
  const SECURITY_PROMPT_KEY = "nw_post_registration_security_prompt";
  const FAMILY_REGISTRATION_DRAFT_KEY = "nw_family_registration_pending_v1";
  const form = document.getElementById("signupForm");
  if (!form) return;

  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const guestChatHandoff = params.get("source") === "web_guest_chat";
  const appHandoff = params.get("next") === "app";
  const requestedNext = params.get("next") === "/payg" ? "/payg" : "";
  const postAuthTarget = guestChatHandoff && requestedNext ? requestedNext : "";
  const guestLoginHref = appHandoff
    ? "/anmelden?produkt=stewaro&next=app"
    : postAuthTarget ? "/anmelden?source=web_guest_chat&next=%2Fpayg" : "/anmelden";
  const product = "stewaro";
  const productLabel = "STEWARO Concierge";
  const PLAN_ALIASES = {
    kostenlos: "free",
    "premium-plus": "premium_plus",
    premiumplus: "premium_plus"
  };
  const PLANS = {
    free: {
      code: "FREE",
      title: "FREE · 0 € / MONAT",
      price: "0 € / Monat",
      usage: "Zentrales FREE-Kontingent · nach Login live sichtbar",
      state: "Verfügbar",
      bookable: true,
      benefits: [
        "Dauerhaft kostenlos",
        "Zentrale FREE-Berechtigungen für App und WhatsApp",
        "Verbrauch und verbleibendes Kontingent nach Login live sichtbar",
        "Direkt in WhatsApp",
        "Text- und Sprachnachrichten",
        "Keine Zahlungsdaten und keine automatische kostenpflichtige Umwandlung"
      ]
    },
    standard: {
      code: "STANDARD",
      title: "STANDARD · 5,99 € / MONAT",
      price: "5,99 € / Monat",
      usage: "App unbegrenzt · 30 WhatsApp-Dialoge",
      state: "Checkout folgt",
      bookable: false,
      benefits: [
        "App unbegrenzt",
        "30 WhatsApp-Dialoge pro Monat",
        "Für regelmäßige Concierge-Nutzung",
        "Preis, Laufzeit und Zahlung werden vor dem Checkout klar angezeigt",
        "Keine Bestellung ohne ausdrückliche Bestätigung"
      ]
    },
    plus: {
      code: "PLUS",
      title: "PLUS · 10,99 € / MONAT",
      price: "10,99 € / Monat",
      usage: "App unbegrenzt · 50 WhatsApp-Dialoge",
      state: "Checkout folgt",
      bookable: false,
      benefits: [
        "App unbegrenzt",
        "50 WhatsApp-Dialoge pro Monat",
        "Für intensive Concierge-Nutzung",
        "Preis, Laufzeit und Zahlung werden vor dem Checkout klar angezeigt",
        "Keine Bestellung ohne ausdrückliche Bestätigung"
      ]
    },
    premium: {
      code: "PREMIUM",
      title: "PREMIUM · 19,99 € / MONAT",
      price: "19,99 € / Monat",
      usage: "App unbegrenzt · 100 WhatsApp-Dialoge",
      state: "Checkout folgt",
      bookable: false,
      benefits: [
        "App unbegrenzt",
        "100 WhatsApp-Dialoge pro Monat",
        "Für umfangreiche Concierge-Nutzung",
        "Preis, Laufzeit und Zahlung werden vor dem Checkout klar angezeigt",
        "Keine Bestellung ohne ausdrückliche Bestätigung"
      ]
    },
    premium_plus: {
      code: "PREMIUM PLUS",
      title: "PREMIUM PLUS · 34,99 € / MONAT",
      price: "34,99 € / Monat",
      usage: "App unbegrenzt · 160 WhatsApp-Dialoge",
      state: "Checkout folgt",
      bookable: false,
      benefits: [
        "App unbegrenzt",
        "160 WhatsApp-Dialoge pro Monat",
        "Für besonders intensive Concierge-Nutzung",
        "Preis, Laufzeit und Zahlung werden vor dem Checkout klar angezeigt",
        "Keine Bestellung ohne ausdrückliche Bestätigung"
      ]
    },
    familie: {
      code: "FAMILIE",
      title: "FAMILIE · 59,66 € / MONAT",
      price: "59,66 € / Monat",
      usage: "App unbegrenzt · 300 WhatsApp-Dialoge",
      state: "Checkout folgt",
      bookable: false,
      benefits: [
        "App unbegrenzt",
        "300 gemeinsam nutzbare WhatsApp-Dialoge pro Monat",
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
  const recipientIds = ["recipientSalutation", "recipientFirstName", "recipientLastName", "relationship", "recipientPhone", "familyMessage"];
  const fullName = (first, last) => [first.trim(), last.trim()].filter(Boolean).join(" ");
  const isSelf = () => form.querySelector('input[name="setupFor"]:checked')?.value === "self";
  const conciergeValue = () => "fidel";
  const concierge = () => "FIDEL";
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
      $("planSelectionNote").innerHTML = "<strong>Direkt registrierbar.</strong><br>FREE wird ohne Zahlungsdaten angelegt. Berechtigungen und Kontingente kommen aus dem zentralen STEWARO-Konto und werden nach Login unter Nutzung angezeigt.";
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

  function setupConciergeSelection() {
    // FIDEL is the STEWARO identity. Voice variants are configured separately and
    // never change the concierge name or brand.
    const existing = [...form.querySelectorAll('[name="conciergeChoice"]')];
    existing.forEach((input) => {
      input.disabled = true;
      if ("checked" in input) input.checked = false;
    });
    let fixed = form.querySelector('input[data-stewaro-fidel-authority]');
    if (!fixed) {
      fixed = document.createElement("input");
      fixed.type = "hidden";
      fixed.name = "conciergeChoice";
      fixed.dataset.stewaroFidelAuthority = "true";
      form.append(fixed);
    }
    fixed.value = "fidel";
    const choice = form.querySelector(".concierge-choice");
    const field = choice?.closest(".field");
    if (field) {
      field.hidden = true;
      field.setAttribute("aria-hidden", "true");
    }
  }

  function person() {
    return isSelf()
      ? { sal: $("ownerSalutation").value, first: $("ownerFirstName").value.trim(), last: $("ownerLastName").value.trim(), phone: $("ownerPhone").value.trim() }
      : { sal: $("recipientSalutation").value, first: $("recipientFirstName").value.trim(), last: $("recipientLastName").value.trim(), phone: $("recipientPhone").value.trim() };
  }

  function updateContextTexts() {
    const name = concierge();
    const ownerPhoneHint = $("ownerPhoneField")?.querySelector(".tiny");
    if (ownerPhoneHint) ownerPhoneHint.textContent = `Optional. Sie können WhatsApp jetzt verbinden oder später im Kundenkonto ergänzen.`;
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
    const welcomeMessage = `<strong>${greeting} 👋</strong><br><br>Willkommen bei STEWARO Concierge.${introduction}<br><br>Ich bin FIDEL, ${informal ? "dein" : "Ihr"} persönlicher KI-Concierge.<br><br>Ich helfe ${informal ? "dir" : "Ihnen"} verständlich bei Organisation, Informationen, Dokumenten, Erinnerungen und weiteren Alltagsaufgaben.`;
    $("messagePreview").innerHTML = welcomeMessage + familyMessagePreview;
  }

  function syncSelf() {
    const self = isSelf();
    const consentRow = $("consentRow");
    const consent = $("consent");
    form.querySelectorAll('.choice label').forEach((label) => label.classList.toggle("selected", label.querySelector("input")?.checked));
    $("recipientBlock").hidden = self;
    $("selfHint").hidden = !self;
    const selfScope = $("selfRegistrationScope");
    if (selfScope) selfScope.hidden = !self;
    consentRow.hidden = self;
    consentRow.setAttribute("aria-hidden", String(self));
    $("ownerPhoneField").hidden = !self;
    $("ownerPhone").required = false;
    $("ownerPhone").disabled = !self;
    consent.disabled = self;
    recipientIds.forEach((id) => { $(id).disabled = self; });
    $("recipientFirstName").required = !self;
    $("recipientLastName").required = !self;
    $("recipientPhone").required = false;
    const recipientHasWhatsapp = !self && Boolean($("recipientPhone").value.trim());
    consentRow.hidden = self || !recipientHasWhatsapp;
    consentRow.setAttribute("aria-hidden", String(self || !recipientHasWhatsapp));
    consent.required = recipientHasWhatsapp;
    if (self || !recipientHasWhatsapp) consent.checked = false;
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
        void window.NahwerkAnalytics?.track("registration_complete", { funnel_name: "registration", funnel_step: "complete" });
        window.NahwerkActivation?.markRegistrationComplete?.();
        localStorage.setItem("scb_onboarding_sent", "1");
        localStorage.setItem("scb_onboarding_result", JSON.stringify(body));
        const loginResult = await login(request.email, password);
        if (loginResult) {
          if (appHandoff) {
            show("<strong>Fertig.</strong><br>FIDEL wird jetzt sicher geöffnet.");
            void handoffToApp(loginResult.session_token);
            return;
          }
          show("<strong>Fertig.</strong><br>Die WhatsApp-Identität wurde bestätigt und der Web-Zugang wurde angelegt. Sie werden zum Kundenbereich weitergeleitet.");
          return setTimeout(() => { location.href = postAuthTarget || window.NAHWERKLocale?.href("erster-schritt.html") || "erster-schritt.html"; }, 500);
        }
        show("<strong>Der Web-Zugang wurde angelegt.</strong><br>Bitte melden Sie sich jetzt mit Ihrer E-Mail-Adresse und Ihrem Passwort an.", true);
        return setTimeout(() => { location.href = (postAuthTarget || appHandoff) ? guestLoginHref : (window.NAHWERKLocale?.href("anmelden.html") || "anmelden.html"); }, 1800);
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
        return show(`<strong>Für diese Person besteht bereits ein Web-Zugang.</strong><br><a href="${guestLoginHref}">Zur Anmeldung</a>`, true);
      }
      if (response.status === 409 && body.status === "email_in_use") {
        resetVerificationUi();
        return show(`<strong>Für diese E-Mail-Adresse besteht bereits ein Konto.</strong><br><a href="${guestLoginHref}">Zur Anmeldung</a>`, true);
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

  async function initializeSecurityRecommendation(sessionToken) {
    localStorage.setItem(SECURITY_PROMPT_KEY, "1");
    try {
      await fetch(MFA_MANAGE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + sessionToken
        },
        body: JSON.stringify({ action: "nudge_init" })
      });
    } catch (_) {}
  }

  async function handoffToApp(sessionToken) {
    try {
      const response = await fetch(SESSION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + sessionToken },
        body: JSON.stringify({ action: "handoff_create" }),
        cache: "no-store",
        credentials: "omit"
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.ok !== true || body?.status !== "handoff_ready" || !/^https:\/\/app\.stewaro\.com\/#handoff=/.test(String(body?.target_url || ""))) {
        throw new Error(String(body?.status || "handoff_create_failed"));
      }
      location.replace(String(body.target_url));
      return true;
    } catch (_) {
      show("<strong>FIDEL konnte gerade nicht geöffnet werden.</strong><br>Der Zugang ist angelegt. Bitte öffnen Sie FIDEL anschließend über Ihr Konto.", true);
      setTimeout(() => { location.href = "/konto"; }, 1800);
      return false;
    }
  }

  async function login(email, password) {
    const response = await fetch(LOGIN_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    const body = await response.json().catch(() => ({}));
    if (!(response.ok && body.ok && body.status === "logged_in" && body.session_token)) return false;
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      session_token: body.session_token,
      customer_account_id: body.customer_account_id,
      person_id: body.person_id,
      role: body.role,
      expires_at: body.expires_at,
      product_context: body.product_context || (body.brand === "stewaro" ? "stewaro" : product)
    }));
    await initializeSecurityRecommendation(body.session_token);
    return body;
  }

  ensureVerificationUi();
  setupConciergeSelection();
  setupPlanSelection();
  if (postAuthTarget || appHandoff) {
    document.querySelectorAll('a[href="/anmelden"],a[href="anmelden.html"]').forEach((link) => {
      if (link instanceof HTMLAnchorElement) link.href = guestLoginHref;
    });
  }
  sessionStorage.setItem("nahwerk_product", product);
  $("productLabel").textContent = productLabel;
  document.title = `${productLabel} registrieren | STEWARO`;
  form.addEventListener("input", (event) => {
    if (event.target?.id === "recipientPhone") syncSelf();
    else render();
  });
  form.addEventListener("change", (event) => {
    if (event.target.name === "setupFor") syncSelf();
    if (event.target.id === "safetyEnabled") syncSafety();
    render();
  });
  form.addEventListener("submit", async (event) => {
    void window.NahwerkAnalytics?.track("registration_start", { funnel_name: "registration", funnel_step: "start" });
    event.preventDefault();
    if (!planBookable()) return show(`<strong>${selectedPlan().code} ist ausgewählt, aber der sichere Checkout ist noch nicht freigegeben.</strong><br>Bitte wählen Sie FREE oder ändern Sie den Tarif oben. Es wurde nichts kostenpflichtig bestellt.`, true);
    const password = $("webPassword").value;
    const passwordLength = [...password].length;
    const normalizedPassword = password.toLowerCase();
    const blockedPasswords = new Set([
      "passwordpassword",
      "password123456",
      "123456789012345",
      "1234567890123456",
      "qwertyuiopasdfgh",
      "qwertyuiop123456",
      "letmeinletmein",
      "iloveyouiloveyou",
      "welcome123456789",
      "adminadminadmin",
      "changemechangeme",
      "nahwerkconcierge",
      "nahwerk concierge"
    ]);
    const emailLocalPart = String($("ownerEmail")?.value || "").trim().toLowerCase().split("@")[0] || "";
    if (passwordLength < 15 || passwordLength > 128) {
      return show("<strong>Bitte wählen Sie ein stärkeres Passwort.</strong><br>Das Passwort muss 15 bis 128 Zeichen lang sein.", true);
    }
    if (blockedPasswords.has(normalizedPassword) || (emailLocalPart.length >= 8 && normalizedPassword === emailLocalPart)) {
      return show("<strong>Bitte wählen Sie ein weniger vorhersehbares Passwort.</strong><br>Verwenden Sie eine lange, individuelle Passphrase.", true);
    }
    if (!form.reportValidity()) return;
    const self = isSelf();
    const p = person();
    const safety = $("safetyEnabled").checked;
    const request = {
      product, concierge_profile: "FIDEL", concierge_choice: "fidel", package: selectedPlan().code,
      registration_type: self ? "self" : "other", account_holder_name: fullName($("ownerFirstName").value, $("ownerLastName").value), account_holder_salutation: $("ownerSalutation").value,
      account_holder_first_name: $("ownerFirstName").value.trim(), account_holder_last_name: $("ownerLastName").value.trim(), account_holder_postal_code: $("ownerPostalCode")?.value.trim() || "", postal_code: $("ownerPostalCode")?.value.trim() || "", email: $("ownerEmail").value.trim(), phone: self ? $("ownerPhone").value.trim() : "",
      supported_person_name: fullName(p.first, p.last), supported_person_salutation: p.sal, supported_person_first_name: p.first, supported_person_last_name: p.last,
      relationship: self ? "Ich selbst" : $("relationship").selectedOptions[0].textContent.trim(), supported_whatsapp: p.phone, form_of_address: $("addressing").value.toUpperCase(),
      preferred_contact_channel: $("preferredContactChannel")?.value || "APP",
      whatsapp_enabled: $("whatsappEnabled")?.value === "true",
      onboarding_version: "stewaro_step_flow_v2",
      initial_notes: (() => {
        const notes = $("note").value.trim();
        const personal = self ? "" : familyMessageValue();
        const parts = [];
        if (notes) parts.push(notes);
        if (personal) parts.push(`Persönliche Nachricht der einrichtenden Person, die beim ersten Kontakt zusätzlich zur STEWARO-Begrüßung übermittelt werden soll: "${personal}"`);
        return parts.join("\n\n");
      })(),
      contact_consent: self ? true : (Boolean(p.phone) ? $("consent").checked : false), safety_enabled: safety, checkin_times: safety ? $("checkinTimes").value.trim() : "", trusted_contact_name: safety ? $("trustedContactName").value.trim() : "", trusted_contact_phone: safety ? $("trustedContactPhone").value.trim() : "",
      account_holder_web_only: !self, web_password: password, web_password_repeat: password
    };
    const familySetup = !self;
    const familyRelationshipMap = {
      mutter:"MOTHER", vater:"FATHER", grossmutter:"GRANDMOTHER", grossvater:"GRANDFATHER",
      partner:"PARTNER", angehoerige:"RELATIVE", andere:"OTHER"
    };
    const familyDraft = familySetup ? {
      version: 1,
      first_name: request.supported_person_first_name,
      last_name: request.supported_person_last_name,
      relationship: familyRelationshipMap[String($("relationship")?.value || "")] || "OTHER",
      whatsapp_number: request.supported_whatsapp,
      preferred_language: "de",
      form_of_address: request.form_of_address,
      contact_consent_attested: request.contact_consent === true,
      safety_enabled: request.safety_enabled === true,
      checkin_time: request.checkin_times,
      trusted_contact_name: request.trusted_contact_name,
      trusted_contact_phone: request.trusted_contact_phone,
      created_at: new Date().toISOString()
    } : null;
    // For Family onboarding, create only the account holder first. The supported person
    // remains pending until the existing Family invitation runtime verifies consent.
    const submissionRequest = familySetup ? {
      ...request,
      registration_type: "self",
      supported_person_name: request.account_holder_name,
      supported_person_salutation: request.account_holder_salutation,
      supported_person_first_name: request.account_holder_first_name,
      supported_person_last_name: request.account_holder_last_name,
      relationship: "Ich selbst",
      supported_whatsapp: "",
      phone: "",
      form_of_address: "DU",
      contact_consent: true,
      safety_enabled: false,
      checkin_times: "",
      trusted_contact_name: "",
      trusted_contact_phone: "",
      account_holder_web_only: true,
      family_setup_pending: true
    } : request;
    const draft = { ...request, web_password: undefined, web_password_repeat: undefined, createdAt: new Date().toISOString(), source: "website" };
    localStorage.setItem("scb_onboarding", JSON.stringify(draft));
    if (familySetup && familyDraft) {
      sessionStorage.setItem(FAMILY_REGISTRATION_DRAFT_KEY, JSON.stringify(familyDraft));
    }
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    submit.textContent = "Zugang wird angelegt …";
    show("<strong>Wird eingerichtet …</strong><br>Bitte lassen Sie diese Seite kurz geöffnet.");
    try {
      const response = await fetch(WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(submissionRequest) });
      const body = await response.json().catch(() => ({}));
      if (response.ok && body.ok === true && body.status === "verification_required" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(body.request_id || ""))) {
        if (familySetup) {
          return show('<strong>Für diese E-Mail besteht bereits eine Identität.</strong><br>Bitte melde dich mit deinem bestehenden STEWARO-Zugang an. Deine Angaben zur unterstützten Person bleiben für den sicheren Family-Einladungsweg erhalten.<br><a href="/anmelden">Zur Anmeldung</a>', true);
        }
        beginVerification(body, submissionRequest, password);
        return;
      }
      if (response.status === 201 && body.ok) {
        void window.NahwerkAnalytics?.track("registration_complete", { funnel_name: "registration", funnel_step: "complete" });
        window.NahwerkActivation?.markRegistrationComplete?.();
        localStorage.setItem("scb_onboarding_sent", "1");
        localStorage.setItem("scb_onboarding_result", JSON.stringify(body));
        const loginResult = await login(submissionRequest.email, password);
        if (loginResult) {
          if (familySetup && familyDraft) {
            show("<strong>Dein Zugang ist angelegt.</strong><br>Die Angaben für die unterstützte Person werden jetzt sicher in den Family-Einladungsweg übernommen.");
            return setTimeout(() => { location.href = "/konto?family_setup=1"; }, 450);
          }
          if (appHandoff) {
            show("<strong>Fertig.</strong><br>FIDEL wird jetzt sicher geöffnet.");
            void handoffToApp(loginResult.session_token);
            return;
          }
          show("<strong>Fertig.</strong><br>Der Zugang wurde angelegt. Sie werden zum Kundenbereich weitergeleitet.");
          return setTimeout(() => { location.href = postAuthTarget || window.NAHWERKLocale?.href("erster-schritt.html") || "erster-schritt.html"; }, 500);
        }
        show("<strong>Der Zugang wurde angelegt.</strong><br>Bitte melden Sie sich jetzt an.", true);
        return setTimeout(() => { location.href = (postAuthTarget || appHandoff) ? guestLoginHref : (window.NAHWERKLocale?.href("anmelden.html") || "anmelden.html"); }, 1800);
      }
      if (response.status === 409 && body.status === "email_in_use") return show(`<strong>Für diese E-Mail-Adresse besteht bereits ein Konto.</strong><br><a href="${guestLoginHref}">Zur Anmeldung</a>`, true);
      if (response.status === 400 || body.status === "validation_error") {
        const rawErrors = Array.isArray(body.errors) ? body.errors.map((item) => String(item || "").trim()).filter(Boolean) : [];
        const friendly = rawErrors.map((error) => {
          if (error.includes("WhatsApp-Telefonnummer")) return "Die WhatsApp-Telefonnummer ist nicht vollständig oder nicht gültig.";
          if (error.includes("Notfallkontakt-Telefonnummer")) return "Die Telefonnummer der Vertrauensperson ist nicht gültig.";
          if (error.includes("Sicherheits-Check-ins") && error.includes("Notfallkontakt")) return "Für den Safety-Check-in fehlt eine gültige Vertrauensperson.";
          if (error.includes("serverseitig verifizierten Zustimmungsweg")) return "Die unterstützte Person muss die Einrichtung sicher bestätigen, bevor ihr Zugang aktiviert wird.";
          if (error.includes("account_holder_name")) return "Dein Name fehlt.";
          if (error.includes("E-Mail")) return "Bitte prüfe die E-Mail-Adresse.";
          if (error.includes("Passwort")) return error;
          return error;
        });
        const detail = friendly.length ? "<br>" + friendly.slice(0, 3).map((item) => "• " + escapeHtml(item)).join("<br>") : "";
        return show("<strong>Einige Angaben müssen noch geprüft werden.</strong>" + detail, true);
      }
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