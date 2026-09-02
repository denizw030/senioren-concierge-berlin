import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

const registration = read("registrieren.html");
const onboarding = read("assets/onboarding.js");

test("registration uses the hardened passphrase policy", () => {
  assert.match(registration, /id="webPassword"[\s\S]*minlength="15"/);
  assert.match(registration, /id="webPassword"[\s\S]*maxlength="128"/);
  assert.match(registration, /Mindestens 15 Zeichen/);
  assert.match(registration, /Sonderzeichen sind nicht vorgeschrieben/);
  assert.match(registration, /assets\/onboarding\.js\?v=21/);

  assert.match(onboarding, /const passwordLength = \[\.\.\.password\]\.length/);
  assert.match(onboarding, /passwordLength < 15 \|\| passwordLength > 128/);
  assert.match(onboarding, /blockedPasswords = new Set/);
  assert.match(onboarding, /nahwerkconcierge/);
  assert.match(onboarding, /emailLocalPart\.length >= 8/);

  assert.equal(onboarding.includes("/\\p{Ll}/u.test(password)"), false);
  assert.equal(onboarding.includes("/\\p{Lu}/u.test(password)"), false);
  assert.equal(onboarding.includes("/\\p{N}/u.test(password)"), false);
  assert.equal(registration.includes("Groß- und Kleinbuchstaben, Zahl und Sonderzeichen"), false);
});

test("registration draft never persists the password", () => {
  assert.match(onboarding, /web_password: undefined/);
  assert.match(onboarding, /web_password_repeat: undefined/);
  assert.equal(
    onboarding.includes('localStorage.setItem("scb_onboarding", JSON.stringify(request))'),
    false
  );
});
