import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("../registrieren.html", import.meta.url), "utf8");
const onboarding = readFileSync(new URL("../assets/onboarding.js", import.meta.url), "utf8");
const voicePreviewCss = readFileSync(new URL("../assets/concierge-voice-preview.css", import.meta.url), "utf8");
const carouselCss = readFileSync(new URL("../assets/concierge-carousel.css", import.meta.url), "utf8");
const carouselJs = readFileSync(new URL("../assets/concierge-carousel.js", import.meta.url), "utf8");

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


test("registration starts with the Concierge photo slider and no generated headline", () => {
  assert.doesNotMatch(html, /id="registrationTitle"/);
  const formStart = html.indexOf('id="signupForm"');
  const slider = html.indexOf('data-concierge-carousel', formStart);
  const setupChoice = html.indexOf('name="setupFor"', formStart);
  assert.ok(slider > formStart && slider < setupChoice);
});

test("Lena is the default Concierge for registration", () => {
  assert.match(html, /data-selected="lena"/);
  assert.doesNotMatch(html, /data-selected="nilo"/);
  assert.match(onboarding, /return conciergeProfiles\[value\] \? value : "lena"/);
  assert.match(onboarding, /choice\.dataset\.selected \|\| "lena"/);
});

test("FREE remains the registration default and tariff appears below personal data", () => {
  assert.match(onboarding, /params\.get\("paket"\) \|\| "free"/);
  const ownerFirstName = html.indexOf('id="ownerFirstName"');
  const plan = html.indexOf('id="selectedPlanBox"');
  assert.ok(ownerFirstName >= 0 && plan > ownerFirstName);
});

test("telephone reception is completely absent from registration", () => {
  assert.doesNotMatch(html, /Telefonannahme|telephoneReceptionRegistrationPath|\/telefonannahme/i);
});

test("registration language selection keeps the chosen language label centered", () => {
  assert.match(voicePreviewCss, /body\.registration-page \.nw-carousel\[data-variant="selection"\] \.nw-voice-preview-language-select/);
  assert.match(voicePreviewCss, /text-align:center!important/);
  assert.match(voicePreviewCss, /text-align-last:center!important/);
});


test("removed registration copy cannot return in light or dark registration", () => {
  for (const removed of [
    "Die Auswahl gilt für diesen Zugang und kann später in den Concierge-Einstellungen geändert werden.",
    "1. Zugang anlegen",
    "WhatsApp bestätigen",
    "3. Erste Aufgabe senden",
    "FREE ist vorausgewählt. Sicherheitsoptionen bleiben freiwillig; kostenpflichtige Tarife werden ohne freigegebenen Checkout nicht bestellt."
  ]) {
    assert.equal(html.includes(removed), false, removed);
    assert.equal(onboarding.includes(removed), false, removed);
  }
});


test("mobile registration carousel arrows stay inside the photo stage", () => {
  assert.match(carouselJs, /stage\.append\(prevArrow,nextArrow\)/);
  assert.match(carouselJs, /registrationArrowsInStage/);
  assert.match(carouselCss, /REGISTRATION_MOBILE_CAROUSEL_ARROWS_V2_20260920/);
  assert.match(carouselCss, /\.nw-carousel-stage>\.nw-carousel-arrow\{[\s\S]*top:50%!important;[\s\S]*bottom:auto!important;/);
  assert.match(carouselCss, /\.nw-carousel-stage>\.nw-carousel-arrow\.prev\{[\s\S]*left:8px!important;[\s\S]*right:auto!important;/);
  assert.match(carouselCss, /\.nw-carousel-stage>\.nw-carousel-arrow\.next\{[\s\S]*right:8px!important;[\s\S]*left:auto!important;/);
  assert.match(html, /assets\/concierge-carousel\.css\?v=14/);
  assert.match(html, /assets\/concierge-carousel\.js\?v=21/);
});
