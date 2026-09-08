import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import { webcrypto } from "node:crypto";

const require = createRequire(import.meta.url);
const runtimeConfig = require("../api/runtime-config.js");
const js = fs.readFileSync("assets/family-owner-sponsored-access.js", "utf8");
const konto = fs.readFileSync("konto.html", "utf8");
const smoke = fs.readFileSync("scripts/family-runtime-smoke.mjs", "utf8");

function hooks() {
  const sandbox = { console, URL, TextEncoder, Uint8Array, crypto: webcrypto };
  vm.createContext(sandbox);
  vm.runInContext(js, sandbox);
  return sandbox.NAHWERKFamilyOwnerTestHooks;
}
function response(status, body) {
  return { status, ok: status >= 200 && status < 300, json: async () => body };
}

const h = hooks();
const TOKEN = "r".repeat(40);
const SHA = "e63d09682c9a919a9ab347ff27d197f2a3c10a18";
const GATEWAY = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-family-access";
const ID = "00000000-0000-4000-8000-000000000501";

test("deployment runtime config is fail-closed and only enables the canonical gateway", () => {
  assert.equal(runtimeConfig.PLATFORM_CONTRACT_SHA, SHA);
  assert.equal(runtimeConfig.PREPARED_FAMILY_GATEWAY_BASE, GATEWAY);
  assert.deepEqual(runtimeConfig.resolveFamilyRuntimeConfig({}), {
    ok: true,
    family_contract: "family-owner-sponsored-access-v1",
    platform_contract_sha: SHA,
    family_runtime_enabled: false,
    family_gateway_base: null,
  });
  assert.equal(runtimeConfig.resolveFamilyRuntimeConfig({ FAMILY_GATEWAY_BASE: "https://example.invalid" }).family_runtime_enabled, false);
  assert.deepEqual(runtimeConfig.resolveFamilyRuntimeConfig({ FAMILY_GATEWAY_BASE: GATEWAY + "/" }), {
    ok: true,
    family_contract: "family-owner-sponsored-access-v1",
    platform_contract_sha: SHA,
    family_runtime_enabled: true,
    family_gateway_base: GATEWAY,
  });
});

test("browser runtime contract and konto metadata are synchronized", () => {
  assert.equal(h.PLATFORM_CONTRACT_SHA, SHA);
  assert.equal(h.PREPARED_FAMILY_GATEWAY_BASE, GATEWAY);
  assert.equal(h.RUNTIME_CONFIG_ENDPOINT, "/api/runtime-config");
  assert.match(konto, new RegExp('data-family-platform-sha="' + SHA + '"'));
  assert.match(konto, /data-family-runtime="inert"/);
});

test("runtime config parser rejects every partial or mismatched activation", () => {
  const valid = { ok: true, family_contract: h.PLATFORM_CONTRACT, platform_contract_sha: SHA, family_runtime_enabled: true, family_gateway_base: GATEWAY };
  assert.equal(h.runtimeConfigGateway(valid), GATEWAY);
  for (const bad of [
    { ...valid, ok: false },
    { ...valid, family_contract: "wrong" },
    { ...valid, platform_contract_sha: "0".repeat(40) },
    { ...valid, family_runtime_enabled: false },
    { ...valid, family_gateway_base: "https://example.invalid" },
    { ...valid, family_gateway_base: null },
  ]) assert.equal(h.runtimeConfigGateway(bad), null);
});

test("runtime config loader performs exactly one same-origin config read and returns canonical base", async () => {
  const calls = [];
  const out = await h.loadRuntimeGateway({
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return response(200, { ok: true, family_contract: h.PLATFORM_CONTRACT, platform_contract_sha: SHA, family_runtime_enabled: true, family_gateway_base: GATEWAY });
    },
  });
  assert.equal(out, GATEWAY);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "/api/runtime-config");
  assert.equal(calls[0].init.method, "GET");
  assert.equal(calls[0].init.cache, "no-store");
  assert.equal(calls[0].init.credentials, "same-origin");
});

test("exact final gateway contract paths are wired including invitation revoke", async () => {
  const seen = [];
  const fetchImpl = async (url, init) => {
    const path = new URL(url).pathname;
    seen.push([init.method || "GET", path]);
    if (path.endsWith("/operator/context")) return response(200, { ok: true, operator: { role: "OWNER", can_manage_sponsored_people: true }, browser_actor_authority: false });
    if (path.endsWith("/operator/managed-people")) return response(200, { ok: true, people: [] });
    if (path.endsWith("/family/invitations")) return response(200, { ok: true, invitations: [] });
    if (path.endsWith("/entitlements") && (init.method || "GET") === "GET") return response(200, { ok: true, entitlements: [] });
    if (path.endsWith("/entitlements") && init.method === "PUT") return response(200, { ok: true, entitlements: [] });
    if (path.endsWith("/usage")) return response(200, { ok: true, usage: [] });
    if (/\/(suspend|resume|revoke)$/.test(path)) return response(200, { ok: true, status: "ACTIVE" });
    return response(200, { ok: true });
  };
  await h.getOperatorContext({ base: GATEWAY, token: TOKEN, fetchImpl });
  await h.getManagedPeople({ base: GATEWAY, token: TOKEN, fetchImpl });
  await h.getInvitations({ base: GATEWAY, token: TOKEN, fetchImpl });
  await h.getEntitlements({ base: GATEWAY, token: TOKEN, id: ID, fetchImpl });
  await h.updateEntitlements({ base: GATEWAY, token: TOKEN, id: ID, entitlements: [], fetchImpl });
  await h.getUsage({ base: GATEWAY, token: TOKEN, id: ID, fetchImpl });
  await h.transition({ base: GATEWAY, token: TOKEN, id: ID, operation: "suspend", fetchImpl });
  await h.transition({ base: GATEWAY, token: TOKEN, id: ID, operation: "resume", fetchImpl });
  await h.transition({ base: GATEWAY, token: TOKEN, id: ID, operation: "revoke", fetchImpl });
  await h.revokeInvitation({ base: GATEWAY, token: TOKEN, id: ID, fetchImpl });
  assert.deepEqual(seen.map(([method, path]) => [method, path.slice(path.indexOf("/operator") >= 0 ? path.indexOf("/operator") : path.indexOf("/family"))]), [
    ["GET", "/operator/context"],
    ["GET", "/operator/managed-people"],
    ["GET", "/family/invitations"],
    ["GET", "/operator/managed-people/" + ID + "/entitlements"],
    ["PUT", "/operator/managed-people/" + ID + "/entitlements"],
    ["GET", "/operator/managed-people/" + ID + "/usage"],
    ["POST", "/operator/managed-people/" + ID + "/suspend"],
    ["POST", "/operator/managed-people/" + ID + "/resume"],
    ["POST", "/operator/managed-people/" + ID + "/revoke"],
    ["POST", "/family/invitations/" + ID + "/revoke"],
  ]);
});

test("runtime smoke harness covers safe read mode plus explicit destructive full mode", () => {
  for (const route of [
    "/operator/context",
    "/operator/managed-people",
    "/family/invitations",
    "/entitlements",
    "/usage",
    "/suspend",
    "/resume",
    "/revoke",
    "/operator/managed-people/invitations",
  ]) assert.ok(smoke.includes(route), route);
  assert.match(smoke, /FAMILY_SMOKE_MODE/);
  assert.match(smoke, /I_UNDERSTAND_THIS_REVOKES_TEST_ACCESS/);
  assert.ok(smoke.includes(SHA));
  assert.ok(smoke.includes(GATEWAY));
});
