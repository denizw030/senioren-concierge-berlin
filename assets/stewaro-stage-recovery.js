(() => {
  "use strict";
  // SOURCE-ONLY preview: deploy and enable only after exact STAGING Auth
  // redirect allowlist, recovery template, callback and rollback review.
  const HOST = "d2h3bbcracss71.cloudfront.net";
  const PATH = "/web-concierge/stage-password-reset.html";
  const STAGE_AUTH = "https://btqklftjmwtqqqdmwlnk.supabase.co/auth/v1/";
  const API_KEY = "sb_publishable_onbKIoe0eb9hgsYC2UeYzw_qttxclvj";
  if (location.protocol !== "https:" || location.hostname !== HOST ||
      location.pathname !== PATH) return;
  const form = document.getElementById("stageRecoveryForm");
  const result = document.getElementById("stageRecoveryStatus");
  const password = document.getElementById("stageNewPassword");
  const confirm = document.getElementById("stageConfirmPassword");
  const button = document.getElementById("stageSavePassword");
  if (!form || !result || !password || !confirm || !button) return;
  const params = new URLSearchParams(location.hash.slice(1));
  // In the implicit recovery flow credentials arrive only as a URL fragment.
  // Clear the fragment before making any request or showing a form.
  history.replaceState(null, "", location.pathname);
  let token = "";
  const report = value => { result.textContent = value; };
  const clear = () => {
    token = "";
    password.value = "";
    confirm.value = "";
    form.hidden = true;
  };
  if (params.get("type") !== "recovery" ||
      !params.get("access_token") ||
      !params.get("refresh_token") ||
      params.get("error")) {
    clear();
    report("Kein gültiger STAGING-Wiederherstellungslink. Bitte einen neuen anfordern.");
    return;
  }
  token = params.get("access_token");
  const call = async (method, endpoint, value) => {
    const response = await fetch(STAGE_AUTH + endpoint, {
      method,
      headers: {
        "apikey": API_KEY,
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json"
      },
      ...(value ? { body: JSON.stringify(value) } : {}),
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "no-referrer"
    });
    return response;
  };
  (async () => {
    try {
      const response = await call("GET", "user");
      const user = response.ok ? await response.json() : null;
      if (!user || typeof user.id !== "string" || !user.id) throw Error("invalid");
      form.hidden = false;
      report("STAGING-Identität bestätigt. Vergib jetzt ein neues Testpasswort.");
    } catch {
      clear();
      report("Wiederherstellungslink ungültig oder abgelaufen.");
    }
  })();
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!token || form.hidden) return;
    if (!form.reportValidity()) return;
    if (password.value !== confirm.value) {
      report("Die beiden Testpasswörter stimmen nicht überein.");
      return;
    }
    const newPassword = password.value;
    password.value = "";
    confirm.value = "";
    button.disabled = true;
    try {
      const response = await call("PUT", "user", { password: newPassword });
      if (!response.ok) throw Error("rejected");
      clear();
      report("STAGING-Testpasswort aktualisiert. Melde dich jetzt erneut an.");
    } catch {
      report("Änderung fehlgeschlagen. Bitte einen neuen Wiederherstellungslink anfordern.");
    } finally {
      button.disabled = false;
    }
  });
})();