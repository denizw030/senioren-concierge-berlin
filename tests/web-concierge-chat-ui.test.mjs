import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../assets/web-concierge-chat.js", import.meta.url), "utf8");
const konto = readFileSync(new URL("../konto.html", import.meta.url), "utf8");

test("web chat UI asset is loaded after Core shadow transport", () => {
  const shadow = konto.indexOf('assets/web-core-shadow.js?v=1');
  const chat = konto.indexOf('assets/web-concierge-chat.js?v=1');
  assert.ok(shadow >= 0);
  assert.ok(chat > shadow);
});

test("web chat UI is disabled by default behind its own guard", () => {
  assert.match(source, /window\.NAHWERK_WEB_CHAT_UI_ENABLED === true/);
  assert.match(source, /sessionStorage\.getItem\(UI_ENABLE_KEY\) === "1"/);
  assert.doesNotMatch(source, /NAHWERK_WEB_CHAT_UI_ENABLED\s*=\s*true/);
  assert.match(source, /if \(!enabled\(\)\) return null/);
});

test("UI delegates transport to the thin WEB shadow adapter only", () => {
  assert.match(source, /window\.NAHWERKWebCoreShadow/);
  assert.match(source, /adapter\.sendTurn\(message\)/);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /nahwerk-customer-portal-staging/);
});

test("browser UI owns no canonical identity or concierge semantics", () => {
  assert.doesNotMatch(source, /\bperson_id\s*:/);
  assert.doesNotMatch(source, /\bcustomer_account_id\s*:/);
  assert.doesNotMatch(source, /\bcustomer_member_id\s*:/);
  assert.doesNotMatch(source, /\bapproval_id\s*:/);
  assert.doesNotMatch(source, /\baction_id\s*:/);
  assert.doesNotMatch(source, /\btask_id\s*:/);
  assert.doesNotMatch(source, /memory_fact/);
});

test("shadow result cannot be rendered as a concierge answer", () => {
  assert.match(source, /result\?\.customer_delivery !== true/);
  assert.match(source, /Array\.isArray\(result\?\.messages\)/);
  assert.match(source, /Shadow verarbeitet – noch keine Kundenausgabe\./);
});

test("rendering uses textContent and never innerHTML", () => {
  assert.match(source, /line\.textContent =/);
  assert.doesNotMatch(source, /innerHTML/);
});

test("UI requires the underlying shadow transport to be enabled too", () => {
  assert.match(source, /typeof adapter\.isEnabled === "function" && adapter\.isEnabled\(\)/);
  assert.match(source, /if \(!transportEnabled\(\)\)/);
});
