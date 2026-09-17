(() => {
  "use strict";

  const CHAT_URL = "/web-concierge";
  const selector = '[data-account-tab="concierge"],[data-open-account-tab="concierge"]';

  function openMainConcierge(event) {
    const target = event.target instanceof Element ? event.target.closest(selector) : null;
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    location.href = CHAT_URL;
  }

  document.addEventListener("click", openMainConcierge, true);

  function redirectDirectConciergeEntry() {
    const params = new URLSearchParams(location.search);
    if (location.hash.toLowerCase() === "#concierge" || params.get("tab")?.toLowerCase() === "concierge") {
      location.replace(CHAT_URL);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", redirectDirectConciergeEntry, { once:true });
  else redirectDirectConciergeEntry();

  window.NAHWERKWebChatUI = Object.freeze({
    isEnabled: () => false,
    isTransportEnabled: () => false,
    mount: () => null,
    openMainConcierge: () => { location.href = CHAT_URL; }
  });
})();
