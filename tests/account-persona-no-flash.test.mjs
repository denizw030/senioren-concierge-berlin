import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const account = read("konto.html");
const accountClean = read("konto/index.html");
const settings = read("concierge-anpassen.html");
const settingsClean = read("concierge-anpassen/index.html");

test("authenticated account never paints a Concierge name from legacy onboarding storage", () => {
  assert.match(account, /if \(selected && !sessionToken\(\)\)/);
  const legacyBlock = account.slice(
    account.indexOf('localStorage.getItem("scb_onboarding")'),
    account.indexOf('prefSummary(', account.indexOf('localStorage.getItem("scb_onboarding")'))
  );
  assert.match(legacyBlock, /if \(selected && !sessionToken\(\)\)/);
  assert.doesNotMatch(legacyBlock, /if \(selected\) \{/);
});

test("STEWARO Concierge settings use the fixed FIDEL identity without a legacy photo carousel", () => {
  assert.match(settings, /GATEWAY_URL\+"\/web\/me"/);
  assert.match(settings, /stewaro-fixed-concierge-card/);
  assert.match(settings, /name="conciergeChoice" value="fidel"/);
  assert.match(settings, /FIDEL/);
  assert.doesNotMatch(settings, /concierge-carousel\.js|concierge-carousel\.css|data-concierge-carousel|NAHWERKCarousel/);
});

test("clean account and Concierge settings routes remain exact mirrors apart from base href", () => {
  assert.equal(account, accountClean.replace('<head><base href="/">','<head>'));
  assert.equal(settings, settingsClean.replace('<head><base href="/">','<head>'));
});
