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
  ["FREE", "0 € / Monat", "50 App-Dialoge", "20 WhatsApp-Dialoge"],
  ["STANDARD", "5,99 € / Monat", "100 App-Dialoge", "30 WhatsApp-Dialoge"],
  ["PLUS", "10,99 € / Monat", "180 App-Dialoge", "50 WhatsApp-Dialoge"],
  ["PREMIUM", "19,99 € / Monat", "400 App-Dialoge", "100 WhatsApp-Dialoge"],
  ["PREMIUM PLUS", "34,99 € / Monat", "750 App-Dialoge", "160 WhatsApp-Dialoge"],
  ["FAMILIE", "59,66 € / Monat", "1.200 App-Dialoge", "300 WhatsApp-Dialoge"]
];

const paidRegistrationMatrix = [
  ["STANDARD", "5,99 € / Monat", "100 App-Dialoge", "30 WhatsApp-Dialoge"],
  ["PLUS", "10,99 € / Monat", "180 App-Dialoge", "50 WhatsApp-Dialoge"],
  ["PREMIUM", "19,99 € / Monat", "400 App-Dialoge", "100 WhatsApp-Dialoge"],
  ["PREMIUM PLUS", "34,99 € / Monat", "750 App-Dialoge", "160 WhatsApp-Dialoge"],
  ["FAMILIE", "59,66 € / Monat", "1.200 App-Dialoge", "300 WhatsApp-Dialoge"]
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

test("public package overview and paid registration choices remain unchanged", () => {
  for (const values of packageMatrix) {
    for (const value of values) assert.equal(packageText.includes(value), true, `${value} is shown on packages`);
  }
  for (const values of paidRegistrationMatrix) {
    for (const value of values) assert.equal(onboarding.includes(value), true, `${value} remains available in paid registration preview`);
  }
  for (const obsolete of ["KOMFORT", "200 Dialoge", "350 Dialoge", "600 Dialoge"])
    assert.equal(onboarding.includes(obsolete) || packages.includes(obsolete), false, `${obsolete} is removed`);
});

test("account preview remains console-only and reversible", () => {
  assert.match(account, /window\.NAHWERKAccountPreview = Object\.freeze/);
  assert.match(account, /prime\(\)[\s\S]*ACCOUNT_PREVIEW_KEY, "prime"/);
  assert.match(account, /senioren\(\)[\s\S]*ACCOUNT_PREVIEW_KEY, "senioren"/);
  assert.match(account, /reset\(\)[\s\S]*removeItem\(ACCOUNT_PREVIEW_KEY\)[\s\S]*location\.reload/);
  assert.equal(account.includes("NAHWERKAccountPreview.prime()"), false, "no visible preview command or switch exists");
});

test("account usage comes from the central customer profile and never invents zero usage", () => {
  assert.match(account, /web-profile/);
  assert.match(account, /id="appUsageSummary"/);
  assert.match(account, /id="whatsappUsageSummary"/);
  assert.match(account, /Aktueller Verbrauch derzeit nicht verfügbar/);
  assert.match(account, /usage\?\.app_dialogues_used/);
  assert.match(account, /usage\?\.whatsapp_dialogues_used/);
  assert.match(account, /plan\?\.app_dialogue_limit/);
  assert.match(account, /plan\?\.whatsapp_dialogue_limit/);
  assert.equal(account.includes('localStorage.getItem("scb_usage")'), false);
  assert.equal(account.includes("u.dialogues_used || 0"), false);
});

test("authenticated customer portal exposes the required customer areas", () => {
  for (const label of ["Übersicht", "Concierge", "E-Mail", "Sicherheit", "Nutzung", "Persönliche Daten"])
    assert.equal(account.includes(label), true, `${label} remains available after login`);
});
