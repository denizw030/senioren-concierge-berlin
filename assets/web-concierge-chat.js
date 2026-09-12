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
})();
