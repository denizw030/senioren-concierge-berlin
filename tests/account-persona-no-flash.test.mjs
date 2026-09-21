import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const account = read("konto.html");
const accountClean = read("konto/index.html");
const settings = read("concierge-anpassen.html");
const settingsClean = read("concierge-anpassen/index.html");
const carousel = read("assets/concierge-carousel.js");

test("authenticated account never paints a Concierge name from legacy onboarding storage", () => {
  assert.match(account, /if \(selected && !sessionToken\(\)\)/);
  const legacyBlock = account.slice(
    account.indexOf('localStorage.getItem("scb_onboarding")'),
    account.indexOf('prefSummary(', account.indexOf('localStorage.getItem("scb_onboarding")'))
  );
  assert.match(legacyBlock, /if \(selected && !sessionToken\(\)\)/);
  assert.doesNotMatch(legacyBlock, /if \(selected\) \{/);
});

test("selection carousel has no named default before a real saved persona exists", () => {
  assert.match(carousel, /const requested=options\.selected\|\|root\.dataset\.selected\|\|""/);
  assert.match(carousel, /if\(variant==="selection"&&!requested\)/);
  assert.match(carousel, /root\.dataset\.awaitingPersona="1"/);
  assert.doesNotMatch(carousel, /const requested=options\.selected\|\|root\.dataset\.selected\|\|"nilo"/);
});

test("Concierge settings mounts and reveals the slider only after authoritative web\/me persona", () => {
  assert.match(settings, /GATEWAY_URL\+"\/web\/me"/);
  assert.match(settings, /canonicalPersonaKey=String\(raw\.persona_key/);
  assert.match(settings, /window\.NAHWERKCarousel\?\.mount\?\.\(carousel,\{selected:canonicalPersonaKey\}\)/);
  assert.match(settings, /carousel\.dataset\.authoritativePersona="1"/);
  const applyBlock = settings.slice(settings.indexOf("function apply(x)"), settings.indexOf("function activePersonaName"));
  assert.doesNotMatch(applyBlock, /authoritativePersona|carousel\.dataset\.selected|_nahwerkCarousel/);
  assert.match(settings, /concierge-carousel\.js\?v=24/);
});

test("Concierge switch drops stale persona prefetch before authoritative reload", () => {
  const start = settings.indexOf("async function switchCanonicalPersona");
  const end = settings.indexOf("function render()", start);
  const block = settings.slice(start, end);
  assert.match(block, /personaPrefetchPromise=null;\s*await loadCanonicalPersona\(s\);/);
  assert.ok(block.indexOf("personaPrefetchPromise=null;") < block.indexOf("await loadCanonicalPersona(s);"));
});

test("clean account and Concierge settings routes remain exact mirrors apart from base href", () => {
  assert.equal(account, accountClean.replace('<head><base href="/">','<head>'));
  assert.equal(settings, settingsClean.replace('<head><base href="/">','<head>'));
});
