(() => {
  "use strict";

  const status = document.getElementById("paymentStatus");
  const remove = document.getElementById("paymentRemove");
  const hint = document.getElementById("paymentRemoveHint");
  if (!status || !remove || !hint) return;

  function sync() {
    const hasMethod = status.textContent.trim() === "Hinterlegt";
    remove.hidden = !hasMethod;
    hint.hidden = !hasMethod;
    remove.disabled = true;
    remove.setAttribute("aria-disabled", "true");
  }

  sync();
  new MutationObserver(sync).observe(status, { childList:true, characterData:true, subtree:true });

  window.NAHWERKPaymentMethodRemovalGuard = Object.freeze({
    supported: false,
    reason: "PAYG_PROD_REMOVE_PAYMENT_METHOD_CONTRACT_MISSING"
  });
})();
