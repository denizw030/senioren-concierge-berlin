import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync("registrieren.html", "utf8");
const catalogSource = fs.readFileSync("assets/concierge-profiles.js", "utf8");
const onboarding = fs.readFileSync("assets/onboarding.js", "utf8");
const sandbox = { window: {} };
vm.runInNewContext(catalogSource, sandbox);

const profiles = sandbox.window.NAHWERK_CONCIERGE_PROFILES;
const languages = sandbox.window.NAHWERK_SUPPORTED_LANGUAGES;

// T1 — exactly the approved 23 website personas are exposed from one catalog.
assert.equal(Object.keys(profiles).length, 23);
assert.deepEqual(
  Array.from(Object.keys(profiles)),
  ["nilo", "mira", "lena", "lukas", "hartmut", "frida", "asha", "sari", "leyla", "noor", "sofia", "camille", "anna", "olena", "mei", "amara", "kwame", "zuri", "jabari", "arjun", "wei", "yuki", "ren"]
);
assert.equal((onboarding.match(/const PROFILES =/g) || []).length, 1);
assert.equal((onboarding.match(/const conciergeValue =/g) || []).length, 1);

// T2 — yuki is the persona key while the existing JUKI asset remains canonical.
assert.equal(profiles.yuki.image, "assets/JUKI-Japanisch-NAHWERK-Concierge.png");
assert.equal(Object.hasOwn(profiles, "juki"), false);

// T17 — persona and language are independent catalogs and independent controls.
assert.ok(Object.keys(languages).length > 1);
for (const profile of Object.values(profiles)) {
  assert.equal(Object.hasOwn(profile, "language"), false);
  assert.equal(Object.hasOwn(profile, "locale"), false);
}
assert.match(html, /id="preferredLanguage"/);
assert.match(onboarding, /name="conciergeChoice"/);

// T18 — the Website→WhatsApp payload and password-free draft carry both selections.
assert.match(onboarding, /concierge_choice: conciergeValue\(\)/);
assert.match(onboarding, /language: languageValue\(\)/);
assert.match(onboarding, /language_code: languageValue\(\)/);
assert.match(onboarding, /localStorage\.setItem\(DRAFT_KEY/);
assert.match(onboarding, /web_password: _password/);

// T19 — legacy FREE quotas and the duplicate legacy plan matrix are gone.
for (const source of [html, onboarding]) {
  assert.doesNotMatch(source, /30 Dialoge\/Monat/);
  assert.doesNotMatch(source, /danach (?:dauerhaft )?15 Dialoge/i);
  assert.doesNotMatch(source, /STANDARD · 9,99/);
  assert.doesNotMatch(source, /PREMIUM PLUS · 44,99/);
}

console.log("T1, T2, T17, T18, T19: GREEN");
