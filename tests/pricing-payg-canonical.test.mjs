import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL("../" + path, import.meta.url), "utf8");
const normalizeClean = (html) => html.replace('<head><base href="/">', "<head>");

test("pricing clean route mirrors canonical pricing page", () => {
  const canonical = read("pakete.html");
  const clean = normalizeClean(read("pakete/index.html"));
  assert.equal(clean, canonical);
});

test("canonical package prices and WhatsApp limits stay aligned", () => {
  const pricing = read("pakete.html");
  for (const expected of [
    "FREE", "0 €", "20 WhatsApp-Nachrichten",
    "STANDARD", "5,99 €", "30 WhatsApp-Nachrichten",
    "PLUS", "10,99 €", "50 WhatsApp-Nachrichten",
    "PREMIUM", "19,99 €", "100 WhatsApp-Nachrichten",
    "PREMIUM PLUS", "34,99 €", "160 WhatsApp-Nachrichten",
    "FAMILIE", "59,66 €", "300 WhatsApp-Nachrichten",
  ]) assert.ok(pricing.includes(expected), `missing ${expected}`);
  assert.match(pricing, /<small>\/ Monat<\/small>/);
});

test("FREE legal copy uses unlimited app/web and 30-day cycle", () => {
  for (const path of ["agb.html", "agb/index.html", "nutzungsbedingungen/index.html"]) {
    const html = read(path);
    assert.match(html, /App- und Web-Dialoge[\s\S]{0,120}unbegrenzt/);
    assert.match(html, /20[\s\S]{0,80}WhatsApp-Nachrichten[\s\S]{0,120}30-Tage-Nutzungszeitraum/);
    assert.doesNotMatch(html, /50 App-Dialoge/);
  }
});

test("PAYG offers the first real 5 euro wallet top-up", () => {
  for (const path of ["payg.html", "payg/index.html"]) {
    const html = read(path);
    assert.match(html, /data-topup-cents="500">5 €<\/button>/);
    assert.match(html, /id="paygActivate">PAYG aktivieren<\/button>/);
  }
});


test("pricing public surface uses the professional STEWARO v2 presentation", () => {
  const pricing = read("pakete.html");
  for (const route of ["/de/","/prime-concierge","/angehoerige","/digitaler-schutz","/telefonannahme","/pakete","/kontakt"]) {
    assert.ok(pricing.includes(`href="${route}"`), `${route} missing from canonical pricing navigation`);
  }
  assert.match(pricing, /pricing-page pricing-v2-page/);
  assert.match(pricing, /pricing-public-v2\.css/);
  assert.match(pricing, /Einfach starten\. Nur so viel, wie Sie brauchen\./);
  assert.match(pricing, /Telefonannahme ist ein eigener Bereich\./);
  assert.doesNotMatch(pricing, /STEWARO weltweit|Telefonannahme Standalone|spezialisierter Telefonagent|\/telefonannahme#einrichtung/);
  assert.doesNotMatch(pricing, /\b(?:du|dich|dein|deine|deinem|deinen|deiner|deines)\b/i);
});

test("pricing locale pages share the same visual shell and clean routes mirror their canonicals", () => {
  for (const lang of ["en","tr"]) {
    const canonical = read(`${lang}/pakete.html`);
    const clean = normalizeClean(read(`${lang}/pakete/index.html`));
    assert.equal(clean, canonical, `${lang} clean pricing route must mirror canonical`);
    assert.match(canonical, /pricing-page pricing-v2-page/);
    assert.match(canonical, /pricing-public-v2\.css/);
  }
});
