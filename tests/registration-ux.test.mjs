import assert from "node:assert/strict";
import { readFileSync } from './helpers/effective-source-fs.mjs';
import test from "node:test";

const html = readFileSync(new URL("../registrieren.html", import.meta.url), "utf8");
const onboarding = readFileSync(new URL("../assets/onboarding.js", import.meta.url), "utf8");
const accountFlow = readFileSync(new URL("../assets/stewaro-account-flow.js", import.meta.url), "utf8");
const wizardCss = readFileSync(new URL("../assets/stewaro-registration-wizard.css", import.meta.url), "utf8");
const authNav = readFileSync(new URL("../assets/auth-nav.js", import.meta.url), "utf8");
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
  assert.match(html, /stewaro-registration-wizard\.css\?v=2/);
  assert.match(html, /stewaro-account-flow\.js\?v=5/);
  assert.match(html, /assets\/onboarding\.js\?v=31/);
  assert.match(accountFlow, /if\(!document\.body\.classList\.contains\("registration-page"\)\)return/);
  assert.doesNotMatch(accountFlow, /registration-page"\)\|\|source!==/);
  assert.match(accountFlow, /familyMode=params\.get\("fuer"\)==="andere"/);
});

test("wizard asks only relevant questions and starts with email", () => {
  const emailStep=accountFlow.indexOf('addInputStep("email"');
  const ownerStep=accountFlow.indexOf('addInputStep(\n    "owner-name"');
  const recipientStep=accountFlow.indexOf('addInputStep(\n      "recipient"');
  const recipientPostalStep=accountFlow.indexOf('"recipient-postal"');
  const selfPostalStep=accountFlow.indexOf('"postal",\n      "Wie lautet deine Postleitzahl?"');
  const contactStep=accountFlow.indexOf('key:"contact"');
  const safetyStep=accountFlow.indexOf('key:"safety"');
  const passwordStep=accountFlow.indexOf('addInputStep("password"');
  assert.ok(emailStep>=0 && ownerStep>emailStep);
  assert.ok(recipientStep>ownerStep && recipientPostalStep>recipientStep);
  assert.ok(selfPostalStep>recipientPostalStep && contactStep>selfPostalStep);
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


test("registration wizard is not obscured by the floating concierge", () => {
  assert.match(authNav, /FLOATING_CONCIERGE_EXCLUDE = new Set\(\["web-concierge\.html", "registrieren\.html"\]\)/);
});

test("wizard keeps WhatsApp branding restrained in the main question", () => {
  assert.match(authNav, /\.stewaro-registration-progressive>h1/);
  assert.match(accountFlow, /title:"Welche WhatsApp-Nummer sollen wir verbinden\?"/);
});

test("review summary does not duplicate WhatsApp and shows the selected Safety time", () => {
  assert.match(accountFlow, /preferredContact\.value==="WHATSAPP"\?"WhatsApp":\(whatsappEnabled\.value==="true"\?"App · WhatsApp zusätzlich":"App"\)/);
  assert.doesNotMatch(accountFlow, /WhatsApp aktiv/);
  assert.match(accountFlow, /"Täglich um "\+checkinValue\+" Uhr"/);
  assert.match(html, /id="checkinTimes"[\s\S]*type="time"[\s\S]*value="09:00"/);
});

test("Family registration creates the account holder first and preserves verified consent authority", () => {
  assert.match(onboarding, /FAMILY_REGISTRATION_DRAFT_KEY = "nw_family_registration_pending_v1"/);
  assert.match(onboarding, /const familySetup = !self/);
  assert.match(onboarding, /registration_type: "self"/);
  assert.match(onboarding, /family_setup_pending: true/);
  assert.match(onboarding, /sessionStorage\.setItem\(FAMILY_REGISTRATION_DRAFT_KEY/);
  assert.match(onboarding, /location\.href = "\/konto\?family_setup=1"/);
  assert.doesNotMatch(onboarding, /registration_type: "other"[\s\S]*submissionRequest/);
});

test("registration surfaces server validation details instead of a generic dead end", () => {
  assert.match(onboarding, /Array\.isArray\(body\.errors\)/);
  assert.match(onboarding, /Einige Angaben müssen noch geprüft werden/);
  assert.match(onboarding, /Die WhatsApp-Telefonnummer ist nicht vollständig oder nicht gültig/);
  assert.doesNotMatch(onboarding, /return show\("<strong>Bitte prüfen Sie Ihre Angaben\.<\/strong>", true\)/);
});


test("OTP verification stays independent from the Family primary-submit variables", () => {
  const start=onboarding.indexOf("async function submitVerification()");
  const end=onboarding.indexOf("form.addEventListener",start);
  const verification=onboarding.slice(start,end);
  assert.ok(start>=0 && end>start);
  assert.match(verification,/login\(request\.email, password\)/);
  assert.doesNotMatch(verification,/submissionRequest|familySetup|familyDraft/);
});

test("pending Family setup survives a manual login in the same tab", () => {
  const familyRuntime = readFileSync(new URL("../assets/family-owner-sponsored-access.js", import.meta.url), "utf8");
  assert.match(onboarding,/sessionStorage\.setItem\(FAMILY_REGISTRATION_DRAFT_KEY, JSON\.stringify\(familyDraft\)\)/);
  assert.match(familyRuntime,/new URLSearchParams\(location\.search\)\.get\("family_setup"\)==="1"\|\|readRegistrationDraft\(\)/);
});


test("Family wizard asks for the Klient postcode and never assigns it to the account holder", () => {
  assert.match(html, /id="recipientPostalCode"[\s\S]*pattern="\[0-9\]\{5\}"/);
  assert.match(accountFlow, /Wie lautet die Postleitzahl des Klienten\?/);
  assert.match(accountFlow, /Die PLZ reicht für die Region\. Die genaue Adresse kannst du im selben Schritt freiwillig ergänzen\./);
  assert.match(accountFlow, /ownerPostal\.required=!familyMode/);
  assert.match(accountFlow, /recipientPostal\.required=familyMode/);
  assert.match(onboarding, /account_holder_postal_code: self \?/);
  assert.match(onboarding, /postal_code: self \?/);
  assert.match(onboarding, /postal_code: String\(\$\("recipientPostalCode"\)\?\.value/);
  assert.match(onboarding, /account_holder_postal_code: "",\n      postal_code: ""/);
});

test("registration review identifies the Klient postcode separately", () => {
  assert.match(accountFlow, /familyMode\?"PLZ Klient":"PLZ"/);
  assert.match(accountFlow, /const postalCode=String\(\(familyMode\?recipientPostal:ownerPostal\)/);
});


test("postcode step offers a subtle optional address without adding another wizard step", () => {
  assert.match(html, /id="ownerStreetAddress"[^>]*autocomplete="street-address"/);
  assert.match(html, /id="recipientStreetAddress"[^>]*autocomplete="street-address"/);
  assert.match(accountFlow, /const addPostalStep=/);
  assert.match(accountFlow, /Adresse optional hinzufügen/);
  assert.match(accountFlow, /tatsächlich nächsten Hausarzt/);
  assert.doesNotMatch(accountFlow, /key:"address"/);
  assert.match(onboarding, /street_address: self \?/);
  assert.match(onboarding, /street_address: String\(\$\("recipientStreetAddress"\)\?\.value/);
  assert.match(onboarding, /postal_code: "",\n      street_address: ""/);
});

test("Safety details remain inside the mobile wizard width", () => {
  assert.match(wizardCss, /#safetyFields\{[\s\S]*width:100%!important;[\s\S]*max-width:100%!important;[\s\S]*padding:0!important;/);
  assert.match(wizardCss, /#safetyFields :is\(input:not\(\[type="checkbox"\]\):not\(\[type="radio"\]\),select,textarea\)\{[\s\S]*max-width:100%!important;/);
  assert.match(wizardCss, /#safetyFields input\[type="time"\]\{[\s\S]*min-inline-size:0!important;/);
});
