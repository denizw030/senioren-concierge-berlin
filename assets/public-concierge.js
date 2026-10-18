(() => {
  "use strict";

  const policy = window.NahwerkPublicChatPolicy;
  if (!policy) return;

  const els = {
    log: document.getElementById("publicChatLog"),
    form: document.getElementById("publicChatForm"),
    input: document.getElementById("publicChatInput"),
    send: document.getElementById("publicChatSend"),
    typing: document.getElementById("publicChatTyping"),
    counter: document.getElementById("publicChatCounter"),
    status: document.getElementById("publicChatStatus"),
    limit: document.getElementById("publicChatLimit"),
    register: document.getElementById("publicChatRegister"),
    newSession: document.getElementById("publicChatNewSession"),
    sessionLabel: document.getElementById("publicChatSessionLabel"),
  };

  if (!els.form || !els.log || !els.input) return;

  const burst = [];
  let submitting = false;
  let state = loadOrCreateState();

  function uuid() {
    if (crypto?.randomUUID) return crypto.randomUUID();
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((value) => value.toString(16).padStart(2, "0"));
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
  }

  function createState() {
    return policy.freshState(`vis_${uuid()}`, `vconv_${uuid()}`);
  }

  function loadOrCreateState() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(policy.SESSION_KEY) || "null");
      const normalized = policy.normalizeState(saved);
      if (normalized) return normalized;
    } catch (_) {}
    const fresh = createState();
    persist(fresh);
    return fresh;
  }

  function persist(next) {
    state = next;
    sessionStorage.setItem(policy.SESSION_KEY, JSON.stringify(next));
  }

  function text(value) {
    return document.createTextNode(String(value || ""));
  }

  function renderMessages() {
    els.log.replaceChildren();
    state.messages.forEach((message) => {
      const row = document.createElement("div");
      row.className = `pc-message pc-message-${message.role}`;
      row.setAttribute("data-role", message.role);
      const bubble = document.createElement("div");
      bubble.className = "pc-bubble";
      bubble.append(text(message.content));
      row.append(bubble);
      els.log.append(row);
    });
    els.log.scrollTop = els.log.scrollHeight;
  }

  function setStatus(message, kind = "info") {
    els.status.textContent = message || "";
    els.status.dataset.kind = kind;
    els.status.hidden = !message;
  }

  function updateUi() {
    els.counter.textContent = `${state.user_message_count} / ${policy.LIMITS.maxUserMessages}`;
    els.sessionLabel.textContent = `Session ${state.visitor_session_id.slice(-8)}`;
    const atMessageLimit = state.user_message_count >= policy.LIMITS.maxUserMessages;
    const atCostLimit = state.direct_model_cost_usd >= policy.LIMITS.maxDirectModelCostUsd;
    const blocked = atMessageLimit || atCostLimit;
    els.limit.hidden = !blocked;
    els.form.dataset.blocked = String(blocked);
    els.input.disabled = blocked || submitting;
    els.send.disabled = blocked || submitting;
    if (atCostLimit) {
      document.getElementById("publicChatLimitTitle").textContent = "Das Besucher-Budget ist erreicht.";
      document.getElementById("publicChatLimitCopy").textContent = "Es wird kein teureres Modell gestartet. Erstelle kostenlos ein Konto, um kontrolliert weiterzumachen.";
    }
  }

  function clientBurstAllowed() {
    const now = Date.now();
    while (burst.length && now - burst[0] > 10_000) burst.shift();
    if (burst.length >= 4) return false;
    if (burst.length && now - burst[burst.length - 1] < 650) return false;
    burst.push(now);
    return true;
  }

  function prepareHandover() {
    const payload = policy.buildHandoverPayload(state);
    if (!payload) return false;
    sessionStorage.setItem(policy.HANDOVER_KEY, JSON.stringify(payload));
    return true;
  }

  async function submitMessage(event) {
    event.preventDefault();
    if (submitting) return;

    const message = els.input.value.trim();
    if (!message) return;
    if (!clientBurstAllowed()) {
      setStatus("Zu viele Nachrichten direkt hintereinander. Bitte kurz erneut versuchen.", "error");
      return;
    }

    const gate = policy.evaluateTurn(state, 0);
    if (!gate.ok) {
      if (gate.reason === "message_limit_reached" || gate.reason === "cost_budget_reached") updateUi();
      else setStatus("Diese Besucher-Sitzung kann gerade nicht fortgesetzt werden.", "error");
      return;
    }

    submitting = true;
    setStatus("");
    els.typing.hidden = false;
    updateUi();

    // Provider-free preview: deterministic local fixture only. No network/provider request occurs here.
    await new Promise((resolve) => setTimeout(resolve, 320));
    const result = policy.appendFixtureTurn(state, message);
    els.typing.hidden = true;
    submitting = false;

    if (!result.ok) {
      setStatus("Die Nachricht wurde nicht ausgeführt.", "error");
      updateUi();
      return;
    }

    persist(result.state);
    els.input.value = "";
    els.input.style.height = "auto";
    renderMessages();
    updateUi();
    if (state.status === "message_limit_reached") els.limit.focus({ preventScroll: false });
    else els.input.focus();
  }

  els.form.addEventListener("submit", submitMessage);
  els.input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      els.form.requestSubmit();
    }
  });
  els.input.addEventListener("input", () => {
    els.input.style.height = "auto";
    els.input.style.height = `${Math.min(els.input.scrollHeight, 150)}px`;
  });
  els.register.addEventListener("click", () => {
    prepareHandover();
  });
  els.newSession.addEventListener("click", () => {
    sessionStorage.removeItem(policy.SESSION_KEY);
    sessionStorage.removeItem(policy.HANDOVER_KEY);
    persist(createState());
    setStatus("");
    renderMessages();
    updateUi();
    els.input.focus();
  });

  renderMessages();
  updateUi();
})();
