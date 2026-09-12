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
  assert.match(page, /id="webConciergeInput"[^>]*disabled/);
  assert.match(page, /id="webConciergeSend"[^>]*disabled/);
  assert.match(page, /assets\/auth-nav\.js/);
  assert.match(client, /SCBAuth\?\.validateSession/);
  assert.doesNotMatch(client, /\bfetch\s*\(/);
});

test("Web Concierge accepts only a future exact PROD project endpoint and never STAGING", () => {
  assert.match(client, /NAHWERK_WEB_CONCIERGE_PROD_ENDPOINT/);
  assert.match(client, /NAHWERK_WEB_CONCIERGE_CLIENT_CONTRACT/);
  assert.match(client, /djicahhmnnamtjuqedqd\.supabase\.co/);
  assert.match(client, /\/functions\/v1\//);
  assert.match(client, /staging\|shadow/i);
  assert.doesNotMatch(client, /customer-portal-staging/);
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
  assert.doesNotMatch(page, /erfolgreich gesendet|Auftrag ausgeführt|Nachricht gesendet/i);
  assert.match(page, /Keine Shadow-Antworten/);
});
