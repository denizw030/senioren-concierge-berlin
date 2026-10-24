(() => {
  "use strict";

  const APP_HOST = "app.stewaro.com";
  if (location.origin !== "https://app.stewaro.com" || document.documentElement.dataset.stewaroApp !== "1") return;

  const SESSION_KEY = "scb_web_session";
  const PROFILE_URL = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/web-profile";
  const SAFETY_URL = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/web-managed-safety-context";
  const SESSION_URL = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/web-session-secure";
  const LIVE_URL = "https://ta832v8wah.execute-api.eu-central-1.amazonaws.com/prod/v1/web/live";
  const ACCOUNT_ORIGIN = "https://account.stewaro.com";
  const LOGIN_URL = ACCOUNT_ORIGIN + "/anmelden?produkt=senioren&next=app";

  const state = { profile: null, safety: null, currentTab: "overview", fidelVoice: null };
  let logoutInProgress = false;
  let safetyAlertActive = false;
  let safetyRequestGeneration = 0;
  let profileRequestGeneration = 0;
  let voicePreferenceRequestGeneration = 0;
  let voiceSaveInProgress = false;

  // Async account data may only be rendered for its initiating identity.
  function sessionStillCurrent(bearer) {
    return !logoutInProgress && Boolean(bearer) && token() === bearer;
  }

  function session() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); }
    catch (_) { return null; }
  }
  function token() { return String(session()?.session_token || ""); }
  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  }
  function formatCount(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed.toLocaleString("de-DE") : null;
  }
  function maskPhone(value) {
    const raw = String(value || "").replace(/^whatsapp:/i, "").trim();
    if (!raw) return "";
    if (raw.length <= 7) return raw;
    return raw.slice(0, 4) + " … " + raw.slice(-4);
  }

  function selectTab(name, { focus = false } = {}) {
    const next = ["overview", "fidel", "safety", "more"].includes(name) ? name : "overview";
    if (next !== "safety" && safetyAlertActive) {
      safetyAlertActive = false;
      safetyRequestGeneration += 1;
    }
    state.currentTab = next;
    document.querySelectorAll("[data-stewaro-app-panel]").forEach((panel) => {
      const active = panel.getAttribute("data-stewaro-app-panel") === next;
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
    });
    document.querySelectorAll("[data-stewaro-app-tab]").forEach((button) => {
      const active = button.getAttribute("data-stewaro-app-tab") === next;
      button.setAttribute("aria-selected", active ? "true" : "false");
      button.tabIndex = active ? 0 : -1;
    });
    const content = document.getElementById("stewaroAppContent");
    if (content) content.scrollTop = 0;
    if (focus) document.querySelector('[data-stewaro-app-tab="' + CSS.escape(next) + '"]')?.focus();
    if (next === "safety") void loadSafety();
  }

  function setConnection(kind, label) {
    const node = document.getElementById("stewaroAppConnection");
    if (!node) return;
    node.classList.toggle("is-online", kind === "online");
    node.classList.toggle("is-error", kind === "error");
    const text = node.querySelector("[data-connection-label]");
    if (text) text.textContent = label;
  }

  // One observer per active chat status node. Online labels must never mask device offline state.
  let chatStatusObserver = null;
  let chatStatusSource = null;
  function syncConnectionFromChat() {
    if (logoutInProgress) return;
    const source = document.getElementById("webConciergeStatus");
    if (source !== chatStatusSource) {
      chatStatusObserver?.disconnect();
      chatStatusObserver = null;
      chatStatusSource = source;
      if (source) {
        chatStatusObserver = new MutationObserver(syncConnectionFromChat);
        chatStatusObserver.observe(source, { childList: true, characterData: true, subtree: true, attributes: true });
      }
    }
    if (!navigator.onLine) {
      setConnection("error", "Offline");
      return;
    }
    if (!source) return;
    const label = String(source.textContent || "").trim();
    if (source.classList.contains("is-online") || /^online$/i.test(label)) {
      setConnection("online", "FIDEL verbunden");
    } else if (/nicht möglich|fehler|fehlgeschlagen|gescheitert|offline/i.test(label)) {
      setConnection("error", "Verbindung gestört");
    } else {
      setConnection("pending", label || "Verbindung wird hergestellt");
    }
  }

  function renderUsage(plan, usage) {
    const appLimit = formatCount(plan?.app_dialogue_limit);
    const appUsed = formatCount(usage?.app_dialogues_used);
    const waLimit = formatCount(plan?.whatsapp_dialogue_limit);
    const waUsed = formatCount(usage?.whatsapp_dialogues_used);
    const planCode = String(plan?.code || "").replace(/_/g, " ").trim();

    if (appLimit !== null && appUsed !== null) {
      const remaining = Math.max(0, Number(plan.app_dialogue_limit) - Number(usage.app_dialogues_used));
      setText("stewaroAppUsage", remaining.toLocaleString("de-DE") + " App-Dialoge übrig");
      setText("stewaroAppUsageMeta", appUsed + " von " + appLimit + " genutzt" + (planCode ? " · " + planCode : ""));
    } else if (appLimit !== null) {
      setText("stewaroAppUsage", appLimit + " App-Dialoge im Tarif");
      setText("stewaroAppUsageMeta", "Aktueller Verbrauch ist gerade nicht verfügbar.");
    } else {
      setText("stewaroAppUsage", "Nutzung nicht verfügbar");
      setText("stewaroAppUsageMeta", "Es werden keine Werte geschätzt.");
    }

    if (waLimit !== null && waUsed !== null) {
      const remaining = Math.max(0, Number(plan.whatsapp_dialogue_limit) - Number(usage.whatsapp_dialogues_used));
      setText("stewaroAppWhatsappMeta", remaining.toLocaleString("de-DE") + " von " + waLimit + " Dialogen übrig");
    } else {
      setText("stewaroAppWhatsappMeta", "Verbrauch im Account einsehen.");
    }
  }

  function renderProfile(body) {
    state.profile = body;
    const profile = body?.profile || {};
    const firstName = String(profile.first_name || session()?.first_name || "").trim();
    setText("stewaroAppGreeting", firstName ? "Guten Tag, " + firstName + "." : "Guten Tag.");
    setText("stewaroAppEmail", profile.email ? String(profile.email) : "Nicht verbunden");
    setText("stewaroAppEmailMeta", profile.email ? "Mit diesem STEWARO-Konto verknüpft." : "Im Account verbinden.");
    const whatsapp = maskPhone(profile.whatsapp_number);
    setText("stewaroAppWhatsapp", whatsapp || "Nicht verbunden");
    if (!whatsapp) setText("stewaroAppWhatsappMeta", "Im Account verbinden.");
    renderUsage(body?.plan || null, body?.usage || null);
  }

  async function loadProfile() {
    if (logoutInProgress) return false;
    const generation = ++profileRequestGeneration;
    const bearer = token();
    if (!bearer) return false;
    try {
      const response = await fetch(PROFILE_URL, {
        method: "GET",
        headers: { Authorization: "Bearer " + bearer },
        cache: "no-store",
        signal: AbortSignal.timeout(9000)
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.ok !== true) throw new Error("profile_unavailable");
      if (!sessionStillCurrent(bearer) || generation !== profileRequestGeneration) return false;
      renderProfile(body);
      document.getElementById("stewaroAppDataNotice")?.setAttribute("hidden", "");
      return true;
    } catch (_) {
      if (!sessionStillCurrent(bearer) || generation !== profileRequestGeneration) return false;
      const notice = document.getElementById("stewaroAppDataNotice");
      if (notice) {
        notice.hidden = false;
        notice.textContent = navigator.onLine
          ? "Einige Kontodaten konnten gerade nicht geladen werden. Es werden keine Werte geschätzt."
          : "Du bist offline. Kontodaten werden wieder geladen, sobald eine Verbindung besteht.";
      }
      return false;
    }
  }


  const FIDEL_VOICE_LABELS = Object.freeze({
    fidel_souveraen:{name:"FIDEL Souverän",description:"Tief, markant und sehr präsent."},
    fidel_klar:{name:"FIDEL Klar",description:"Ruhig, klar und klassisch männlich."},
    fidel_warm:{name:"FIDEL Warm",description:"Warm, weich und weiblich."}
  });

  async function liveVoiceRequest(path,{method="GET",body=null}={}) {
    const bearer=token();
    if(!bearer)throw new Error("session_required");
    const response=await fetch(LIVE_URL+path,{
      method,
      headers:{Authorization:"Bearer "+bearer,...(body?{"Content-Type":"application/json"}:{})},
      body:body?JSON.stringify(body):undefined,
      cache:"no-store",
      signal:AbortSignal.timeout(9000)
    });
    const payload=await response.json().catch(()=>({}));
    if(!response.ok||payload?.ok!==true)throw new Error(String(payload?.error||"voice_unavailable"));
    return payload;
  }

  function mountFidelVoiceSelector() {
    const host=document.querySelector(".stewaro-app-more");
    if(!host||document.getElementById("stewaroFidelVoiceSetting"))return;
    const section=document.createElement("section");
    section.id="stewaroFidelVoiceSetting";
    section.className="stewaro-fidel-voice-setting";
    section.setAttribute("aria-labelledby","stewaroFidelVoiceTitle");
    section.innerHTML=`
      <div class="stewaro-fidel-voice-head">
        <span class="stewaro-app-more-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 10v4M9 7v10M13 5v14M17 8v8M21 10v4"></path></svg></span>
        <span class="stewaro-app-more-copy"><strong id="stewaroFidelVoiceTitle">FIDEL Stimme</strong><span>Wähle den Klang von FIDEL. Name und Persönlichkeit bleiben gleich.</span></span>
      </div>
      <div class="stewaro-fidel-voice-options" role="radiogroup" aria-labelledby="stewaroFidelVoiceTitle">
        ${Object.entries(FIDEL_VOICE_LABELS).map(([key,value])=>`
          <label class="stewaro-fidel-voice-option">
            <input type="radio" name="stewaroFidelVoice" value="${key}">
            <span><strong>${value.name}</strong><small>${value.description}</small></span>
          </label>`).join("")}
      </div>
      <p class="stewaro-fidel-voice-status" id="stewaroFidelVoiceStatus" aria-live="polite">Stimme wird geladen …</p>`;
    host.insertBefore(section,host.lastElementChild);
    section.querySelectorAll('input[name="stewaroFidelVoice"]').forEach((input)=>{
      input.addEventListener("change",async()=>{
        if(!input.checked || voiceSaveInProgress)return;
        const bearer=token();
        if(!sessionStillCurrent(bearer))return;
        // The pending write owns the voice UI; background refresh cannot replace it.
        voiceSaveInProgress=true;
        voicePreferenceRequestGeneration += 1;
        let reloadAfterFailure=false;
        const all=[...section.querySelectorAll('input[name="stewaroFidelVoice"]')];
        all.forEach(x=>x.disabled=true);
        setText("stewaroFidelVoiceStatus","Stimme wird gespeichert …");
        try{
          const result=await liveVoiceRequest("/voice-preference",{method:"POST",body:{voice_variant:input.value}});
          if(!sessionStillCurrent(bearer))return;
          state.fidelVoice=String(result.selected||input.value);
          setText("stewaroFidelVoiceStatus",(FIDEL_VOICE_LABELS[state.fidelVoice]?.name||"FIDEL")+" ist ausgewählt.");
        }catch{
          if(!sessionStillCurrent(bearer))return;
          setText("stewaroFidelVoiceStatus","Die Stimme konnte gerade nicht gespeichert werden.");
          reloadAfterFailure=true;
        }finally{
          voiceSaveInProgress=false;
          if(sessionStillCurrent(bearer)){
            all.forEach(x=>x.disabled=false);
            if(reloadAfterFailure)void loadFidelVoicePreference();
          }
        }
      });
    });
  }

  async function loadFidelVoicePreference() {
    if (logoutInProgress || voiceSaveInProgress) return false;
    const generation = ++voicePreferenceRequestGeneration;
    const bearer = token();
    if (!bearer) return false;
    mountFidelVoiceSelector();
    try{
      const result=await liveVoiceRequest("/voice-options");
      if (!sessionStillCurrent(bearer) || generation !== voicePreferenceRequestGeneration) return false;
      const selected=String(result.selected||"fidel_souveraen");
      state.fidelVoice=selected;
      const input=document.querySelector('input[name="stewaroFidelVoice"][value="'+CSS.escape(selected)+'"]');
      if(input)input.checked=true;
      setText("stewaroFidelVoiceStatus",(FIDEL_VOICE_LABELS[selected]?.name||"FIDEL")+" ist ausgewählt.");
      return true;
    }catch{
      if (!sessionStillCurrent(bearer) || generation !== voicePreferenceRequestGeneration) return false;
      setText("stewaroFidelVoiceStatus","Stimmenauswahl ist gerade nicht verfügbar.");
      return false;
    }
  }

  function showSafetyState(name) {
    document.querySelectorAll("[data-stewaro-safety-state]").forEach((node) => {
      node.hidden = node.getAttribute("data-stewaro-safety-state") !== name;
    });
  }

  function renderSafety(body) {
    state.safety = body;
    const safety = body?.safety || {};
    const enabled = safety.enabled === true;
    const next = safety.next_checkin_at ? new Date(safety.next_checkin_at) : null;
    const nextText = next && !Number.isNaN(next.getTime())
      ? next.toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })
      : "";
    setText("stewaroAppSafety", enabled ? "Schutz aktiv" : "Schutz einrichten");
    setText("stewaroAppSafetyMeta", enabled
      ? (nextText ? "Nächste Sicherheitsabfrage: " + nextText : "Sicherheitsfunktionen sind aktiviert.")
      : "Sicherheitsfunktionen sind noch nicht aktiviert.");
    setText("stewaroSafetyActiveNext", nextText || "Aktiv");
    const contacts = Array.isArray(safety.contacts) ? safety.contacts.filter(Boolean).length : 0;
    setText("stewaroSafetyActiveContacts", contacts
      ? contacts + " Sicherheitskontakt" + (contacts === 1 ? "" : "e") + " hinterlegt"
      : "Keine Sicherheitskontakte hinterlegt");
    showSafetyState(enabled ? "active" : "setup");
    const notice = document.getElementById("stewaroSafetyUnavailable");
    if (notice) notice.hidden = true;
  }

  async function loadSafety() {
    // A phishing warning takes precedence over stale or concurrent safety-status reads.
    if (safetyAlertActive || logoutInProgress) return false;
    const requestGeneration = ++safetyRequestGeneration;
    const bearer = token();
    if (!bearer) return false;
    try {
      const response = await fetch(SAFETY_URL, {
        method: "GET",
        headers: { Authorization: "Bearer " + bearer },
        cache: "no-store",
        signal: AbortSignal.timeout(7000)
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.ok !== true) throw new Error("safety_unavailable");
      if (safetyAlertActive || logoutInProgress || requestGeneration !== safetyRequestGeneration || !sessionStillCurrent(bearer)) return false;
      renderSafety(body);
      return true;
    } catch (_) {
      if (safetyAlertActive || logoutInProgress || requestGeneration !== safetyRequestGeneration || !sessionStillCurrent(bearer)) return false;
      setText("stewaroAppSafety", "Status nicht verfügbar");
      setText("stewaroAppSafetyMeta", "Sicherheitsstatus konnte gerade nicht geladen werden.");
      const notice = document.getElementById("stewaroSafetyUnavailable");
      if (notice) {
        notice.hidden = false;
        notice.textContent = "Der aktuelle Sicherheitsstatus ist nicht erreichbar. STEWARO zeigt deshalb keinen geschätzten Schutzstatus an.";
      }
      return false;
    }
  }

  function showSafetyAlert(detail = {}) {
    safetyAlertActive = true;
    safetyRequestGeneration += 1;
    const host = String(detail.host || detail.hostname || "").trim();
    const reason = String(detail.reason || "").trim();
    setText("stewaroSafetyBlockedHost", host || "Verdächtiger Link");
    setText("stewaroSafetyBlockedReason", reason || "Der Link weist Merkmale eines möglichen Betrugsversuchs auf.");
    showSafetyState("blocked");
    setText("stewaroAppSafety", "Verdächtiger Link blockiert");
    setText("stewaroAppSafetyMeta", "FIDEL kann dir helfen, den Hinweis einzuordnen.");
    selectTab("safety");
  }

  function prepareFidelSafetyQuestion() {
    selectTab("fidel");
    const input = document.getElementById("webConciergeInput");
    if (input instanceof HTMLTextAreaElement && !input.value.trim()) {
      input.value = "Ich möchte einen verdächtigen Link prüfen lassen.";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.focus();
    }
  }

  async function logout() {
    if (logoutInProgress) return;
    logoutInProgress = true;
    profileRequestGeneration += 1;
    voicePreferenceRequestGeneration += 1;
    safetyRequestGeneration += 1;
    const bearer = token();
    // Revoke local access and conceal personal content BEFORE waiting for the network.
    try { sessionStorage.removeItem(SESSION_KEY); } catch (_) {}
    try { localStorage.removeItem(SESSION_KEY); } catch (_) {}
    const shell = document.getElementById("stewaroAppShell");
    if (shell) shell.hidden = true;
    window.STEWARO_APP_AUTH_READY = Promise.resolve(false);
    if (bearer) {
      try {
        await fetch(SESSION_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + bearer },
          body: JSON.stringify({ action: "logout" }),
          cache: "no-store",
          signal: AbortSignal.timeout(6000)
        });
      } catch (_) {}
    }
    location.replace(LOGIN_URL);
  }

  // The FIDEL phone execution view belongs in the authenticated App, not Account settings.
  // This link is only mounted after the existing App handoff/session boot succeeds.
  function mountOutboundMissionEntry() {
    const settingsLink = document.querySelector(
      '.stewaro-app-card a[href="https://account.stewaro.com/telefonannahme"]'
    );
    if (!settingsLink || document.getElementById("stewaroAppOutboundMissionEntry")) return;
    const link = document.createElement("a");
    link.id = "stewaroAppOutboundMissionEntry";
    link.className = "stewaro-app-card-link";
    link.href = "/telefonate/ausgehend/";
    link.textContent = "Telefonaufträge live verfolgen →";
    settingsLink.parentElement.insertBefore(link, settingsLink);
  }

  function bindNavigation() {
    document.querySelectorAll("[data-stewaro-app-tab]").forEach((button) => {
      button.addEventListener("click", () => selectTab(button.getAttribute("data-stewaro-app-tab"), { focus: true }));
    });
    document.querySelectorAll("[data-stewaro-open-tab]").forEach((button) => {
      button.addEventListener("click", () => selectTab(button.getAttribute("data-stewaro-open-tab")));
    });
    document.getElementById("stewaroSafetyAskFidel")?.addEventListener("click", prepareFidelSafetyQuestion);
    document.getElementById("stewaroAppLogout")?.addEventListener("click", logout);
    mountFidelVoiceSelector();
    document.getElementById("stewaroAppRetryData")?.addEventListener("click", () => {
      void Promise.allSettled([loadProfile(), loadSafety(), loadFidelVoicePreference()]);
    });
  }

  // STEWARO_APP_TODAY_SHORTCUTS_V1
  // Presentation-only, account-gated shortcuts. Never sends a request, starts a call,
  // writes a task, or infers a status. Existing FIDEL chat retains all authority.
  const TODAY_INTENTS = Object.freeze({
    appointment: "FIDEL, bitte hilf mir dabei, einen Termin zu organisieren. Frag mich zuerst nach den nötigen Angaben.",
    reminder: "FIDEL, bitte hilf mir, eine Erinnerung einzurichten. Frag mich nach dem genauen Zeitpunkt und woran du mich erinnern sollst.",
    document: "FIDEL, ich möchte einen Brief oder ein Dokument verstehen. Erkläre mir, wie ich es dir sicher zeigen kann.",
    tasks: "FIDEL, zeig mir bitte den belegten aktuellen Stand meiner Aufträge und offenen Erledigungen. Wenn Informationen fehlen, sag mir das ausdrücklich."
  });

  function todayChatNotice(message) {
    const mount = document.getElementById("stewaroAppFidelMount");
    if (!mount) return;
    let notice = document.getElementById("stewaroAppTodayChatNotice");
    if (!notice) {
      notice = document.createElement("p");
      notice.id = "stewaroAppTodayChatNotice";
      notice.className = "stewaro-app-today-chat-notice";
      notice.setAttribute("role", "status");
      notice.setAttribute("aria-live", "polite");
      mount.prepend(notice);
    }
    notice.textContent = message;
    notice.hidden = !message;
  }

  function openTodayAction(intent) {
    if (!Object.hasOwn(TODAY_INTENTS, intent)) return;
    selectTab("fidel");
    const input = document.getElementById("webConciergeInput");
    if (!(input instanceof HTMLTextAreaElement) || input.disabled) {
      todayChatNotice("FIDEL verbindet sich noch. Bitte warte kurz und wähle die Aktion erneut.");
      return;
    }
    if (input.value.trim()) {
      todayChatNotice("Dein bisheriger Text bleibt erhalten. Du kannst ihn zuerst senden oder bearbeiten.");
      input.focus();
      return;
    }
    todayChatNotice("");
    input.value = TODAY_INTENTS[intent];
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus();
  }

  function mountTodayShortcuts() {
    const overview = document.querySelector('[data-stewaro-app-panel="overview"]');
    const hero = overview?.querySelector(".stewaro-app-hero-card");
    if (!hero || document.getElementById("stewaroAppToday")) return;
    const section = document.createElement("section");
    section.id = "stewaroAppToday";
    section.className = "stewaro-app-today";
    section.setAttribute("aria-labelledby", "stewaroAppTodayTitle");
    // Static, trusted UI copy only. No profile, task, or provider data is interpolated.
    section.innerHTML = `
      <div class="stewaro-app-today-heading">
        <div>
          <p class="stewaro-app-kicker">DEIN ALLTAG · MIT FIDEL</p>
          <h2 id="stewaroAppTodayTitle">Was steht heute an?</h2>
          <p>Einfach sagen, was du brauchst. FIDEL hilft dir beim nächsten Schritt.</p>
        </div>
        <button class="stewaro-app-today-history" type="button" data-stewaro-today-open="fidel">
          Chatverlauf öffnen <span aria-hidden="true">→</span>
        </button>
      </div>
      <div class="stewaro-app-today-actions" aria-label="Fidel um Unterstützung bitten">
        <button type="button" class="stewaro-app-today-action" data-stewaro-today-action="appointment"><span class="stewaro-app-today-action-icon" aria-hidden="true">01</span><span><strong>Termin organisieren</strong><small>Arzt, Behörde oder Alltag</small></span><span aria-hidden="true" class="stewaro-app-today-arrow">↗</span></button>
        <button type="button" class="stewaro-app-today-action" data-stewaro-today-action="reminder"><span class="stewaro-app-today-action-icon" aria-hidden="true">02</span><span><strong>Erinnerung erstellen</strong><small>Wichtiges im Blick behalten</small></span><span aria-hidden="true" class="stewaro-app-today-arrow">↗</span></button>
        <button type="button" class="stewaro-app-today-action" data-stewaro-today-action="document"><span class="stewaro-app-today-action-icon" aria-hidden="true">03</span><span><strong>Brief verstehen</strong><small>Gemeinsam Klarheit schaffen</small></span><span aria-hidden="true" class="stewaro-app-today-arrow">↗</span></button>
        <button type="button" class="stewaro-app-today-action" data-stewaro-today-action="tasks"><span class="stewaro-app-today-action-icon" aria-hidden="true">04</span><span><strong>Aufträge prüfen</strong><small>Nach dem aktuellen Stand fragen</small></span><span aria-hidden="true" class="stewaro-app-today-arrow">↗</span></button>
      </div>
      <p class="stewaro-app-today-footnote">Die Auswahl öffnet nur einen bearbeitbaren Entwurf im FIDEL-Chat. Es wird noch nichts gesendet, bestellt oder angerufen. Auftragsstände werden nicht geschätzt.</p>
    `;
    hero.insertAdjacentElement("afterend", section);
    section.querySelectorAll("[data-stewaro-today-action]").forEach((button) => {
      button.addEventListener("click", () => openTodayAction(button.getAttribute("data-stewaro-today-action")));
    });
    section.querySelectorAll("[data-stewaro-today-open]").forEach((button) => {
      button.addEventListener("click", () => { todayChatNotice(""); selectTab("fidel"); });
    });
  }

  function mountExistingFidel() {
    const workspace = document.querySelector(".web-concierge-shell > .web-concierge-workspace");
    const mount = document.getElementById("stewaroAppFidelMount");
    if (workspace && mount && workspace.parentElement !== mount) mount.appendChild(workspace);
  }

  function bindNetworkState() {
    const apply = () => {
      if (!navigator.onLine) setConnection("error", "Offline");
      else syncConnectionFromChat();
    };
    addEventListener("offline", apply);
    addEventListener("online", () => {
      setConnection("pending", "Verbindung wird hergestellt");
      void Promise.allSettled([loadProfile(), loadSafety(), loadFidelVoicePreference()]);
      syncConnectionFromChat();
    });
    apply();
  }

  async function boot() {
    // Missing or failed authentication gate must never mount the App shell.
    if (!window.STEWARO_APP_AUTH_READY || await window.STEWARO_APP_AUTH_READY !== true || logoutInProgress) return;
    const shell = document.getElementById("stewaroAppShell");
    if (!shell) return;
    shell.hidden = false;
    mountExistingFidel();
    mountTodayShortcuts();
    bindNavigation();
    mountOutboundMissionEntry();
    selectTab("overview");
    syncConnectionFromChat();
    bindNetworkState();
    window.addEventListener("stewaro:safety-link-blocked", (event) => showSafetyAlert(event?.detail || {}));
    void Promise.allSettled([loadProfile(), loadSafety(), loadFidelVoicePreference()]);
  }

  window.STEWAROAppShell = Object.freeze({
    selectTab,
    refresh: () => Promise.allSettled([loadProfile(), loadSafety(), loadFidelVoicePreference()]),
    showSafetyAlert
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else void boot();
})();
