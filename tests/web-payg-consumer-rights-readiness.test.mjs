import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const guard = read("assets/payg-consumer-rights-guard.js");
const payg = read("payg.html");
const withdrawal = read("widerruf.html");

test("PAYG consumer-rights gate is wired into the real customer page", () => {
  assert.match(payg, /assets\/payg-consumer-rights-guard\.js/);
  assert.match(guard, /functions\/v1\/web-payg/);
  assert.doesNotMatch(guard, /staging|shadow/i);
});

test("paid quote approval is fail-closed until the authoritative legal contract is complete", () => {
  assert.match(guard, /payg-consumer-rights-v1/);
  assert.match(guard, /electronic_withdrawal_function === true/);
  assert.match(guard, /immediate_performance_consent_evidence === true/);
  assert.match(guard, /order_confirmation_durable_medium === true/);
  assert.match(guard, /consumer_rights_evidence_required/);
  assert.match(guard, /button\[data-quote-action="approve"\]/);
});

test("future authoritative approval carries explicit immediate-performance evidence", () => {
  assert.match(guard, /immediate_performance_requested: true/);
  assert.match(guard, /withdrawal_expiry_acknowledged: true/);
  assert.match(guard, /accepted_at_client: new Date\(\)\.toISOString\(\)/);
  assert.match(guard, /body\.consumer_rights_evidence = \{ \.\.\.pendingEvidence \}/);
});

test("electronic withdrawal link can only come from an approved NAHWERK HTTPS origin", () => {
  assert.match(guard, /https:\/\/nahwerkconcierge\.com/);
  assert.match(guard, /https:\/\/www\.nahwerkconcierge\.com/);
  assert.match(guard, /url\.protocol === "https:"/);
  assert.match(guard, /Vertrag widerrufen/);
});

test("withdrawal page contains real current provider contact details and no operator placeholder", () => {
  assert.match(withdrawal, /NAHWERK Concierge/);
  assert.match(withdrawal, /Deniz Wannenmacher/);
  assert.match(withdrawal, /Osdorfer Straße 108/);
  assert.match(withdrawal, /dw@nahwerkconcierge\.com/);
  assert.match(withdrawal, /Elektronische Widerrufsfunktion/);
  assert.doesNotMatch(withdrawal, /legal-placeholder/);
});

test("one-off PAYG legal surface does not invent subscription cancellation semantics", () => {
  assert.match(withdrawal, /einzelnen PAYG-Auftrag/);
  assert.match(withdrawal, /keine zusätzliche Abo- oder Dauerschuldlogik/);
});
