(() => {
  "use strict";

  const PAYG_URL = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/web-payg";
  const CHECKOUT_URL = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/web-payg-checkout";
  const CONTRACT_VERSION = "payg-payment-method-detach-v1";
  const status = document.getElementById("paymentStatus");
  const remove = document.getElementById("paymentRemove");
  const hint = document.getElementById("paymentRemoveHint");
  if (!status || !(remove instanceof HTMLButtonElement) || !hint) return;

  const nativeFetch = window.fetch.bind(window);
  let capability = null;
  let activeMethod = null;
  let busy = false;

  function validUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
  }

  function requestUrl(input) {
    try { return new URL(input instanceof Request ? input.url : String(input),location.href).href; }
    catch { return ""; }
  }

  function normalizeCapability(body) {
    const source = body?.payment_method_capabilities;
    if (!source || typeof source !== "object") return null;
    const ready = source.contract_version === CONTRACT_VERSION && source.authoritative === true && source.detach_supported === true;
    return Object.freeze({ contract_version:String(source.contract_version || ""), authoritative:source.authoritative === true, detach_supported:source.detach_supported === true, ready });
  }

  function chooseActiveMethod(body) {
    const methods = Array.isArray(body?.payment_methods) ? body.payment_methods.filter((item) => item?.status === "ACTIVE" && validUuid(item?.id)) : [];
    return methods.find((item) => item?.is_default === true) || methods[0] || null;
  }

  function showError(message) {
    const box = document.getElementById("paygSessionError");
    if (!box) return;
    box.hidden = false;
    box.textContent = message;
  }

  function syncUi() {
    const hasMethod = Boolean(activeMethod) || status.textContent.trim() === "Hinterlegt";
    const ready = capability?.ready === true && Boolean(activeMethod) && !busy;
    remove.hidden = !hasMethod;
    hint.hidden = !hasMethod;
    remove.disabled = !ready;
    remove.dataset.forceDisabled = ready ? "0" : "1";
    remove.setAttribute("aria-disabled",ready ? "false" : "true");
    hint.textContent = ready
      ? "Du kannst die aktuell verwendete Zahlungsmethode entfernen. Erfolg wird erst angezeigt, wenn Stripe-Detach und der autoritative PAYG-Status bestätigt sind."
      : "Entfernen bleibt gesperrt, bis der autoritative PAYG-PROD-Vertrag payg-payment-method-detach-v1 bestätigt. Die Website entfernt keine Zahlungsmethode lokal.";
  }

  async function authoritativeState() {
    const session = window.SCBAuth?.getSession?.();
    if (!session?.session_token) throw new Error("invalid_session");
    const response = await nativeFetch(PAYG_URL,{ method:"GET", headers:{ Authorization:`Bearer ${session.session_token}` }, cache:"no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body?.ok === false) throw new Error(String(body?.status || "state_unavailable"));
    capability = normalizeCapability(body);
    activeMethod = chooseActiveMethod(body);
    syncUi();
    return body;
  }

  async function detach() {
    if (busy || capability?.ready !== true || !activeMethod?.id) return;
    const label = [activeMethod.brand ? String(activeMethod.brand).toUpperCase() : "Zahlungsmethode",activeMethod.last4 ? `•••• ${activeMethod.last4}` : ""].filter(Boolean).join(" · ");
    if (!confirm(`${label} wirklich entfernen? Offene Zahlungen oder Aufträge können den Vorgang serverseitig ablehnen.`)) return;
    const session = window.SCBAuth?.getSession?.();
    if (!session?.session_token) return location.replace("anmelden.html");
    busy = true;
    syncUi();
    const methodId = String(activeMethod.id);
    try {
      const response = await nativeFetch(CHECKOUT_URL,{
        method:"POST",
        headers:{ Authorization:`Bearer ${session.session_token}`, "Content-Type":"application/json" },
        body:JSON.stringify({
          action:"detach_payment_method",
          payment_method_id:methodId,
          idempotency_key:`payment-detach-${methodId}-${crypto.randomUUID()}`
        }),
        cache:"no-store"
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.ok !== true || body?.status !== "payment_method_detached" || body?.contract_version !== CONTRACT_VERSION || body?.authoritative !== true || String(body?.payment_method_id || "") !== methodId) {
        throw new Error(String(body?.status || "payment_method_detach_failed"));
      }
      const verified = await authoritativeState();
      const stillActive = (Array.isArray(verified?.payment_methods) ? verified.payment_methods : []).some((item) => String(item?.id || "") === methodId && item?.status === "ACTIVE");
      if (stillActive) throw new Error("detach_not_reconciled");
      location.reload();
    } catch {
      showError("Die Zahlungsmethode wurde nicht als entfernt bestätigt. Es wird kein Erfolg angezeigt; bitte den aktuellen Status erneut laden.");
    } finally {
      busy = false;
      syncUi();
    }
  }

  window.fetch = async (input,init = {}) => {
    const response = await nativeFetch(input,init);
    const method = String(init?.method || (input instanceof Request ? input.method : "GET") || "GET").toUpperCase();
    if (requestUrl(input) === PAYG_URL && method === "GET") {
      try {
        const body = await response.clone().json();
        capability = normalizeCapability(body);
        activeMethod = chooseActiveMethod(body);
      } catch {
        capability = null;
        activeMethod = null;
      }
      syncUi();
    }
    return response;
  };

  remove.addEventListener("click",detach);
  syncUi();
  new MutationObserver(syncUi).observe(status,{ childList:true,characterData:true,subtree:true });

  window.NAHWERKPaymentMethodRemovalGuard = Object.freeze({
    contractVersion:CONTRACT_VERSION,
    normalizeCapability,
    isSupported:() => capability?.ready === true
  });
})();
