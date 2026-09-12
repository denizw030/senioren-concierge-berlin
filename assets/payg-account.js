(() => {
  const PAYG_URL = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/web-payg";
  const CHECKOUT_URL = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/web-payg-checkout";

  const $ = (id) => document.getElementById(id);
  const state = { account:null, loading:false };

  function moneyFromCents(value, currency = "EUR") {
    const cents = Number(value || 0);
    return new Intl.NumberFormat("de-DE", { style:"currency", currency }).format(cents / 100);
  }

  function money(value, currency = "EUR") {
    const amount = Number(value || 0);
    return new Intl.NumberFormat("de-DE", { style:"currency", currency }).format(amount);
  }

  function formatDateTime(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("de-DE", { dateStyle:"medium", timeStyle:"short" }).format(date);
  }

  function showError(message) {
    const box = $("paygSessionError");
    if (!box) return;
    box.hidden = false;
    box.textContent = message;
  }

  function clearError() {
    const box = $("paygSessionError");
    if (!box) return;
    box.hidden = true;
    box.textContent = "";
  }

  function setBusy(busy) {
    state.loading = busy;
    document.body.classList.toggle("payg-loading", busy);
    [
      $("paygActivate"),
      $("paymentManage"),
      ...document.querySelectorAll("[data-topup-cents]"),
      ...document.querySelectorAll("[data-quote-action]")
    ].forEach((el) => {
      if (el) el.disabled = busy || el.dataset.forceDisabled === "1";
    });
  }

  function validatedSession() {
    const auth = window.SCBAuth;
    const session = auth?.getSession?.();
    if (!session?.session_token || !session?.customer_account_id) return null;
    return session;
  }

  async function api(url, method = "GET", payload = null) {
    const session = validatedSession();
    if (!session) throw new Error("invalid_session");
    const options = {
      method,
      headers: { Authorization: `Bearer ${session.session_token}` }
    };
    if (payload) {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify({ customer_account_id:session.customer_account_id, ...payload });
    }
    const response = await fetch(url, options);
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body?.ok === false) {
      const error = new Error(String(body?.status || `http_${response.status}`));
      error.body = body;
      error.status = response.status;
      throw error;
    }
    return body;
  }

  function friendlyStatus(code) {
    const map = {
      stripe_not_configured:"Stripe Live ist in der PROD-Runtime noch nicht verbunden.",
      payment_method_required:"Bitte zuerst eine Zahlungsmethode hinterlegen.",
      payg_not_active:"Bitte PAYG zuerst aktivieren.",
      invalid_session:"Deine Sitzung ist nicht mehr gültig.",
      checkout_failed:"Die sichere Zahlungsseite konnte nicht vorbereitet werden.",
      payment_method_register_failed:"Die Zahlungsmethode konnte nicht übernommen werden.",
      topup_finalize_failed:"Die Zahlung wurde noch nicht vollständig verbucht. Bitte den Status erneut laden.",
      quote_id_required:"Die Preisfreigabe ist nicht mehr gültig. Bitte den Status neu laden.",
      quote_approval_failed:"Der Auftrag konnte nicht kostenpflichtig freigegeben werden. Bitte den aktuellen Status neu laden.",
      quote_cancel_failed:"Der Auftrag konnte nicht abgelehnt werden. Bitte den aktuellen Status neu laden."
    };
    return map[code] || "Der Vorgang konnte gerade nicht abgeschlossen werden. Es wurde nichts doppelt ausgelöst.";
  }

  function renderPaymentMethod(methods, provider) {
    const status = $("paymentStatus");
    const meta = $("paymentMeta");
    const button = $("paymentManage");
    const active = Array.isArray(methods) ? methods.find((m) => m?.is_default && m?.status === "ACTIVE") || methods.find((m) => m?.status === "ACTIVE") : null;
    const providerReady = provider?.setup_available === true;

    if (active) {
      status.textContent = "Hinterlegt";
      const brand = active.brand ? String(active.brand).toUpperCase() : String(active.method_type || "Zahlungsmethode");
      const ending = active.last4 ? ` · endet auf ${active.last4}` : "";
      const expiry = active.exp_month && active.exp_year ? ` · gültig bis ${String(active.exp_month).padStart(2,"0")}/${active.exp_year}` : "";
      meta.textContent = `${brand}${ending}${expiry}`;
      button.textContent = "Zahlungsmethode ändern";
    } else if (providerReady) {
      status.textContent = "Noch nicht hinterlegt";
      meta.textContent = "Zahlungsmethoden werden auf einer sicheren Stripe-Seite hinterlegt. NAHWERK speichert keine vollständigen Kartendaten.";
      button.textContent = "Zahlungsmethode hinterlegen";
    } else {
      status.textContent = "Stripe Live fehlt";
      meta.textContent = "Der PAYG-Vertrag ist aktiv, aber die Stripe-Live-Anbindung ist serverseitig noch nicht konfiguriert.";
      button.textContent = "Zahlungsmethode derzeit nicht verfügbar";
    }

    button.dataset.forceDisabled = providerReady ? "0" : "1";
    button.disabled = state.loading || !providerReady;
    return Boolean(active);
  }

  function quoteActionable(quote) {
    if (String(quote?.status || "").toUpperCase() !== "QUOTED") return false;
    if (!quote?.expires_at) return true;
    const expiresAt = new Date(quote.expires_at).getTime();
    return Number.isFinite(expiresAt) && expiresAt > Date.now();
  }

  function renderQuotes(data) {
    const host = $("paygQuotes");
    if (!host) return;
    const quotes = (Array.isArray(data?.quotes) ? data.quotes : []).filter((quote) => String(quote?.status || "").toUpperCase() === "QUOTED");
    host.innerHTML = "";
    if (!quotes.length) {
      const empty = document.createElement("div");
      empty.className = "payg-quote-empty";
      empty.textContent = "Keine offenen Preisfreigaben.";
      host.appendChild(empty);
      return;
    }

    const paygReady = data?.payg?.enabled === true && data?.payg?.billing_blocked !== true;
    quotes.forEach((quote) => {
      const row = document.createElement("article");
      row.className = "payg-quote";

      const head = document.createElement("div");
      head.className = "payg-quote-head";
      const titleWrap = document.createElement("div");
      titleWrap.className = "payg-quote-title";
      const title = document.createElement("strong");
      title.textContent = String(quote.description || quote.rate_code || "PAYG-Auftrag");
      const meta = document.createElement("span");
      const expiry = formatDateTime(quote.expires_at);
      meta.textContent = quoteActionable(quote)
        ? `Status QUOTED${expiry ? ` · gültig bis ${expiry}` : ""}`
        : `Status QUOTED · Freigabefrist abgelaufen${expiry ? ` (${expiry})` : ""}`;
      titleWrap.append(title,meta);

      const amount = document.createElement("strong");
      amount.className = "payg-quote-amount";
      amount.textContent = moneyFromCents(quote.amount_cents,quote.currency || "EUR");
      head.append(titleWrap,amount);
      row.appendChild(head);

      const actionable = paygReady && quoteActionable(quote);
      if (actionable) {
        const actions = document.createElement("div");
        actions.className = "payg-quote-actions";
        const approve = document.createElement("button");
        approve.className = "btn red";
        approve.type = "button";
        approve.dataset.quoteAction = "approve";
        approve.dataset.quoteId = String(quote.id || "");
        approve.dataset.forceDisabled = "0";
        approve.textContent = `Kostenpflichtig freigeben – ${moneyFromCents(quote.amount_cents,quote.currency || "EUR")}`;
        const cancel = document.createElement("button");
        cancel.className = "btn light";
        cancel.type = "button";
        cancel.dataset.quoteAction = "cancel";
        cancel.dataset.quoteId = String(quote.id || "");
        cancel.dataset.forceDisabled = "0";
        cancel.textContent = "Nicht beauftragen";
        actions.append(approve,cancel);
        row.appendChild(actions);
      }
      host.appendChild(row);
    });
  }

  function renderActivity(data) {
    const list = $("paygActivity");
    if (!list) return;
    const rows = [];
    for (const item of Array.isArray(data?.quotes) ? data.quotes : []) {
      rows.push({
        time:item.created_at,
        type:"Auftrag",
        title:item.description || item.rate_code || "PAYG-Auftrag",
        amount:moneyFromCents(item.amount_cents,item.currency || "EUR"),
        status:item.status || "—"
      });
    }
    for (const item of Array.isArray(data?.topups) ? data.topups : []) {
      rows.push({
        time:item.created_at,
        type:"Zahlung",
        title:"Wallet-Guthaben",
        amount:moneyFromCents(item.amount_cents,item.currency || "EUR"),
        status:item.status || "—"
      });
    }
    rows.sort((a,b) => new Date(b.time || 0) - new Date(a.time || 0));
    list.innerHTML = "";
    if (!rows.length) {
      const li = document.createElement("li");
      li.className = "payg-activity-empty";
      li.textContent = "Noch keine PAYG-Vorgänge.";
      list.appendChild(li);
      return;
    }
    rows.slice(0,8).forEach((row) => {
      const li = document.createElement("li");
      li.className = "payg-activity-row";
      const left = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = row.title;
      const meta = document.createElement("span");
      meta.textContent = `${row.type} · ${row.status}`;
      left.append(title,meta);
      const amount = document.createElement("strong");
      amount.textContent = row.amount;
      li.append(left,amount);
      list.appendChild(li);
    });
  }

  function render(data) {
    state.account = data;
    const payg = data?.payg || {};
    const wallet = data?.wallet || {};
    const enabled = payg.enabled === true;
    const blocked = payg.billing_blocked === true;
    const button = $("paygActivate");

    $("paygStatus").textContent = blocked ? "Gesperrt" : enabled ? "Aktiv" : "Inaktiv";
    $("paygStatusMeta").textContent = blocked
      ? `PAYG ist gesperrt${payg.billing_blocked_reason ? `: ${payg.billing_blocked_reason}` : "."}`
      : enabled
        ? "Du zahlst nur für ausdrücklich freigegebene kostenpflichtige Leistungen."
        : "PAYG ist noch nicht aktiviert. Es entstehen keine PAYG-Kosten.";
    button.textContent = enabled ? "PAYG deaktivieren" : "PAYG aktivieren";
    button.dataset.forceDisabled = blocked ? "1" : "0";
    button.disabled = state.loading || blocked;

    const provider = data?.payment_provider || {};
    const hasPaymentMethod = renderPaymentMethod(data?.payment_methods, provider);

    const available = Number(wallet.available_cents || 0);
    const balance = Number(wallet.balance_cents || 0);
    const reserved = Number(wallet.reserved_cents || 0);
    $("walletStatus").textContent = wallet.status === "ACTIVE" ? moneyFromCents(available,wallet.currency || "EUR") : "Noch kein Wallet";
    $("walletMeta").textContent = wallet.status === "ACTIVE"
      ? `Guthaben ${moneyFromCents(balance,wallet.currency || "EUR")} · reserviert ${moneyFromCents(reserved,wallet.currency || "EUR")}`
      : "Das Wallet wird bei der PAYG-Aktivierung automatisch provisioniert.";

    const usage = Array.isArray(data?.usage) ? data.usage : [];
    const total = usage.reduce((sum,row) => sum + Number(row?.actual_cost || 0),0);
    $("costStatus").textContent = usage.length ? money(total,"EUR") : money(0,"EUR");
    $("costMeta").textContent = usage.length
      ? `${usage.length} abgerechnete PAYG-Leistung${usage.length === 1 ? "" : "en"}. Jede Position stammt aus dem serverseitigen Usage-Ledger.`
      : "Noch keine abgerechneten PAYG-Leistungen. Es werden keine Kosten geschätzt.";

    document.querySelectorAll("[data-topup-cents]").forEach((el) => {
      const ready = enabled && !blocked && hasPaymentMethod && provider.setup_available === true;
      el.dataset.forceDisabled = ready ? "0" : "1";
      el.disabled = state.loading || !ready;
    });
    $("topupHint").textContent = !enabled
      ? "Aktiviere zuerst PAYG."
      : provider.setup_available !== true
        ? "Stripe Live ist noch nicht verbunden."
        : !hasPaymentMethod
          ? "Hinterlege zuerst eine Zahlungsmethode."
          : "Das Aufladen startet erst nach deiner ausdrücklichen Bestätigung auf der sicheren Zahlungsseite.";

    const latestQuote = Array.isArray(data?.quotes) && data.quotes.length ? data.quotes[0] : null;
    if (latestQuote) {
      $("orderStatus").textContent = latestQuote.status || "—";
      $("orderMeta").textContent = `${latestQuote.description || latestQuote.rate_code} · ${moneyFromCents(latestQuote.amount_cents,latestQuote.currency || "EUR")}`;
    } else {
      $("orderStatus").textContent = "Kein offener PAYG-Auftrag";
      $("orderMeta").textContent = "Bei einem kostenpflichtigen Auftrag siehst du den Preis vor der Freigabe. Ohne Zustimmung wird nichts ausgeführt oder belastet.";
    }

    $("paygContractNotice").innerHTML = provider.setup_available === true
      ? "<strong>PROD aktiv:</strong> PAYG-Status, Wallet, Zahlungsmethode, Preise und Kosten werden ausschließlich aus dem autoritativen PROD-Vertrag geladen."
      : "<strong>PAYG-Backend aktiv:</strong> Status, Wallet, Preise und Kosten kommen aus PROD. Für echte Zahlungen fehlt aktuell noch die Stripe-Live-Konfiguration der Server-Runtime.";

    renderQuotes(data);
    renderActivity(data);
  }

  async function load() {
    clearError();
    setBusy(true);
    try {
      const data = await api(PAYG_URL,"GET");
      render(data);
    } catch (error) {
      if (error.message === "invalid_session" || error.status === 401) {
        location.replace("anmelden.html");
        return;
      }
      showError(friendlyStatus(error.message));
    } finally {
      setBusy(false);
    }
  }

  async function togglePayg() {
    if (state.loading) return;
    clearError();
    setBusy(true);
    try {
      const enabled = state.account?.payg?.enabled === true;
      await api(PAYG_URL,"POST",{ action:enabled ? "deactivate" : "activate" });
      await load();
    } catch (error) {
      showError(friendlyStatus(error.message));
      setBusy(false);
    }
  }

  async function managePayment() {
    if (state.loading) return;
    clearError();
    setBusy(true);
    try {
      const result = await api(CHECKOUT_URL,"POST",{
        action:"payment_method_checkout",
        idempotency_key:`payment-method-${Date.now()}-${crypto.randomUUID()}`
      });
      if (!result?.checkout_url) throw new Error("checkout_failed");
      location.assign(result.checkout_url);
    } catch (error) {
      showError(friendlyStatus(error.message));
      setBusy(false);
    }
  }

  async function startTopup(amount) {
    if (state.loading) return;
    const formatted = moneyFromCents(amount,"EUR");
    if (!confirm(`Du wirst zu Stripe weitergeleitet. Erst dort bestätigst du die Zahlung über ${formatted}. Fortfahren?`)) return;
    clearError();
    setBusy(true);
    try {
      const result = await api(CHECKOUT_URL,"POST",{
        action:"topup_checkout",
        amount_cents:amount,
        idempotency_key:`topup-${amount}-${Date.now()}-${crypto.randomUUID()}`
      });
      if (!result?.checkout_url) throw new Error("checkout_failed");
      location.assign(result.checkout_url);
    } catch (error) {
      showError(friendlyStatus(error.message));
      setBusy(false);
    }
  }

  function findQuote(quoteId) {
    return (Array.isArray(state.account?.quotes) ? state.account.quotes : []).find((quote) => String(quote?.id || "") === String(quoteId || "")) || null;
  }

  async function approveQuote(quoteId) {
    if (state.loading) return;
    const quote = findQuote(quoteId);
    if (!quote || !quoteActionable(quote)) return showError("Diese Preisfreigabe ist nicht mehr aktiv. Bitte den Status neu laden.");
    const title = String(quote.description || quote.rate_code || "PAYG-Auftrag");
    const amount = moneyFromCents(quote.amount_cents,quote.currency || "EUR");
    if (!confirm(`Du gibst „${title}“ zum angezeigten Gesamtbetrag von ${amount} kostenpflichtig frei. Ohne diese Freigabe wird der Auftrag nicht als genehmigt markiert. Kostenpflichtig freigeben?`)) return;
    clearError();
    setBusy(true);
    try {
      await api(PAYG_URL,"POST",{ action:"approve_quote", quote_id:String(quote.id) });
      await load();
    } catch (error) {
      showError(friendlyStatus(error.message));
      setBusy(false);
    }
  }

  async function cancelQuote(quoteId) {
    if (state.loading) return;
    const quote = findQuote(quoteId);
    if (!quote || String(quote.status || "").toUpperCase() !== "QUOTED") return showError("Diese Preisfreigabe ist nicht mehr offen. Bitte den Status neu laden.");
    const title = String(quote.description || quote.rate_code || "PAYG-Auftrag");
    if (!confirm(`„${title}“ nicht beauftragen und diese Preisfreigabe ablehnen?`)) return;
    clearError();
    setBusy(true);
    try {
      await api(PAYG_URL,"POST",{ action:"cancel_quote", quote_id:String(quote.id), reason:"customer_cancelled_in_web_account" });
      await load();
    } catch (error) {
      showError(friendlyStatus(error.message));
      setBusy(false);
    }
  }

  async function syncReturnState() {
    const params = new URLSearchParams(location.search);
    const checkoutSessionId = params.get("session_id") || "";
    if (!checkoutSessionId) return false;
    let action = null;
    if (params.get("payment_setup") === "success") action = "sync_payment_method_checkout";
    if (params.get("topup") === "success") action = "sync_topup_checkout";
    if (!action) return false;
    try {
      await api(CHECKOUT_URL,"POST",{ action, checkout_session_id:checkoutSessionId });
      const clean = new URL(location.href);
      clean.searchParams.delete("session_id");
      clean.searchParams.delete("payment_setup");
      clean.searchParams.delete("topup");
      history.replaceState(null,"",clean.pathname + clean.search + clean.hash);
      return true;
    } catch (error) {
      showError(friendlyStatus(error.message));
      return false;
    }
  }

  async function init() {
    const auth = window.SCBAuth;
    if (!auth?.validateSession) return location.replace("anmelden.html");
    const valid = await auth.validateSession().catch(() => false);
    if (!valid) return location.replace("anmelden.html");

    $("paygActivate")?.addEventListener("click", togglePayg);
    $("paymentManage")?.addEventListener("click", managePayment);
    document.querySelectorAll("[data-topup-cents]").forEach((button) => {
      button.addEventListener("click", () => startTopup(Number(button.dataset.topupCents)));
    });
    $("paygQuotes")?.addEventListener("click", (event) => {
      const button = event.target instanceof Element ? event.target.closest("button[data-quote-action]") : null;
      if (!button || button.disabled) return;
      if (button.dataset.quoteAction === "approve") approveQuote(button.dataset.quoteId);
      if (button.dataset.quoteAction === "cancel") cancelQuote(button.dataset.quoteId);
    });
    await syncReturnState();
    await load();
  }

  window.NAHWERKPaygAccountTestHooks = Object.freeze({ quoteActionable, moneyFromCents, friendlyStatus });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once:true });
  else init();
})();
