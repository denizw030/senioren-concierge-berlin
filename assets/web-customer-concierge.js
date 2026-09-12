(() => {
  "use strict";
  const SESSION_KEY = "scb_web_session";

  function sessionToken() {
    try { return String(JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null")?.session_token || ""); }
    catch { return ""; }
  }

  function configuredEndpoint() {
    const raw = String(window.NAHWERK_WEB_CONCIERGE_PROD_ENDPOINT || "").trim();
    if (!raw) return null;
    try {
      const url = new URL(raw);
      if (url.protocol !== "https:") return null;
      if (url.hostname !== "djicahhmnnamtjuqedqd.supabase.co") return null;
      if (!url.pathname.startsWith("/functions/v1/")) return null;
      if (/staging|shadow/i.test(url.href)) return null;
      return url.href;
    } catch { return null; }
  }

  async function boot() {
    const valid = window.SCBAuth?.validateSession
      ? await window.SCBAuth.validateSession().catch(() => false)
      : Boolean(sessionToken());
    if (!valid) { location.replace("anmelden.html"); return; }

    const status = document.getElementById("webConciergeStatus");
    const title = document.getElementById("webConciergeStateTitle");
    const meta = document.getElementById("webConciergeStateMeta");
    const input = document.getElementById("webConciergeInput");
    const send = document.getElementById("webConciergeSend");
    const endpoint = configuredEndpoint();
    const contractVersion = String(window.NAHWERK_WEB_CONCIERGE_CLIENT_CONTRACT || "").trim();
    const ready = Boolean(endpoint && contractVersion);

    status.textContent = ready ? "PROD-Vertrag erkannt" : "Noch nicht freigegeben";
    title.textContent = ready ? "Web-Concierge wird verbunden" : "Web-Concierge noch nicht verfügbar";
    meta.textContent = ready
      ? "Der PROD-Endpunkt ist konfiguriert. Die Oberfläche bleibt bis zur implementierten kanonischen Client-Version gesperrt, damit keine Nachrichten mit einem erfundenen Schema gesendet werden."
      : "Dein Kundenkonto ist bereit. Für echte Concierge-Nachrichten fehlt noch der browserfähige PROD-Gateway-Vertrag des zentralen NAHWERK Core.";

    // URL + Versionsname reichen absichtlich nicht zum Senden. Erst wenn der
    // kanonische Request-/Response-Vertrag veröffentlicht ist, darf die
    // Website eine Nachricht erzeugen. Bis dahin gibt es keinen Netzwerkcall.
    input.disabled = true;
    send.disabled = true;
  }

  window.NAHWERKWebCustomerConciergeTestHooks = Object.freeze({ configuredEndpoint, sessionToken });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
