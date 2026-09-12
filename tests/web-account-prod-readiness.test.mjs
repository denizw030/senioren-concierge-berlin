import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('login and registration use published PROD web auth functions, never staging', () => {
  const login = read('anmelden.html');
  const onboarding = read('assets/onboarding.js');
  assert.match(login, /web-login-secure/);
  assert.match(onboarding, /web-registration-secure/);
  assert.match(onboarding, /web-login-secure/);
  assert.doesNotMatch(login, /staging/i);
  assert.doesNotMatch(onboarding, /staging/i);
});

test('customer account fails closed when plan or usage truth is unavailable', () => {
  const account = read('konto.html');
  assert.match(account, /Nur tatsächlich verfügbare Verbrauchsdaten werden angezeigt/);
  assert.match(account, /Aktueller Verbrauch derzeit nicht verfügbar\. Es werden keine Werte geschätzt/);
  assert.match(account, /Keine Live-Daten/);
});

test('customer account website blocks staging calls and suppresses staging telephone surface', () => {
  const ui = read('assets/site-ui.js');
  assert.match(ui, /konto\|payg\|web-concierge/);
  assert.match(ui, /\/staging\/i/);
  assert.match(ui, /PROD web guard blocked a non-PROD endpoint/);
  assert.match(ui, /telephoneReceptionCard/);
  assert.match(ui, /reception\.hidden = true/);
});

test('legacy Web Concierge Shadow path is removed and cannot be mistaken for PROD delivery', () => {
  const shadow = read('assets/web-core-shadow.js');
  const chat = read('assets/web-concierge-chat.js');
  assert.doesNotMatch(shadow, /customer-portal-staging\/portal\/web-core-shadow/);
  assert.doesNotMatch(shadow, /\bfetch\s*\(/);
  assert.match(shadow, /shadow_only: false/);
  assert.match(shadow, /customer_delivery: false/);
  assert.match(shadow, /web_prod_gateway_required/);
  assert.doesNotMatch(chat, /\bfetch\s*\(/);
  assert.match(chat, /isEnabled: \(\) => false/);
  assert.match(chat, /mount: \(\) => null/);
});

test('PAYG customer surface uses only canonical PROD functions and no mocks or staging', () => {
  const payg = read('payg.html');
  const runtime = read('assets/payg-account.js');
  assert.match(payg, /Kundenkonto · PAYG/);
  assert.match(payg, /assets\/payg-account\.js/);
  assert.match(payg, /id="paygActivate"/);
  assert.match(payg, /id="paymentManage"/);
  assert.match(payg, /data-topup-cents="500"/);
  assert.match(payg, /Zahlungen & Aufträge/);
  assert.match(runtime, /functions\/v1\/web-payg/);
  assert.match(runtime, /functions\/v1\/web-payg-checkout/);
  assert.match(runtime, /enabled \? "deactivate" : "activate"/);
  assert.match(runtime, /payment_method_checkout/);
  assert.match(runtime, /sync_payment_method_checkout/);
  assert.match(runtime, /topup_checkout/);
  assert.match(runtime, /sync_topup_checkout/);
  assert.match(runtime, /serverseitigen Usage-Ledger/);
  assert.doesNotMatch(payg, /customer-portal-staging|mock/i);
  assert.doesNotMatch(runtime, /customer-portal-staging|mock/i);
});

test('PAYG surface is mobile responsive, session-bound and explicit before real top-up', () => {
  const payg = read('payg.html');
  const runtime = read('assets/payg-account.js');
  assert.match(payg, /@media\(max-width:820px\)/);
  assert.match(runtime, /SCBAuth/);
  assert.match(runtime, /validateSession/);
  assert.match(runtime, /location\.replace\("anmelden\.html"\)/);
  assert.match(runtime, /confirm\(`Du wirst zu Stripe weitergeleitet/);
  assert.match(runtime, /location\.assign\(result\.checkout_url\)/);
});

test('PAYG payment state remains fail-closed when Stripe Live is not configured', () => {
  const runtime = read('assets/payg-account.js');
  assert.match(runtime, /provider\.setup_available === true/);
  assert.match(runtime, /Stripe Live ist in der PROD-Runtime noch nicht verbunden/);
  assert.match(runtime, /button\.disabled = state\.loading \|\| !providerReady/);
});
