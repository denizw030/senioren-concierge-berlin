import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

const login = read("anmelden.html");
const registration = read("registrieren.html");
const onboarding = read("assets/onboarding.js");
const authNav = read("assets/auth-nav.js");
const account = read("konto.html");
const reset = read("passwort-zuruecksetzen.html");

test("login only creates a session-scoped session after a successful backend login", () => {
  assert.match(login, /body\.status!=='logged_in'\|\|!body\.session_token/);
  assert.match(login, /sessionStorage\.setItem\(SESSION_KEY,JSON\.stringify/);
  assert.equal(/localStorage\.setItem\(SESSION_KEY/.test(login), false);
  assert.match(login, /body\.status==='invalid_credentials'/);
  assert.match(login, /res\.status===429/);
});

test("login completes enrolled MFA only through the second verification step", () => {
  assert.match(login, /body\.status==='mfa_required'\|\|body\.mfa_required===true/);
  assert.match(login, /localStorage\.removeItem\(SESSION_KEY\)/);
  assert.match(login, /sessionStorage\.removeItem\(SESSION_KEY\)/);
  assert.match(login, /web\/login\/mfa\/challenge/);
  assert.match(login, /web\/login\/mfa\/verify/);
  assert.match(login, /body\.mfa_verified===true&&completeLogin\(body\)/);
  assert.match(login, /mfaChoiceSms/);
  assert.match(login, /mfaChoiceTotp/);
  assert.match(login, /startMfaChallenge\('sms'\)/);
  assert.match(login, /startMfaChallenge\('totp'\)/);
});

test("login exposes the secure recovery-code path without bypassing password verification", () => {
  assert.match(login, /web-mfa-recovery-code-secure/);
  assert.match(login, /id="mfaRecoverySubmit"/);
  assert.match(login, /password,recovery_code/);
  assert.match(login, /NWRC-/);
  assert.match(login, /Danach müssen Sie sofort eine neue Zwei-Faktor-Methode einrichten/);
});

test("password reset response does not reveal whether an account exists", () => {
  assert.match(login, /Wenn für diese Adresse ein Konto besteht/);
});

test("registration keeps the hardened passphrase policy and never persists the password in its draft", () => {
  assert.match(registration, /minlength="15"/);
  assert.match(registration, /maxlength="128"/);
  assert.match(onboarding, /passwordLength < 15 \|\| passwordLength > 128/);
  assert.match(onboarding, /blockedPasswords = new Set/);
  assert.match(onboarding, /web_password: undefined/);
  assert.match(onboarding, /web_password_repeat: undefined/);
  assert.match(registration, /assets\/onboarding\.js\?v=21/);
});

test("raw web session tokens are not persisted in localStorage", () => {
  assert.equal(/localStorage\.setItem\(SESSION_KEY/.test(login), false);
  assert.equal(/localStorage\.setItem\(SESSION_KEY/.test(onboarding), false);
  assert.equal(/localStorage\.(getItem|setItem)\("scb_web_session"/.test(account), false);
  assert.match(authNav, /sessionStorage\.getItem\(SESSION_KEY/);
  assert.match(authNav, /sessionStorage\.setItem\(SESSION_KEY/);
  assert.match(authNav, /localStorage\.removeItem\(SESSION_KEY/);
  assert.match(authNav, /JSON\.stringify\(\{ action: "logout" \}\)/);
});

test("protected account pages validate against the secure session layer", () => {
  assert.match(authNav, /const PROTECTED = new Set\(\["konto\.html", "concierge-anpassen\.html"\]\)/);
  assert.match(authNav, /functions\/v1\/web-session-secure/);
  assert.match(authNav, /response\.ok && body\.ok && body\.status === "session_valid"/);
});

test("account security supports MFA enrollment, disable, cross-factor recovery and recovery codes", () => {
  assert.match(account, /id="mfaCard"/);
  assert.match(account, /functions\/v1\/web-mfa-status/);
  assert.match(account, /functions\/v1\/web-mfa-manage/);
  assert.match(account, /mfaManage\("enroll_start"/);
  assert.match(account, /mfaManage\("enroll_verify"/);
  assert.match(account, /mfaManage\("enroll_cancel"/);
  assert.match(account, /mfaManage\("disable"/);
  assert.match(account, /mfaManage\("sms_disable_start"/);
  assert.match(account, /mfaManage\("sms_disable_verify"/);
  assert.match(account, /mfaManage\("cross_reset_totp_start"/);
  assert.match(account, /mfaManage\("cross_reset_totp_verify"/);
  assert.match(account, /mfaManage\("cross_reset_sms"/);
  assert.match(account, /mfaManage\("recovery_codes_totp"/);
  assert.match(account, /mfaManage\("recovery_codes_sms_start"/);
  assert.match(account, /mfaManage\("recovery_codes_sms_verify"/);
  assert.match(account, /id="mfaRecoveryCodesOutput"/);
  assert.match(account, /navigator\.clipboard\.writeText/);
  assert.equal(/localStorage\.setItem\([^\n]*(challenge_id|mfaEnrollmentToken|mfaRecoveryCodesSmsChallengeId)/.test(account), false);
});

test("password recovery is server-side and revokes sessions", () => {
  assert.match(reset, /web-password-recovery-secure/);
  assert.match(reset, /minlength="15"/);
  assert.match(reset, /signOut\(\{scope:'global'\}\)/);
  assert.equal(reset.includes("auth.updateUser({password:p})"), false);
});
