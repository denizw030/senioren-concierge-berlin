(() => {
  let active = null;
  const entries = new Set();

  const isProvisional = profile => profile.voiceStatus && profile.voiceStatus !== "approved";
  const audioUrl = entry => entry.profile.sampleAudioByLanguage?.[entry.language] || entry.profile.sampleAudio || "";

  function visibleCopy(entry, state) {
    if (state === "loading") return "Wird geladen";
    if (state === "playing") return "Stoppen";
    if (state === "error") return "Nicht verfügbar";
    return "Stimme anhören";
  }

  function setState(entry, state) {
    if (!entry) return;
    entry.state = state;
    const { button, profile, copy, control } = entry;
    button.dataset.state = state;
    control.dataset.state = state;
    button.setAttribute("aria-pressed", state === "playing" ? "true" : "false");
    const langLabel = profile.previewLanguages?.find(item => item.code === entry.language)?.label || entry.language;
    const action = state === "playing" ? "stoppen" : "anhören";
    const prefix = isProvisional(profile) ? "Teststimme" : "Stimme";
    button.setAttribute("aria-label", `${prefix} von ${profile.name} auf ${langLabel} ${action}`);
    button.title = `${prefix} von ${profile.name} auf ${langLabel} ${action}`;
    copy.textContent = visibleCopy(entry, state);
  }

  function resetAudio(entry) {
    if (!entry?.audio) return;
    entry.audio.pause();
    try { entry.audio.currentTime = 0; } catch (_) {}
  }

  function stop(entry, nextState = "stopped") {
    if (!entry) return;
    resetAudio(entry);
    setState(entry, nextState);
    if (active === entry) active = null;
  }

  function ensureAudio(entry) {
    const url = audioUrl(entry);
    if (!url) return null;
    if (!entry.audio) {
      const audio = new Audio();
      audio.preload = "none";
      audio.addEventListener("ended", () => stop(entry));
      audio.addEventListener("error", () => {
        if (active === entry) active = null;
        setState(entry, "error");
      });
      entry.audio = audio;
    }
    if (entry.audio.dataset.url !== url) {
      resetAudio(entry);
      entry.audio.src = url;
      entry.audio.dataset.url = url;
      entry.audio.load();
    }
    return entry.audio;
  }

  async function play(entry) {
    if (!entry || !audioUrl(entry)) return;
    if (active && active !== entry) stop(active);
    active = entry;
    setState(entry, "loading");
    const audio = ensureAudio(entry);
    if (!audio) {
      active = null;
      setState(entry, "error");
      return;
    }
    try {
      await audio.play();
      if (active === entry && !audio.paused) setState(entry, "playing");
    } catch (_) {
      if (active === entry) active = null;
      setState(entry, "error");
    }
  }

  async function toggle(entry) {
    if (!entry || !audioUrl(entry)) return;
    if (entry.state === "playing" || entry.state === "loading") {
      stop(entry);
      return;
    }
    await play(entry);
  }

  function createControl(profile, options = {}) {
    if (!profile?.sampleAudio && !profile?.sampleAudioByLanguage) return null;
    const control = document.createElement("div");
    control.className = `nw-voice-preview-control ${options.className || ""}`.trim();
    control.dataset.conciergeKey = profile.key;
    const provisional = isProvisional(profile);
    if (provisional) control.dataset.provisional = "true";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "nw-voice-preview-button";
    button.innerHTML = `
      <span class="nw-voice-preview-icon" aria-hidden="true">
        <svg class="icon-wave" viewBox="0 0 22 18" focusable="false">
          <path d="M2 10.5v-3M6.5 14V4M11 16V2M15.5 13V5M20 10.5v-3" />
        </svg>
        <span class="icon-loading"></span>
        <svg class="icon-stop" viewBox="0 0 18 18" focusable="false"><rect x="5" y="5" width="8" height="8" rx="2"/></svg>
        <span class="icon-error">!</span>
      </span>
      <span class="nw-voice-preview-copy"></span>
      ${provisional ? '<span class="nw-voice-preview-badge" aria-hidden="true">Test</span>' : ""}
    `;
    const copy = button.querySelector(".nw-voice-preview-copy");

    const languages = profile.previewLanguages?.length
      ? profile.previewLanguages
      : [{code:profile.nativeLanguage || "de",label:profile.nativeLanguageLabel || "Deutsch"}];
    const initialLanguage = profile.nativeLanguage || languages[0].code;
    const entry = { profile, button, copy, control, audio:null, state:"idle", language:initialLanguage };

    control.appendChild(button);

    if (languages.length > 1) {
      const languageWrap = document.createElement("label");
      languageWrap.className = "nw-voice-preview-language";
      languageWrap.innerHTML = '<span>Sprache</span>';
      const select = document.createElement("select");
      select.className = "nw-voice-preview-language-select";
      select.setAttribute("aria-label", `Sprache für die Hörprobe von ${profile.name}`);
      languages.forEach(item => {
        const option = document.createElement("option");
        option.value = item.code;
        option.textContent = item.label;
        option.selected = item.code === initialLanguage;
        select.appendChild(option);
      });
      select.addEventListener("pointerdown", event => event.stopPropagation());
      select.addEventListener("click", event => event.stopPropagation());
      select.addEventListener("change", async event => {
        event.stopPropagation();
        const next = select.value;
        if (!profile.sampleAudioByLanguage?.[next] || next === entry.language) return;
        if (active) stop(active);
        entry.language = next;
        if (entry.audio) {
          entry.audio.removeAttribute("src");
          entry.audio.dataset.url = "";
          try { entry.audio.load(); } catch (_) {}
        }
        setState(entry, "idle");
        await play(entry);
      });
      languageWrap.appendChild(select);
      control.appendChild(languageWrap);
      entry.select = select;
    }

    entries.add(entry);
    setState(entry, "idle");

    button.addEventListener("pointerdown", event => event.stopPropagation());
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      toggle(entry);
    });
    return control;
  }

  function stopAll() {
    entries.forEach(entry => {
      if (entry.state === "playing" || entry.state === "loading") stop(entry);
    });
    active = null;
  }

  addEventListener("pagehide", stopAll);
  addEventListener("beforeunload", stopAll);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopAll();
  });

  window.NAHWERKVoicePreview = { createControl, stopAll };
})();