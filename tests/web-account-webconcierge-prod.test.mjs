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
const authNav = read("assets/auth-nav.js");

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
  assert.match(client, /me\?\.environment\s*!==\s*"PROD"/);
  assert.match(client, /me\?\.authoritative\s*!==\s*true/);
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

test("customer message appears immediately and browser sends only message plus canonical thread id", () => {
  assert.match(client, /appendMessage\("user",content,now,clientId,"WEB"\)/);
  assert.match(client, /showTyping\(\)/);
  assert.match(client, /gatewayRequest\("\/web\/chat"/);
  assert.match(client, /message:content,source_message_id:sourceMessageId,thread_id:activeThreadId/);
  assert.match(client, /response\?\.thread_id&&response\?\.thread_id!==activeThreadId/);
  assert.match(client, /renderCoreV1Response\(response\.core\)/);
  assert.match(client, /const returnedThreadId=String\(response\?\.thread_id\|\|""\)/);
  assert.doesNotMatch(client, /customer_account_id\s*:/);
  assert.doesNotMatch(client, /customer_member_id\s*:/);
  assert.doesNotMatch(client, /person_id\s*:/);
  assert.doesNotMatch(client, /service_role|SUPABASE_SERVICE_ROLE|core_decide_action_approval|core_create_action_request/);
  assert.match(client, /\/payg#quote-/);
});

test("webchat safely turns HTTPS URLs into clickable links", () => {
  assert.match(client, /function appendLinkifiedText\(container,text\)/);
  assert.match(client, /link\.target="_blank"/);
  assert.match(client, /link\.rel="noopener noreferrer"/);
  assert.match(client, /appendLinkifiedText\(body,text\)/);
  assert.doesNotMatch(client, /body\.innerHTML\s*=\s*text/);
  assert.match(css, /\.web-concierge-message-link\{/);
});

test("initial webchat hydration does not wait for readiness or optional channel summaries", () => {
  assert.match(client, /const initialHistoryPromise=\(async\(\)=>\{/);
  assert.match(client, /Promise\.allSettled\(\[/);
  assert.match(client, /channelHistoryRequest\("WHATSAPP",\{summary:true\}\)/);
  assert.match(client, /const \[data\]=await Promise\.all\(\[/);
  assert.match(client, /historyRequest\(threadId,\{limit:HISTORY_PAGE_SIZE\}\)/);
  assert.match(client, /refreshRoutedTurns\(\)\.catch/);
});

test("persisted chat history is authenticated, paginated and reuses the canonical PROD web gateway", () => {
  assert.match(client, /HISTORY_ENDPOINT = "https:\/\/djicahhmnnamtjuqedqd\.supabase\.co\/functions\/v1\/nahwerk-web-gateway\/web\/history"/);
  assert.match(client, /HISTORY_CONTRACT_VERSION = "canonical-core-receipts-v1"/);
  assert.match(client, /HISTORY_PAGE_SIZE = 60/);
  assert.match(client, /url\.pathname !== "\/functions\/v1\/nahwerk-web-gateway\/web\/history"/);
  assert.match(client, /payload\?\.history_contract!==HISTORY_CONTRACT_VERSION/);
  assert.match(client, /headers:\{Authorization:`Bearer \$\{token\}`\}/);
  assert.match(client, /historyRequest\(threadId,\{limit:HISTORY_PAGE_SIZE\}\)/);
  assert.match(client, /historyRequest\(threadId,\{before:historyNextBefore,limit:HISTORY_PAGE_SIZE\}\)/);
  assert.match(client, /Ältere Nachrichten laden/);
  assert.match(client, /crypto\.randomUUID\(\)/);
  assert.match(client, /webConciergeThreads/);
  assert.doesNotMatch(client, /nahwerk-web-chat-history/);
});

test("global WhatsApp decorator never injects a second brand logo into channel titles", () => {
  assert.match(authNav, /parent\.closest\("\.web-concierge-thread,\.web-concierge-thread-title,\.web-concierge-thread-title-text,\.web-concierge-channel-icon"\)/);
  assert.match(client, /channelIcon\(b\.dataset\.chatChannel\)/);
  assert.match(css, /\.web-concierge-thread\[data-chat-scope="CHANNEL"\] \.web-concierge-thread-title::before\{\s*content:none!important;\s*display:none!important;/);
});

test("Web Concierge keeps the normal Web/App chat separate from WhatsApp", () => {
  assert.match(client, /SYNC_INTERVAL_MS = 3000/);
  assert.match(client, /setInterval\(\(\)=>\{void syncHistory\(\);\},SYNC_INTERVAL_MS\)/);
  assert.match(client, /NORMAL_CHAT_CHANNELS=new Set\(\["WEB","APP"\]\)/);
  assert.match(client, /VIRTUAL_WHATSAPP_THREAD_ID/);
  assert.match(client, /title:"WhatsApp"/);
  assert.match(client, /channel_view:"WHATSAPP"/);
  assert.match(client, /primaryChatThreadId/);
  assert.match(client, /source\.find\(isNormalThread\)\|\|null/);
  assert.doesNotMatch(page, /web-customer-concierge-thread-scope\.js/);
  assert.doesNotMatch(cleanPage, /web-customer-concierge-thread-scope\.js/);
});

test("account Concierge entry opens the real main customer chat without a Web Chat layer", () => {
  assert.match(legacyUi, /const CHAT_URL = "\/web-concierge"/);
  assert.match(legacyUi, /data-account-tab="concierge"/);
  assert.match(legacyUi, /data-open-account-tab="concierge"/);
  assert.match(legacyUi, /location\.href = CHAT_URL/);
  assert.doesNotMatch(page, /Web Chat/i);
});

test("account overview reads the same authoritative central Concierge persona", () => {
  assert.match(legacyUi, /nahwerk-web-gateway/);
  assert.match(legacyUi, /\/web\/me/);
  assert.match(legacyUi, /method: "GET"/);
  assert.match(legacyUi, /body\?\.environment !== "PROD"/);
  assert.match(legacyUi, /body\?\.authoritative !== true/);
  assert.match(legacyUi, /renderOverviewPersona\(body\.persona\)/);
  assert.doesNotMatch(legacyUi, /method:\s*"POST"|method:\s*"PUT"|\/web\/chat|whatsapp/i);
});

test("chat header displays only the authoritative central Concierge persona", () => {
  assert.match(client, /await refreshPersona\(true\)/);
  assert.match(client, /applyPersona\(me\.persona\)/);
  assert.match(client, /raw\.display_name,raw\.name,raw\.persona_name,raw\.label/);
  assert.match(client, /webConciergeTitle/);
  assert.match(client, /assets\/concierges\/large/);
  assert.doesNotMatch(client, /\bNilo\b|"nilo"|'nilo'/i);
  const personaClient = client.slice(client.indexOf("function normalizePersona"), client.indexOf("function openConciergeSettings"));
  assert.doesNotMatch(personaClient, /localStorage\.(setItem|getItem)|localStorage\[/);
});

test("Concierge avatar and name open central Concierge settings", () => {
  assert.match(client, /SETTINGS_URL = "\/concierge-anpassen"/);
  assert.match(client, /title\.onclick = openConciergeSettings/);
  assert.match(client, /avatar\.onclick = openConciergeSettings/);
  assert.match(client, /title\.onkeydown/);
  assert.match(client, /avatar\.onkeydown/);
});

test("channel view state is initialized before boot", () => {
  assert.match(client, /let channelView = "CHAT";/);
  assert.match(client, /let channelViewReadOnly = false;/);
});

test("channel rendering is native and no MutationObserver shim is loaded", () => {
  assert.doesNotMatch(page, /web-customer-concierge-thread-scope\.js/);
  assert.doesNotMatch(cleanPage, /web-customer-concierge-thread-scope\.js/);
  assert.doesNotMatch(client, /new MutationObserver/);
});

test("E-Mail is a separate read-only protocol below phone history", () => {
  assert.match(client, /VIRTUAL_EMAIL_THREAD_ID/);
  assert.match(client, /title:"E-Mail-Protokoll"/);
  assert.match(client, /channel_view:"EMAIL"/);
  assert.match(client, /channelHistoryRequest\("EMAIL",\{summary:true\}\)/);
  assert.match(client, /view==="WHATSAPP"\|\|view==="PHONE"\|\|view==="EMAIL"/);
});

test("WhatsApp is a separate read-only protocol and cannot accidentally send as Web", () => {
  assert.match(client, /VIRTUAL_WHATSAPP_THREAD_ID/);
  assert.match(client, /channel_view:"WHATSAPP"/);
  assert.match(client, /channelViewReadOnly=view!=="CHAT"/);
  assert.match(client, /nahwerk:chat-channel-view/);
  assert.match(client, /WhatsApp-Verlauf – antworte in WhatsApp/);
  assert.match(client, /sending\|\|channelViewReadOnly/);
  assert.match(client, /channelHistoryRequest\("PHONE",\{summary:true\}\)/);
});

test("phone and email protocol entries stay mounted during every sidebar refresh", () => {
  assert.match(client, /threadCache=\[chatThread,whatsappThread,phoneThread,emailThread\]/);
  assert.match(client, /const next=\[chatThread,\{\.\.\.whatsappThread\},\{\.\.\.phoneThread\},\{\.\.\.emailThread\}\]/);
  assert.match(client, /thread_id:VIRTUAL_PHONE_THREAD_ID,title:"Telefonprotokoll"/);
  assert.match(client, /thread_id:VIRTUAL_EMAIL_THREAD_ID,title:"E-Mail-Protokoll"/);
});

test("legacy Shadow transport remains inert", () => {
  assert.doesNotMatch(shadow, /\bfetch\s*\(/);
  assert.doesNotMatch(shadow, /https?:\/\//);
  assert.doesNotMatch(shadow, /customer-portal-staging/);
  assert.match(shadow, /web_prod_gateway_required/);
  assert.match(shadow, /isEnabled: \(\) => false/);
  assert.match(legacyUi, /mount: \(\) => null/);
  assert.match(legacyUi, /isTransportEnabled: \(\) => false/);
  assert.doesNotMatch(legacyUi, /method:\s*"POST"|method:\s*"PUT"|method:\s*"PATCH"|method:\s*"DELETE"/);
  assert.doesNotMatch(legacyUi, /customer-portal-staging/);
});

test("customer PROD guard covers account PAYG and Web Concierge", () => {
  assert.ok(siteUi.includes(String.raw`(?:konto|payg|web-concierge|concierge-anpassen)(?:\.html)?\/?$`));
  assert.match(siteUi, /PROD web guard blocked a non-PROD endpoint/);
  assert.match(siteUi, /accountWebConciergeEntry/);
  assert.match(siteUi, /web-concierge/);
});

test("legacy and clean routes expose the same end-customer messenger", () => {
  for (const surface of [page,cleanPage]) {
    assert.match(surface, /Neuer Chat/);
    assert.match(surface, /Deine Chats/);
    assert.match(surface, /aria-label="Chatverlauf"/);
    assert.match(surface, /assets\/web-customer-concierge\.js\?v=50/);
    assert.doesNotMatch(surface, /web-customer-concierge-thread-scope\.js/);
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


test("chat can render contextual connection offers without introducing a second transport", () => {
  assert.match(client, /function renderConnectionOffer/);
  assert.match(client, /\/web\/integrations\/connect/);
  assert.match(client, /connection_offer/);
  assert.match(client, /Google|Microsoft|display_name/);
  assert.match(client, /renderIntegrationReturnNotice/);
});
