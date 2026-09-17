(() => {
  "use strict";

  // Legacy compatibility shim. The old Shadow/Test Web Concierge is no longer
  // mountable on the customer website. Real customer messaging is exposed only
  // through the dedicated PROD Web Concierge surface once its server contract
  // becomes authoritative.
  window.NAHWERKWebChatUI = Object.freeze({
    isEnabled: () => false,
    isTransportEnabled: () => false,
    mount: () => null
  });

  // Keep telephone documentation separate from the text chat. On the customer
  // account overview this adds a clean entry into the read-only phone history.
  const isCustomerAccount = /(?:^|\/)konto(?:\.html)?\/?$/.test(location.pathname);
  if (!isCustomerAccount) return;
  const highlights = document.querySelector(".account-overview-highlights[data-account-panel='overview']");
  if (!highlights || document.getElementById("accountPhoneHistoryEntry")) return;
  const phone = document.createElement("a");
  phone.id = "accountPhoneHistoryEntry";
  phone.className = "account-overview-link";
  phone.href = "/telefonate/";
  phone.setAttribute("aria-label", "Telefonate und Ergebnisse öffnen");
  phone.innerHTML = '<span class="eyebrow">Telefon</span><strong>Telefonate</strong><span>Ergebnisse, Dauer und Zusammenfassungen deiner Anrufe ansehen.</span>';
  highlights.appendChild(phone);
})();
