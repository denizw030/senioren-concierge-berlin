import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const page = read("web-concierge.html");
const client = read("assets/web-customer-concierge.js");
const shadow = read("assets/web-core-shadow.js");
const legacyUi = read("assets/web-concierge-chat.js");
const siteUi = read("assets/site-ui.js");

test("authenticated Web Concierge surface is present and fail closed by default", () => {
  assert.match(page, /Dein Web Concierge/);
  assert.match(page, /id="webConciergeLog"/);
  assert.match(page, /id="webConciergeInput"[^>]*disabled/);
  assert.match(page, /id="webConciergeSend"[^>]*disabled/);
  assert.match(page, /assets\/auth-nav\.js/);
  assert.match(client, /SCBAuth\?\.validateSession/);
  assert.match(client, /setComposerReady\(false\)/);
});

test("Web Concierge is pinned to one exact PROD gateway and never STAGING", () => {
  assert.match(client, /GATEWAY_CONTRACT_VERSION = "web-concierge-gateway-v1"/);
  assert.match(client, /https:\/\/djicahhmnnamtjuqedqd\.supabase\.co\/functions\/v1\/web-concierge-gateway/);
  assert.match(client, /url\.pathname !== "\/functions\/v1\/web-concierge-gateway"/);
  assert.match(client, /staging\|shadow/i);
  assert.doesNotMatch(client, /customer-portal-staging/);
});

test("gateway readiness must prove WEB Core and CAO authority before enabling composer", () => {
  assert.match(client, /raw\.contract_version === GATEWAY_CONTRACT_VERSION/);
  assert.match(client, /raw\.core_contract_version === CORE_CONTRACT_VERSION/);
  assert.match(client, /toUpperCase\(\) === "WEB"/);
  assert.match(client, /raw\.authoritative === true/);
  assert.match(client, /raw\.cao_authoritative === true/);
  assert.match(client, /raw\.shadow === false/);
  assert.match(client, /gatewayReady = readiness\?\.ready === true/);
});

test("website renderer consumes exact Core v1 authoritative response semantics only", () => {
  assert.match(client, /CORE_CONTRACT_VERSION = "core-v1"/);
  for (const field of ["response_id","conversation_id","turn_id","active_task_id","response_state","messages","pending_approval","action_refs","error","state_version","correlation_id"]) {
    assert.ok(client.includes(field), `missing Core v1 response field ${field}`);
  }
  assert.match(client, /delivery\.shadow === false/);
  assert.match(client, /delivery\.deliver === true/);
  assert.match(client, /delivery\.channel \|\| ""\)\.toUpperCase\(\) === "WEB"/);
  assert.match(client, /!response\.authoritative/);
});

test("browser sends content or bound approval only and never owns identity or Core business logic", () => {
  assert.match(client, /gateway\("turn",\{ source_message_id:crypto\.randomUUID\(\), content \}\)/);
  assert.match(client, /gateway\("approval",\{ source_message_id:crypto\.randomUUID\(\), approval_id:approvalId, decision \}\)/);
  assert.doesNotMatch(client, /customer_account_id\s*:/);
  assert.doesNotMatch(client, /customer_member_id\s*:/);
  assert.doesNotMatch(client, /person_id\s*:/);
  assert.doesNotMatch(client, /service_role|SUPABASE_SERVICE_ROLE|core_decide_action_approval|core_create_action_request/);
  assert.match(client, /payg\.html/);
});

test("legacy Shadow transport and UI remain inert", () => {
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

test("Web Concierge surface is responsive and does not claim execution success locally", () => {
  const css = read("assets/web-customer-concierge.css");
  assert.match(css, /@media\(max-width:700px\)/);
  assert.match(css, /web-concierge-approval-actions/);
  assert.doesNotMatch(page, /erfolgreich gesendet|Auftrag ausgeführt|Nachricht gesendet/i);
  assert.match(page, /Keine Shadow-Antworten/);
});
