(() => {
  let action = "";

  function ensureRegion() {
    let region = document.getElementById("paygActionProgress");
    if (region) return region;
    region = document.createElement("div");
    region.id = "paygActionProgress";
    region.className = "payg-notice";
    region.hidden = true;
    region.setAttribute("role", "status");
    region.setAttribute("aria-live", "polite");
    const error = document.getElementById("paygSessionError");
    if (error?.parentNode) error.parentNode.insertBefore(region, error);
    return region;
  }

  function labelForAction() {
    if (action === "activate") return "PAYG wird aktiviert …";
    if (action === "deactivate") return "PAYG wird deaktiviert …";
    if (action === "payment") return "Sichere Stripe-Seite wird vorbereitet …";
    if (action === "topup") return "Sichere Guthaben-Aufladung wird vorbereitet …";
    if (action === "quote") return "Deine Entscheidung wird serverseitig bestätigt …";
    return "Vorgang wird verarbeitet …";
  }

  function errorForAction(current) {
    const generic = "Der Vorgang konnte gerade nicht abgeschlossen werden. Es wurde nichts doppelt ausgelöst.";
    if (current !== generic) return current;
    if (action === "activate") return "PAYG konnte nicht aktiviert werden. Dein Kundenkonto hat derzeit keine ausreichende Zahlungsberechtigung. Es wurde nichts aktiviert oder belastet.";
    if (action === "deactivate") return "PAYG konnte nicht deaktiviert werden. Bitte lade den aktuellen Kontostatus neu. Es wurde nichts doppelt ausgelöst.";
    if (action === "payment") return "Die sichere Stripe-Seite konnte nicht vorbereitet werden. Prüfe zuerst, ob PAYG aktiv ist. Es wurde keine Zahlung ausgelöst.";
    if (action === "topup") return "Die Guthaben-Aufladung konnte nicht vorbereitet werden. Es wurde keine Zahlung ausgelöst.";
    if (action === "quote") return "Die Preisentscheidung konnte nicht bestätigt werden. Bitte lade den aktuellen Status neu.";
    return current;
  }

  function sync() {
    const region = ensureRegion();
    const busy = document.body.classList.contains("payg-loading");
    if (busy) {
      region.textContent = labelForAction();
      region.hidden = false;
    } else {
      region.hidden = true;
      region.textContent = "";
    }

    const error = document.getElementById("paygSessionError");
    if (error && !error.hidden && error.textContent) {
      error.textContent = errorForAction(error.textContent);
    }
  }

  document.addEventListener("click", (event) => {
    const button = event.target instanceof Element ? event.target.closest("button") : null;
    if (!button) return;
    if (button.id === "paygActivate") action = button.textContent?.includes("deaktivieren") ? "deactivate" : "activate";
    else if (button.id === "paymentManage") action = "payment";
    else if (button.matches("[data-topup-cents]")) action = "topup";
    else if (button.matches("[data-quote-action]")) action = "quote";
    else return;
    queueMicrotask(sync);
  }, true);

  function init() {
    ensureRegion();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { attributes:true, attributeFilter:["class"] });
    const error = document.getElementById("paygSessionError");
    if (error) observer.observe(error, { attributes:true, childList:true, subtree:true });
    sync();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once:true });
  else init();
})();
