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
const css = read("assets/web-customer-concierge.css");

test("authenticated Web Concierge is a customer messenger and remains fail closed internally", () => {
  assert.match(page, /Dein Concierge/);
  for (const id of ["webConciergeNewChat","webConciergeThreads","webConciergeLog","webConciergeInput","webConciergeSend"]) assert.ok(page.includes(`id="${id}"`));
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
  assert.match(client, /gatewayRequest\("\/health",\{auth:false\}\)/);
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
  for (const field of ["response_id","conversation_id","turn_id","active_task_id","response_state","messages","pending_approval","action_refs","error","state_version","correlation_id"]) assert.ok(client.includes(field), `missing Core v1 response field ${field}`);
  assert.match(client, /delivery\.shadow === false/);
  assert.match(client, /delivery\.deliver === true/);
  assert.match(client, /delivery\.channel \|\| ""\)\.toUpperCase\(\) === "WEB"/);
  assert.match(client, /!response\|\|!response\.authoritative/);
});

test("customer message appears immediately and browser sends only message plus thread correlation", () => {
  assert.match(client, /appendMessage\("user",content,now,clientId\)/);
  assert.match(client, /showTyping\(\)/);
  assert.match(client, /gatewayRequest\("\/web\/chat"/);
  assert.match(client, /message:content,source_message_id:sourceMessageId,correlation_id:activeThreadId/);
  assert.match(client, /renderCoreV1Response\(response\.core\)/);
  assert.doesNotMatch(client, /customer_account_id\s*:/);
  assert.doesNotMatch(client, /customer_member_id\s*:/);
  assert.doesNotMatch(client, /person_id\s*:/);
  assert.doesNotMatch(client, /service_role|SUPABASE_SERVICE_ROLE|core_decide_action_approval|core_create_action_request/);
  assert.match(client, /\/payg#quote-/);
});

test("persisted chat history is authenticated and uses the dedicated PROD history function", () => {
  assert.match(client, /HISTORY_ENDPOINT = "https:\/\/djicahhmnnamtjuqedqd\.supabase\.co\/functions\/v1\/nahwerk-web-chat-history"/);
  assert.match(client, /headers:\{Authorization:`Bearer \$\{token\}`\}/);
  assert.match(client, /historyRequest\(threadId\)/);
  assert.match(client, /crypto\.randomUUID\(\)/);
  assert.match(client, /webConciergeThreads/);
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

test("legacy and clean routes expose the same end-customer messenger", () => {
  for (const surface of [page,cleanPage]) {
    assert.match(surface, /Neuer Chat/);
    assert.match(surface, /Deine Chats/);
    assert.match(surface, /aria-label="Chatverlauf"/);
    assert.match(surface, /assets\/web-customer-concierge\.js\?v=6/);
    assert.doesNotMatch(surface, /PROD|autoritativ|Core-v1|web-gateway-v1|Fail-closed|Shadow-Antworten|kanonische Kundenidentität/i);
  }
});

test("messenger is tall, responsive and uses compact user/assistant bubbles", () => {
  assert.match(css, /height:clamp\(680px/);
  assert.match(css, /web-concierge-sidebar/);
  assert.match(css, /web-concierge-message-user/);
  assert.match(css, /web-concierge-message-assistant/);
  assert.match(css, /web-concierge-message-time/);
  assert.match(css, /@media\(max-width:820px\)/);
  assert.match(css, /web-concierge-approval-actions/);
  assert.doesNotMatch(page, /erfolgreich gesendet|Auftrag ausgeführt|Nachricht gesendet/i);
});
