import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

const registration = read("registrieren.html");
const onboarding = read("assets/onboarding.js");

test("registration requires a strong password", () => {
  assert.match(registration, /id="webPassword"[\s\S]*minlength="12"/);
  assert.match(registration, /id="webPassword"[\s\S]*maxlength="128"/);
  assert.match(registration, /Groß- und Kleinbuchstaben, Zahl und Sonderzeichen/);
  assert.match(registration, /assets\/onboarding\.js\?v=18/);

  assert.match(onboarding, /password\.length >= 12/);
  assert.match(onboarding, /password\.length <= 128/);
  assert.match(onboarding, /\\p\{Ll\}/);
  assert.match(onboarding, /\\p\{Lu\}/);
  assert.match(onboarding, /\\p\{N\}/);
  assert.match(onboarding, /\[\^\\p\{L\}\\p\{N\}\\s\]/);

  assert.equal(onboarding.includes("password.length < 10"), false);
  assert.equal(registration.includes("Mindestens 10 Zeichen."), false);
});

test("registration draft never persists the password", () => {
  assert.match(onboarding, /web_password: undefined/);
  assert.match(onboarding, /web_password_repeat: undefined/);
  assert.equal(
    onboarding.includes('localStorage.setItem("scb_onboarding", JSON.stringify(request))'),
    false
  );
});
