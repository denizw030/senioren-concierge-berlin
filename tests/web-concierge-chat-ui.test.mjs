import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../assets/web-concierge-chat.js", import.meta.url), "utf8");
const konto = readFileSync(new URL("../konto.html", import.meta.url), "utf8");

test("legacy compatibility asset may remain loaded for the account entry", () => {
  assert.match(konto, /assets\/web-concierge-chat\.js\?v=4/);
});

test("legacy Shadow chat UI and transport remain permanently disabled", () => {
  assert.match(source, /isEnabled: \(\) => false/);
  assert.match(source, /isTransportEnabled: \(\) => false/);
  assert.match(source, /mount: \(\) => null/);
  assert.doesNotMatch(source, /NAHWERKWebCoreShadow/);
  assert.doesNotMatch(source, /customer_delivery/);
  assert.doesNotMatch(source, /method:\s*"POST"|method:\s*"PUT"|method:\s*"PATCH"|method:\s*"DELETE"/);
});

test("account helper performs only authenticated central persona read plus local rendering", () => {
  assert.match(source, /ta832v8wah\.execute-api\.eu-central-1\.amazonaws\.com\/prod\/v1\/web/);
  assert.match(source, /\/me/);
  assert.match(source, /method: "GET"/);
  assert.match(source, /renderOverviewPersona\(body\.persona\)/);
  assert.match(source, /overviewConcierge/);
  assert.doesNotMatch(source, /staging/i);
  assert.doesNotMatch(source, /\/web\/chat|approval_id|action_id|task_id/);
  assert.doesNotMatch(source, /\bNilo\b|"nilo"|'nilo'/i);
});
