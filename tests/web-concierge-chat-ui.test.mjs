import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../assets/web-concierge-chat.js", import.meta.url), "utf8");
const konto = readFileSync(new URL("../konto.html", import.meta.url), "utf8");

test("legacy chat asset may remain loaded for compatibility", () => {
  assert.match(konto, /assets\/web-concierge-chat\.js\?v=1/);
});

test("legacy Shadow chat UI is permanently disabled", () => {
  assert.match(source, /isEnabled: \(\) => false/);
  assert.match(source, /isTransportEnabled: \(\) => false/);
  assert.match(source, /mount: \(\) => null/);
});

test("legacy chat has no network, STAGING, Shadow rendering or customer semantics", () => {
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /staging/i);
  assert.doesNotMatch(source, /NAHWERKWebCoreShadow/);
  assert.doesNotMatch(source, /customer_delivery/);
  assert.doesNotMatch(source, /innerHTML|textContent|appendChild/);
  assert.doesNotMatch(source, /person_id|customer_account_id|approval_id|action_id|task_id/);
});
