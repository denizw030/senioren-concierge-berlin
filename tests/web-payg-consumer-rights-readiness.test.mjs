import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const guard = read("assets/payg-consumer-rights-guard.js");
const payg = read("payg.html");
const withdrawalInfo = read("widerruf.html");
const withdrawalPage = read("vertrag-widerrufen.html");
const withdrawalRuntime = read("assets/electronic-withdrawal.js");

test("PAYG consumer-rights gate is wired into the real customer page", () => {
  assert.match(payg, /assets\/payg-consumer-rights-guard\.js\?v=2/);
  assert.match(guard, /functions\/v1\/web-payg/);
  assert.doesNotMatch(guard, /staging|shadow/i);
});

test("paid quote approval is fail-closed until the authoritative legal contract is complete", () => {
  assert.match(guard, /payg-consumer-rights-v1/);
  assert.match(guard, /source\.authoritative === true/);
  assert.match(guard, /source\.electronic_withdrawal_function === true/);
  assert.match(guard, /source\.immediate_performance_consent_evidence === true/);
  assert.match(guard, /source\.order_confirmation_durable_medium === true/);
  assert.match(guard, /legal_text_version/);
  assert.match(guard, /legal_text_sha256/);
  assert.match(guard, /\^\[0-9a-f\]\{64\}\$/);
  assert.match(guard, /consumer_rights_evidence_required/);
});

test("future authoritative approval carries version-bound immediate-performance evidence", () => {
  assert.match(guard, /immediate_performance_requested:true/);
  assert.match(guard, /withdrawal_expiry_acknowledged:true/);
  assert.match(guard, /legal_text_version:contract\.legal_text_version/);
  assert.match(guard, /legal_text_sha256:contract\.legal_text_sha256/);
  assert.match(guard, /accepted_at_client:new Date\(\)\.toISOString\(\)/);
  assert.match(guard, /body\.consumer_rights_evidence = \{ \.\.\.pendingEvidence \}/);
});

test("electronic withdrawal UI asks only required identification and confirmation-channel data", () => {
  assert.match(withdrawalPage, />Vertrag widerrufen</);
  assert.match(withdrawalPage, /id="withdrawName"/);
  assert.match(withdrawalPage, /id="withdrawReference"/);
  assert.match(withdrawalPage, /id="withdrawEmail"/);
  assert.match(withdrawalPage, /id="withdrawConfirm"[^>]*disabled>Widerruf bestätigen/);
  assert.doesNotMatch(withdrawalPage, /Widerrufsgrund|reason/i);
});

test("electronic withdrawal stays fail-closed until authoritative durable confirmation is available", () => {
  assert.match(withdrawalRuntime, /CONTRACT_VERSION = "payg-consumer-rights-v1"/);
  assert.match(withdrawalRuntime, /web-payg-consumer-rights/);
  assert.match(withdrawalRuntime, /electronic_withdrawal_function === true/);
  assert.match(withdrawalRuntime, /durable_confirmation === true/);
  assert.match(withdrawalRuntime, /confirmation_delivery_state === "SENT"/);
  assert.match(withdrawalRuntime, /statement:"WITHDRAW"/);
  assert.doesNotMatch(withdrawalRuntime, /staging|shadow/i);
});

test("withdrawal information contains current provider details and electronic-function link", () => {
  assert.match(withdrawalInfo, /NAHWERK Concierge/);
  assert.match(withdrawalInfo, /Deniz Wannenmacher/);
  assert.match(withdrawalInfo, /Osdorfer Straße 108/);
  assert.match(withdrawalInfo, /dw@nahwerkconcierge\.com/);
  assert.match(withdrawalInfo, /Elektronische Widerrufsfunktion/);
  assert.doesNotMatch(withdrawalInfo, /legal-placeholder/);
  assert.match(payg, /vertrag-widerrufen\.html/);
});

test("one-off PAYG legal surface does not invent subscription cancellation semantics", () => {
  assert.match(withdrawalInfo, /einzelnen PAYG-Auftrag/);
  assert.match(withdrawalInfo, /keine zusätzliche Abo- oder Dauerschuldlogik/);
});
