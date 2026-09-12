(() => {
  "use strict";

  // Legacy compatibility shim only. The former STAGING shadow transport is
  // intentionally removed from the real customer website. No network request
  // is made here. A future Web Concierge must use the canonical PROD gateway.
  const blocked = (sourceMessageId = null) => Promise.resolve({
    ok: false,
    skipped: true,
    reason: "web_prod_gateway_required",
    shadow_only: false,
    customer_delivery: false,
    source_message_id: sourceMessageId
  });

  window.NAHWERKWebCoreShadow = Object.freeze({
    isEnabled: () => false,
    createPendingTurn: () => null,
    readPending: () => null,
    removePending: () => {},
    channelSessionId: () => null,
    sendPending: (sourceMessageId) => blocked(sourceMessageId),
    sendTurn: () => blocked(null)
  });
})();
