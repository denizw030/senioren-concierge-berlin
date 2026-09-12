import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const page = read("web-concierge.html");
const client = read("assets/web-customer-concierge.js");
const shadow = read("assets/web-core-shadow.js");
const legacyUi = read("assets/web-concierge-chat.js");
const siteUi = read("assets/site-ui.js");

test("authenticated Web Concierge surface is present and fail closed", () => {
  assert.match(page, /Dein Web Concierge/);
  assert.match(page, /id="webConciergeLog"/);
  assert.match(page, /id="webConciergeInput"[^>]*disabled/);
  assert.match(page, /id="webConciergeSend"[^>]*disabled/);
  assert.match(page, /assets\/auth-nav\.js/);
  assert.match(client, /SCBAuth\?\.validateSession/);
  assert.doesNotMatch(client, /\bfetch\s*\(/);
});

test("Web Concierge accepts only a future exact PROD project endpoint and never STAGING", () => {
  assert.match(client, /NAHWERK_WEB_CONCIERGE_PROD_ENDPOINT/);
  assert.match(client, /djicahhmnnamtjuqedqd\.supabase\.co/);
  assert.match(client, /\/functions\/v1\//);
  assert.match(client, /staging\|shadow/i);
  assert.doesNotMatch(client, /customer-portal-staging/);
});

test("website renderer consumes exact Core v1 response semantics only", () => {
  assert.match(client, /CORE_CONTRACT_VERSION = "core-v1"/);
  for (const field of ["response_id","conversation_id","turn_id","active_task_id","response_state","messages","pending_approval","action_refs","error","state_version","correlation_id"]) {
    assert.ok(client.includes(field), `missing Core v1 response field ${field}`);
  }
  assert.match(client, /delivery\.shadow === false/);
  assert.match(client, /delivery\.deliver === true/);
  assert.match(client, /delivery\.channel \|\| ""\)\.toUpperCase\(\) === "WEB"/);
  assert.match(client, /if \(!response\.authoritative\) return false/);
});

test("website does not own Approval or Action business logic", () => {
  assert.match(client, /Freigabe bleibt an die vom Core gelieferte offene Aktion gebunden/);
  assert.doesNotMatch(client, /approve_quote|cancel_quote|core_decide_action_approval|create_action_request/);
  assert.doesNotMatch(client, /service_role|SUPABASE_SERVICE_ROLE|x-nahwerk-service/);
});

test("legacy Shadow transport and UI have no network path", () => {
  for (const source of [shadow, legacyUi]) {
    assert.doesNotMatch(source, /\bfetch\s*\(/);
    assert.doesNotMatch(source, /https?:\/\//);
    assert.doesNotMatch(source, /customer-portal-staging/);
  }
  assert.match(shadow, /web_prod_gateway_required/);
  assert.match(shadow, /isEnabled: \(\) => false/);
  assert.match(legacyUi, /mount: \(\) => null/);
});

test("customer PROD guard covers account PAYG and Web Concierge", () => {
  assert.match(siteUi, /\(\?:konto\|payg\|web-concierge\)\\\.html/);
  assert.match(siteUi, /PROD web guard blocked a non-PROD endpoint/);
  assert.match(siteUi, /accountWebConciergeEntry/);
  assert.match(siteUi, /web-concierge\.html/);
});

test("Web Concierge surface is responsive and does not claim customer success", () => {
  const css = read("assets/web-customer-concierge.css");
  assert.match(css, /@media\(max-width:700px\)/);
  assert.match(css, /web-concierge-runtime-card/);
  assert.doesNotMatch(page, /erfolgreich gesendet|Auftrag ausgeführt|Nachricht gesendet/i);
  assert.match(page, /Keine Shadow-Antworten/);
});
