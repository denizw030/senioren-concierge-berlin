(() => {
  "use strict";

  const PAYG_URL = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/web-payg";
  const CONTRACT_VERSION = "payg-consumer-rights-v1";
  const ALLOWED_WITHDRAWAL_ORIGINS = new Set([
    "https://nahwerkconcierge.com",
    "https://www.nahwerkconcierge.com"
  ]);

  const nativeFetch = window.fetch.bind(window);
  let contract = null;
  let pendingEvidence = null;
  let dialog = null;

  function validWithdrawalUrl(value) {
    try {
      const url = new URL(String(value || ""));
      return url.protocol === "https:" && ALLOWED_WITHDRAWAL_ORIGINS.has(url.origin) ? url.href : null;
    } catch {
      return null;
    }
  }

  function normalizeConsumerRights(raw) {
    const source = raw && typeof raw === "object" ? raw.consumer_rights : null;
    if (!source || typeof source !== "object") return null;
    const withdrawalUrl = validWithdrawalUrl(source.electronic_withdrawal_url);
    const ready =
      source.contract_version === CONTRACT_VERSION &&
      source.electronic_withdrawal_function === true &&
      Boolean(withdrawalUrl) &&
      source.immediate_performance_consent_evidence === true &&
      source.order_confirmation_durable_medium === true;
    return Object.freeze({
      contract_version: String(source.contract_version || ""),
      electronic_withdrawal_function: source.electronic_withdrawal_function === true,
      electronic_withdrawal_url: withdrawalUrl,
      immediate_performance_consent_evidence: source.immediate_performance_consent_evidence === true,
      order_confirmation_durable_medium: source.order_confirmation_durable_medium === true,
      ready
    });
  }

  function statusBox() {
    let box = document.getElementById("paygConsumerRightsGate");
    if (box) return box;
    const anchor = document.getElementById("paygContractNotice");
    if (!anchor) return null;
    box = document.createElement("div");
    box.id = "paygConsumerRightsGate";
    box.className = "payg-notice";
    box.setAttribute("role", "status");
    anchor.before(box);
    return box;
  }

  function showPageError(message) {
    const box = document.getElementById("paygSessionError");
    if (!box) return;
    box.hidden = false;
    box.textContent = message;
    box.scrollIntoView?.({ block:"nearest", behavior:"smooth" });
  }

  function renderGate() {
    const ready = contract?.ready === true;
    const box = statusBox();
    if (box) {
      box.replaceChildren();
      const strong = document.createElement("strong");
      strong.textContent = ready ? "Verbraucherschutz in PROD bestätigt:" : "Kostenfreigabe geschützt:";
      const text = document.createTextNode(ready
        ? " Elektronischer Widerruf, Sofortausführungs-Nachweis und dauerhafte Bestellbestätigung sind serverseitig freigegeben."
        : " Kostenpflichtige PAYG-Aufträge bleiben gesperrt, bis der autoritative PROD-Vertrag elektronischen Widerruf, Sofortausführungs-Nachweis und dauerhafte Bestellbestätigung bestätigt.");
      box.append(strong, text);
      if (ready && contract.electronic_withdrawal_url) {
        box.append(document.createTextNode(" "));
        const link = document.createElement("a");
        link.href = contract.electronic_withdrawal_url;
        link.textContent = "Vertrag widerrufen";
        link.rel = "nofollow";
        box.appendChild(link);
      }
    }

    document.querySelectorAll('button[data-quote-action="approve"]').forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) return;
      button.dataset.consumerRightsReady = ready ? "1" : "0";
      button.dataset.forceDisabled = ready ? "0" : "1";
      if (!ready) {
        button.disabled = true;
        button.setAttribute("aria-disabled", "true");
        button.title = "Kostenpflichtige Freigabe wartet auf den autoritativen PAYG-Verbraucherrechtsvertrag.";
      } else {
        button.removeAttribute("aria-disabled");
        button.removeAttribute("title");
      }
    });
  }

  function ensureDialog() {
    if (dialog) return dialog;
    dialog = document.createElement("dialog");
    dialog.id = "paygImmediatePerformanceConsent";
    dialog.setAttribute("aria-labelledby", "paygImmediatePerformanceTitle");
    dialog.innerHTML = `
      <form method="dialog" style="max-width:620px;padding:4px;display:grid;gap:16px">
        <div>
          <div class="eyebrow">PAYG · Verbraucherrecht</div>
          <h2 id="paygImmediatePerformanceTitle" style="margin:6px 0 8px">Sofortige Ausführung bestätigen</h2>
          <p id="paygImmediatePerformanceOrder" style="margin:0;color:#555"></p>
        </div>
        <label style="display:flex;gap:10px;align-items:flex-start"><input id="paygImmediateStart" type="checkbox" /> <span>Ich verlange ausdrücklich, dass NAHWERK vor Ablauf der Widerrufsfrist mit dieser kostenpflichtigen Dienstleistung beginnt.</span></label>
        <label style="display:flex;gap:10px;align-items:flex-start"><input id="paygWithdrawalExpiryAck" type="checkbox" /> <span>Mir ist bekannt, dass mein Widerrufsrecht bei vollständiger Vertragserfüllung erlischt, wenn die gesetzlichen Voraussetzungen erfüllt sind.</span></label>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn red" id="paygConsumerRightsConfirm" type="button">Erklärungen bestätigen</button>
          <button class="btn light" value="cancel" type="submit">Abbrechen</button>
        </div>
      </form>`;
    document.body.appendChild(dialog);
    dialog.querySelector("#paygConsumerRightsConfirm")?.addEventListener("click", () => {
      const start = dialog.querySelector("#paygImmediateStart");
      const expiry = dialog.querySelector("#paygWithdrawalExpiryAck");
      if (!(start instanceof HTMLInputElement) || !(expiry instanceof HTMLInputElement) || !start.checked || !expiry.checked) {
        showPageError("Bitte bestätige beide Erklärungen, wenn der Auftrag sofort beginnen soll.");
        return;
      }
      const quoteId = String(dialog.dataset.quoteId || "");
      const button = document.querySelector(`button[data-quote-action="approve"][data-quote-id="${CSS.escape(quoteId)}"]`);
      pendingEvidence = {
        quote_id: quoteId,
        contract_version: CONTRACT_VERSION,
        immediate_performance_requested: true,
        withdrawal_expiry_acknowledged: true,
        accepted_at_client: new Date().toISOString()
      };
      dialog.close("confirmed");
      if (button instanceof HTMLButtonElement) button.click();
    });
    return dialog;
  }

  function openConsentDialog(button) {
    const current = ensureDialog();
    current.dataset.quoteId = String(button.dataset.quoteId || "");
    const start = current.querySelector("#paygImmediateStart");
    const expiry = current.querySelector("#paygWithdrawalExpiryAck");
    if (start instanceof HTMLInputElement) start.checked = false;
    if (expiry instanceof HTMLInputElement) expiry.checked = false;
    const summary = current.querySelector("#paygImmediatePerformanceOrder");
    if (summary) summary.textContent = `Diese Erklärungen gelten nur für die gerade ausgewählte Preisfreigabe ${button.textContent?.trim() || ""}.`;
    current.showModal();
  }

  function requestMatchesPayg(input) {
    try {
      const url = new URL(input instanceof Request ? input.url : String(input), location.href);
      return url.href === PAYG_URL;
    } catch {
      return false;
    }
  }

  window.fetch = async (input, init = {}) => {
    const isPayg = requestMatchesPayg(input);
    const method = String(init?.method || (input instanceof Request ? input.method : "GET") || "GET").toUpperCase();

    if (isPayg && method === "POST" && typeof init?.body === "string") {
      let body = null;
      try { body = JSON.parse(init.body); } catch {}
      if (body?.action === "approve_quote") {
        const quoteId = String(body.quote_id || "");
        const evidenceMatches = contract?.ready === true && pendingEvidence?.quote_id === quoteId;
        if (!evidenceMatches) {
          return new Response(JSON.stringify({ ok:false, status:"consumer_rights_evidence_required" }), {
            status:409,
            headers:{ "Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store" }
          });
        }
        body.consumer_rights_evidence = { ...pendingEvidence };
        pendingEvidence = null;
        init = { ...init, body:JSON.stringify(body) };
      }
    }

    const response = await nativeFetch(input, init);
    if (isPayg && method === "GET") {
      try {
        const body = await response.clone().json();
        contract = normalizeConsumerRights(body);
      } catch {
        contract = null;
      }
      renderGate();
    }
    return response;
  };

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest('button[data-quote-action="approve"]') : null;
    if (!(target instanceof HTMLButtonElement)) return;
    const quoteId = String(target.dataset.quoteId || "");
    if (contract?.ready !== true) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showPageError("Dieser kostenpflichtige Auftrag bleibt gesperrt, bis der autoritative PROD-Vertrag die erforderlichen Verbraucherrechts-Nachweise bestätigt.");
      return;
    }
    if (pendingEvidence?.quote_id !== quoteId) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openConsentDialog(target);
    }
  }, true);

  function init() {
    statusBox();
    renderGate();
    const quotes = document.getElementById("paygQuotes");
    if (quotes) new MutationObserver(renderGate).observe(quotes, { childList:true, subtree:true });
  }

  window.NAHWERKPaygConsumerRightsGate = Object.freeze({
    contractVersion: CONTRACT_VERSION,
    normalizeConsumerRights,
    isReady: () => contract?.ready === true
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once:true });
  else init();
})();
