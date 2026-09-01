import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

const login = read("anmelden.html");
const registration = read("registrieren.html");
const onboarding = read("assets/onboarding.js");
const authNav = read("assets/auth-nav.js");

test("login only creates a local session after a successful backend login", () => {
  assert.match(login, /body\.status!=='logged_in'\|\|!body\.session_token/);
  assert.match(login, /localStorage\.setItem\(SESSION_KEY,JSON\.stringify/);
  assert.match(login, /body\.status==='invalid_credentials'/);
  assert.match(login, /res\.status===429/);
});

test("login completes enrolled MFA only through the second verification step", () => {
  assert.match(login, /body\.status==='mfa_required'\|\|body\.mfa_required===true/);
  assert.match(login, /localStorage\.removeItem\(SESSION_KEY\)/);
  assert.match(login, /let pendingMfa=null/);
  assert.match(login, /web\/login\/mfa\/verify/);
  assert.match(login, /body\.mfa_verified===true&&completeLogin\(body\)/);
  assert.match(login, /autocomplete="one-time-code"/);
  assert.match(login, /pattern="\[0-9\]\{6\}"/);
  assert.match(login, /Zusätzliche Bestätigung erforderlich/);
});

test("password reset response does not reveal whether an account exists", () => {
  assert.match(login, /Wenn für diese Adresse ein Konto besteht/);
});

test("registration keeps the strong password policy and never persists the password in its draft", () => {
  assert.match(registration, /minlength="12"/);
  assert.match(registration, /maxlength="128"/);
  assert.match(onboarding, /password\.length >= 12/);
  assert.match(onboarding, /web_password: undefined/);
  assert.match(onboarding, /web_password_repeat: undefined/);
});

test("protected account pages still validate the existing web session", () => {
  assert.match(authNav, /const PROTECTED = new Set\(\["konto\.html", "concierge-anpassen\.html"\]\)/);
  assert.match(authNav, /web\/session\/check/);
  assert.match(authNav, /response\.ok && body\.ok && body\.status === "session_valid"/);
});


test("account security supports real MFA enrollment and secure removal", () => {
  const account = read("konto.html");
  assert.match(account, /id="mfaCard"/);
  assert.match(account, /functions\/v1\/web-mfa-status/);
  assert.match(account, /functions\/v1\/web-mfa-manage/);
  assert.match(account, /id="mfaEnableButton"/);
  assert.match(account, /id="mfaDisableButton"/);
  assert.match(account, /id="mfaQr"/);
  assert.match(account, /id="mfaSecret"/);
  assert.match(account, /autocomplete="current-password"/);
  assert.match(account, /autocomplete="one-time-code"/);
  assert.match(account, /mfaManage\("enroll_start"/);
  assert.match(account, /mfaManage\("enroll_verify"/);
  assert.match(account, /mfaManage\("enroll_cancel"/);
  assert.match(account, /mfaManage\("disable"/);
  assert.match(account, /Bei der nächsten Anmeldung wird der Authenticator-Code zwingend abgefragt/);
  assert.match(account, /Empfohlen · Noch nicht aktiviert/);
  assert.equal(/localStorage\.setItem\([^\n]*(enrollment_token|mfaEnrollmentToken)/.test(account), false);
});
