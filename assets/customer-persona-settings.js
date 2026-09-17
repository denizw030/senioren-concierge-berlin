(() => {
  "use strict";

  const SESSION_KEY = "scb_web_session";
  const GATEWAY = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-web-gateway";
  let currentKey = "";
  let selectedKey = "";
  let personas = [];

  function sessionToken() {
    try { return String(JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null")?.session_token || ""); }
    catch { return ""; }
  }

  function cleanName(value, key) {
    const full = String(value || "").trim();
    return full.replace(/\s*[—–-]\s*NAHWERK Concierge\s*$/i, "").trim() || key;
  }

  function imageFor(key, raw) {
    const direct = [raw?.image_url, raw?.avatar_url, raw?.portrait_url, raw?.photo_url]
      .map((value) => String(value || "").trim()).find(Boolean);
    if (direct) {
      try {
        const url = new URL(direct, location.origin);
        if (url.origin === location.origin || url.protocol === "https:") return url.href;
      } catch {}
    }
    return `/assets/concierges/large/${encodeURIComponent(key)}.webp`;
  }

  async function request(path, { method = "GET", body = null } = {}) {
    const token = sessionToken();
    if (!token) throw new Error("session_required");
    const headers = { Authorization: `Bearer ${token}` };
    if (body !== null) headers["Content-Type"] = "application/json";
    const response = await fetch(`${GATEWAY}${path}`, {
      method,
      headers,
      body: body === null ? undefined : JSON.stringify(body),
      cache: "no-store",
      credentials: "omit"
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok !== true || payload?.environment !== "PROD" || payload?.authoritative !== true) {
      throw new Error(String(payload?.error || `http_${response.status}`));
    }
    return payload;
  }

  function status(text, type = "") {
    const node = document.getElementById("personaSettingsStatus");
    if (!node) return;
    node.textContent = text;
    node.dataset.state = type;
    node.hidden = !text;
  }

  function updateSave() {
    const button = document.getElementById("personaSettingsSave");
    if (!button) return;
    button.disabled = !selectedKey || selectedKey === currentKey;
  }

  function render() {
    const grid = document.getElementById("personaSettingsGrid");
    if (!grid) return;
    grid.replaceChildren();

    for (const raw of personas) {
      const key = String(raw?.persona_key || "").trim().toLowerCase();
      if (!/^[a-z0-9_-]{1,64}$/.test(key)) continue;
      const name = cleanName(raw?.display_name, key);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "persona-option";
      button.dataset.personaKey = key;
      button.setAttribute("aria-pressed", selectedKey === key ? "true" : "false");
      if (selectedKey === key) button.classList.add("is-selected");

      const image = document.createElement("span");
      image.className = "persona-option-image";
      image.style.backgroundImage = `url("${imageFor(key, raw).replaceAll('"', "%22")}")`;
      image.setAttribute("aria-hidden", "true");

      const copy = document.createElement("span");
      copy.className = "persona-option-copy";
      const title = document.createElement("strong");
      title.textContent = name;
      const meta = document.createElement("span");
      meta.textContent = raw?.telephone_approved === true
        ? "Für NAHWERK und Telefon freigegeben"
        : "Für NAHWERK freigegeben";
      copy.append(title, meta);

      const mark = document.createElement("span");
      mark.className = "persona-option-mark";
      mark.textContent = selectedKey === key ? "Ausgewählt" : "Auswählen";

      button.append(image, copy, mark);
      button.addEventListener("click", () => {
        selectedKey = key;
        render();
        updateSave();
        status(selectedKey === currentKey ? "Das ist dein aktueller Concierge." : "Auswahl geändert. Jetzt speichern.");
      });
      grid.appendChild(button);
    }
  }

  async function load() {
    status("Deine Concierge-Auswahl wird geladen …");
    const [me, list] = await Promise.all([request("/web/me"), request("/web/personas")]);
    const rawKey = [me?.persona?.persona_id, me?.persona?.persona_key, me?.persona?.key, me?.persona?.slug, me?.persona?.id]
      .map((value) => String(value || "").trim().toLowerCase()).find(Boolean) || "";
    currentKey = rawKey;
    selectedKey = rawKey;
    personas = Array.isArray(list?.personas) ? list.personas : [];
    render();
    updateSave();
    status(personas.length ? "Deine aktuelle Auswahl ist markiert." : "Aktuell sind keine Concierges zur Auswahl freigegeben.", personas.length ? "ready" : "error");
  }

  async function save() {
    if (!selectedKey || selectedKey === currentKey) return;
    const button = document.getElementById("personaSettingsSave");
    if (button) button.disabled = true;
    status("Auswahl wird gespeichert …");
    try {
      const result = await request("/web/persona", { method: "POST", body: { persona_key: selectedKey } });
      const saved = String(result?.persona?.persona_key || result?.persona_key || "").trim().toLowerCase();
      if (saved !== selectedKey) throw new Error("persona_confirmation_mismatch");
      currentKey = saved;
      selectedKey = saved;
      render();
      updateSave();
      status("Gespeichert. Deine Auswahl gilt automatisch für NAHWERK.", "success");
    } catch {
      status("Die Auswahl konnte gerade nicht gespeichert werden. Bitte versuche es erneut.", "error");
      updateSave();
    }
  }

  async function boot() {
    const valid = window.SCBAuth?.validateSession ? await window.SCBAuth.validateSession().catch(() => false) : false;
    if (!valid) { location.replace("/anmelden"); return; }
    document.getElementById("personaSettingsSave")?.addEventListener("click", () => { void save(); });
    document.getElementById("personaSettingsBack")?.addEventListener("click", () => { location.href = "/web-concierge"; });
    try { await load(); }
    catch { status("Deine Concierge-Auswahl ist momentan nicht verfügbar. Bitte versuche es erneut.", "error"); }
  }

  window.NAHWERKCustomerPersonaSettingsTestHooks = Object.freeze({ cleanName, imageFor, request });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else void boot();
})();
