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

  const GUEST_RESUME_KEY = "nw_guest_resume_request_v1";
  function mountGuestHandoff() {
    let handoff=null;
    try { handoff=JSON.parse(localStorage.getItem(GUEST_RESUME_KEY)||"null"); } catch (_) {}
    const request=String(handoff?.request||"").trim();
    const created=Date.parse(String(handoff?.created_at||""));
    if(!request||!Number.isFinite(created)||Date.now()-created>24*60*60*1000) return;
    const theme=document.getElementById("nwPortalThemeSetting");
    if(!theme||document.getElementById("paygGuestHandoff")) return;
    const card=document.createElement("section");
    card.id="paygGuestHandoff";
    card.className="payg-card payg-wide payg-guest-handoff";
    const eyebrow=document.createElement("div");
    eyebrow.className="eyebrow";
    eyebrow.textContent="Dein Concierge-Auftrag";
    const title=document.createElement("h2");
    title.textContent="PAYG-Guthaben aufladen";
    const copy=document.createElement("p");
    copy.textContent="Du kommst aus dem kostenlosen Concierge-Chat. Lade zuerst PAYG-Guthaben ab 5 € auf. Danach kannst du deinen vorbereiteten Auftrag im Chat fortsetzen; vor einer kostenpflichtigen Ausführung siehst du den Preis.";
    const requestBox=document.createElement("div");
    requestBox.className="payg-guest-request";
    requestBox.textContent=request.slice(0,700);
    const link=document.createElement("a");
    link.className="btn light payg-guest-resume";
    link.href="/web-concierge?resume_guest=1";
    link.textContent="Auftrag im Chat fortsetzen";
    card.append(eyebrow,title,copy,requestBox,link);
    theme.insertAdjacentElement("afterend",card);
  }
  mountGuestHandoff();

  toggle.addEventListener("change", () => {
    const next = toggle.checked ? "dark" : "light";
    try { localStorage.setItem(KEY, next); } catch (_) {}
    applyTheme(next);
  });

  addEventListener("storage", (event) => {
    if (event.key === KEY) applyTheme(readTheme());
  });
})();
