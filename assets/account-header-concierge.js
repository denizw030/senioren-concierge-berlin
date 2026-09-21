(() => {
  "use strict";

  const PAYG_URL = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/web-payg";
  const SESSION_KEY = "scb_web_session";
  const source = document.getElementById("overviewConcierge");
  const nav = document.querySelector(".top .nav");
  if (!source || !nav) return;

  const sourceCard = source.closest(".account-overview-link");
  const link = document.createElement("a");
  link.id = "accountHeaderConcierge";
  link.className = "nw-header-concierge";
  link.href = "/web-concierge";
  link.hidden = true;
  link.innerHTML = '<span class="nw-header-concierge-avatar" aria-hidden="true"></span><span class="nw-header-concierge-copy"><small>Dein Concierge</small><strong></strong><span class="nw-header-concierge-payg" hidden>PAYG-Guthaben <b></b></span></span><span class="nw-header-concierge-chat" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 6.8A2.8 2.8 0 0 1 7.8 4h8.4A2.8 2.8 0 0 1 19 6.8v5.9a2.8 2.8 0 0 1-2.8 2.8h-4.7L7 19v-3.5A2.8 2.8 0 0 1 5 12.8Z"></path><path d="M9 9h6M9 12h4"></path></svg></span>';
  const links = nav.querySelector(".links");
  nav.insertBefore(link, links || null);

  const nameNode = link.querySelector(".nw-header-concierge-copy strong");
  const avatarNode = link.querySelector(".nw-header-concierge-avatar");
  const paygNode = link.querySelector(".nw-header-concierge-payg");
  const paygValueNode = paygNode.querySelector("b");
  let displayedName = "";
  let lastPaygLoad = 0;

  function readSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); }
    catch (_) { return null; }
  }

  function moneyFromCents(value, currency = "EUR") {
    return new Intl.NumberFormat("de-DE", { style:"currency", currency }).format(Number(value || 0) / 100);
  }

  async function syncPaygBalance(force = false) {
    if (!force && Date.now() - lastPaygLoad < 30000) return;
    const current = readSession();
    if (!current?.session_token || !current?.customer_account_id) {
      paygValueNode.textContent = "–";
      paygNode.hidden = false;
      return;
    }
    lastPaygLoad = Date.now();
    try {
      const response = await fetch(PAYG_URL, {
        method:"GET",
        headers:{ Authorization:`Bearer ${current.session_token}` },
        cache:"no-store",
        credentials:"omit"
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.ok === false || body?.environment === "STAGING") return;
      const wallet = body?.wallet || {};
      const value = moneyFromCents(Number.isFinite(Number(wallet.available_cents)) ? wallet.available_cents : 0, wallet.currency || "EUR");
      paygValueNode.textContent = value;
      paygNode.hidden = false;
      link.setAttribute("aria-label", `${displayedName} öffnen und chatten. PAYG-Guthaben ${value}`);
    } catch (_) {
      paygValueNode.textContent = "–";
      paygNode.hidden = false;
    }
  }

  function sync() {
    const central = source.dataset.personaSource === "central";
    const name = String(source.textContent || "").trim();
    const sourceAvatar = sourceCard?.querySelector("[data-overview-concierge-avatar]");
    const backgroundImage = String(sourceAvatar?.style?.backgroundImage || "").trim();

    if (!central || !name || name === "Concierge wird geladen …") {
      link.hidden = true;
      return false;
    }

    nameNode.textContent = name;
    displayedName = name;
    avatarNode.style.backgroundImage = backgroundImage && backgroundImage !== "none"
      ? backgroundImage
      : 'url("/assets/logos/NAHWERK-Goldmann-Logo.svg")';
    link.setAttribute("aria-label", name + " öffnen und chatten");
    link.title = "Mit " + name + " chatten";
    link.hidden = false;
    paygValueNode.textContent ||= "wird geladen …";
    paygNode.hidden = false;
    void syncPaygBalance();
    return true;
  }

  const observerTarget = sourceCard || source.parentElement || source;
  new MutationObserver(sync).observe(observerTarget, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["data-persona-source", "style"]
  });

  sync();
  window.addEventListener("pageshow", () => { sync(); void syncPaygBalance(true); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { sync(); void syncPaygBalance(); } });
})();
