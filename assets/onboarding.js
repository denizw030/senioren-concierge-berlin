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
  const planKey = ({ kostenlos: "free" }[params.get("paket")] || params.get("paket") || "free").toLowerCase();
  const plans = {
    free: { code: "FREE", title: "FREE · 0 € / MONAT", benefits: ["30 Dialoge/Monat in den ersten 2 Monaten", "Danach dauerhaft 15 Dialoge pro Monat", "1 Bildgenerierung pro Monat", "1 Foto-/Dokument-Digitalisierung pro Monat", "5 Erinnerungen pro Monat, z. B. Wecker oder Termine", "Direkt in WhatsApp", "Text- und Sprachnachrichten"] },
    standard: { code: "STANDARD", title: "STANDARD · 9,99 € / MONAT", benefits: ["100 Dialoge pro Monat", "5 Bildgenerierungen", "10 Foto-/Dokument-Digitalisierungen", "25 Erinnerungen"] },
    komfort: { code: "KOMFORT", title: "KOMFORT · 19,99 € / MONAT", benefits: ["200 Dialoge pro Monat", "10 Bildgenerierungen", "20 Foto-/Dokument-Digitalisierungen", "50 Erinnerungen"] },
    premium: { code: "PREMIUM", title: "PREMIUM · 29,99 € / MONAT", benefits: ["350 Dialoge pro Monat", "25 Bildgenerierungen", "25 Foto-/Dokument-Digitalisierungen", "100 Erinnerungen"] },
    "premium-plus": { code: "PREMIUM PLUS", title: "PREMIUM PLUS · 44,99 € / MONAT", benefits: ["600 Dialoge pro Monat", "40 Bildgenerierungen", "50 Foto-/Dokument-Digitalisierungen", "150 Erinnerungen"] }
  };
  const selectedPlan = plans[planKey] || plans.free;
  const planBookable = selectedPlan.code === "FREE";
  const conciergeProfiles = {
    nilo: { name: "Nilo", description: "Klar, ruhig und strukturiert.", image: "assets/NAHWERK-Concierge-Nilo.png" },
    mira: { name: "Mira", description: "Warm, verständlich und aufmerksam.", image: "assets/NAHWERK-Concierge-Mira.png" },
    lena: { name: "Lena", description: "Modern, empathisch und lösungsorientiert.", image: "assets/NAHWERK-Concierge-Lena.png" },
    lukas: { name: "Lukas", description: "Souverän, direkt und zuverlässig.", image: "assets/NAHWERK-Concierge-Lukas.png" }
  };
  const recipientIds = ["recipientSalutation", "recipientFirstName", "recipientLastName", "relationship", "recipientPhone"];
  const fullName = (first, last) => [first.trim(), last.trim()].filter(Boolean).join(" ");
  const isSelf = () => form.querySelector('input[name="setupFor"]:checked')?.value === "self";
  const conciergeValue = () => {
    const value = form.querySelector('input[name="conciergeChoice"]:checked')?.value;
    return conciergeProfiles[value] ? value : "nilo";
  };
  const concierge = () => conciergeProfiles[conciergeValue()].name;

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
    injectConciergeStyles();
    const field = choice.closest(".field");
    const heading = field?.querySelector(":scope > label");
    if (heading) {
      heading.classList.add("concierge-selection-title");
      heading.textContent = "Wer darf Sie begleiten?";
    }
    let intro = field?.querySelector(".concierge-selection-intro");
    if (!intro && field) {
      intro = document.createElement("p");
      intro.className = "concierge-selection-intro";
      choice.before(intro);
    }
    if (intro) intro.textContent = "Wählen Sie den Concierge, dessen Auftreten und Kommunikationsstil am besten zu Ihnen passt. Die grundlegenden Möglichkeiten bleiben bei allen Profilen gleich.";
    choice.innerHTML = Object.entries(conciergeProfiles).map(([value, profile], index) => `
      <label class="concierge-option">
        <input type="radio" name="conciergeChoice" value="${value}"${index === 0 ? " checked" : ""} aria-label="${profile.name} auswählen" />
        <span class="concierge-card-content">
          <img src="${profile.image}" alt="Portrait von ${profile.name}, NAHWERK Concierge" loading="lazy" />
          <span class="concierge-card-copy"><strong>${profile.name}</strong><span>${profile.description}</span><span class="concierge-check" aria-hidden="true">✓</span></span>
        </span>
      </label>`).join("");
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
    if (recipientHeading) recipientHeading.textContent = `Person, die ${name} unterstützen soll`;
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
    const introduction = !isSelf() && owner ? `<br>${owner} hat diesen Zugang für ${informal ? "dich" : "Sie"} eingerichtet.` : "";
    updateContextTexts();
    $("messagePreview").innerHTML = `<strong>${greeting} 👋</strong><br><br>Willkommen bei ${productLabel}.${introduction}<br><br>Ich bin ${concierge()}, ${informal ? "dein" : "Ihr"} persönlicher KI-Concierge.<br><br>Ich erkläre die Bedienung verständlich und helfe ${informal ? "dir" : "Ihnen"} bei Organisation, Informationen, Dokumenten und vielem mehr.`;
  }

  function syncSelf() {
    const self = isSelf();
    form.querySelectorAll('.choice label').forEach((label) => label.classList.toggle("selected", label.querySelector("input")?.checked));
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

  setupConciergeSelection();
  sessionStorage.setItem("nahwerk_product", product);
  $("registrationTitle").textContent = `${productLabel} Zugang registrieren`;
  $("productLabel").textContent = productLabel;
  $("selectedPlanName").textContent = selectedPlan.title;
  $("selectedPlanBenefits").innerHTML = selectedPlan.benefits.map((benefit) => `<li>${benefit}</li>`).join("");
  if (!planBookable) {
    $("selectedPlanBox").classList.add("selected-paid-plan");
    $("planSelectionNote").innerHTML = `<strong>${selectedPlan.code} ist ausgewählt.</strong><br>Dieser Tarif ist noch nicht verbindlich buchbar, weil der sichere Zahlungs-, Widerrufs- und Kündigungsprozess noch nicht aktiviert ist. <a href="registrieren.html?produkt=${product}&paket=free">Stattdessen FREE starten</a>.`;
    $("registrationSubmit").textContent = `${selectedPlan.code} ausgewählt · noch nicht buchbar`;
    $("registrationSubmit").setAttribute("aria-disabled", "true");
  }
  document.title = `${productLabel} registrieren | NAHWERK`;

  form.addEventListener("input", render);
  form.addEventListener("change", (event) => {
    if (event.target.name === "setupFor") syncSelf();
    if (event.target.id === "safetyEnabled") syncSafety();
    render();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!planBookable) return show(`<strong>${selectedPlan.code} ist ausgewählt, aber noch nicht buchbar.</strong><br>Für eine verbindliche Buchung fehlt derzeit noch der Zahlungs- und Vertragsprozess. Sie können aktuell <a href="registrieren.html?produkt=${product}&paket=free">FREE registrieren</a>.`, true);
    const password = $("webPassword").value;
    if (password.length < 10 || password.length > 128) return show("<strong>Das Passwort muss zwischen 10 und 128 Zeichen lang sein.</strong>", true);
    if (password !== $("webPasswordConfirm").value) return show("<strong>Die beiden Passwörter stimmen nicht überein.</strong>", true);
    if (!form.reportValidity()) return;
    const self = isSelf();
    const p = person();
    const safety = $("safetyEnabled").checked;
    const request = {
      product,
      concierge_profile: product === "senioren" ? "SENIOR_MARTIN" : "PRIME_MARTIN",
      concierge_choice: conciergeValue().toUpperCase(),
      package: selectedPlan.code,
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
    const draft = { ...request, web_password: undefined, web_password_repeat: undefined, createdAt: new Date().toISOString(), source: "website" };
    localStorage.setItem("scb_onboarding", JSON.stringify(draft));
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
      submit.textContent = "Kostenlosen Zugang registrieren";
    }
  });

  syncSelf();
  syncSafety();
})();
