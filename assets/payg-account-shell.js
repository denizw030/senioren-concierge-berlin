(() => {
  "use strict";

  const KEY = "nw_portal_theme_v1";
  const toggle = document.getElementById("nwPortalThemeToggle");
  if (!toggle) return;

  function readTheme() {
    try {
      const value = localStorage.getItem(KEY);
      if (value === "light" || value === "dark") return value;
    } catch (_) {}
    return document.documentElement.dataset.nwPortalTheme === "light" ? "light" : "dark";
  }

  function applyTheme(theme) {
    const normalized = theme === "light" ? "light" : "dark";
    document.documentElement.dataset.nwPortalTheme = normalized;
    document.body.classList.toggle("nw-portal-light", normalized === "light");
    document.body.classList.toggle("nw-portal-dark", normalized === "dark");
    toggle.checked = normalized === "dark";
    toggle.setAttribute("aria-checked", String(toggle.checked));
  }

  applyTheme(readTheme());

  toggle.addEventListener("change", () => {
    const next = toggle.checked ? "dark" : "light";
    try { localStorage.setItem(KEY, next); } catch (_) {}
    applyTheme(next);
  });

  addEventListener("storage", (event) => {
    if (event.key === KEY) applyTheme(readTheme());
  });
})();
