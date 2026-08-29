(() => {
  let active = null;
  const entries = new Set();

  const isProvisional = profile => profile.voiceStatus && profile.voiceStatus !== "approved";
  const isRework = profile => profile.voiceStatus === "voice_rework";

  function visibleCopy(entry, state) {
    if (state === "loading") return "Wird geladen";
    if (state === "playing") return "Stoppen";
    if (isRework(entry.profile)) return "Stimme wird überarbeitet";
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
    const action = state === "playing" ? "stoppen" : "anhören";
    const prefix = isProvisional(profile) ? "Teststimme" : "Stimme";
    if (isRework(profile)) {
      button.setAttribute("aria-label", `Stimme von ${profile.name} wird überarbeitet`);
      button.title = `Stimme von ${profile.name} wird überarbeitet`;
    } else {
      button.setAttribute("aria-label", `${prefix} von ${profile.name} ${action}`);
      button.title = `${prefix} von ${profile.name} ${action}`;
    }
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
    if (entry.audio) return entry.audio;
    const audio = new Audio();
    audio.preload = "none";
    audio.src = entry.profile.sampleAudio;
    audio.addEventListener("ended", () => stop(entry));
    audio.addEventListener("error", () => {
      if (active === entry) active = null;
      setState(entry, "error");
    });
    entry.audio = audio;
    return audio;
  }

  async function toggle(entry) {
    if (!entry?.profile?.sampleAudio || isRework(entry.profile)) return;
    if (entry.state === "playing" || entry.state === "loading") {
      stop(entry);
      return;
    }
    if (active && active !== entry) stop(active);
    active = entry;
    setState(entry, "loading");
    const audio = ensureAudio(entry);
    try {
      await audio.play();
      if (active === entry && !audio.paused) setState(entry, "playing");
    } catch (_) {
      if (active === entry) active = null;
      setState(entry, "error");
    }
  }

  function createControl(profile, options = {}) {
    if (!profile?.sampleAudio) return null;
    const control = document.createElement("span");
    control.className = `nw-voice-preview-control ${options.className || ""}`.trim();
    control.dataset.conciergeKey = profile.key;
    const provisional = isProvisional(profile);
    const rework = isRework(profile);
    if (provisional) control.dataset.provisional = "true";
    if (rework) control.dataset.rework = "true";

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
      ${provisional && !rework ? '<span class="nw-voice-preview-badge" aria-hidden="true">Test</span>' : ""}
    `;
    if (rework) button.disabled = true;
    const copy = button.querySelector(".nw-voice-preview-copy");
    control.appendChild(button);

    const entry = { profile, button, copy, control, audio: null, state: "idle" };
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