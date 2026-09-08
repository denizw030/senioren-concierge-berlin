#!/usr/bin/env node
const CANONICAL_GATEWAY = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-family-access";
const CONTRACT_SHA = "e63d09682c9a919a9ab347ff27d197f2a3c10a18";
const FEATURE_CODES = [
  "whatsapp_dialog","app_dialog","web_research","document_analysis","image_analysis",
  "image_generation","reminders","concierge_execution","phone_concierge","voice_input"
];

const gateway = String(process.env.FAMILY_GATEWAY_BASE || "").trim().replace(/\/+$/, "");
const token = String(process.env.FAMILY_RUNTIME_TOKEN || "").trim();
const mode = String(process.env.FAMILY_SMOKE_MODE || "read").toLowerCase();

if (gateway !== CANONICAL_GATEWAY) {
  throw new Error("FAMILY_GATEWAY_BASE must equal the canonical Family gateway.");
}
if (token.length < 32) throw new Error("FAMILY_RUNTIME_TOKEN is required (real authenticated web session token).");
if (!["read","full"].includes(mode)) throw new Error("FAMILY_SMOKE_MODE must be read or full.");

async function call(method, path, body, extraHeaders = {}) {
  const headers = { Authorization: `Bearer ${token}`, Accept: "application/json", ...extraHeaders };
  const init = { method, headers };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  const response = await fetch(gateway + path, init);
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.ok !== true) {
    throw new Error(`${method} ${path} failed: HTTP ${response.status} ${JSON.stringify(data)}`);
  }
  process.stdout.write(`GREEN ${method} ${path}\n`);
  return data;
}

const context = await call("GET", "/operator/context");
if (context?.operator?.role !== "OWNER" || context?.browser_actor_authority !== false) {
  throw new Error("Authenticated smoke actor is not a server-confirmed OWNER.");
}
const managed = await call("GET", "/operator/managed-people");
await call("GET", "/family/invitations");

const managedId = String(process.env.FAMILY_SMOKE_MANAGED_PERSON_ID || "").trim();
if (managedId) {
  await call("GET", `/operator/managed-people/${encodeURIComponent(managedId)}/entitlements`);
  await call("GET", `/operator/managed-people/${encodeURIComponent(managedId)}/usage`);
}

if (mode === "full") {
  if (process.env.FAMILY_SMOKE_DESTRUCTIVE_ACK !== "I_UNDERSTAND_THIS_REVOKES_TEST_ACCESS") {
    throw new Error("Full mode requires FAMILY_SMOKE_DESTRUCTIVE_ACK=I_UNDERSTAND_THIS_REVOKES_TEST_ACCESS.");
  }
  if (!managedId) throw new Error("Full mode requires FAMILY_SMOKE_MANAGED_PERSON_ID for a disposable managed-access fixture.");
  const ent = await call("GET", `/operator/managed-people/${encodeURIComponent(managedId)}/entitlements`);
  const currentEntitlements = Array.isArray(ent.entitlements)
    ? ent.entitlements.map((row) => ({ feature_code: String(row.feature_code), included_quantity: Number(row.included_quantity) }))
    : [];
  if (!currentEntitlements.length || currentEntitlements.some((row) => !FEATURE_CODES.includes(row.feature_code) || !Number.isFinite(row.included_quantity))) {
    throw new Error("Disposable fixture has no valid sponsored entitlements to round-trip.");
  }
  await call("PUT", `/operator/managed-people/${encodeURIComponent(managedId)}/entitlements`, { entitlements: currentEntitlements });
  await call("POST", `/operator/managed-people/${encodeURIComponent(managedId)}/suspend`, {});
  await call("POST", `/operator/managed-people/${encodeURIComponent(managedId)}/resume`, {});

  let inviteInput;
  try { inviteInput = JSON.parse(String(process.env.FAMILY_SMOKE_INVITATION_JSON || "")); }
  catch { throw new Error("FAMILY_SMOKE_INVITATION_JSON must be valid JSON in full mode."); }
  const invite = await call(
    "POST",
    "/operator/managed-people/invitations",
    inviteInput,
    { "Idempotency-Key": `family-runtime-smoke-${Date.now()}` }
  );
  const invitationId = String(invite.invitation?.id || invite.id || "").trim();
  if (!invitationId) throw new Error("Invitation smoke did not return an invitation id.");
  await call("POST", `/family/invitations/${encodeURIComponent(invitationId)}/revoke`, {});
  await call("POST", `/operator/managed-people/${encodeURIComponent(managedId)}/revoke`, {});
}

process.stdout.write(`FAMILY RUNTIME SMOKE GREEN · contract ${CONTRACT_SHA} · mode ${mode} · managed=${Array.isArray(managed.people) ? managed.people.length : 0}\n`);
