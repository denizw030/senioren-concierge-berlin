import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const visibleText = (source) => source
  .replace(/<script[\s\S]*?<\/script>/gi, " ")
  .replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<!--[\s\S]*?-->/g, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ");

const quotedStrings = (source) => source.match(/"(?:\\.|[^"\\\n\r])*"|'(?:\\.|[^'\\\n\r])*'|`(?:\\.|[^`\\\n\r])*`/g) || [];

test("Block 3 STEWARO surfaces expose no static legacy brand copy", () => {
  const pages = [
    "de/index.html",
    "anmelden.html",
    "registrieren.html",
    "konto.html",
    "web-concierge.html",
    "email-concierge.html",
    "safety.html",
    "telefonannahme.html",
    "pakete.html",
    "payg.html",
    "concierge-anpassen.html"
  ];
  for (const page of pages) {
    const text = visibleText(read(page));
    assert.doesNotMatch(text, /NAHWERK|Nahwerk/, `${page} still exposes legacy visible copy`);
    assert.match(text, /STEWARO/, `${page} does not expose STEWARO`);
  }
});

test("Block 3 runtime modules use STEWARO for user-facing strings while technical namespaces stay stable", () => {
  const modules = [
    "assets/auth-nav.js",
    "assets/acquisition-v1.js",
    "assets/concierge-carousel.js",
    "assets/owner-product-gaps.js",
    "assets/onboarding.js",
    "assets/email-account-integration.js",
    "assets/email-provider-logo-connect-v3.js",
    "assets/email-concierge-product.js",
    "assets/web-customer-concierge.js",
    "assets/web-voice-memo.js",
    "assets/web-concierge-chat.js",
    "assets/account-header-concierge.js",
    "assets/telephone-reception-product.js",
    "assets/payg-account.js",
    "assets/payg-consumer-rights-guard.js",
    "assets/site-ui.js"
  ];
  for (const path of modules) {
    const legacyQuoted = quotedStrings(read(path)).filter((value) => /NAHWERK|Nahwerk/.test(value));
    assert.deepEqual(legacyQuoted, [], `${path} still has legacy brand text in a string literal`);
  }

  assert.match(read("assets/email-account-integration.js"), /NAHWERKEmailIntegrationTestHooks/);
  assert.match(read("assets/email-concierge-product.js"), /NAHWERKEmailConciergeProduct/);
  assert.match(read("assets/web-customer-concierge.js"), /NAHWERKWebCustomerConciergeLiveBridge/);
  assert.match(read("assets/telephone-reception-product.js"), /NAHWERKTelephoneReceptionContract/);
  assert.match(read("assets/payg-account.js"), /NAHWERKPaygAccountTestHooks/);
  assert.match(read("assets/onboarding.js"), /NAHWERKLocale/);
});

test("Block 3 keeps canonical auth, Core gateway, email, phone and billing endpoints unchanged", () => {
  const auth = read("assets/auth-nav.js");
  assert.match(auth, /const SESSION_KEY = "scb_web_session"/);
  assert.match(auth, /https:\/\/djicahhmnnamtjuqedqd\.supabase\.co\/functions\/v1\/web-session-secure/);
  assert.match(auth, /https:\/\/djicahhmnnamtjuqedqd\.supabase\.co\/functions\/v1\/web-profile/);

  const chat = read("assets/web-customer-concierge.js");
  assert.match(chat, /https:\/\/ta832v8wah\.execute-api\.eu-central-1\.amazonaws\.com\/prod\/v1\/web/);
  assert.match(chat, /https:\/\/ta832v8wah\.execute-api\.eu-central-1\.amazonaws\.com\/prod\/v1\/web\/history/);

  assert.match(read("assets/email-account-integration.js"), /https:\/\/djicahhmnnamtjuqedqd\.supabase\.co\/functions\/v1\/nahwerk-email-runtime/);
  assert.match(read("assets/telephone-reception-product.js"), /https:\/\/djicahhmnnamtjuqedqd\.supabase\.co\/functions\/v1\/nahwerk-telephone-reception-onboarding\/number\/submit/);

  const payg = read("assets/payg-account.js");
  assert.match(payg, /https:\/\/djicahhmnnamtjuqedqd\.supabase\.co\/functions\/v1\/web-payg/);
  assert.match(payg, /https:\/\/djicahhmnnamtjuqedqd\.supabase\.co\/functions\/v1\/web-payg-checkout/);
});

test("Block 3 uses the STEWARO mark for generic concierge fallbacks", () => {
  assert.match(read("assets/web-concierge-chat.js"), /\/assets\/logos\/stewaro-mark\.svg/);
  assert.match(read("assets/account-header-concierge.js"), /\/assets\/logos\/stewaro-mark\.svg/);
  assert.doesNotMatch(read("konto.html"), /NAHWERK-Goldmann-(?:Icon|Logo)\.svg/);
});

test("Block 3 shared navigation is STEWARO-first and legacy public brand routes are absent", () => {
  const nav = read("assets/auth-nav.js");
  for (const pair of [
    '["/de/", "Übersicht"]',
    '["/prime-concierge", "Concierge"]',
    '["/angehoerige", "Für Angehörige"]',
    '["/safety", "Sicherheit"]',
    '["/telefonannahme", "Telefon"]',
    '["/leistungen", "Leistungen"]',
    '["/pakete", "Preise"]',
    '["/kontakt", "Kontakt"]'
  ]) assert.ok(nav.includes(pair), `missing navigation pair ${pair}`);
  assert.doesNotMatch(nav, /"\/concierges",/);
  assert.doesNotMatch(nav, /"\/senioren-concierge",/);
});

test("Block 3 production domain remains isolated", () => {
  assert.equal(read("CNAME").trim(), "nahwerkconcierge.com");
  assert.match(read("assets/site.css"), /stewaro-brand-shell\.css/);
});
