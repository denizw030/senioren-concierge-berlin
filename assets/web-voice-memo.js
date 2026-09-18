(() => {
  "use strict";

  const SESSION_KEY = "scb_web_session";
  const ENDPOINT = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-web-gateway/web/audio-transcribe";
  const HEALTH_ENDPOINT = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-web-gateway/health";
  const MAX_DURATION_MS = 120000;
  const HEALTH_TIMEOUT_MS = 5000;
  const TRANSCRIBE_TIMEOUT_MS = 50000;

  let recorder = null;
  let stream = null;
  let chunks = [];
  let blob = null;
  let mime = "";
  let startedAt = 0;
  let timer = null;
  let preview = null;
  let previewUrl = "";
  let cancelled = false;
  let processing = false;

  function token() {
    try {
      return String(JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null")?.session_token || "");
    } catch {
      return "";
    }
  }

  function fetchTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeout));
  }

  function supported() {
    return Boolean(
      window.isSecureContext &&
      navigator.mediaDevices?.getUserMedia &&
      typeof window.MediaRecorder !== "undefined"
    );
  }

  function pickMime() {
    if (typeof MediaRecorder === "undefined") return "";
    for (const type of ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"]) {
      try {
        if (MediaRecorder.isTypeSupported(type)) return type;
      } catch {}
    }
    return "";
  }

  function clock(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
  }

  function stopTracks() {
    if (stream) {
      for (const track of stream.getTracks()) track.stop();
    }
    stream = null;
  }

  function clearTimer() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  function releasePreview() {
    try { preview?.pause(); } catch {}
    preview = null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = "";
  }

  function els() {
    return {
      form: document.querySelector(".web-concierge-form"),
      input: document.getElementById("webConciergeInput"),
      send: document.getElementById("webConciergeSend"),
      trigger: document.getElementById("webConciergeVoice"),
      panel: document.getElementById("webConciergeVoiceRecorder"),
      status: document.getElementById("webConciergeVoiceStatus"),
      time: document.getElementById("webConciergeVoiceTime"),
      cancel: document.getElementById("webConciergeVoiceCancel"),
      play: document.getElementById("webConciergeVoicePlay"),
      stop: document.getElementById("webConciergeVoiceStop"),
      submit: document.getElementById("webConciergeVoiceSend")
    };
  }

  function setMode(mode, message = "") {
    const e = els();
    if (!e.form || !e.panel) return;
    const active = mode !== "idle";
    e.form.classList.toggle("is-voice-active", active);
    e.panel.hidden = !active;
    e.panel.dataset.mode = mode;
    if (e.status) {
      e.status.textContent = message || (
        mode === "recording" ? "Aufnahme läuft" :
        mode === "processing" ? "Wird verarbeitet …" :
        "Sprachmemo bereit"
      );
    }
    if (e.stop) e.stop.hidden = mode !== "recording";
    if (e.play) e.play.hidden = mode !== "ready";
    if (e.submit) e.submit.hidden = mode !== "ready";
    if (e.cancel) e.cancel.disabled = mode === "processing";
    if (e.play) e.play.disabled = mode === "processing";
    if (e.stop) e.stop.disabled = mode === "processing";
    if (e.submit) e.submit.disabled = mode === "processing";
  }

  function reset() {
    clearTimer();
    stopTracks();
    releasePreview();
    recorder = null;
    chunks = [];
    blob = null;
    mime = "";
    startedAt = 0;
    cancelled = false;
    processing = false;
    const e = els();
    if (e.time) e.time.textContent = "0:00";
    if (e.play) e.play.textContent = "▶";
    setMode("idle");
  }

  function errorCard(title, text) {
    const log = document.getElementById("webConciergeLog");
    if (!log) return;
    const card = document.createElement("div");
    card.className = "web-concierge-runtime-card is-error";
    const strong = document.createElement("strong");
    strong.textContent = title;
    const body = document.createElement("span");
    body.textContent = text;
    card.append(strong, body);
    log.appendChild(card);
    requestAnimationFrame(() => { log.scrollTop = log.scrollHeight; });
  }

  async function start() {
    if (recorder || processing) return;
    try {
      cancelled = false;
      chunks = [];
      blob = null;
      releasePreview();

      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const preferred = pickMime();
      recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
      mime = String(recorder.mimeType || preferred || "audio/webm").split(";")[0].toLowerCase();

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data?.size) chunks.push(event.data);
      });

      recorder.addEventListener("stop", () => {
        clearTimer();
        stopTracks();
        recorder = null;

        if (cancelled) {
          reset();
          return;
        }

        const recorded = new Blob(chunks, { type: mime || "audio/webm" });
        chunks = [];
        if (!recorded.size) {
          reset();
          errorCard("Sprachmemo nicht aufgenommen", "Bitte versuche die Aufnahme noch einmal.");
          return;
        }

        blob = recorded;
        previewUrl = URL.createObjectURL(recorded);
        preview = new Audio(previewUrl);
        preview.addEventListener("ended", () => {
          const e = els();
          if (e.play) e.play.textContent = "▶";
        });

        const e = els();
        if (e.time) e.time.textContent = clock(Date.now() - startedAt);
        setMode("ready");
      }, { once: true });

      startedAt = Date.now();
      setMode("recording");
      const e = els();
      if (e.time) e.time.textContent = "0:00";

      timer = setInterval(() => {
        const elapsed = Date.now() - startedAt;
        const current = els();
        if (current.time) current.time.textContent = clock(elapsed);
        if (elapsed >= MAX_DURATION_MS && recorder?.state === "recording") recorder.stop();
      }, 250);

      recorder.start(250);
    } catch (error) {
      stopTracks();
      recorder = null;
      clearTimer();
      setMode("idle");
      const denied = String(error?.name || "") === "NotAllowedError";
      errorCard(
        "Mikrofon nicht verfügbar",
        denied
          ? "Bitte erlaube NAHWERK den Mikrofonzugriff in deinen Browser-Einstellungen."
          : "Die Aufnahme konnte gerade nicht gestartet werden."
      );
    }
  }

  function stop() {
    if (recorder?.state === "recording") recorder.stop();
  }

  function cancel() {
    cancelled = true;
    if (recorder?.state === "recording") {
      recorder.stop();
      return;
    }
    reset();
  }

  function togglePreview() {
    if (!preview) return;
    const e = els();
    if (preview.paused) {
      preview.play().then(() => {
        if (e.play) e.play.textContent = "❚❚";
      }).catch(() => {});
    } else {
      preview.pause();
      if (e.play) e.play.textContent = "▶";
    }
  }

  function extensionFor(type) {
    if (type.includes("mp4") || type.includes("m4a")) return "m4a";
    if (type.includes("ogg")) return "ogg";
    if (type.includes("wav")) return "wav";
    if (type.includes("mpeg")) return "mp3";
    return "webm";
  }

  async function transcribe(audio, type) {
    const session = token();
    if (!session) throw new Error("session_required");

    const form = new FormData();
    form.append("audio", audio, `voice-memo.${extensionFor(type)}`);

    const response = await fetchTimeout(
      ENDPOINT,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${session}` },
        body: form,
        cache: "no-store",
        credentials: "omit"
      },
      TRANSCRIBE_TIMEOUT_MS
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok !== true || typeof payload?.transcript !== "string" || !payload.transcript.trim()) {
      throw new Error(String(payload?.error || "voice_transcription_failed"));
    }
    return payload.transcript.trim();
  }

  async function submit() {
    if (!blob || processing) return;
    processing = true;
    setMode("processing");
    try {
      const transcript = await transcribe(blob, mime);
      const e = els();
      reset();
      if (!(e.input instanceof HTMLTextAreaElement)) throw new Error("composer_unavailable");
      e.input.value = transcript;
      e.input.dispatchEvent(new Event("input", { bubbles: true }));
      if (e.send instanceof HTMLButtonElement && !e.send.disabled) {
        e.send.click();
      } else {
        e.input.focus();
      }
    } catch {
      processing = false;
      setMode("ready", "Sprachmemo konnte nicht verarbeitet werden");
    }
  }

  function build() {
    const form = document.querySelector(".web-concierge-form");
    const input = document.getElementById("webConciergeInput");
    if (!form || !input || document.getElementById("webConciergeVoice")) return false;

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.id = "webConciergeVoice";
    trigger.className = "web-concierge-voice-trigger";
    trigger.hidden = true;
    trigger.setAttribute("aria-label", "Sprachmemo aufnehmen");
    trigger.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 14.25a3.5 3.5 0 0 0 3.5-3.5V6.5a3.5 3.5 0 1 0-7 0v4.25a3.5 3.5 0 0 0 3.5 3.5Zm6-3.75a.75.75 0 0 0-1.5 0 4.5 4.5 0 0 1-9 0 .75.75 0 0 0-1.5 0 6.01 6.01 0 0 0 5.25 5.96V19H8.75a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-2.5v-2.54A6.01 6.01 0 0 0 18 10.5Z"/></svg>';
    form.insertBefore(trigger, input);

    const panel = document.createElement("div");
    panel.id = "webConciergeVoiceRecorder";
    panel.className = "web-concierge-voice-recorder";
    panel.hidden = true;
    panel.dataset.mode = "idle";
    panel.innerHTML = '<button type="button" class="web-concierge-voice-icon is-cancel" id="webConciergeVoiceCancel" aria-label="Sprachmemo löschen">×</button><button type="button" class="web-concierge-voice-icon is-play" id="webConciergeVoicePlay" aria-label="Sprachmemo anhören" hidden>▶</button><div class="web-concierge-voice-meta"><span id="webConciergeVoiceStatus">Aufnahme läuft</span><span id="webConciergeVoiceTime">0:00</span></div><div class="web-concierge-voice-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><button type="button" class="web-concierge-voice-icon is-stop" id="webConciergeVoiceStop" aria-label="Aufnahme stoppen">■</button><button type="button" class="web-concierge-voice-icon is-send" id="webConciergeVoiceSend" aria-label="Sprachmemo senden" hidden>↑</button>';
    form.appendChild(panel);

    trigger.addEventListener("click", () => { void start(); });
    document.getElementById("webConciergeVoiceCancel")?.addEventListener("click", cancel);
    document.getElementById("webConciergeVoiceStop")?.addEventListener("click", stop);
    document.getElementById("webConciergeVoicePlay")?.addEventListener("click", togglePreview);
    document.getElementById("webConciergeVoiceSend")?.addEventListener("click", () => { void submit(); });

    window.addEventListener("pagehide", () => {
      cancelled = true;
      try {
        if (recorder?.state === "recording") recorder.stop();
      } catch {}
      stopTracks();
      releasePreview();
    }, { once: true });

    return true;
  }

  async function backendReady() {
    try {
      const response = await fetchTimeout(HEALTH_ENDPOINT, { method: "GET", cache: "no-store", credentials: "omit" }, HEALTH_TIMEOUT_MS);
      const payload = await response.json().catch(() => ({}));
      return response.ok && payload?.ok === true && payload?.audio_input_v1 === true;
    } catch {
      return false;
    }
  }

  async function init() {
    if (!supported() || !build()) return;
    const trigger = document.getElementById("webConciergeVoice");
    if (!trigger) return;
    const ready = await backendReady();
    trigger.hidden = !ready;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    void init();
  }
})();