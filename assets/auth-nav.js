perl: warning: Setting locale failed.
perl: warning: Please check that your locale settings:
	LC_ALL = "C.UTF-8",
	LC_CTYPE = "C.UTF-8",
	LANG = "C.UTF-8"
    are supported and installed on your system.
perl: warning: Falling back to the standard locale ("C").
(() => {
  const logoCss = document.createElement("link");
  logoCss.rel = "stylesheet";
  logoCss.href = "assets/nahwerk-logo-v2.css?v=4";
  document.head.appendChild(logoCss);
  const SESSION_KEY = "scb_web_session";
  const PRODUCT_KEY = "nahwerk_product";
  const CHECK_URL = "https://denizw.app.n8n.cloud/webhook/senioren-concierge/web/session/check";
  const LOGOUT_URL = "https://denizw.app.n8n.cloud/webhook/senioren-concierge/web/logout";
  const PROTECTED = new Set(["konto.html", "martin-anpassen.html"]);
  const CONTEXT_PAGES = new Set(["registrieren.html", "anmelden.html", "konto.html", "martin-anpassen.html"]);
  const NAV = [["index.html", "Übersicht"], ["prime-concierge.html", "Prime Concierge"], ["senioren-concierge.html", "Senioren Concierge"], ["angehoerige.html", "Für Angehörige"], ["kontakt.html", "Kontakt"]];
  const page = () => location.pathname.split("/").pop() || "index.html";
  function productContext(current = page()) {
    const requested = new URLSearchParams(location.search).get("produkt");
    if (requested === "senioren" || requested === "prime") {
      sessionStorage.setItem(PRODUCT_KEY, requested);
      return requested;
    }
    if (current === "senioren-concierge.html" || current === "angehoerige.html") return "senioren";
    if (current === "prime-concierge.html") return "prime";
    if (CONTEXT_PAGES.has(current)) return sessionStorage.getItem(PRODUCT_KEY) === "senioren" ? "senioren" : "prime";
    return "prime";
  }
  function getSession() {
    try {
      const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
      if (session?.session_token) return session;
    } catch (_) {}
    return null;
  }
  const isLoggedIn = () => !!getSession();
  function clearLocalAuth() {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem("scb_onboarding_sent");
    localStorage.removeItem("scb_onboarding_result");
  }
  function makeLink(href, label, cls = "") {
    const link = document.createElement("a");
    link.href = href;
    link.textContent = label;
    if (cls) link.className = cls;
    return link;
  }
  async function logout() {
    const session = getSession();
    if (session?.session_token) {
      try {
        await fetch(LOGOUT_URL, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.session_token}` }, body: "{}" });
      } catch (_) {}
    }
    clearLocalAuth();
    location.href = "index.html";
  }
  function ensureOdysxBar() {
    document.querySelectorAll(".odysx-info-bar").forEach((element) => element.remove());
    const header = document.querySelector("header.top");
    if (!header) return;
    const bar = document.createElement("div");
    bar.className = "odysx-info-bar";
    bar.setAttribute("role", "note");
    bar.innerHTML = '<img src="assets/Krone.png?v=1" alt="ODYSX" style="width:24px;height:24px;object-fit:contain;display:block;flex:0 0 auto"><span>Eine Marke von <strong>ODYSX</strong></span>';
    Object.assign(bar.style, { boxSizing: "border-box", width: "100%", minHeight: "32px", padding: "4px 20px", background: "#242424", borderTop: "1px solid #343434", borderBottom: "1px solid #3a3a3a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: "9px", textAlign: "center", font: "500 13px/18px Arial,sans-serif", letterSpacing: ".25px", position: "relative", zIndex: "49" });
    header.insertAdjacentElement("afterend", bar);
  }
  function normalizeShell() {
    const current = page();
    const product = productContext(current);
    document.body.dataset.product = product;
    document.body.classList.toggle("senior-product", product === "senioren");
    document.querySelectorAll("header.top .brand").forEach((brand) => {
      brand.href = "index.html";
      brand.innerHTML = '<span class="mark nahwerk-mark" aria-hidden="true"></span><span class="brandtext"><strong>NAHWERK</strong><span>CONCIERGE</span></span>';
    });
    document.querySelectorAll("nav.links").forEach((nav) => {
      nav.innerHTML = "";
      NAV.forEach(([href, label]) => nav.appendChild(makeLink(href, label, current === href ? "active" : "")));
      if (isLoggedIn()) {
        nav.appendChild(makeLink("konto.html", "Kundenbereich", current === "konto.html" ? "active" : ""));
        const out = makeLink("#", "Abmelden");
        out.dataset.logout = "1";
        out.addEventListener("click", (event) => { event.preventDefault(); logout(); });
        nav.appendChild(out);
      } else {
        const suffix = `?produkt=${product}`;
        nav.appendChild(makeLink(`anmelden.html${suffix}`, "Anmelden", current === "anmelden.html" ? "active auth-link login-link" : ""));
        nav.appendChild(makeLink(`registrieren.html${suffix}`, "Registrieren", current === "registrieren.html" ? "active auth-link register-link" : "auth-link register-link"));
      }
    });
    ensureOdysxBar();
    document.querySelectorAll(".footbottom span:first-child").forEach((element) => { element.textContent = "© 2026 Nahwerk Concierge"; });
    document.querySelectorAll('.footer a[href="anmelden.html"],.footer a[href="registrieren.html"]').forEach((link) => { if (isLoggedIn()) link.remove(); });
  }
  function updateNav() {
    normalizeShell();
    if (!isLoggedIn()) return;
    document.querySelectorAll(".footergrid>div").forEach((box) => {
      if (box.querySelector("h4")?.textContent.trim() === "Informationen" && !box.querySelector('a[href="konto.html"]')) {
        box.appendChild(makeLink("konto.html", "Kundenbereich"));
        const out = makeLink("#", "Abmelden");
        out.dataset.logout = "1";
        out.addEventListener("click", (event) => { event.preventDefault(); logout(); });
        box.appendChild(out);
      }
    });
  }
  async function validateSession() {
    const session = getSession();
    if (!session?.session_token) return false;
    try {
      const response = await fetch(CHECK_URL, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.session_token}` }, body: "{}" });
      const body = await response.json().catch(() => ({}));
      if (response.ok && body.ok && body.status === "session_valid") {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ session_token: body.session_token || session.session_token, customer_account_id: body.customer_account_id, person_id: body.person_id, role: body.role, expires_at: body.expires_at }));
        return true;
      }
      if (response.status === 401 || response.status === 403) { clearLocalAuth(); return false; }
    } catch (_) { return true; }
    clearLocalAuth();
    return false;
  }
  document.addEventListener("DOMContentLoaded", async () => {
    normalizeShell();
    const current = page();
    const valid = await validateSession();
    if (valid) {
      updateNav();
      if (current === "anmelden.html" || current === "registrieren.html") location.replace("konto.html");
    } else {
      normalizeShell();
      if (PROTECTED.has(current)) location.replace("anmelden.html");
    }
  });
  window.SCBAuth = { getSession, isLoggedIn, validateSession, logout, clearLocalAuth, productContext, SESSION_KEY };
})();
