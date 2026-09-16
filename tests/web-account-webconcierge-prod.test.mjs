import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const page = read("web-concierge.html");
const cleanPage = read("web-concierge/index.html");
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
  assert.match(client, /location\.replace\("\/anmelden"\)/);
});

test("Web Concierge is pinned to the exact active PROD gateway and never STAGING", () => {
  assert.match(client, /GATEWAY_CONTRACT_VERSION = "web-gateway-v1"/);
  assert.match(client, /https:\/\/djicahhmnnamtjuqedqd\.supabase\.co\/functions\/v1\/nahwerk-web-gateway/);
  assert.match(client, /url\.pathname !== "\/functions\/v1\/nahwerk-web-gateway"/);
  assert.match(client, /staging\|shadow/i);
  assert.doesNotMatch(client, /web-concierge-gateway/);
  assert.doesNotMatch(client, /customer-portal-staging/);
});

test("gateway readiness proves PROD WEB and CAO authority plus canonical server identity", () => {
  assert.match(client, /gatewayRequest\("\/health",\{ auth:false \}\)/);
  assert.match(client, /gatewayRequest\("\/web\/me"\)/);
  assert.match(client, /raw\.service === "nahwerk-web-gateway"/);
  assert.match(client, /raw\.production === true/);
  assert.match(client, /raw\.contract_version === GATEWAY_CONTRACT_VERSION/);
  assert.match(client, /raw\.web_route_authoritative === true/);
  assert.match(client, /raw\.cao_web_authoritative === true/);
  assert.match(client, /raw\.fail_safe === "closed"/);
  assert.match(client, /me\?\.environment !== "PROD"/);
  assert.match(client, /me\?\.authoritative !== true/);
  for (const field of ["person_id","customer_account_id","customer_member_id"]) assert.ok(client.includes(field));
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

test("browser sends only customer message input and never owns identity or Core business logic", () => {
  assert.match(client, /gatewayRequest\("\/web\/chat"/);
  assert.match(client, /message:content, source_message_id:crypto\.randomUUID\(\)/);
  assert.match(client, /renderCoreV1Response\(response\.core\)/);
  assert.doesNotMatch(client, /customer_account_id\s*:/);
  assert.doesNotMatch(client, /customer_member_id\s*:/);
  assert.doesNotMatch(client, /person_id\s*:/);
  assert.doesNotMatch(client, /service_role|SUPABASE_SERVICE_ROLE|core_decide_action_approval|core_create_action_request/);
  assert.doesNotMatch(client, /gateway\("(?:readiness|turn|approval|sync)"/);
  assert.doesNotMatch(client, /POLLABLE_STATES/);
  assert.match(client, /\/payg#quote-/);
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
  assert.ok(siteUi.includes(String.raw`(?:konto|payg|web-concierge)(?:\.html)?\/?$`));
  assert.match(siteUi, /PROD web guard blocked a non-PROD endpoint/);
  assert.match(siteUi, /accountWebConciergeEntry/);
  assert.match(siteUi, /web-concierge/);
});

test("legacy and clean Web Concierge pages expose the same current contract", () => {
  for (const surface of [page,cleanPage]) {
    assert.match(surface, /web-gateway-v1/);
    assert.match(surface, /assets\/web-customer-concierge\.js\?v=4/);
    assert.match(surface, /Keine Shadow-Antworten/);
    assert.doesNotMatch(surface, /web-concierge-gateway-v1/);
  }
});

test("Web Concierge surface is responsive and does not claim execution success locally", () => {
  const css = read("assets/web-customer-concierge.css");
  assert.match(css, /@media\(max-width:700px\)/);
  assert.match(css, /web-concierge-approval-actions/);
  assert.doesNotMatch(page, /erfolgreich gesendet|Auftrag ausgeführt|Nachricht gesendet/i);
  assert.match(page, /Keine Shadow-Antworten/);
});
