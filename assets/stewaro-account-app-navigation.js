(() => {
  "use strict";
  // Domain-scoped account navigation only; never move sessions via URL/query.
  if (location.hostname !== "account.stewaro.com") return;
  // Both the shared auth loader and legacy page markup may load this helper.
  // Install navigation listeners exactly once; never create duplicate handoffs.
  if (document.__stewaroAccountAppNavigationV1) return;
  document.__stewaroAccountAppNavigationV1 = true;

  const SITE_ORIGIN = "https://stewaro.com";
  const APP_ORIGIN = "https://app.stewaro.com";
  const ACCOUNT_LOGIN = "/anmelden?produkt=senioren&next=app";
  const SESSION_KEY = "scb_web_session";
  const SESSION_URL = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/web-session-secure";
  const APP_PATH = "/web-concierge";
  let transferring = false;

  function storedSession() {
    for (const storage of [sessionStorage, localStorage]) {
      try {
        const session = JSON.parse(storage.getItem(SESSION_KEY) || "null");
        if (!session?.session_token) continue;
        if (storage === localStorage && session.remember_me !== true) continue;
        if (session.expires_at) {
          const expiration = new Date(session.expires_at).getTime();
          if (Number.isFinite(expiration) && expiration <= Date.now()) continue;
        }
        return session;
      } catch (_) {}
    }
    return null;
  }

  function appDestination(link) {
    try {
      const target = new URL(link.getAttribute("href") || "", location.href);
      if (![location.origin, APP_ORIGIN].includes(target.origin)) return false;
      return target.pathname === APP_PATH || target.pathname === APP_PATH + "/" || target.pathname === APP_PATH + ".html";
    } catch (_) {
      return false;
    }
  }

  function isSiteBrand(link) {
    return link.matches("header.top a.brand, footer a.brand, .stewaro-account-flow-brand, .stewaro-registration-brand");
  }

  function rewriteVisibleLinks() {
    document.querySelectorAll("header.top a.brand, footer a.brand, .stewaro-account-flow-brand, .stewaro-registration-brand").forEach((link) => {
      link.href = SITE_ORIGIN + "/de/";
    });
    document.querySelectorAll("a[href]").forEach((link) => {
      if (appDestination(link)) link.href = APP_ORIGIN + APP_PATH;
    });
  }

  function status(message) {
    let node = document.getElementById("stewaroAppNavigationStatus");
    if (!node) {
      node = document.createElement("p");
      node.id = "stewaroAppNavigationStatus";
      node.setAttribute("role", "status");
      node.setAttribute("aria-live", "polite");
      node.style.cssText = "position:fixed;left:16px;right:16px;bottom:18px;z-index:9999;max-width:540px;margin:auto;padding:14px 18px;border:1px solid rgba(167,124,41,.22);border-radius:15px;background:#f7f3eb;color:#173126;box-shadow:0 12px 35px rgba(0,0,0,.12);font-size:14px;line-height:1.45";
      document.body.appendChild(node);
    }
    node.textContent = message;
  }

  function validatedHandoffUrl(value) {
    let dest;
    try { dest = new URL(String(value || "")); } catch (_) { return null; }
    if (dest.origin !== APP_ORIGIN || dest.pathname !== "/" || dest.search) return null;
    if (!/^#handoff=hnd_[A-Za-z0-9_-]{40,120}$/.test(dest.hash)) return null;
    return dest.href;
  }

  async function openFidel() {
    if (transferring) return;
    const session = storedSession();
    if (!session) {
      location.replace(ACCOUNT_LOGIN);
      return;
    }
    transferring = true;
    status("Die sichere Verbindung zu FIDEL wird hergestellt …");
    try {
      const response = await fetch(SESSION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.session_token },
        body: JSON.stringify({ action: "handoff_create", target: "app" }),
        credentials: "omit",
        cache: "no-store",
        signal: AbortSignal.timeout(12000)
      });
      const body = await response.json().catch(() => ({}));
      const destination = validatedHandoffUrl(body?.target_url);
      if (!response.ok || body?.ok !== true || body?.status !== "handoff_ready" || !destination) {
        throw new Error("handoff_unavailable");
      }
      // One-time token remains a URL fragment, never a query parameter or log.
      location.assign(destination);
    } catch (_) {
      status("FIDEL konnte nicht sicher geöffnet werden. Bitte versuche es erneut. Dein Konto bleibt angemeldet.");
    } finally {
      transferring = false;
    }
  }

  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button > 0) return;
    const link = event.target?.closest?.("a[href]");
    if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
    if (isSiteBrand(link)) {
      event.preventDefault();
      location.assign(SITE_ORIGIN + "/de/");
      return;
    }
    if (!appDestination(link)) return;
    event.preventDefault();
    void openFidel();
  }, true);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", rewriteVisibleLinks, { once: true });
  else rewriteVisibleLinks();

  const path = location.pathname.replace(/\/index\.html$/, "/").replace(/\/+$/, "") || "/";
  if (path === "/konto" && new URLSearchParams(location.search).get("stewaro_app") === "1") {
    void openFidel();
  }
})();
