(() => {
  "use strict";

  const CHAT_URL = "/web-concierge";
  const SESSION_KEY = "scb_web_session";
  const LEGACY_ONBOARDING_KEY = "scb_onboarding";
  const GATEWAY_ENDPOINT = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-web-gateway";
  const selector = '[data-account-tab="concierge"],[data-open-account-tab="concierge"]';

  function session() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); }
    catch (_) { return null; }
  }

  function clearLegacyConciergeChoice() {
    try {
      const raw = localStorage.getItem(LEGACY_ONBOARDING_KEY);
      if (!raw) return;
      const value = JSON.parse(raw);
      if (!value || typeof value !== "object" || Array.isArray(value)) return;
      let changed = false;
      for (const key of ["conciergeChoice", "concierge_choice"]) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          delete value[key];
          changed = true;
        }
      }
      if (changed) localStorage.setItem(LEGACY_ONBOARDING_KEY, JSON.stringify(value));
    } catch (_) {}
  }

  function normalizePersona(raw) {
    if (!raw || typeof raw !== "object") return null;
    const rawKey = [raw.persona_id, raw.persona_key, raw.key, raw.slug, raw.id, raw.code]
      .map((value) => String(value || "").trim().toLowerCase())
      .find(Boolean) || "";
    if (!/^[a-z0-9_-]{1,64}$/.test(rawKey)) return null;
    const name = [raw.display_name, raw.name, raw.persona_name, raw.label]
      .map((value) => String(value || "").trim())
      .find(Boolean) || rawKey.charAt(0).toUpperCase() + rawKey.slice(1);
    const directImage = [raw.image_url, raw.avatar_url, raw.portrait_url, raw.photo_url, raw.image, raw.avatar, raw.portrait]
      .map((value) => String(value || "").trim())
      .find(Boolean) || "";
    let image = `/assets/concierges/large/${encodeURIComponent(rawKey)}.webp`;
    if (directImage) {
      try {
        const url = new URL(directImage, location.origin);
        if (url.origin === location.origin || url.protocol === "https:") image = url.href;
      } catch (_) {}
    }
    return { key: rawKey, name, image };
  }

  function renderOverviewPersona(raw) {
    const target = document.getElementById("overviewConcierge");
    if (!target) return null;
    const persona = normalizePersona(raw);
    const button = target.closest(".account-overview-link");
    target.textContent = persona?.name || "Concierge wird geladen …";
    target.dataset.personaSource = persona ? "central" : "pending";

    let avatar = button?.querySelector("[data-overview-concierge-avatar]");
    if (!avatar && button) {
      avatar = document.createElement("span");
      avatar.dataset.overviewConciergeAvatar = "true";
      avatar.setAttribute("aria-hidden", "true");
      avatar.style.cssText = "width:38px;height:38px;border-radius:50%;display:block;margin:8px 0 7px;background-position:center top;background-size:cover;border:1px solid rgba(212,175,55,.25);box-shadow:0 8px 24px rgba(0,0,0,.22)";
      target.before(avatar);
    }
    if (avatar) {
      avatar.style.display = persona ? "block" : "none";
      avatar.style.backgroundImage = persona ? `url(\"${persona.image.replaceAll('"', "%22")}\")` : "none";
    }
    return persona;
  }

  async function syncOverviewPersona() {
    clearLegacyConciergeChoice();
    if (!document.getElementById("overviewConcierge")) return false;
    renderOverviewPersona(null);
    const current = session();
    if (!current?.session_token) return false;
    try {
      const response = await fetch(`${GATEWAY_ENDPOINT}/web/me`, {
        method: "GET",
        headers: { Authorization: `Bearer ${current.session_token}` },
        cache: "no-store",
        credentials: "omit"
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.ok !== true || body?.environment !== "PROD" || body?.authoritative !== true) return false;
      return !!renderOverviewPersona(body.persona);
    } catch (_) {
      return false;
    }
  }

  function openMainConcierge(event) {
    const target = event.target instanceof Element ? event.target.closest(selector) : null;
    if (!target) return;
    if (target.id === "accountTabConcierge" && document.getElementById("conciergeQuickMenu")) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    location.href = CHAT_URL;
  }

  document.addEventListener("click", openMainConcierge, true);

  function redirectDirectConciergeEntry() {
    const params = new URLSearchParams(location.search);
    if (location.hash.toLowerCase() === "#concierge" || params.get("tab")?.toLowerCase() === "concierge") {
      location.replace(CHAT_URL);
      return;
    }
    void syncOverviewPersona();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", redirectDirectConciergeEntry, { once:true });
  else redirectDirectConciergeEntry();

  window.addEventListener("pageshow", () => { void syncOverviewPersona(); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) void syncOverviewPersona(); });

  window.NAHWERKWebChatUI = Object.freeze({
    isEnabled: () => false,
    isTransportEnabled: () => false,
    mount: () => null,
    syncOverviewPersona,
    normalizePersona,
    openMainConcierge: () => { location.href = CHAT_URL; }
  });
})();
