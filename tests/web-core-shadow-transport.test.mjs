import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../assets/web-core-shadow.js", import.meta.url), "utf8");
const konto = readFileSync(new URL("../konto.html", import.meta.url), "utf8");

test("web shadow transport is loaded only from the isolated branch asset", () => {
  assert.match(konto, /assets\/web-core-shadow\.js\?v=1/);
});

test("web shadow transport is disabled by default", () => {
  assert.match(source, /window\.NAHWERK_WEB_SHADOW_ENABLED === true/);
  assert.match(source, /sessionStorage\.getItem\(ENABLE_KEY\) === "1"/);
  assert.doesNotMatch(source, /NAHWERK_WEB_SHADOW_ENABLED\s*=\s*true/);
});

test("web shadow transport preserves stable retry identifiers", () => {
  assert.match(source, /source_message_id: sourceMessageId/);
  assert.match(source, /Idempotency-Key": pending\.source_message_id/);
  assert.match(source, /sendPending\(sourceMessageId\)/);
  assert.match(source, /PENDING_PREFIX \+ sourceMessageId/);
  assert.match(source, /channel_session_id: channelSessionId\(\)/);
});

test("browser never supplies canonical identity fields", () => {
  assert.doesNotMatch(source, /person_id\s*:/);
  assert.doesNotMatch(source, /customer_account_id\s*:/);
  assert.doesNotMatch(source, /customer_member_id\s*:/);
});

test("browser sends only the authenticated web session bearer", () => {
  assert.match(source, /Authorization": "Bearer " \+ token/);
  assert.match(source, /const SESSION_KEY = "scb_web_session"/);
});

test("shadow response cannot become customer-visible core output", () => {
  assert.match(source, /customer_delivery: false/);
  assert.doesNotMatch(source, /innerHTML/);
  assert.doesNotMatch(source, /textContent\s*=/);
  assert.doesNotMatch(source, /appendChild/);
  assert.doesNotMatch(source, /\.messages/);
});

test("retry failure keeps pending turn rather than changing customer flow", () => {
  assert.match(source, /pending\.state = "RETRYABLE"/);
  assert.match(source, /writePending\(pending\)/);
});
