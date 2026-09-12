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
  assert.match(ui, /konto\\\.html/);
  assert.match(ui, /\/staging\/i/);
  assert.match(ui, /PROD web guard blocked a non-PROD endpoint/);
  assert.match(ui, /telephoneReceptionCard/);
  assert.match(ui, /reception\.hidden = true/);
});

test('PAYG is findable but remains fail-closed until canonical PROD contract exists', () => {
  const ui = read('assets/site-ui.js');
  const payg = read('payg.html');
  assert.match(ui, /accountPaygEntry/);
  assert.match(ui, /payg\.html/);
  assert.match(payg, /Kundenkonto · PAYG/);
  assert.match(payg, /id="paygActivate" disabled/);
  assert.match(payg, /id="paymentManage" disabled/);
  assert.match(payg, /Es werden keine Kosten, Guthaben, Belastungen oder Auftragszahlen geschätzt/);
  assert.match(payg, /PAYG-Arbeitsstrang seinen kanonischen PROD-Webvertrag veröffentlicht hat/);
  assert.doesNotMatch(payg, /customer-portal-staging|functions\/v1\/.*payg/i);
});

test('PAYG surface is mobile responsive and validates the real session', () => {
  const payg = read('payg.html');
  assert.match(payg, /@media\(max-width:820px\)/);
  assert.match(payg, /SCBAuth/);
  assert.match(payg, /validateSession/);
  assert.match(payg, /location\.replace\("anmelden\.html"\)/);
});
