(() => {
  const mobileCss = document.createElement("style");
  mobileCss.textContent = `.top .nav{min-height:84px!important;align-items:flex-end!important;padding-top:10px!important;padding-bottom:0!important}.top .brand{align-self:center!important;margin-bottom:6px}.top .links{align-self:flex-end!important;gap:6px!important}.top .links a,.top .links .auth-link{min-height:42px!important;margin:0 0 3px!important;padding:11px 10px 9px!important;border:0!important;border-bottom:1px solid transparent!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;transform-origin:center bottom;transition:transform .18s ease,border-color .18s ease,color .18s ease!important}.top .links a:hover{transform:scale(1.04);background:transparent!important;border-bottom-color:#cda84e!important}.top .links a.active{border-bottom-color:#cda84e!important}.top .links .register-link{background:transparent!important;color:inherit!important}.top .links .register-link:hover{background:transparent!important;color:#eed58e!important;border-bottom-color:#cda84e!important}body.senior-product .top .links a:hover,body[data-product="senioren"] .top .links a:hover{background:transparent!important;border-bottom-color:#a77c29!important}body.senior-product .top .links .register-link,body[data-product="senioren"] .top .links .register-link{color:inherit!important}@media(max-width:1280px){.top{position:sticky!important;top:0!important;z-index:60!important}.top .nav{position:relative!important;align-items:center!important;flex-wrap:nowrap!important;justify-content:space-between!important;padding-bottom:8px!important}.top .brand{margin-bottom:0}.top .nav-toggle{display:block!important;position:fixed!important;top:16px!important;right:clamp(10px,3vw,28px)!important;z-index:64!important;flex:0 0 auto!important;margin-left:auto!important}.top .links{display:none!important;position:fixed!important;top:var(--nw-mobile-menu-top,84px)!important;left:clamp(10px,3vw,28px)!important;right:clamp(10px,3vw,28px)!important;width:auto!important;max-height:calc(100dvh - var(--nw-mobile-menu-top,84px) - 12px)!important;overflow:auto!important;overscroll-behavior:contain;grid-template-columns:1fr!important;flex-direction:column!important;align-items:stretch!important;text-align:left!important;background:#090909!important}.top .links.is-open{display:flex!important}.top .links a,.top .links .auth-link{margin:0!important;padding:14px 16px!important;transform:none!important}}@media(max-width:620px){.top .links{left:10px!important;right:10px!important}}`;
  document.head.appendChild(mobileCss);
  const SESSION_KEY = "scb_web_session";
  const PRODUCT_KEY = "nahwerk_product";
  const CHECK_URL = "https://denizw.app.n8n.cloud/webhook/senioren-concierge/web/session/check";
  const LOGOUT_URL = "https://denizw.app.n8n.cloud/webhook/senioren-concierge/web/logout";
  const PROTECTED = new Set(["konto.html", "concierge-anpassen.html"]);
  const CONTEXT_PAGES = new Set(["pakete.html", "registrieren.html", "anmelden.html", "konto.html", "concierge-anpassen.html"]);
  const NAV = [["index.html", "Übersicht"], ["prime-concierge.html", "Persönlicher Concierge"], ["concierges.html", "Concierges"], ["senioren-concierge.html", "Senioren Concierge"], ["senioren-concierge.html#angehoerige", "Für Angehörige"], ["leistungen.html", "Leistungen"], ["kontakt.html", "Kontakt"]];
  const page = () => location.pathname.split("/").pop() || "index.html";
  function productContext(current = page()) {
    const requested = new URLSearchParams(location.search).get("produkt");
    if (requested === "senioren" || requested === "prime") {
      sessionStorage.setItem(PRODUCT_KEY, requested);
      return requested;
    }
    if (current === "senioren-concierge.html" || current === "angehoerige.html") {
      sessionStorage.setItem(PRODUCT_KEY, "senioren");
      return "senioren";
    }
    if (current === "prime-concierge.html") {
      sessionStorage.setItem(PRODUCT_KEY, "prime");
      return "prime";
    }
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
    bar.innerHTML = '<img src="assets/Krone.png?v=1" alt="" aria-hidden="true" style="width:24px;height:24px;object-fit:contain;display:block;flex:0 0 auto"><span>Eine Marke von <strong>ODYSX</strong></span><img class="odysx-crown-logo" src="assets/Krone-white.png?v=1" alt="ODYSX Krone">';
    header.insertAdjacentElement("afterend", bar);
  }
  function normalizeShell() {
    const current = page();
    const product = productContext(current);
    document.body.dataset.product = product;
    document.body.classList.toggle("senior-product", product === "senioren");
    if (current === "pakete.html" && product === "senioren") {
      document.title = "Senioren-Concierge Tarife | NAHWERK";
      document.querySelectorAll('[href^="registrieren.html"]').forEach((link) => {
        const url = new URL(link.getAttribute("href"), location.href);
        url.searchParams.set("produkt", "senioren");
        link.setAttribute("href", `${url.pathname.split("/").pop()}?${url.searchParams.toString()}`);
      });
    }
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
        nav.appendChild(makeLink(`anmelden.html${suffix}`, "Anmelden", `${current === "anmelden.html" ? "active " : ""}auth-link login-link`.trim()));
        nav.appendChild(makeLink(`registrieren.html${suffix}`, "Registrieren", `${current === "registrieren.html" ? "active " : ""}auth-link register-link`.trim()));
      }
      nav.id ||= "main-navigation";
      if (!nav.previousElementSibling?.classList.contains("nav-toggle")) {
        const toggle = document.createElement("button");
        toggle.className = "nav-toggle";
        toggle.type = "button";
        toggle.setAttribute("aria-label", "Menü öffnen");
        toggle.setAttribute("aria-controls", nav.id);
        toggle.setAttribute("aria-expanded", "false");
        toggle.innerHTML = '<span></span><span></span><span></span>';
        const preserveViewport = (change) => {
          const x = window.scrollX;
          const y = window.scrollY;
          change();
          requestAnimationFrame(() => {
            if (window.scrollX !== x || window.scrollY !== y) window.scrollTo({ left:x, top:y, behavior:"auto" });
          });
        };
        const syncMenuTop = () => {
          const header = nav.closest("header.top");
          const bottom = header ? Math.max(0, header.getBoundingClientRect().bottom) : 84;
          nav.style.setProperty("--nw-mobile-menu-top", `${Math.round(bottom)}px`);
        };
        const close = () => {
          preserveViewport(() => nav.classList.remove("is-open"));
          toggle.setAttribute("aria-expanded", "false");
          toggle.setAttribute("aria-label", "Menü öffnen");
        };
        toggle.addEventListener("pointerdown", (event) => {
          event.preventDefault();
          try { toggle.focus({ preventScroll:true }); } catch (_) { toggle.focus(); }
        });
        toggle.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          const open = !nav.classList.contains("is-open");
          if (open) syncMenuTop();
          preserveViewport(() => nav.classList.toggle("is-open", open));
          toggle.setAttribute("aria-expanded", String(open));
          toggle.setAttribute("aria-label", open ? "Menü schließen" : "Menü öffnen");
        });
        addEventListener("resize", () => { if (nav.classList.contains("is-open")) syncMenuTop(); }, { passive:true });
        nav.addEventListener("click", (event) => { if (event.target.closest("a")) close(); });
        document.addEventListener("click", (event) => { if (!event.target.closest(".nav")) close(); });
        document.addEventListener("keydown", (event) => { if (event.key === "Escape") { close(); try { toggle.focus({ preventScroll:true }); } catch (_) { toggle.focus(); } } });
        nav.before(toggle);
      }
    });
    ensureOdysxBar();
    document.querySelectorAll(".footbottom > span:first-child").forEach((element) => { element.textContent = "© 2026 Nahwerk Concierge"; });
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
  function activatePlanCards() {
    document.querySelectorAll("[data-plan-url]").forEach((card) => {
      if (card.dataset.planReady) return;
      card.dataset.planReady = "1";
      const open = () => { location.href = card.dataset.planUrl; };
      card.addEventListener("click", (event) => {
        if (event.target.closest("a,button,input,select,textarea,label")) return;
        open();
      });
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      });
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
  function decorateWhatsApp(root = document.body) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue.includes("WhatsApp")) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent || parent.closest("script,style,noscript,textarea,.whatsapp-label")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const parts = node.nodeValue.split("WhatsApp");
      if (parts.length < 2) return;
      const fragment = document.createDocumentFragment();
      parts.forEach((part, index) => {
        if (index) {
          const label = document.createElement("span");
          label.className = "whatsapp-label";
          label.innerHTML = '<img class="whatsapp-mark" src="assets/whatsapp-mark.svg?v=1" alt="" aria-hidden="true">WhatsApp';
          fragment.appendChild(label);
        }
        if (part) fragment.appendChild(document.createTextNode(part));
      });
      node.replaceWith(fragment);
    });
  }
  document.addEventListener("DOMContentLoaded", async () => {
    decorateWhatsApp();
    activatePlanCards();
    new MutationObserver((mutations) => {
      mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) decorateWhatsApp(node.parentElement);
        else if (node.nodeType === Node.ELEMENT_NODE && !node.matches(".whatsapp-label")) decorateWhatsApp(node);
      }));
    }).observe(document.body, { childList: true, subtree: true });
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
