import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("../registrieren.html", import.meta.url), "utf8");
const onboarding = readFileSync(new URL("../assets/onboarding.js", import.meta.url), "utf8");

test("hidden registration rows cannot be forced visible by component CSS", () => {
  assert.match(html, /#signupForm \[hidden\]\s*{\s*display:\s*none\s*!important;/);
  assert.match(html, /id="consentRow" hidden/);
});

test("self registration removes the third-party consent control", () => {
  assert.match(onboarding, /consentRow\.hidden\s*=\s*self/);
  assert.match(onboarding, /consent\.disabled\s*=\s*self/);
  assert.match(onboarding, /consent\.required\s*=\s*!self/);
  assert.match(onboarding, /if \(self\) consent\.checked\s*=\s*false/);
});

test("registration contains an accessible in-flow plan switcher", () => {
  assert.match(html, /id="planChangeButton"/);
  assert.match(html, /aria-controls="registrationPlanPicker"/);
  assert.match(html, /id="registrationPlanPicker" hidden/);
  assert.match(onboarding, /name="planChoice"/);
  assert.match(onboarding, /history\.replaceState\(null, "", url\)/);
});

test("tariff and concierge selections remain independent", () => {
  assert.match(onboarding, /name="planChoice"/);
  assert.match(onboarding, /inputName:\s*"conciergeChoice"/);
  assert.match(onboarding, /concierge_choice:\s*conciergeValue\(\),\s*package:\s*selectedPlan\(\)\.code/);
});

test("unreleased paid plans cannot create a fake paid order", () => {
  assert.match(onboarding, /if \(!planBookable\(\)\) return show/);
  assert.match(onboarding, /submit\.disabled\s*=\s*true/);
  assert.match(onboarding, /Bis dahin wird nichts kostenpflichtig bestellt/);
});

test("obsolete public pricing claims stay removed", () => {
  for (const staleClaim of [
    "30 Dialoge/Monat in den ersten 2 Monaten",
    "STANDARD · 9,99 €",
    "PREMIUM PLUS · 44,99 €"
  ]) {
    assert.equal(onboarding.includes(staleClaim), false, staleClaim);
  }
});
