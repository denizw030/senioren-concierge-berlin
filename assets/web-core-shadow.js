(() => {
  "use strict";

  const ENDPOINT =
    "https://btqklftjmwtqqqdmwlnk.supabase.co/functions/v1/nahwerk-customer-portal-staging/portal/web-core-shadow";
  const SESSION_KEY = "scb_web_session";
  const CHANNEL_SESSION_KEY = "nw_web_shadow_channel_session_v1";
  const PENDING_PREFIX = "nw_web_shadow_pending_v1:";
  const ENABLE_KEY = "nw_web_shadow_enabled_v1";

  function enabled() {
    return window.NAHWERK_WEB_SHADOW_ENABLED === true ||
      sessionStorage.getItem(ENABLE_KEY) === "1";
  }

  function sessionToken() {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null")?.session_token || "";
    } catch (_) {
      return "";
    }
  }

  function uuid() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    const b = new Uint8Array(16);
    globalThis.crypto.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
    return h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) + "-" +
      h.slice(16, 20) + "-" + h.slice(20);
  }

  function channelSessionId() {
    let value = sessionStorage.getItem(CHANNEL_SESSION_KEY) || "";
    if (!value) {
      value = "web:" + uuid();
      sessionStorage.setItem(CHANNEL_SESSION_KEY, value);
    }
    return value;
  }

  function pendingKey(sourceMessageId) {
    return PENDING_PREFIX + sourceMessageId;
  }

  function readPending(sourceMessageId) {
    try {
      return JSON.parse(sessionStorage.getItem(pendingKey(sourceMessageId)) || "null");
    } catch (_) {
      return null;
    }
  }

  function writePending(turn) {
    sessionStorage.setItem(pendingKey(turn.source_message_id), JSON.stringify(turn));
    return turn;
  }

  function createPendingTurn(message) {
    const content = String(message || "").trim();
    if (!content) throw new Error("empty_web_turn");

    const sourceMessageId = uuid();
    return writePending({
      source_message_id: sourceMessageId,
      correlation_id: uuid(),
      channel_session_id: channelSessionId(),
      message: content,
      created_at: new Date().toISOString(),
      attempts: 0,
      state: "PENDING"
    });
  }

  function removePending(sourceMessageId) {
    sessionStorage.removeItem(pendingKey(sourceMessageId));
  }

  async function sendPending(sourceMessageId) {
    const pending = readPending(sourceMessageId);
    if (!pending) throw new Error("web_shadow_pending_turn_not_found");

    if (!enabled()) {
      return {
        ok: false,
        skipped: true,
        reason: "web_shadow_disabled",
        source_message_id: pending.source_message_id
      };
    }

    const token = sessionToken();
    if (!token) throw new Error("web_session_required");

    pending.attempts = Number(pending.attempts || 0) + 1;
    pending.last_attempt_at = new Date().toISOString();
    pending.state = "SENDING";
    writePending(pending);

    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token,
          "Idempotency-Key": pending.source_message_id
        },
        body: JSON.stringify({
          message: pending.message,
          source_message_id: pending.source_message_id,
          correlation_id: pending.correlation_id,
          channel_session_id: pending.channel_session_id,
          received_at: pending.created_at
        })
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.ok !== true) {
        pending.state = "RETRYABLE";
        pending.last_error = String(body?.error || "web_shadow_http_" + response.status);
        writePending(pending);
        return {
          ok: false,
          skipped: false,
          retryable: true,
          status: response.status,
          source_message_id: pending.source_message_id,
          error: pending.last_error
        };
      }

      pending.state = "SHADOW_ACCEPTED";
      pending.accepted_at = new Date().toISOString();
      pending.shadow = {
        response_id: body.response_id || null,
        conversation_id: body.conversation_id || null,
        turn_id: body.turn_id || null,
        active_task_id: body.active_task_id || null,
        response_state: body.response_state || null,
        state_version: body.state_version ?? null,
        duplicate: body.duplicate === true
      };
      writePending(pending);

      const result = {
        ok: true,
        shadow_only: true,
        customer_delivery: false,
        source_message_id: pending.source_message_id,
        ...pending.shadow
      };

      window.dispatchEvent(new CustomEvent("nahwerk:web-shadow-result", {
        detail: result
      }));
      return result;
    } catch (error) {
      pending.state = "RETRYABLE";
      pending.last_error = error instanceof Error ? error.message : "web_shadow_network_error";
      writePending(pending);
      return {
        ok: false,
        skipped: false,
        retryable: true,
        source_message_id: pending.source_message_id,
        error: pending.last_error
      };
    }
  }

  async function sendTurn(message) {
    const pending = createPendingTurn(message);
    return sendPending(pending.source_message_id);
  }

  window.NAHWERKWebCoreShadow = Object.freeze({
    createPendingTurn,
    sendPending,
    sendTurn,
    readPending,
    removePending,
    channelSessionId,
    isEnabled: enabled
  });
})();
