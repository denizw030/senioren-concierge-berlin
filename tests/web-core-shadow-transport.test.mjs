import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../assets/web-core-shadow.js", import.meta.url), "utf8");
const konto = readFileSync(new URL("../konto.html", import.meta.url), "utf8");

test("legacy compatibility asset may remain loaded but contains no STAGING transport", () => {
  assert.match(konto, /assets\/web-core-shadow\.js\?v=1/);
  assert.doesNotMatch(source, /staging/i);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /https?:\/\//);
});

test("legacy shadow adapter is permanently disabled", () => {
  assert.match(source, /isEnabled: \(\) => false/);
  assert.match(source, /reason: "web_prod_gateway_required"/);
  assert.match(source, /shadow_only: false/);
  assert.match(source, /customer_delivery: false/);
});

test("legacy adapter cannot construct browser identity or pending customer work", () => {
  assert.match(source, /createPendingTurn: \(\) => null/);
  assert.match(source, /readPending: \(\) => null/);
  assert.doesNotMatch(source, /person_id\s*:/);
  assert.doesNotMatch(source, /customer_account_id\s*:/);
  assert.doesNotMatch(source, /Authorization/);
  assert.doesNotMatch(source, /Idempotency-Key/);
});
