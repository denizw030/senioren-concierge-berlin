(() => {
  "use strict";

  // STEWARO_CUSTOMER_CALL_WEBRTC_JOIN_V1_20261007
  const SESSION_KEY = "scb_web_session";
  const LIVE_API = "https://ta832v8wah.execute-api.eu-central-1.amazonaws.com/prod/v1/web/live";
  const CONTRACT = "stewaro.client-call-join.v1";
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const channel = location.hostname === "app.stewaro.com" ? "APP" : "WEB";

  let device = null;
  let currentCall = null;
  let currentConferenceId = "";
  let activated = false;
  let activating = null;
  let tokenExpiresAt = 0;

  function sessionToken() {
    const bridge = window.NAHWERKWebCustomerConciergeLiveBridge;
    if (typeof bridge?.sessionToken === "function") {
      const value = String(bridge.sessionToken() || "");
      if (value) return value;
    }
    try {
      return String(JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null")?.session_token || "");
    } catch {
      return "";
    }
  }

  async function post(path, body = {}) {
    const bearer = sessionToken();
    if (!bearer) throw new Error("SESSION_REQUIRED");
    const response = await fetch(LIVE_API + path, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + bearer,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
      cache: "no-store",
      credentials: "omit",
      signal: AbortSignal.timeout(12000)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok !== true) {
      throw new Error(String(payload?.error || ("HTTP_" + response.status)));
    }
    return payload;
  }

  function ensureSurface() {
    let root = document.getElementById("stewaroCustomerCallJoin");
    if (root) return root;

    root = document.createElement("section");
    root.id = "stewaroCustomerCallJoin";
    root.className = "stewaro-call-join";
    root.hidden = true;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "stewaroCallJoinTitle");
    root.innerHTML = `
      <div class="stewaro-call-join__backdrop" data-call-join-dismiss="0"></div>
      <div class="stewaro-call-join__card">
        <div class="stewaro-call-join__orb" aria-hidden="true">
          <img src="/assets/logos/stewaro-icon.svg?v=1" alt="">
        </div>
        <p class="stewaro-call-join__eyebrow">STEWARO · FIDEL</p>
        <h2 id="stewaroCallJoinTitle">Die Praxis ist bereit.</h2>
        <p id="stewaroCallJoinText">Du kannst jetzt direkt über STEWARO dem Gespräch beitreten. Es wird dafür kein zusätzlicher Mobilfunkanruf zu dir aufgebaut.</p>
        <div class="stewaro-call-join__status" id="stewaroCallJoinStatus" aria-live="polite"></div>
        <div class="stewaro-call-join__actions">
          <button type="button" class="stewaro-call-join__primary" id="stewaroCallJoinAccept">Gespräch beitreten</button>
          <button type="button" class="stewaro-call-join__secondary" id="stewaroCallJoinDecline">Nicht jetzt</button>
        </div>
      </div>`;
    document.body.appendChild(root);

    root.querySelector("#stewaroCallJoinAccept")?.addEventListener("click", () => {
      void acceptIncoming();
    });
    root.querySelector("#stewaroCallJoinDecline")?.addEventListener("click", () => {
      void declineIncoming();
    });
    return root;
  }

  function setStatus(text, kind = "") {
    const node = ensureSurface().querySelector("#stewaroCallJoinStatus");
    if (!(node instanceof HTMLElement)) return;
    node.textContent = String(text || "");
    node.dataset.kind = kind;
  }

  function setButtonsDisabled(disabled) {
    const root = ensureSurface();
    root.querySelectorAll("button").forEach((button) => {
      button.disabled = Boolean(disabled);
    });
  }

  function openSurface(call, conferenceId) {
    currentCall = call;
    currentConferenceId = conferenceId;
    const root = ensureSurface();
    setButtonsDisabled(false);
    setStatus("Bereit zum Beitreten.");
    root.hidden = false;
    document.documentElement.classList.add("stewaro-call-join-open");
    root.querySelector("#stewaroCallJoinAccept")?.focus();
  }

  function closeSurface() {
    const root = document.getElementById("stewaroCustomerCallJoin");
    if (root) root.hidden = true;
    document.documentElement.classList.remove("stewaro-call-join-open");
    setButtonsDisabled(false);
    setStatus("");
    currentCall = null;
    currentConferenceId = "";
  }

  function incomingContext(call) {
    const params = call?.customParameters;
    const kind = typeof params?.get === "function" ? String(params.get("kind") || "") : "";
    const conferenceId = typeof params?.get === "function" ? String(params.get("conference_id") || "") : "";
    if (kind !== "stewaro_join" || !UUID.test(conferenceId)) return null;
    return { kind, conferenceId };
  }

  function bindCallTerminalEvents(call) {
    let closed = false;
    const finish = () => {
      if (closed) return;
      closed = true;
      if (currentCall === call) closeSurface();
    };
    ["disconnect", "cancel", "reject", "error"].forEach((eventName) => call.on?.(eventName, finish));
  }

  async function acceptIncoming() {
    const call = currentCall;
    if (!call) return;
    setButtonsDisabled(true);
    setStatus("Mikrofon wird verbunden …");
    try {
      call.accept({
        rtcConstraints: {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        }
      });
      setStatus("Du bist im Gespräch.", "connected");
      const root = ensureSurface();
      const accept = root.querySelector("#stewaroCallJoinAccept");
      const decline = root.querySelector("#stewaroCallJoinDecline");
      if (accept) accept.hidden = true;
      if (decline) {
        decline.hidden = false;
        decline.textContent = "Gespräch verlassen";
        decline.disabled = false;
        decline.onclick = () => {
          try { call.disconnect?.(); } catch {}
          closeSurface();
        };
      }
      window.dispatchEvent(new CustomEvent("stewaro:customer-call-joined", {
        detail: { conference_session_id: currentConferenceId, channel }
      }));
    } catch {
      setButtonsDisabled(false);
      setStatus("Die Audioverbindung konnte nicht hergestellt werden. Bitte versuche es erneut.", "error");
    }
  }

  async function declineIncoming() {
    const call = currentCall;
    const conferenceId = currentConferenceId;
    if (!call || !UUID.test(conferenceId)) return;
    setButtonsDisabled(true);
    setStatus("Wird gespeichert …");
    let lastError = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const result = await post("/call-join/decline", {
          conference_session_id: conferenceId,
          channel
        });
        if (result?.contract_version !== CONTRACT || result?.declined !== true) {
          throw new Error("DECLINE_NOT_CONFIRMED");
        }
        try { call.reject?.(); } catch {}
        closeSurface();
        window.dispatchEvent(new CustomEvent("stewaro:customer-call-declined", {
          detail: { conference_session_id: conferenceId, channel }
        }));
        return;
      } catch (error) {
        lastError = error;
        if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
    setButtonsDisabled(false);
    setStatus("„Nicht jetzt“ konnte noch nicht sicher gespeichert werden. Bitte tippe erneut.", "error");
    console.warn("STEWARO call-join decline failed", String(lastError?.message || lastError || ""));
  }

  async function fetchJoinToken() {
    const result = await post("/call-join/token", { channel });
    if (result?.contract_version !== CONTRACT || result?.incoming_only !== true || !result?.token) {
      throw new Error("JOIN_TOKEN_INVALID");
    }
    tokenExpiresAt = Date.parse(String(result.expires_at || "")) || (Date.now() + Math.max(60, Number(result.ttl_seconds || 600)) * 1000);
    return String(result.token);
  }

  async function refreshDeviceToken() {
    if (!device) return;
    const token = await fetchJoinToken();
    device.updateToken?.(token);
  }

  async function activate() {
    if (activated || activating) return activating;
    if (!sessionToken()) return false;
    const Device = window.Twilio?.Device;
    if (typeof Device !== "function") return false;

    activating = (async () => {
      try {
        const token = await fetchJoinToken();
        device = new Device(token, {
          appName: "STEWARO",
          appVersion: "customer-call-join-v1",
          closeProtection: false,
          allowIncomingWhileBusy: false
        });

        device.on("incoming", (call) => {
          const context = incomingContext(call);
          if (!context) {
            try { call.reject?.(); } catch {}
            return;
          }
          bindCallTerminalEvents(call);
          openSurface(call, context.conferenceId);
        });

        device.on("tokenWillExpire", () => {
          void refreshDeviceToken().catch(() => {});
        });

        device.on("error", (error) => {
          window.dispatchEvent(new CustomEvent("stewaro:customer-call-device-error", {
            detail: { code: String(error?.code || "VOICE_DEVICE_ERROR") }
          }));
        });

        await device.register();
        activated = true;
        document.documentElement.dataset.stewaroCallJoinReady = "1";
        window.dispatchEvent(new CustomEvent("stewaro:customer-call-ready", { detail: { channel } }));
        return true;
      } catch (error) {
        activated = false;
        document.documentElement.dataset.stewaroCallJoinReady = "0";
        console.warn("STEWARO call-join activation unavailable", String(error?.message || error || ""));
        return false;
      } finally {
        activating = null;
      }
    })();

    return activating;
  }

  function armActivation() {
    const trigger = () => { void activate(); };
    window.addEventListener("pointerdown", trigger, { once: true, capture: true, passive: true });
    window.addEventListener("keydown", trigger, { once: true, capture: true });
    window.addEventListener("focus", () => {
      if (!activated && sessionToken()) void activate();
      if (activated && device && tokenExpiresAt - Date.now() < 90000) void refreshDeviceToken().catch(() => {});
    });
  }

  window.addEventListener("pagehide", () => {
    try { currentCall?.disconnect?.(); } catch {}
    try { device?.destroy?.(); } catch {}
    currentCall = null;
    device = null;
    activated = false;
  }, { once: true });

  ensureSurface();
  armActivation();

  window.STEWAROCustomerCallJoin = Object.freeze({
    activate,
    isReady: () => activated === true,
    channel: () => channel
  });
})();
