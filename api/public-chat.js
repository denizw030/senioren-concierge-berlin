"use strict";

const CONTRACT_VERSION = "nahwerk-public-web-concierge-v1";
const MODEL_POLICY = Object.freeze({
  family: "GPT-5.6 Luna",
  runtime_model_id_env: "PUBLIC_CHAT_LUNA_MODEL_ID",
  automatic_escalation: false,
  forbidden_families: ["Terra", "Sol", "Realtime"],
});

const VISITOR_LIMITS = Object.freeze({
  max_user_messages: 12,
  max_direct_model_cost_usd: 0.02,
  max_response_chars: 1400,
  max_context_messages: 24,
  max_context_chars: 9000,
  request_burst: 4,
  request_burst_window_ms: 10_000,
  min_request_interval_ms: 650,
});

const VISITOR_AUTHORITY = Object.freeze({
  allowed: ["chat", "explain_capabilities", "prepare_task", "collect_required_information"],
  denied: [
    "phone_call",
    "whatsapp_send",
    "email_send",
    "booking",
    "purchase",
    "payment",
    "paid_web_search",
    "web_search",
    "voice",
    "provider_tools",
    "safety_escalation",
    "external_action",
    "approval_authority",
    "customer_memory_write",
    "account_entitlement_consume",
  ],
});

const FORBIDDEN_IDENTITY_FIELDS = [
  "person_id",
  "customer_account_id",
  "account_id",
  "entitlements",
  "account_entitlements",
  "approval_id",
];

function json(res, status, body) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.status(status).json(body);
}

function isVisitorSessionId(value) {
  return /^vis_[0-9a-f-]{36}$/i.test(String(value || ""));
}

function isVisitorConversationId(value) {
  return /^vconv_[0-9a-f-]{36}$/i.test(String(value || ""));
}

function containsForbiddenIdentity(body) {
  return FORBIDDEN_IDENTITY_FIELDS.some((key) => body?.[key] != null);
}

function requestsExternalAuthority(body) {
  const requested = [];
  if (typeof body?.requested_capability === "string") requested.push(body.requested_capability);
  if (typeof body?.requested_action === "string") requested.push(body.requested_action);
  if (Array.isArray(body?.tools)) requested.push(...body.tools.map(String));
  if (Array.isArray(body?.capabilities)) requested.push(...body.capabilities.map(String));
  return requested.some((value) => VISITOR_AUTHORITY.denied.includes(value));
}

function validatePublicChatRequest(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, status: 400, error: "invalid_request" };
  }
  if (!isVisitorSessionId(body.visitor_session_id)) {
    return { ok: false, status: 400, error: "invalid_visitor_session" };
  }
  if (!isVisitorConversationId(body.conversation_id)) {
    return { ok: false, status: 400, error: "invalid_visitor_conversation" };
  }
  if (containsForbiddenIdentity(body)) {
    return { ok: false, status: 403, error: "customer_identity_forbidden_in_visitor_mode" };
  }
  if (requestsExternalAuthority(body)) {
    return { ok: false, status: 403, error: "visitor_authority_denied" };
  }
  if (body.model != null || body.model_family != null || body.allow_model_escalation != null) {
    return { ok: false, status: 403, error: "visitor_model_override_forbidden" };
  }
  if (typeof body.message !== "string" || !body.message.trim() || body.message.length > 2400) {
    return { ok: false, status: 400, error: "invalid_message" };
  }
  return { ok: true };
}

function authorizeVisitorTurn(serverState, estimatedTurnCostUsd) {
  if (!serverState || serverState.authoritative !== true) {
    return { ok: false, reason: "authoritative_server_state_required" };
  }

  const messages = Number(serverState.user_message_count || 0);
  const spent = Number(serverState.direct_model_cost_usd || 0);
  const estimate = Number(estimatedTurnCostUsd);
  if (!Number.isFinite(messages) || messages < 0 || !Number.isFinite(spent) || spent < 0) {
    return { ok: false, reason: "invalid_server_state" };
  }
  if (!Number.isFinite(estimate) || estimate < 0) {
    return { ok: false, reason: "invalid_cost_estimate" };
  }
  if (messages >= VISITOR_LIMITS.max_user_messages) {
    return { ok: false, reason: "message_limit_reached" };
  }
  if (spent + estimate > VISITOR_LIMITS.max_direct_model_cost_usd + 1e-9) {
    return { ok: false, reason: "cost_budget_reached" };
  }
  return {
    ok: true,
    next_user_message_count: messages + 1,
    max_user_messages: VISITOR_LIMITS.max_user_messages,
    remaining_cost_usd: Number((VISITOR_LIMITS.max_direct_model_cost_usd - spent - estimate).toFixed(6)),
  };
}

function publicChatHandler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { ok: false, error: "method_not_allowed", contract: CONTRACT_VERSION });
  }

  const validation = validatePublicChatRequest(req.body);
  if (!validation.ok) {
    return json(res, validation.status, { ok: false, error: validation.error, contract: CONTRACT_VERSION });
  }

  // Fail closed until the canonical server-side visitor ledger + Luna adapter are connected.
  // This endpoint intentionally performs no provider call and never trusts browser counters as authority.
  return json(res, 503, {
    ok: false,
    status: "visitor_runtime_not_connected",
    provider_called: false,
    action_executed: false,
    customer_memory_written: false,
    account_entitlement_consumed: false,
    contract: CONTRACT_VERSION,
    model_policy: MODEL_POLICY,
    limits: VISITOR_LIMITS,
  });
}

module.exports = publicChatHandler;
module.exports.CONTRACT_VERSION = CONTRACT_VERSION;
module.exports.MODEL_POLICY = MODEL_POLICY;
module.exports.VISITOR_LIMITS = VISITOR_LIMITS;
module.exports.VISITOR_AUTHORITY = VISITOR_AUTHORITY;
module.exports.FORBIDDEN_IDENTITY_FIELDS = FORBIDDEN_IDENTITY_FIELDS;
module.exports.isVisitorSessionId = isVisitorSessionId;
module.exports.isVisitorConversationId = isVisitorConversationId;
module.exports.containsForbiddenIdentity = containsForbiddenIdentity;
module.exports.requestsExternalAuthority = requestsExternalAuthority;
module.exports.validatePublicChatRequest = validatePublicChatRequest;
module.exports.authorizeVisitorTurn = authorizeVisitorTurn;
