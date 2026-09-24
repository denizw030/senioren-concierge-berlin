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
    "FREE", "0 €", "20 WhatsApp-Kundennachrichten",
    "STANDARD", "5,99 €", "30 WhatsApp-Kundennachrichten",
    "PLUS", "10,99 €", "50 WhatsApp-Kundennachrichten",
    "PREMIUM", "19,99 €", "100 WhatsApp-Kundennachrichten",
    "PREMIUM PLUS", "34,99 €", "160 WhatsApp-Kundennachrichten",
    "FAMILIE", "59,66 €", "300 WhatsApp-Kundennachrichten",
  ]) assert.ok(pricing.includes(expected), `missing ${expected}`);
  assert.match(pricing, /<small>\/ Monat<\/small>/);
});

test("FREE legal copy uses unlimited app/web and 30-day cycle", () => {
  for (const path of ["agb.html", "agb/index.html", "nutzungsbedingungen/index.html"]) {
    const html = read(path);
    assert.match(html, /App- und Web-Dialoge[\s\S]{0,120}unbegrenzt/);
    assert.match(html, /20[\s\S]{0,80}WhatsApp-Kundennachrichten[\s\S]{0,120}30-Tage-Nutzungszeitraum/);
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
