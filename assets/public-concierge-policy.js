(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.NahwerkPublicChatPolicy = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const VERSION = "nahwerk-public-web-concierge-v1";
  const LIMITS = Object.freeze({
    maxUserMessages: 12,
    maxDirectModelCostUsd: 0.02,
    maxResponseChars: 1400,
    maxContextMessages: 24,
    maxContextChars: 9000,
  });
  const MODEL = Object.freeze({ family: "GPT-5.6 Luna", automaticEscalation: false });
  const HANDOVER_KEY = "nahwerk_public_chat_handover_v1";
  const SESSION_KEY = "nahwerk_public_chat_v1";

  const ACTION_TERMS = [
    "anrufen", "telefonier", "whatsapp", "e-mail", "email", "buch", "reservier", "kauf", "bezahl",
    "websuche", "web search", "safety", "notfall", "überweis", "bestell"
  ];

  function freshState(visitorSessionId, conversationId) {
    return {
      version: VERSION,
      visitor_session_id: visitorSessionId,
      conversation_id: conversationId,
      user_message_count: 0,
      direct_model_cost_usd: 0,
      status: "active",
      messages: [
        {
          role: "assistant",
          content: "Hallo. Ich bin dein persönlicher NAHWERK Concierge. Du kannst mir dein Anliegen direkt schildern – ich helfe dir, es zu klären oder einen Auftrag vorzubereiten. In dieser öffentlichen Vorschau führe ich noch keine externen Aktionen aus."
        }
      ],
      intent_summary: "",
      updated_at: new Date().toISOString(),
    };
  }

  function normalizeState(state) {
    if (!state || state.version !== VERSION) return null;
    if (!/^vis_[0-9a-f-]{36}$/i.test(String(state.visitor_session_id || ""))) return null;
    if (!/^vconv_[0-9a-f-]{36}$/i.test(String(state.conversation_id || ""))) return null;
    const count = Number(state.user_message_count || 0);
    const cost = Number(state.direct_model_cost_usd || 0);
    if (!Number.isInteger(count) || count < 0 || count > LIMITS.maxUserMessages) return null;
    if (!Number.isFinite(cost) || cost < 0) return null;
    const messages = Array.isArray(state.messages) ? state.messages.slice(-LIMITS.maxContextMessages) : [];
    return { ...state, user_message_count: count, direct_model_cost_usd: cost, messages };
  }

  function evaluateTurn(state, estimatedTurnCostUsd) {
    const normalized = normalizeState(state);
    if (!normalized) return { ok: false, reason: "invalid_session_state" };
    const estimate = Number(estimatedTurnCostUsd || 0);
    if (!Number.isFinite(estimate) || estimate < 0) return { ok: false, reason: "invalid_cost_estimate" };
    if (normalized.user_message_count >= LIMITS.maxUserMessages) return { ok: false, reason: "message_limit_reached" };
    if (normalized.direct_model_cost_usd + estimate > LIMITS.maxDirectModelCostUsd + 1e-9) return { ok: false, reason: "cost_budget_reached" };
    return { ok: true };
  }

  function compactContext(messages) {
    const kept = [];
    let chars = 0;
    for (let i = messages.length - 1; i >= 0 && kept.length < LIMITS.maxContextMessages; i -= 1) {
      const item = messages[i];
      if (!item || !["user", "assistant"].includes(item.role) || typeof item.content !== "string") continue;
      const content = item.content.slice(0, 2400);
      if (chars + content.length > LIMITS.maxContextChars) break;
      kept.unshift({ role: item.role, content });
      chars += content.length;
    }
    return kept;
  }

  function summarizeIntent(messages) {
    const userMessages = messages.filter((item) => item.role === "user").map((item) => item.content.trim()).filter(Boolean);
    if (!userMessages.length) return "";
    return userMessages.slice(-3).join(" · ").slice(0, 700);
  }

  function requestsAction(text) {
    const normalized = String(text || "").toLowerCase();
    return ACTION_TERMS.some((term) => normalized.includes(term));
  }

  function fixtureReply(text) {
    const normalized = String(text || "").trim().toLowerCase();
    if (!normalized) return "Schilder mir kurz dein Anliegen – ich helfe dir, es zu strukturieren.";
    if (requestsAction(normalized)) {
      return "Ich kann diesen Auftrag mit dir vollständig vorbereiten und die nötigen Angaben sammeln. In der öffentlichen Vorschau darf ich jedoch nichts extern ausführen: keine Anrufe, Nachrichten, Buchungen, Käufe, Zahlungen, Websuche oder Safety-Eskalationen. Nach der Registrierung kann der Auftrag kontrolliert in den authentifizierten Concierge übernommen werden.";
    }
    if (/was kannst|wie funktioniert|nahwerk|concierge/.test(normalized)) {
      return "NAHWERK ist als persönlicher Concierge gedacht: Anliegen verstehen, Informationen ordnen, Aufgaben vorbereiten und – nach Anmeldung und mit den nötigen Freigaben – echte Ausführungen koordinieren. Hier im Besucher-Modus kannst du schon normal mit mir sprechen und dein Anliegen vorbereiten, ohne Kundenkonto und ohne externe Aktion.";
    }
    if (/termin|arzt|restaurant|reise|ticket|handwerker/.test(normalized)) {
      return "Das lässt sich gut vorbereiten. Nenne mir bitte die wichtigsten Rahmenbedingungen – zum Beispiel Ort, gewünschte Zeit, Prioritäten und was auf keinen Fall passieren soll. Ich halte den Kontext in dieser Besucher-Sitzung zusammen; ausgeführt wird hier noch nichts.";
    }
    return "Verstanden. Ich kann das Anliegen mit dir Schritt für Schritt schärfen, fehlende Angaben sammeln und daraus einen klaren Auftrag machen. Solange du Besucher bist, bleibt alles im eingeschränkten Visitor Mode: Gespräch ja, externe Ausführung nein.";
  }

  function appendFixtureTurn(state, userText) {
    const gate = evaluateTurn(state, 0);
    if (!gate.ok) return { ok: false, reason: gate.reason, state };
    const clean = String(userText || "").trim().slice(0, 2400);
    if (!clean) return { ok: false, reason: "empty_message", state };
    const reply = fixtureReply(clean).slice(0, LIMITS.maxResponseChars);
    const messages = compactContext([
      ...state.messages,
      { role: "user", content: clean },
      { role: "assistant", content: reply },
    ]);
    const count = state.user_message_count + 1;
    const next = {
      ...state,
      user_message_count: count,
      status: count >= LIMITS.maxUserMessages ? "message_limit_reached" : "active",
      messages,
      intent_summary: summarizeIntent(messages),
      updated_at: new Date().toISOString(),
    };
    return { ok: true, state: next, reply };
  }

  function buildHandoverPayload(state) {
    const normalized = normalizeState(state);
    if (!normalized) return null;
    return {
      contract: VERSION,
      status: "backend_contract_missing",
      visitor_session_id: normalized.visitor_session_id,
      conversation_id: normalized.conversation_id,
      intent_summary: summarizeIntent(normalized.messages),
      transcript: compactContext(normalized.messages),
      user_message_count: normalized.user_message_count,
      created_for: "post_registration_canonical_handover",
    };
  }

  return {
    VERSION,
    LIMITS,
    MODEL,
    SESSION_KEY,
    HANDOVER_KEY,
    freshState,
    normalizeState,
    evaluateTurn,
    compactContext,
    summarizeIntent,
    requestsAction,
    fixtureReply,
    appendFixtureTurn,
    buildHandoverPayload,
  };
});
