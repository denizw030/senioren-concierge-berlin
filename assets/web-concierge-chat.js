(() => {
  "use strict";

  const UI_ENABLE_KEY = "nw_web_chat_ui_enabled_v1";
  const ROOT_ID = "nw-web-chat-ui-v1";

  function enabled() {
    return window.NAHWERK_WEB_CHAT_UI_ENABLED === true ||
      sessionStorage.getItem(UI_ENABLE_KEY) === "1";
  }

  function transport() {
    return window.NAHWERKWebCoreShadow || null;
  }

  function transportEnabled() {
    const adapter = transport();
    return Boolean(adapter && typeof adapter.isEnabled === "function" && adapter.isEnabled());
  }

  function createElement(tag, attrs = {}, text = "") {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === "class") el.className = String(value);
      else el.setAttribute(key, String(value));
    });
    if (text) el.textContent = text;
    return el;
  }

  function addStyles() {
    if (document.getElementById(ROOT_ID + "-styles")) return;
    const style = createElement("style", { id: ROOT_ID + "-styles" });
    style.textContent = `
      #${ROOT_ID} {
        position: fixed;
        right: 22px;
        bottom: 22px;
        z-index: 2147482000;
        width: min(390px, calc(100vw - 28px));
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
        color: #f7f5ef;
      }
      #${ROOT_ID} * { box-sizing: border-box; }
      #${ROOT_ID} .nw-chat-shell {
        overflow: hidden;
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 24px;
        background: rgba(10,14,19,.96);
        box-shadow: 0 24px 70px rgba(0,0,0,.34);
        backdrop-filter: blur(24px);
      }
      #${ROOT_ID} .nw-chat-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 14px;
        padding: 18px 18px 14px;
        border-bottom: 1px solid rgba(255,255,255,.08);
      }
      #${ROOT_ID} .nw-chat-title {
        margin: 0;
        font-size: 16px;
        font-weight: 760;
        letter-spacing: -.015em;
      }
      #${ROOT_ID} .nw-chat-subtitle {
        margin: 4px 0 0;
        color: rgba(247,245,239,.62);
        font-size: 12px;
        line-height: 1.4;
      }
      #${ROOT_ID} .nw-chat-badge {
        flex: 0 0 auto;
        padding: 5px 8px;
        border: 1px solid rgba(214,184,115,.32);
        border-radius: 999px;
        color: #d9bd7d;
        font-size: 10px;
        font-weight: 780;
        letter-spacing: .04em;
        text-transform: uppercase;
      }
      #${ROOT_ID} .nw-chat-log {
        display: grid;
        gap: 10px;
        min-height: 180px;
        max-height: 330px;
        overflow: auto;
        padding: 16px 16px 10px;
      }
      #${ROOT_ID} .nw-chat-line {
        max-width: 86%;
        padding: 10px 12px;
        border-radius: 16px;
        font-size: 13px;
        line-height: 1.5;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }
      #${ROOT_ID} .nw-chat-line.is-user {
        justify-self: end;
        background: rgba(255,255,255,.11);
      }
      #${ROOT_ID} .nw-chat-line.is-core {
        justify-self: start;
        border: 1px solid rgba(214,184,115,.20);
        background: rgba(214,184,115,.08);
      }
      #${ROOT_ID} .nw-chat-line.is-status {
        max-width: 100%;
        justify-self: stretch;
        padding: 7px 4px;
        color: rgba(247,245,239,.56);
        background: transparent;
        font-size: 11px;
        text-align: center;
      }
      #${ROOT_ID} .nw-chat-form {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 9px;
        padding: 12px;
        border-top: 1px solid rgba(255,255,255,.08);
      }
      #${ROOT_ID} .nw-chat-input {
        width: 100%;
        min-width: 0;
        min-height: 44px;
        max-height: 120px;
        resize: vertical;
        padding: 11px 12px;
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 14px;
        outline: none;
        background: rgba(255,255,255,.055);
        color: inherit;
        font: inherit;
        font-size: 13px;
        line-height: 1.45;
      }
      #${ROOT_ID} .nw-chat-input:focus {
        border-color: rgba(214,184,115,.55);
        box-shadow: 0 0 0 3px rgba(214,184,115,.08);
      }
      #${ROOT_ID} .nw-chat-send {
        align-self: end;
        min-height: 44px;
        padding: 0 16px;
        border: 0;
        border-radius: 14px;
        background: #d9bd7d;
        color: #17130c;
        font: inherit;
        font-size: 12px;
        font-weight: 800;
        cursor: pointer;
      }
      #${ROOT_ID} .nw-chat-send:disabled {
        opacity: .45;
        cursor: default;
      }
      @media (max-width: 520px) {
        #${ROOT_ID} {
          right: 14px;
          bottom: 14px;
          width: calc(100vw - 28px);
        }
      }
    `;
    document.head.appendChild(style);
  }

  function appendLine(log, kind, text) {
    const line = createElement("div", {
      class: "nw-chat-line " + kind,
      role: kind === "is-status" ? "status" : "article"
    });
    line.textContent = String(text || "");
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
    return line;
  }

  function renderDeliveredCoreMessages(log, result) {
    if (result?.customer_delivery !== true || !Array.isArray(result?.messages)) return 0;
    let rendered = 0;
    result.messages.forEach((message) => {
      if (message?.type !== "text" || typeof message?.text !== "string") return;
      const text = message.text.trim();
      if (!text) return;
      appendLine(log, "is-core", text);
      rendered += 1;
    });
    return rendered;
  }

  async function submitTurn(log, input, button) {
    const message = input.value.trim();
    if (!message) return;

    const adapter = transport();
    if (!adapter || typeof adapter.sendTurn !== "function") {
      appendLine(log, "is-status", "Web-Concierge-Transport ist nicht verfügbar.");
      return;
    }
    if (!transportEnabled()) {
      appendLine(log, "is-status", "Web-Concierge-Testtransport ist deaktiviert.");
      return;
    }

    input.value = "";
    button.disabled = true;
    appendLine(log, "is-user", message);

    try {
      const result = await adapter.sendTurn(message);
      if (result?.ok !== true) {
        appendLine(log, "is-status", result?.retryable === true
          ? "Testübertragung fehlgeschlagen. Die Nachricht bleibt für einen Retry erhalten."
          : "Testübertragung nicht ausgeführt.");
        return;
      }

      const rendered = renderDeliveredCoreMessages(log, result);
      if (!rendered) {
        appendLine(log, "is-status", "Shadow verarbeitet – noch keine Kundenausgabe.");
      }
    } catch (_) {
      appendLine(log, "is-status", "Web-Concierge-Testtransport ist momentan nicht erreichbar.");
    } finally {
      button.disabled = false;
      input.focus();
    }
  }

  function mount() {
    if (!enabled()) return null;
    if (document.getElementById(ROOT_ID)) return document.getElementById(ROOT_ID);

    addStyles();

    const root = createElement("section", {
      id: ROOT_ID,
      "aria-label": "NAHWERK Web Concierge Testoberfläche",
      "data-web-chat-ui": "shadow-only"
    });
    const shell = createElement("div", { class: "nw-chat-shell" });
    const head = createElement("header", { class: "nw-chat-head" });
    const copy = createElement("div");
    const title = createElement("h2", { class: "nw-chat-title" }, "NAHWERK Concierge");
    const subtitle = createElement(
      "p",
      { class: "nw-chat-subtitle" },
      "Isolierte Web-Adapter-Abnahme · keine Kundenausgabe"
    );
    const badge = createElement("span", { class: "nw-chat-badge" }, "Shadow");
    const log = createElement("div", {
      class: "nw-chat-log",
      "aria-live": "polite",
      "aria-relevant": "additions"
    });
    const form = createElement("form", { class: "nw-chat-form" });
    const input = createElement("textarea", {
      class: "nw-chat-input",
      rows: "1",
      maxlength: "4000",
      placeholder: "Nachricht an Ihren Concierge",
      "aria-label": "Nachricht an den NAHWERK Concierge"
    });
    const button = createElement("button", {
      class: "nw-chat-send",
      type: "submit"
    }, "Senden");

    copy.appendChild(title);
    copy.appendChild(subtitle);
    head.appendChild(copy);
    head.appendChild(badge);
    form.appendChild(input);
    form.appendChild(button);
    shell.appendChild(head);
    shell.appendChild(log);
    shell.appendChild(form);
    root.appendChild(shell);
    document.body.appendChild(root);

    appendLine(
      log,
      "is-status",
      transportEnabled()
        ? "Shadow-Testtransport bereit."
        : "UI bereit. Shadow-Testtransport bleibt deaktiviert."
    );

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      submitTurn(log, input, button);
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        form.requestSubmit();
      }
    });

    return root;
  }

  const api = Object.freeze({
    isEnabled: enabled,
    isTransportEnabled: transportEnabled,
    mount
  });

  window.NAHWERKWebChatUI = api;

  if (enabled()) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => mount(), { once: true });
    } else {
      mount();
    }
  }
})();
