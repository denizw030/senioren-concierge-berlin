import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const account = read("konto.html");
const onboarding = read("assets/onboarding.js");
const packages = read("pakete.html");
const packageText = packages.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const freeRegistrationPlan = onboarding.match(/free:\s*\{([\s\S]*?)\n    \},\n    standard:/)?.[1] || "";

const packageMatrix = [
  ["FREE", "0 € / Monat", "Web & App Standard unbegrenzt", "30 WhatsApp-Nachrichten / 30 Tage"],
  ["STANDARD", "5,99 € / Monat", "Web & App Standard unbegrenzt", "30 WhatsApp-Nachrichten / 30 Tage"],
  ["PLUS", "10,99 € / Monat", "Web & App Standard unbegrenzt", "30 WhatsApp-Nachrichten / 30 Tage"],
  ["PREMIUM", "19,99 € / Monat", "Web & App Standard unbegrenzt", "30 WhatsApp-Nachrichten / 30 Tage"],
  ["PREMIUM PLUS", "34,99 € / Monat", "Web & App Standard unbegrenzt", "30 WhatsApp-Nachrichten / 30 Tage"],
  ["FAMILIE", "59,66 € / Monat", "Web Standard unbegrenzt", "300 App · 300 WhatsApp gemeinsam / 30 Tage"]
];

const paidRegistrationMatrix = [
  ["STANDARD", "5,99 € / Monat", "Web & App Standard unbegrenzt", "30 WhatsApp-Nachrichten / 30 Tage"],
  ["PLUS", "10,99 € / Monat", "Web & App Standard unbegrenzt", "30 WhatsApp-Nachrichten / 30 Tage"],
  ["PREMIUM", "19,99 € / Monat", "Web & App Standard unbegrenzt", "30 WhatsApp-Nachrichten / 30 Tage"],
  ["PREMIUM PLUS", "34,99 € / Monat", "Web & App Standard unbegrenzt", "30 WhatsApp-Nachrichten / 30 Tage"],
  ["FAMILIE", "59,66 € / Monat", "Web Standard unbegrenzt", "300 App · 300 WhatsApp gemeinsam / 30 Tage"]
];

test("FREE registration uses the central account entitlement contract", () => {
  assert.match(onboarding, /web-registration-secure/);
  assert.match(onboarding, /web-login-secure/);
  assert.match(onboarding, /package: selectedPlan\(\)\.code/);
  assert.match(onboarding, /code: "FREE"[\s\S]*price: "0 € \/ Monat"[\s\S]*bookable: true/);
  assert.match(onboarding, /Zentrales FREE-Kontingent · nach Login live sichtbar/);
  assert.match(onboarding, /FREE wird ohne Zahlungsdaten angelegt/);
  assert.ok(freeRegistrationPlan, "FREE registration plan block exists");
  assert.doesNotMatch(freeRegistrationPlan, /\b50 App-Dialoge\b/, "FREE App quota is not maintained in the active registration plan");
  assert.doesNotMatch(freeRegistrationPlan, /\b20 WhatsApp-Dialoge\b/, "FREE WhatsApp quota is not maintained in the active registration plan");
});

test("public package overview and registration preview match the central authority", () => {
  for (const values of packageMatrix) {
    for (const value of values) assert.equal(packageText.includes(value), true, `${value} is shown on packages`);
  }
  for (const values of paidRegistrationMatrix) {
    for (const value of values) assert.equal(onboarding.includes(value), true, `${value} remains available in paid registration preview`);
  }
  for (const obsolete of ["KOMFORT", "50 App-Dialoge", "100 App-Dialoge", "180 App-Dialoge", "400 App-Dialoge", "750 App-Dialoge", "1.200 App-Dialoge", "20 WhatsApp-Dialoge", "50 WhatsApp-Dialoge", "100 WhatsApp-Dialoge", "160 WhatsApp-Dialoge"])
    assert.equal(onboarding.includes(obsolete) || packages.includes(obsolete), false, `${obsolete} is removed`);
});

test("account preview remains console-only and reversible", () => {
  assert.match(account, /window\.NAHWERKAccountPreview = Object\.freeze/);
  assert.match(account, /prime\(\)[\s\S]*ACCOUNT_PREVIEW_KEY, "prime"/);
  assert.match(account, /senioren\(\)[\s\S]*ACCOUNT_PREVIEW_KEY, "senioren"/);
  assert.match(account, /reset\(\)[\s\S]*removeItem\(ACCOUNT_PREVIEW_KEY\)[\s\S]*location\.reload/);
  assert.equal(account.includes("NAHWERKAccountPreview.prime()"), false, "no visible preview command or switch exists");
});

test("account usage renders the canonical 30-day authority and owner controls without inventing usage", () => {
  assert.match(account, /web-profile/);
  assert.match(account, /Aktueller 30-Tage-Nutzungszeitraum/);
  assert.match(account, /id="appUsageSummary"/);
  assert.match(account, /id="whatsappUsageSummary"/);
  assert.match(account, /account\?\.usage\?\.app_dialog/);
  assert.match(account, /account\?\.usage\?\.whatsapp_dialog/);
  assert.match(account, /usage_feature_catalog/);
  assert.match(account, /owner_self_limits/);
  assert.match(account, /action:"owner_self_limit_set"/);
  assert.match(account, /Meine Kontingente/);
  assert.equal(account.includes("Nutzung diesen Kalendermonat"), false);
  assert.equal(account.includes('localStorage.getItem("scb_usage")'), false);
  assert.equal(account.includes("u.dialogues_used || 0"), false);
});

test("authenticated customer portal exposes the required customer areas", () => {
  for (const label of ["Übersicht", "Concierge", "E-Mail", "Sicherheit", "Nutzung", "Persönliche Daten"])
    assert.equal(account.includes(label), true, `${label} remains available after login`);
});
