(() => {
  "use strict";

  const PROD_PAYG_ENDPOINT = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/web-payg";
  const SESSION_KEY = "scb_web_session";
  const STRIPE_JS = "https://js.stripe.com/v3/";
  const ALLOWED_TOPUPS = new Set([500, 1000, 2000, 5000]);

  const el = (id) => document.getElementById(id);
  const state = { data: null, busy: false, stripe: null, elements: null, setupClientSecret: null };

  function sessionToken() {
    try { return String(JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null")?.session_token || ""); }
    catch { return ""; }
  }

  function money(cents, currency = "EUR") {
    const value = Number(cents);
    if (!Number.isFinite(value)) return "–";
    return new Intl.NumberFormat("de-DE", { style: "currency", currency }).format(value / 100);
  }

  function moneyMajor(amount, currency = "EUR") {
    const value = Number(amount);
    if (!Number.isFinite(value)) return "–";
    return new Intl.NumberFormat("de-DE", { style: "currency", currency }).format(value);
  }

  function dateTime(value) {
    if (!value) return "–";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "–" : new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(date);
  }

  function uuid() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return `web-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function setAlert(message, kind = "") {
    const box = el("paygAlert");
    if (!box) return;
    box.textContent = message || "";
    box.className = "payg-alert" + (kind ? ` is-${kind}` : "");
    box.hidden = !message;
  }

  function setBusy(value, label = "") {
    state.busy = Boolean(value);
    document.body.classList.toggle("payg-loading", state.busy);
    document.querySelectorAll("[data-payg-action]").forEach((node) => {
      node.disabled = state.busy || node.dataset.contractBlocked === "true";
    });
    const live = el("paygLiveStatus");
    if (live) live.textContent = state.busy ? (label || "Wird geladen …") : "";
  }

  function errorMessage(body, status) {
    const raw = body?.error?.message || body?.error || body?.message || "";
    const code = body?.error?.code || body?.code || "";
    if (status === 401 || code === "UNAUTHENTICATED") return "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.";
    if (/stripe|provider_configuration|configuration_missing/i.test(String(code) + String(raw))) return "Die Zahlungsanbindung ist serverseitig noch nicht vollständig verfügbar.";
    if (/billing_blocked/i.test(String(code) + String(raw))) return "PAYG ist für dieses Konto derzeit gesperrt.";
    if (/payment_method/i.test(String(code) + String(raw))) return "Für diese Aktion wird eine gültige Zahlungsmethode benötigt.";
    if (/quote.*expired|expired.*quote/i.test(String(code) + String(raw))) return "Diese Preisfreigabe ist abgelaufen. Bitte fordere einen neuen Preis an.";
    return raw ? String(raw).slice(0, 220) : "Die Anfrage konnte gerade nicht verarbeitet werden.";
  }

  async function request(method = "GET", body = null) {
    const token = sessionToken();
    if (!token) throw Object.assign(new Error("session_required"), { status: 401 });
    const init = { method, headers: { Authorization: `Bearer ${token}` } };
    if (body) {
      init.headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }
    const response = await fetch(PROD_PAYG_ENDPOINT, init);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.ok === false) {
      const error = new Error(errorMessage(data, response.status));
      error.status = response.status;
      error.body = data;
      throw error;
    }
    return data;
  }

  function empty(text) { return `<div class="payg-empty">${escapeHtml(text)}</div>`; }
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  }

  function renderStatus(data) {
    const payg = data?.payg || {};
    const wallet = data?.wallet || {};
    const enabled = payg.enabled === true;
    el("paygStatus").textContent = payg.billing_blocked ? "Gesperrt" : enabled ? "Aktiv" : "Nicht aktiv";
    el("paygStatus").classList.toggle("is-on", enabled && !payg.billing_blocked);
    el("paygStatusMeta").textContent = payg.billing_blocked
      ? (payg.billing_blocked_reason || "PAYG ist für dieses Konto derzeit gesperrt.")
      : enabled ? "PAYG ist für dieses Kundenkonto aktiviert." : "PAYG ist noch nicht aktiviert. Es entstehen dadurch keine Kosten.";
    el("walletBalance").textContent = money(wallet.balance_cents, wallet.currency || "EUR");
    el("walletAvailable").textContent = money(wallet.available_cents, wallet.currency || "EUR");
    el("walletReserved").textContent = money(wallet.reserved_cents, wallet.currency || "EUR");
    el("walletState").textContent = wallet.status || "–";
    el("dailyLimit").value = Number.isFinite(Number(payg.daily_limit_cents)) ? (Number(payg.daily_limit_cents) / 100).toFixed(2) : "";
    el("monthlyLimit").value = Number.isFinite(Number(payg.monthly_limit_cents)) ? (Number(payg.monthly_limit_cents) / 100).toFixed(2) : "";
    el("paygActivate").hidden = enabled;
    el("paygDeactivate").hidden = !enabled;
    el("paygActivate").disabled = state.busy || payg.billing_blocked === true;
  }

  function renderPaymentMethods(data) {
    const methods = Array.isArray(data?.payment_methods) ? data.payment_methods : [];
    const host = el("paymentMethods");
    host.innerHTML = methods.length ? methods.map((method) => {
      const brand = escapeHtml(method.brand || method.method_type || "Zahlungsmethode");
      const last4 = method.last4 ? ` •••• ${escapeHtml(method.last4)}` : "";
      const expiry = method.exp_month && method.exp_year ? ` · gültig bis ${String(method.exp_month).padStart(2, "0")}/${String(method.exp_year).slice(-2)}` : "";
      return `<div class="payg-row"><div class="payg-row-main"><div class="payg-method"><strong>${brand}${last4}</strong>${method.is_default ? '<span class="payg-pill">Standard</span>' : ""}</div><div class="payg-row-meta">${escapeHtml(method.status || "aktiv")}${expiry}</div></div></div>`;
    }).join("") : empty("Noch keine aktive Zahlungsmethode hinterlegt.");

    const provider = data?.payment_provider || {};
    const key = stripePublishableKey();
    const add = el("paymentAdd");
    const note = el("paymentContractNote");
    const canStart = provider.setup_available === true && Boolean(key) && data?.payg?.enabled === true && data?.payg?.billing_blocked !== true;
    add.disabled = state.busy || !canStart;
    add.dataset.contractBlocked = canStart ? "false" : "true";
    if (data?.payg?.enabled !== true) note.textContent = "Aktiviere zuerst PAYG.";
    else if (provider.setup_available !== true) note.textContent = "Die Stripe-PROD-Anbindung ist serverseitig noch nicht für die Einrichtung freigegeben.";
    else if (!key) note.textContent = "Der öffentliche Stripe-Browser-Key ist noch nicht im Website-PROD-Client veröffentlicht. Es wird keine Ersatz- oder STAGING-Konfiguration verwendet.";
    else note.textContent = methods.length
      ? "Du kannst eine neue Standard-Zahlungsmethode hinterlegen. Entfernen ist erst verfügbar, sobald der PAYG-PROD-Vertrag dafür eine autoritative Aktion bereitstellt."
      : "Zahlungsmethode sicher über Stripe hinzufügen.";
  }

  function renderTopups(data) {
    const packages = Array.isArray(data?.topup_packages_cents) ? data.topup_packages_cents.filter((n) => ALLOWED_TOPUPS.has(Number(n))) : [];
    const methods = Array.isArray(data?.payment_methods) ? data.payment_methods : [];
    const defaultMethod = methods.find((item) => item.is_default) || methods[0] || null;
    const provider = data?.payment_provider || {};
    const key = stripePublishableKey();
    const topupReady = Boolean(defaultMethod && key && data?.payg?.enabled === true && provider.webhook_configured === true);
    const host = el("topupPackages");
    host.innerHTML = packages.length ? packages.map((amount) => `<button class="payg-package" type="button" data-payg-action="topup" data-amount-cents="${Number(amount)}" ${topupReady ? "" : "disabled"}>${money(amount)} kostenpflichtig aufladen</button>`).join("") : empty("Keine serverseitig bestätigten Aufladebeträge verfügbar.");
    el("topupConsent").checked = false;
    if (!defaultMethod) el("topupMeta").textContent = "Für eine Aufladung wird zuerst eine aktive Zahlungsmethode benötigt.";
    else if (!key) el("topupMeta").textContent = "Aufladung bleibt gesperrt, bis der Stripe-Browser-Key in PROD veröffentlicht ist.";
    else if (provider.webhook_configured !== true) el("topupMeta").textContent = "Aufladung bleibt gesperrt, bis die serverseitige Stripe-Zahlungsbestätigung in PROD autoritativ bestätigt ist.";
    else el("topupMeta").textContent = `Belastung über ${defaultMethod.brand || defaultMethod.method_type || "Standard-Zahlungsmethode"}${defaultMethod.last4 ? ` •••• ${defaultMethod.last4}` : ""}.`;
  }

  function quoteCanApprove(status) {
    return String(status || "").toUpperCase() === "QUOTED";
  }

  function renderQuotes(data) {
    const quotes = Array.isArray(data?.quotes) ? data.quotes : [];
    const host = el("quoteList");
    host.innerHTML = quotes.length ? quotes.map((quote) => {
      const status = String(quote.status || "UNBEKANNT").toUpperCase();
      const amount = money(quote.amount_cents, quote.currency || "EUR");
      const actions = quoteCanApprove(status) ? `<div class="payg-quote-actions"><button class="btn red" type="button" data-payg-action="approve-quote" data-quote-id="${escapeHtml(quote.id)}">Kostenpflichtig freigeben – ${amount}</button><button class="btn light" type="button" data-payg-action="cancel-quote" data-quote-id="${escapeHtml(quote.id)}">Nicht beauftragen</button></div>` : "";
      return `<div class="payg-row"><div class="payg-row-main"><h3>${escapeHtml(quote.description || quote.rate_code || "PAYG-Auftrag")}</h3><div class="payg-row-meta">Status: ${escapeHtml(status)} · ${dateTime(quote.created_at)}${quote.expires_at ? ` · gültig bis ${dateTime(quote.expires_at)}` : ""}</div>${actions}</div><div class="payg-amount">${amount}</div></div>`;
    }).join("") : empty("Noch keine PAYG-Aufträge oder Preisfreigaben vorhanden.");
  }

  function renderUsage(data) {
    const usage = Array.isArray(data?.usage) ? data.usage : [];
    el("usageList").innerHTML = usage.length ? usage.map((item) => `<div class="payg-row"><div class="payg-row-main"><strong>${escapeHtml(item.rate_code || "Concierge-Ausführung")}</strong><div class="payg-row-meta">${escapeHtml(item.quantity ?? "–")} ${escapeHtml(item.unit || "")} · ${dateTime(item.occurred_at)}</div></div><div class="payg-amount">${moneyMajor(item.actual_cost, item.currency || "EUR")}</div></div>`).join("") : empty("Noch keine PAYG-Nutzung verbucht.");
  }

  function renderTransactions(data) {
    const rows = Array.isArray(data?.transactions) ? data.transactions : [];
    el("transactionList").innerHTML = rows.length ? rows.map((item) => `<div class="payg-row"><div class="payg-row-main"><strong>${escapeHtml(item.description || item.type || "Wallet-Buchung")}</strong><div class="payg-row-meta">${escapeHtml(item.type || "")}${item.created_at ? ` · ${dateTime(item.created_at)}` : ""}</div></div><div class="payg-amount">${money(item.amount_cents, item.currency || "EUR")}</div></div>`).join("") : empty("Noch keine Wallet-Buchungen vorhanden.");
  }

  function renderRates(data) {
    const rates = Array.isArray(data?.rates) ? data.rates : [];
    el("rateList").innerHTML = rates.length ? rates.map((item) => `<div class="payg-row"><div class="payg-row-main"><strong>${escapeHtml(item.display_name || item.rate_code)}</strong><div class="payg-row-meta">pro ${escapeHtml(item.unit || "Einheit")}</div></div><div class="payg-amount">${money(item.unit_price_cents, item.currency || "EUR")}</div></div>`).join("") : empty("Aktuell wurden keine PAYG-Preise serverseitig veröffentlicht.");
  }

  function render(data) {
    state.data = data;
    renderStatus(data);
    renderPaymentMethods(data);
    renderTopups(data);
    renderQuotes(data);
    renderUsage(data);
    renderTransactions(data);
    renderRates(data);
    el("lastUpdated").textContent = `Live-Stand: ${new Intl.DateTimeFormat("de-DE", { timeStyle: "short", dateStyle: "short" }).format(new Date())}`;
  }

  async function reload(message = "Live-Daten werden geladen …") {
    setBusy(true, message);
    setAlert("");
    try { render(await request("GET")); }
    catch (error) {
      if (error.status === 401) { sessionStorage.removeItem(SESSION_KEY); location.replace("anmelden.html"); return; }
      setAlert(error.message || "PAYG-Live-Daten konnten nicht geladen werden.", "error");
    } finally { setBusy(false); }
  }

  function euroToCents(input) {
    const raw = String(input.value || "").trim().replace(",", ".");
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : NaN;
  }

  async function activate() {
    const daily = euroToCents(el("dailyLimit"));
    const monthly = euroToCents(el("monthlyLimit"));
    if (Number.isNaN(daily) || Number.isNaN(monthly)) return setAlert("Bitte gib gültige Limits ab 0 € ein oder lasse die Felder leer.", "error");
    setBusy(true, "PAYG wird aktiviert …");
    try {
      await request("POST", { action: "activate", daily_limit_cents: daily, monthly_limit_cents: monthly });
      setAlert("PAYG wurde für dein Konto aktiviert.", "success");
      render(await request("GET"));
    } catch (error) { setAlert(error.message, "error"); }
    finally { setBusy(false); }
  }

  async function deactivate() {
    setBusy(true, "PAYG wird deaktiviert …");
    try {
      await request("POST", { action: "deactivate" });
      setAlert("PAYG wurde deaktiviert. Es werden keine neuen PAYG-Aufträge freigegeben.", "success");
      render(await request("GET"));
    } catch (error) { setAlert(error.message, "error"); }
    finally { setBusy(false); }
  }

  function stripePublishableKey() {
    return String(window.NAHWERK_PAYG_STRIPE_PUBLISHABLE_KEY || document.querySelector('meta[name="nahwerk-stripe-publishable-key"]')?.content || "").trim();
  }

  async function loadStripe() {
    const key = stripePublishableKey();
    if (!/^pk_live_/.test(key)) throw new Error("Der Stripe-Live-Browser-Key ist in PROD noch nicht veröffentlicht.");
    if (!window.Stripe) {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = STRIPE_JS;
        script.async = true;
        script.onload = resolve;
        script.onerror = () => reject(new Error("Stripe konnte im Browser nicht geladen werden."));
        document.head.appendChild(script);
      });
    }
    state.stripe ||= window.Stripe(key);
    return state.stripe;
  }

  async function startPaymentSetup() {
    setBusy(true, "Sichere Zahlungseinrichtung wird vorbereitet …");
    try {
      const stripe = await loadStripe();
      const result = await request("POST", { action: "setup_payment_method", idempotency_key: uuid() });
      if (!result?.client_secret) throw new Error("Der Zahlungsanbieter hat keine sichere Browser-Freigabe geliefert.");
      state.setupClientSecret = result.client_secret;
      state.elements = stripe.elements({ clientSecret: result.client_secret });
      const container = el("paymentElement");
      container.innerHTML = "";
      state.elements.create("payment").mount(container);
      el("paymentSetupBox").hidden = false;
      el("paymentConfirm").disabled = false;
      el("paymentConfirm").dataset.contractBlocked = "false";
      setAlert("Zahlungsmethode wird sicher über Stripe erfasst. NAHWERK erhält keine vollständigen Kartendaten.");
    } catch (error) { setAlert(error.message, "error"); }
    finally { setBusy(false); }
  }

  async function confirmPaymentSetup() {
    if (!state.stripe || !state.elements || !state.setupClientSecret) return;
    setBusy(true, "Zahlungsmethode wird bestätigt …");
    try {
      const result = await state.stripe.confirmSetup({ elements: state.elements, clientSecret: state.setupClientSecret, confirmParams: { return_url: location.href }, redirect: "if_required" });
      if (result.error) throw new Error(result.error.message || "Die Zahlungsmethode konnte nicht bestätigt werden.");
      const setupIntent = result.setupIntent;
      if (!setupIntent?.id || setupIntent.status !== "succeeded") throw new Error("Die Zahlungsmethode wurde noch nicht vollständig bestätigt.");
      await request("POST", { action: "sync_payment_method", setup_intent_id: setupIntent.id });
      el("paymentSetupBox").hidden = true;
      setAlert("Zahlungsmethode wurde erfolgreich hinterlegt.", "success");
      render(await request("GET"));
    } catch (error) { setAlert(error.message, "error"); }
    finally { setBusy(false); }
  }

  async function topup(amountCents) {
    if (!ALLOWED_TOPUPS.has(amountCents)) return;
    if (!el("topupConsent").checked) return setAlert("Bitte bestätige zuerst den angezeigten Aufladebetrag.", "error");
    const method = state.data?.payment_methods?.find((item) => item.is_default) || state.data?.payment_methods?.[0];
    if (!method) return setAlert("Es ist keine aktive Zahlungsmethode hinterlegt.", "error");
    if (state.data?.payment_provider?.webhook_configured !== true) return setAlert("Die serverseitige Zahlungsbestätigung ist noch nicht autoritativ verfügbar.", "error");
    if (String(method.method_type || "card").toLowerCase() !== "card") return setAlert("Diese Zahlungsmethode benötigt einen serverseitig freigegebenen Bestätigungsweg. Es wird keine Ersatzlogik verwendet.", "error");
    setBusy(true, `Aufladung über ${money(amountCents)} wird vorbereitet …`);
    try {
      const stripe = await loadStripe();
      const result = await request("POST", { action: "create_topup", amount_cents: amountCents, idempotency_key: uuid() });
      if (!result?.client_secret) throw new Error("Der Zahlungsanbieter hat keine sichere Zahlungsfreigabe geliefert.");
      const confirmation = await stripe.confirmCardPayment(result.client_secret);
      if (confirmation.error) throw new Error(confirmation.error.message || "Die Zahlung wurde nicht bestätigt.");
      setAlert("Zahlung bestätigt. Der Kontostand wird erst nach serverseitiger Zahlungsbestätigung aktualisiert.", "success");
      await reload("Zahlungsstatus wird aktualisiert …");
    } catch (error) { setAlert(error.message, "error"); }
    finally { setBusy(false); }
  }

  async function approveQuote(id) {
    if (!id) return;
    setBusy(true, "Kostenfreigabe wird gespeichert …");
    try {
      await request("POST", { action: "approve_quote", quote_id: id });
      setAlert("Der angezeigte Auftrag wurde kostenpflichtig freigegeben.", "success");
      render(await request("GET"));
    } catch (error) { setAlert(error.message, "error"); }
    finally { setBusy(false); }
  }

  async function cancelQuote(id) {
    if (!id) return;
    setBusy(true, "Auftrag wird verworfen …");
    try {
      await request("POST", { action: "cancel_quote", quote_id: id, reason: "customer_cancelled_in_web_account" });
      setAlert("Der Auftrag wurde nicht freigegeben.", "success");
      render(await request("GET"));
    } catch (error) { setAlert(error.message, "error"); }
    finally { setBusy(false); }
  }

  function bind() {
    el("paygActivate")?.addEventListener("click", activate);
    el("paygDeactivate")?.addEventListener("click", deactivate);
    el("paygRefresh")?.addEventListener("click", () => reload());
    el("paymentAdd")?.addEventListener("click", startPaymentSetup);
    el("paymentConfirm")?.addEventListener("click", confirmPaymentSetup);
    document.addEventListener("click", (event) => {
      const button = event.target instanceof Element ? event.target.closest("[data-payg-action]") : null;
      if (!button || button.disabled || state.busy) return;
      const action = button.dataset.paygAction;
      if (action === "topup") topup(Number(button.dataset.amountCents));
      if (action === "approve-quote") approveQuote(button.dataset.quoteId);
      if (action === "cancel-quote") cancelQuote(button.dataset.quoteId);
    });
  }

  window.NAHWERKPaygAccountTestHooks = Object.freeze({ PROD_PAYG_ENDPOINT, money, moneyMajor, euroToCents, errorMessage, stripePublishableKey, quoteCanApprove });

  async function boot() {
    bind();
    const authValid = window.SCBAuth?.validateSession ? await window.SCBAuth.validateSession().catch(() => false) : Boolean(sessionToken());
    if (!authValid) { location.replace("anmelden.html"); return; }
    await reload();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
