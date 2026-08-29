(() => {
  let active = null;
  const entries = new Set();

  const isProvisional = profile => profile.voiceStatus && profile.voiceStatus !== "approved";

  function visibleLabel(entry, state) {
    const test = isProvisional(entry.profile);
    if (state === "loading") return "Wird geladen";
    if (state === "playing") return "Wiedergabe stoppen";
    if (state === "error") return "Audio nicht verfügbar";
    if (state === "stopped") return test ? "Teststimme anhören" : "Stimme anhören";
    return test ? "Teststimme anhören" : "Stimme anhören";
  }

  function setState(entry, state) {
    if (!entry) return;
    entry.state = state;
    const { button, profile, label } = entry;
    button.dataset.state = state;
    button.setAttribute("aria-pressed", state === "playing" ? "true" : "false");
    const action = state === "playing" ? "stoppen" : "anhören";
    const prefix = isProvisional(profile) ? "Teststimme" : "Stimme";
    button.setAttribute("aria-label", `${prefix} von ${profile.name} ${action}`);
    button.title = `${prefix} von ${profile.name} ${action}`;
    if (label) label.textContent = visibleLabel(entry, state);
    const srState = button.querySelector(".nw-voice-preview-state");
    if (srState) srState.textContent = state;
    entry.control.dataset.state = state;
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
    if (!entry?.profile?.sampleAudio) return;
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
    if (isProvisional(profile)) control.dataset.provisional = "true";

    const label = document.createElement("span");
    label.className = "nw-voice-preview-label";
    label.setAttribute("aria-hidden", "true");
    control.appendChild(label);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "nw-voice-preview-button";
    button.innerHTML = `
      <span class="nw-voice-preview-icon" aria-hidden="true">
        <svg class="icon-speaker" viewBox="0 0 24 24" focusable="false"><path d="M4 9v6h4l5 4V5L8 9H4zm12.5 3a4.5 4.5 0 0 0-2.1-3.8v7.6A4.5 4.5 0 0 0 16.5 12zm0-7.2v2.1a7 7 0 0 1 0 10.2v2.1a9 9 0 0 0 0-13.4z"/></svg>
        <svg class="icon-stop" viewBox="0 0 24 24" focusable="false"><rect x="7" y="7" width="10" height="10" rx="1.5"/></svg>
        <span class="icon-loading"></span>
        <span class="icon-error">!</span>
      </span>
      <span class="nw-voice-preview-state visually-hidden">idle</span>`;
    control.appendChild(button);

    const entry = { profile, button, label, control, audio: null, state: "idle" };
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