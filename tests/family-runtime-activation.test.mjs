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
const pagesConfig = JSON.parse(fs.readFileSync("api/runtime-config.json", "utf8"));

function hooks() {
  const sandbox = { console, URL, TextEncoder, Uint8Array, crypto: webcrypto };
  vm.createContext(sandbox);
  vm.runInContext(js, sandbox);
  return sandbox.NAHWERKFamilyOwnerTestHooks;
}
function response(status, body, options = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    redirected: options.redirected === true,
    json: async () => {
      if (options.jsonError) throw new Error("invalid_json");
      return body;
    },
  };
}

const h = hooks();
const TOKEN = "r".repeat(40);
const SHA = "e63d09682c9a919a9ab347ff27d197f2a3c10a18";
const GATEWAY = "https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-family-access";
const CONTRACT = "family-owner-sponsored-access-v1";
const ID = "00000000-0000-4000-8000-000000000501";
const VALID = { ok: true, family_contract: CONTRACT, platform_contract_sha: SHA, family_runtime_enabled: true, family_gateway_base: GATEWAY };

test("deployment runtime config is fail-closed and only enables the canonical gateway", () => {
  assert.equal(runtimeConfig.PLATFORM_CONTRACT_SHA, SHA);
  assert.equal(runtimeConfig.PREPARED_FAMILY_GATEWAY_BASE, GATEWAY);
  assert.deepEqual(runtimeConfig.resolveFamilyRuntimeConfig({}), {
    ok: true,
    family_contract: CONTRACT,
    platform_contract_sha: SHA,
    family_runtime_enabled: false,
    family_gateway_base: null,
  });
  assert.equal(runtimeConfig.resolveFamilyRuntimeConfig({ FAMILY_GATEWAY_BASE: "https://example.invalid" }).family_runtime_enabled, false);
  assert.deepEqual(runtimeConfig.resolveFamilyRuntimeConfig({ FAMILY_GATEWAY_BASE: GATEWAY + "/" }), VALID);
});

test("GitHub Pages static runtime config is exact public routing metadata", () => {
  assert.deepEqual(pagesConfig, VALID);
  assert.equal(Object.keys(pagesConfig).sort().join(","), [
    "family_contract","family_gateway_base","family_runtime_enabled","ok","platform_contract_sha"
  ].sort().join(","));
});

test("browser runtime contract and konto metadata are synchronized", () => {
  assert.equal(h.PLATFORM_CONTRACT_SHA, SHA);
  assert.equal(h.PREPARED_FAMILY_GATEWAY_BASE, GATEWAY);
  assert.equal(h.RUNTIME_CONFIG_ENDPOINT, "/api/runtime-config");
  assert.equal(h.PAGES_RUNTIME_CONFIG_ENDPOINT, "/api/runtime-config.json");
  assert.match(konto, new RegExp('data-family-platform-sha="' + SHA + '"'));
  assert.match(konto, /data-family-runtime="inert"/);
});

test("runtime config parser rejects every partial or mismatched activation", () => {
  assert.equal(h.runtimeConfigGateway(VALID), GATEWAY);
  for (const bad of [
    { ...VALID, ok: false },
    { ...VALID, family_contract: "wrong" },
    { ...VALID, platform_contract_sha: "0".repeat(40) },
    { ...VALID, family_runtime_enabled: false },
    { ...VALID, family_gateway_base: "https://example.invalid" },
    { ...VALID, family_gateway_base: null },
  ]) assert.equal(h.runtimeConfigGateway(bad), null);
});

test("Vercel/serverless runtime config remains primary and uses one same-origin read", async () => {
  const calls = [];
  const out = await h.loadRuntimeGateway({
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return response(200, VALID);
    },
  });
  assert.equal(out, GATEWAY);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "/api/runtime-config");
  assert.equal(calls[0].init.method, "GET");
  assert.equal(calls[0].init.cache, "no-store");
  assert.equal(calls[0].init.credentials, "same-origin");
});

test("GitHub Pages activates only after primary 404/405 and exact static config", async () => {
  for (const absentStatus of [404, 405]) {
    const calls = [];
    const out = await h.loadRuntimeGateway({
      fetchImpl: async (url, init) => {
        calls.push({ url, init });
        if (url === "/api/runtime-config") return response(absentStatus, null);
        if (url === "/api/runtime-config.json") return response(200, VALID);
        throw new Error("unexpected_url");
      },
    });
    assert.equal(out, GATEWAY);
    assert.deepEqual(calls.map((row) => row.url), ["/api/runtime-config", "/api/runtime-config.json"]);
    assert.ok(calls.every((row) => row.init.cache === "no-store" && row.init.credentials === "same-origin"));
  }
});

test("missing static config, static 404 and invalid JSON all remain inert", async () => {
  for (const staticResponse of [
    response(404, null),
    response(200, null, { jsonError: true }),
  ]) {
    const out = await h.loadRuntimeGateway({
      fetchImpl: async (url) => url === "/api/runtime-config" ? response(404, null) : staticResponse,
    });
    assert.equal(out, null);
  }
});

test("wrong Pages contract, SHA, gateway or enabled flag remain inert", async () => {
  for (const bad of [
    { ...VALID, family_contract: "wrong" },
    { ...VALID, platform_contract_sha: "0".repeat(40) },
    { ...VALID, family_gateway_base: "https://example.invalid" },
    { ...VALID, family_runtime_enabled: false },
  ]) {
    const out = await h.loadRuntimeGateway({
      fetchImpl: async (url) => url === "/api/runtime-config" ? response(404, null) : response(200, bad),
    });
    assert.equal(out, null);
  }
});

test("redirects, unexpected primary responses and network errors never activate or fall back", async () => {
  for (const primary of [
    response(200, VALID, { redirected: true }),
    response(200, null, { jsonError: true }),
    response(500, VALID),
  ]) {
    let calls = 0;
    const out = await h.loadRuntimeGateway({ fetchImpl: async () => { calls++; return primary; } });
    assert.equal(out, null);
    assert.equal(calls, 1);
  }
  assert.equal(await h.loadRuntimeGateway({ fetchImpl: async () => { throw new Error("network"); } }), null);
});

test("operator authorization matrix hides normal users and gates entitlement management", () => {
  const normal = { ok: true, operator: { role: "CUSTOMER", can_manage_sponsored_people: false, can_manage_sponsored_entitlements: false }, browser_actor_authority: false };
  const ownerNoPeople = { ok: true, operator: { role: "OWNER", can_manage_sponsored_people: false, can_manage_sponsored_entitlements: true }, browser_actor_authority: false };
  const ownerNoQuota = { ok: true, operator: { role: "OWNER", can_manage_sponsored_people: true, can_manage_sponsored_entitlements: false }, browser_actor_authority: false };
  const ownerFull = { ok: true, operator: { role: "OWNER", can_manage_sponsored_people: true, can_manage_sponsored_entitlements: true }, browser_actor_authority: false };
  const browserAuthority = { ...ownerFull, browser_actor_authority: true };
  assert.equal(h.operatorContextAllowed(normal), false);
  assert.equal(h.operatorContextAllowed(ownerNoPeople), false);
  assert.equal(h.operatorContextAllowed(ownerNoQuota), true);
  assert.equal(h.canManageEntitlements(ownerNoQuota), false);
  assert.equal(h.operatorContextAllowed(ownerFull), true);
  assert.equal(h.canManageEntitlements(ownerFull), true);
  assert.equal(h.operatorContextAllowed(browserAuthority), false);
  assert.equal(h.canManageEntitlements(browserAuthority), false);
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
