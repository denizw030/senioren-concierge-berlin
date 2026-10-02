import assert from "node:assert/strict";
import { readFileSync } from './helpers/effective-source-fs.mjs';
import test from "node:test";

const html = readFileSync(new URL("../registrieren.html", import.meta.url), "utf8");
const onboarding = readFileSync(new URL("../assets/onboarding.js", import.meta.url), "utf8");
const accountFlow = readFileSync(new URL("../assets/stewaro-account-flow.js", import.meta.url), "utf8");
const wizardCss = readFileSync(new URL("../assets/stewaro-registration-wizard.css", import.meta.url), "utf8");
const voicePreviewCss = readFileSync(new URL("../assets/concierge-voice-preview.css", import.meta.url), "utf8");
const carouselCss = readFileSync(new URL("../assets/concierge-carousel.css", import.meta.url), "utf8");
const carouselJs = readFileSync(new URL("../assets/concierge-carousel.js", import.meta.url), "utf8");

test("hidden registration rows cannot be forced visible by component CSS", () => {
  assert.match(html, /#signupForm \[hidden\]\s*{\s*display:\s*none\s*!important;/);
  assert.match(html, /id="consentRow" hidden/);
});

test("WhatsApp is optional and consent is required only when a WhatsApp number is supplied", () => {
  assert.match(onboarding, /\$\("ownerPhone"\)\.required\s*=\s*false/);
  assert.match(onboarding, /\$\("recipientPhone"\)\.required\s*=\s*false/);
  assert.match(onboarding, /recipientHasWhatsapp/);
  assert.match(onboarding, /consent\.required\s*=\s*recipientHasWhatsapp/);
  assert.match(html, /Deine WhatsApp-Telefonnummer[\s\S]*\(optional\)/);
  assert.match(html, /WhatsApp-Telefonnummer der unterstützten Person[\s\S]*\(optional\)/);
});

test("explicit Family links reveal recipient setup without a second audience chooser", () => {
  assert.match(html, /name="setupFor" value="other" hidden data-family-setup-mode/);
  assert.match(onboarding, /params\.get\("fuer"\) === "andere"/);
  assert.match(onboarding, /otherSetup\.checked = true/);
  assert.match(onboarding, /\$\("recipientBlock"\)\.hidden = self/);
  assert.match(onboarding, /selfScope\.hidden = !self/);
});

test("registration contains an accessible in-flow plan switcher", () => {
  assert.match(html, /id="planChangeButton"/);
  assert.match(html, /aria-controls="registrationPlanPicker"/);
  assert.match(html, /id="registrationPlanPicker" hidden/);
  assert.match(onboarding, /name="planChoice"/);
  assert.match(onboarding, /history\.replaceState\(null, "", url\)/);
});

test("tariff selection remains independent from the fixed FIDEL identity", () => {
  assert.match(onboarding, /name="planChoice"/);
  assert.match(onboarding, /const conciergeValue = \(\) => "fidel"/);
  assert.match(onboarding, /concierge_profile: "FIDEL", concierge_choice: "fidel", package: selectedPlan\(\)\.code/);
  assert.doesNotMatch(onboarding, /inputName:\s*"conciergeChoice"/);
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


test("registration starts with a fixed STEWARO FIDEL card and no photo slider", () => {
  assert.doesNotMatch(html, /id="registrationTitle"/);
  const formStart = html.indexOf('id="signupForm"');
  const fidel = html.indexOf('stewaro-fixed-concierge-card', formStart);
  const setupChoice = html.indexOf('name="setupFor"', formStart);
  assert.ok(fidel > formStart && fidel < setupChoice);
  assert.match(html, /name="conciergeChoice" value="fidel"/);
  assert.doesNotMatch(html, /data-concierge-carousel|concierge-carousel\.css|concierge-carousel\.js|auth-slider-i18n\.js/);
});

test("FIDEL is the registration authority without carousel runtime", () => {
  assert.match(onboarding, /const conciergeValue = \(\) => "fidel"/);
  assert.match(onboarding, /const concierge = \(\) => "FIDEL"/);
  assert.match(onboarding, /dataset\.stewaroFidelAuthority = "true"/);
  assert.doesNotMatch(onboarding, /conciergeProfiles|NAHWERKCarousel\?\.mount/);
});

test("registration no longer loads photo carousel or voice-preview assets", () => {
  assert.doesNotMatch(html, /concierge-carousel|concierge-voice-preview|auth-slider-i18n/);
});


test("registration uses one calm canonical step flow for self and Family entry", () => {
  assert.match(html, /stewaro-registration-wizard\.css\?v=1/);
  assert.match(html, /stewaro-account-flow\.js\?v=2/);
  assert.match(html, /assets\/onboarding\.js\?v=28/);
  assert.match(accountFlow, /if\(!document\.body\.classList\.contains\("registration-page"\)\)return/);
  assert.doesNotMatch(accountFlow, /registration-page"\)\|\|source!==/);
  assert.match(accountFlow, /familyMode=params\.get\("fuer"\)==="andere"/);
});

test("wizard asks only relevant questions and starts with email", () => {
  const emailStep=accountFlow.indexOf('addInputStep("email"');
  const ownerStep=accountFlow.indexOf('addInputStep(\n    "owner-name"');
  const postalStep=accountFlow.indexOf('addInputStep("postal"');
  const recipientStep=accountFlow.indexOf('addInputStep(\n      "recipient"');
  const contactStep=accountFlow.indexOf('key:"contact"');
  const safetyStep=accountFlow.indexOf('key:"safety"');
  const passwordStep=accountFlow.indexOf('addInputStep("password"');
  assert.ok(emailStep>=0 && ownerStep>emailStep && postalStep>ownerStep);
  assert.ok(recipientStep>postalStep && contactStep>recipientStep);
  assert.ok(safetyStep>contactStep && passwordStep>safetyStep);
  assert.match(accountFlow, /conditional:\(\)=>preferredContact\.value==="APP"/);
  assert.match(accountFlow, /conditional:\(\)=>whatsappEnabled\.value==="true"/);
  assert.match(accountFlow, /conditional:\(\)=>safetyEnabled\.checked/);
});

test("wizard preserves real controls and forwards channel preferences", () => {
  assert.match(accountFlow, /const parking=document\.createElement\("div"\)/);
  assert.match(accountFlow, /if\(stage\.contains\(node\)\)parking\.append\(node\)/);
  assert.match(accountFlow, /preferredContactChannel/);
  assert.match(accountFlow, /whatsappEnabled/);
  assert.match(onboarding, /preferred_contact_channel: \$\("preferredContactChannel"\)\?\.value \|\| "APP"/);
  assert.match(onboarding, /whatsapp_enabled: \$\("whatsappEnabled"\)\?\.value === "true"/);
  assert.match(onboarding, /onboarding_version: "stewaro_step_flow_v2"/);
});

test("wizard includes optional Safety without exposing a large legacy form", () => {
  assert.match(accountFlow, /Soll ein Safety-Check-in eingerichtet werden\?/);
  assert.match(accountFlow, /Nein, später/);
  assert.match(accountFlow, /Ja, einrichten/);
  assert.match(accountFlow, /Ein Check-in und eine Vertrauensperson reichen für den Start\./);
  assert.match(wizardCss, /#signupForm>\*:not\(\.stewaro-registration-progressive\)/);
  assert.match(wizardCss, /\.stewaro-registration-progressive>h1/);
});
