import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const flat = read("web-concierge.html");
const clean = read("web-concierge/index.html");
const css = read("assets/stewaro-app.css");
const shell = read("assets/stewaro-app-shell.js");
const chat = read("assets/web-customer-concierge.js");

test("STEWARO app uses the approved ivory forest and champagne palette", () => {
  assert.match(css, /--stewaro-ivory:#f7f3eb/);
  assert.match(css, /--stewaro-forest:#173126/);
  assert.match(css, /--stewaro-gold:#c79a3d/);
  assert.match(css, /--stewaro-serif:Georgia/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
});

test("both FIDEL route mirrors load the same app shell assets", () => {
  for (const page of [flat, clean]) {
    assert.match(page, /assets\/stewaro-app\.css\?v=1/);
    assert.match(page, /assets\/stewaro-app-shell\.js\?v=1/);
    assert.match(page, /id="stewaroAppShell"/);
    assert.match(page, /assets\/logos\/stewaro-wordmark\.svg\?v=1/);
    for (const label of ["Übersicht", "FIDEL", "Sicherheit", "Mehr"]) {
      assert.ok(page.includes(">" + label + "<"), "missing bottom navigation label " + label);
    }
  }
});

test("app contains all three approved Safety presentation states without unsafe bypass copy", () => {
  for (const copy of [
    "STEWARO Schutz einrichten",
    "Schutz aktiv",
    "STEWARO hat den verdächtigen Link blockiert.",
    "Der Link weist Merkmale eines möglichen Betrugsversuchs auf.",
    "FIDEL prüfen lassen",
    "Einstellungen ändern"
  ]) assert.ok(flat.includes(copy), "missing Safety copy: " + copy);
  assert.doesNotMatch(flat, /Trotzdem öffnen|Schutz garantiert|100 ?% sicher/i);
  assert.match(flat, /data-stewaro-safety-state="blocked" hidden/);
});

test("overview reads authoritative profile usage and Safety data instead of hardcoding account status", () => {
  assert.match(shell, /functions\/v1\/web-profile/);
  assert.match(shell, /functions\/v1\/web-managed-safety-context/);
  assert.match(shell, /Authorization: "Bearer " \+ bearer/);
  assert.match(shell, /usage\?\.app_dialogues_used/);
  assert.match(shell, /plan\?\.app_dialogue_limit/);
  assert.match(shell, /profile\.whatsapp_number/);
  assert.match(shell, /safety\.enabled === true/);
  assert.match(shell, /Es werden keine Werte geschätzt/);
});

test("blocked-link screen is event driven and never silently fabricates an incident", () => {
  assert.match(shell, /stewaro:safety-link-blocked/);
  assert.match(shell, /showSafetyAlert/);
  assert.doesNotMatch(shell, /showSafetyAlert\(\s*\{\s*host:/);
  assert.match(shell, /selectTab\("safety"\)/);
});

test("FIDEL remains the existing Web Gateway chat and adds an explicit safe retry affordance", () => {
  assert.match(chat, /execute-api\.eu-central-1\.amazonaws\.com\/prod\/v1\/web/);
  assert.match(chat, /execute-api\.eu-central-1\.amazonaws\.com\/prod\/v1\/web\/history/);
  assert.match(chat, /web-concierge-retry/);
  assert.match(chat, /Erneut senden/);
  assert.match(chat, /source_message_id:sourceMessageId/);
  assert.match(chat, /content\.length>4000/);
});

test("app-specific auth failures return to account.stewaro.com and never enable guest mode", () => {
  assert.match(chat, /IS_CANONICAL_APP_HOST/);
  assert.match(chat, /https:\/\/account\.stewaro\.com\/anmelden\?produkt=senioren&next=app/);
  assert.match(chat, /canonicalAppHost&&guestMode/);
});

test("More uses existing Account surfaces and logout invalidates the existing secure session", () => {
  assert.match(flat, /https:\/\/account\.stewaro\.com\/email-concierge/);
  assert.match(flat, /https:\/\/account\.stewaro\.com\/telefonannahme/);
  assert.match(flat, /https:\/\/account\.stewaro\.com\/concierge-anpassen/);
  assert.match(shell, /functions\/v1\/web-session-secure/);
  assert.match(shell, /action: "logout"/);
  assert.match(shell, /sessionStorage\.removeItem\(SESSION_KEY\)/);
  assert.match(shell, /localStorage\.removeItem\(SESSION_KEY\)/);
});

console.log("STEWARO_APP_DESIGN_SHELL=GREEN");
