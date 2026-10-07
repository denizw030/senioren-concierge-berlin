(() => {
  "use strict";
  const params = new URLSearchParams(window.location.search);
  if (params.get("produkt") === "internal-hq" && params.get("next") === "hq") {
    document.documentElement.classList.add("stewaro-hq-login-entry");
  }
})();
