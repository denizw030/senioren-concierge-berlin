(() => {
  "use strict";

  const SESSION_KEY = "scb_web_session";
  const ENDPOINT = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-web-gateway/web/audio-message";
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
  let durationMs = 0;
  let sendWhenStopped = false;

  function token() {
    try {
      return String(JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null")?.session_token || "");
    } catch {
      return "";
    }
  }

  function reportClientDiagnostic(code) {
    try{
      const u=new URL("https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-web-gateway/client-diagnostic");
      u.searchParams.set("source","VOICE_MEMO_CLIENT");
      u.searchParams.set("code",String(code||"VOICE_MEMO_CLIENT_ERROR").slice(0,180));
      fetch(u.href,{method:"GET",cache:"no-store",credentials:"omit"}).catch(()=>{});
    }catch{}
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
    durationMs = 0;
    sendWhenStopped = false;
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
    if (!window.NAHWERKWebCustomerConciergeLiveBridge?.isAllowed?.()) return;
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

        durationMs = Math.max(0, Date.now() - startedAt);
        const e = els();
        if (e.time) e.time.textContent = clock(durationMs);
        setMode("ready");
        if (sendWhenStopped) {
          sendWhenStopped = false;
          void submit();
        }
      }, { once: true });

      startedAt = Date.now();
      setMode("recording");
      const e = els();
      if (e.time) e.time.textContent = "0:00";

      timer = setInterval(() => {
        const elapsed = Date.now() - startedAt;
        const current = els();
        if (current.time) current.time.textContent = clock(elapsed);
        if (elapsed >= MAX_DURATION_MS && recorder?.state === "recording") { sendWhenStopped = true; recorder.stop(); }
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

  function stopAndSend() {
    if (recorder?.state !== "recording") return;
    sendWhenStopped = true;
    recorder.stop();
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

  async function sendVoiceMemo(audio, type) {
    void window.SCBAuth?.validateSession?.().catch(() => false);
    const session = token();
    if (!session) throw new Error("session_required");
    const bridge = window.NAHWERKWebCustomerConciergeLiveBridge;
    if (!bridge?.isAllowed?.()) throw new Error("channel_read_only");
    const threadID = bridge?.threadId?.();
    if (!threadID) throw new Error("thread_required");

    const sourceMessageID = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
    const form = new FormData();
    form.append("audio", audio, `voice-memo.${extensionFor(type)}`);
    form.append("thread_id", threadID);
    form.append("source_message_id", sourceMessageID);
    form.append("duration_ms", String(Math.max(0, Math.round(durationMs))));

    const response = await fetchTimeout(
      ENDPOINT,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${session}` },
        body: form,
        cache: "no-store",
        credentials: "omit"
      },
      90000
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok !== true || payload?.contract_version !== "audio-message-v1") {
      throw new Error(String(payload?.error || "voice_message_failed"));
    }
    return payload;
  }

  async function submit() {
    if (!blob || processing) return;
    processing = true;
    setMode("processing");
    try {
      const payload = await sendVoiceMemo(blob, mime);
      reset();
      window.dispatchEvent(new CustomEvent("nahwerk:voice-memo-sent",{detail:{payload}}));
    } catch (error) {
      const code=String(error?.message||error?.name||"voice_message_failed");
      reportClientDiagnostic(code);
      processing = false;
      setMode("ready", `Sprachmemo Fehler: ${code.slice(0,60)}`);
      window.dispatchEvent(new CustomEvent("nahwerk:voice-memo-error",{detail:{error:code}}));
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
    panel.innerHTML = '<button type="button" class="web-concierge-voice-icon is-cancel" id="webConciergeVoiceCancel" aria-label="Sprachmemo löschen">×</button><button type="button" class="web-concierge-voice-icon is-play" id="webConciergeVoicePlay" aria-label="Sprachmemo anhören" hidden>▶</button><div class="web-concierge-voice-meta"><span id="webConciergeVoiceStatus">Aufnahme läuft</span><span id="webConciergeVoiceTime">0:00</span></div><div class="web-concierge-voice-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><button type="button" class="web-concierge-voice-icon is-stop" id="webConciergeVoiceStop" aria-label="Sprachmemo senden"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17V7M7.8 11.2 12 7l4.2 4.2"/></svg></button><button type="button" class="web-concierge-voice-icon is-send" id="webConciergeVoiceSend" aria-label="Sprachmemo senden" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17V7M7.8 11.2 12 7l4.2 4.2"/></svg></button>';
    form.appendChild(panel);

    trigger.addEventListener("click", () => { void start(); });
    document.getElementById("webConciergeVoiceCancel")?.addEventListener("click", cancel);
    document.getElementById("webConciergeVoiceStop")?.addEventListener("click", stopAndSend);
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
    const syncAvailability=()=>{
      const allowed=Boolean(window.NAHWERKWebCustomerConciergeLiveBridge?.isAllowed?.());
      trigger.hidden=!(ready&&allowed);
      trigger.disabled=!(ready&&allowed);
      if(!allowed&&recorder)reset();
    };
    syncAvailability();
    window.addEventListener("nahwerk:chat-channel-view",syncAvailability);
    const availabilityTimer=setInterval(syncAvailability,1000);
    window.addEventListener("pagehide",()=>clearInterval(availabilityTimer),{once:true});
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    void init();
  }
})();