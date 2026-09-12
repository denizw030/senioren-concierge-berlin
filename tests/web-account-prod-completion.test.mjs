import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const payg = read("payg.html");
const paygJs = read("assets/payg-account.js");
const siteUi = read("assets/site-ui.js");
const webConcierge = read("web-concierge.html");
const webConciergeJs = read("assets/web-customer-concierge.js");
const legacyShadow = read("assets/web-core-shadow.js");
const legacyChat = read("assets/web-concierge-chat.js");

test("PAYG customer surface targets exactly the PROD web-payg function", () => {
  assert.match(paygJs, /djicahhmnnamtjuqedqd\.supabase\.co\/functions\/v1\/web-payg/);
  assert.doesNotMatch(paygJs, /staging|shadow/i);
  assert.doesNotMatch(payg, /staging|shadow/i);
});

test("PAYG UI consumes real authoritative account state instead of mock values", () => {
  for (const token of ["payment_methods", "topup_packages_cents", "quotes", "usage", "transactions", "rates", "wallet", "payg"]) {
    assert.ok(paygJs.includes(token), `missing PROD PAYG state field ${token}`);
  }
  assert.doesNotMatch(paygJs, /mock|fixture|fake[-_ ]?success/i);
});

test("PAYG customer actions are limited to the published PROD contract", () => {
  for (const action of ["activate", "deactivate", "setup_payment_method", "sync_payment_method", "create_topup", "approve_quote", "cancel_quote"]) {
    assert.ok(paygJs.includes(`action: "${action}"`), `missing PAYG action ${action}`);
  }
  assert.doesNotMatch(paygJs, /remove_payment_method|detach_payment_method|delete_payment_method/);
});

test("cost-bearing controls communicate payment obligation and stay fail closed", () => {
  assert.match(paygJs, /kostenpflichtig aufladen/);
  assert.match(paygJs, /Kostenpflichtig freigeben/);
  assert.match(payg, /topupConsent/);
  assert.match(payg, /konkreten Betrag unmittelbar am kostenpflichtigen Freigabe-/);
  assert.match(paygJs, /provider\.webhook_configured === true/);
});

test("Stripe browser integration accepts Live configuration only and invents no key", () => {
  assert.match(payg, /meta name="nahwerk-stripe-publishable-key" content=""/);
  assert.match(paygJs, /\^pk_live_/);
  assert.doesNotMatch(paygJs, /pk_test_/);
  assert.doesNotMatch(paygJs, /pk_live_[A-Za-z0-9]+/);
  assert.match(paygJs, /NAHWERK_PAYG_STRIPE_PUBLISHABLE_KEY/);
});

test("PAYG usage respects authoritative ledger unit semantics", () => {
  assert.match(paygJs, /moneyMajor\(item\.actual_cost/);
  assert.match(paygJs, /money\(item\.amount_cents/);
  assert.match(paygJs, /quoteCanApprove\(status\)/);
  assert.match(paygJs, /=== "QUOTED"/);
});

test("legacy Web Concierge Shadow transport is completely inert", () => {
  for (const source of [legacyShadow, legacyChat]) {
    assert.doesNotMatch(source, /staging/i);
    assert.doesNotMatch(source, /\bfetch\s*\(/);
  }
  assert.match(legacyShadow, /web_prod_gateway_required/);
  assert.match(legacyChat, /mount: \(\) => null/);
});

test("authenticated Web Concierge surface cannot invent a PROD gateway contract", () => {
  assert.match(webConcierge, /Web-Concierge noch nicht verfügbar|PROD-Verfügbarkeit wird geprüft/);
  assert.match(webConcierge, /id="webConciergeInput"[^>]+disabled/);
  assert.match(webConcierge, /id="webConciergeSend"[^>]+disabled/);
  assert.match(webConciergeJs, /NAHWERK_WEB_CONCIERGE_PROD_ENDPOINT/);
  assert.match(webConciergeJs, /NAHWERK_WEB_CONCIERGE_CLIENT_CONTRACT/);
  assert.doesNotMatch(webConciergeJs, /\bfetch\s*\(/);
  assert.doesNotMatch(webConciergeJs, /staging|shadow/i);
});

test("PROD guard covers account, PAYG and authenticated Web Concierge", () => {
  assert.match(siteUi, /\(\?:konto\|payg\|web-concierge\)\\\.html/);
  assert.match(siteUi, /\/staging\/i/);
  assert.match(siteUi, /accountPaygEntry/);
  assert.match(siteUi, /accountWebConciergeEntry/);
});

test("paid customer surface keeps legal information reachable", () => {
  assert.match(payg, /href="agb\.html"/);
  assert.match(payg, /href="widerruf\.html"/);
  assert.match(payg, /href="datenschutz\.html"/);
});

test("new customer surfaces are responsive", () => {
  assert.match(read("assets/payg-account.css"), /@media\(max-width:620px\)/);
  assert.match(read("assets/web-customer-concierge.css"), /@media\(max-width:700px\)/);
});
