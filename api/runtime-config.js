const PLATFORM_CONTRACT = "family-owner-sponsored-access-v1";
const PLATFORM_CONTRACT_SHA = "e63d09682c9a919a9ab347ff27d197f2a3c10a18";
const PREPARED_FAMILY_GATEWAY_BASE = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-family-access";

function normalizeGatewayBase(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\/+$/, "");
  return normalized || null;
}

function resolveFamilyRuntimeConfig(env = process.env) {
  const configured = normalizeGatewayBase(env.FAMILY_GATEWAY_BASE);
  const enabled = configured === PREPARED_FAMILY_GATEWAY_BASE;
  return {
    ok: true,
    family_contract: PLATFORM_CONTRACT,
    platform_contract_sha: PLATFORM_CONTRACT_SHA,
    family_runtime_enabled: enabled,
    family_gateway_base: enabled ? PREPARED_FAMILY_GATEWAY_BASE : null,
  };
}

function runtimeConfigHandler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  const body = resolveFamilyRuntimeConfig(process.env);
  if (req.method === "HEAD") return res.status(200).end();
  return res.status(200).json(body);
}

module.exports = runtimeConfigHandler;
module.exports.resolveFamilyRuntimeConfig = resolveFamilyRuntimeConfig;
module.exports.normalizeGatewayBase = normalizeGatewayBase;
module.exports.PLATFORM_CONTRACT = PLATFORM_CONTRACT;
module.exports.PLATFORM_CONTRACT_SHA = PLATFORM_CONTRACT_SHA;
module.exports.PREPARED_FAMILY_GATEWAY_BASE = PREPARED_FAMILY_GATEWAY_BASE;
