import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL("../" + path, import.meta.url), "utf8");
const CURRENT_PROD_HOST = "nahwerkconcierge.com";
const STEWARO_CANDIDATE = "https://stewaro.com";

test("Block 4 keeps pricing and Family ready for STEWARO", () => {
  const pricing = read("pakete.html");
  for (const expected of ["STEWARO", "FREE", "0 €", "STANDARD", "5,99 €", "PLUS", "10,99 €", "PREMIUM", "19,99 €", "PREMIUM PLUS", "34,99 €", "FAMILIE", "59,66 €"]) {
    assert.ok(pricing.includes(expected), `pricing missing ${expected}`);
  }

  const family = read("angehoerige.html");
  for (const expected of ["STEWARO Family", "Keine automatische Einsicht", "Keine kostenpflichtige Bestellung ohne Bestätigung"]) {
    assert.ok(family.includes(expected), `Family missing ${expected}`);
  }
});

test("Block 4 legal customer surfaces use STEWARO presentation", () => {
  const legal = [
    "agb.html", "agb/index.html", "nutzungsbedingungen/index.html",
    "datenschutz.html", "datenschutz/index.html",
    "datenloeschung.html", "datenloeschung/index.html",
    "impressum.html", "impressum/index.html",
    "ki-transparenz.html", "ki-transparenz/index.html",
    "widerruf.html", "widerruf/index.html",
  ];

  for (const path of legal) {
    const html = read(path);
    assert.ok(html.includes("STEWARO"), `${path} missing STEWARO`);
    assert.doesNotMatch(html, /NAHWERK/);
  }

  for (const path of ["datenschutz/index.html", "ki-transparenz.html", "ki-transparenz/index.html"]) {
    const html = read(path);
    assert.ok(html.includes("FIDEL"), `${path} missing FIDEL`);
    assert.doesNotMatch(html, /Nilo|Mira/);
  }
});

test("Block 4 prepares STEWARO SEO without performing the public DNS cutover", () => {
  assert.equal(read("CNAME").trim(), CURRENT_PROD_HOST);
  assert.ok(read("robots.txt").includes(`Sitemap: ${STEWARO_CANDIDATE}/sitemap.xml`));
  assert.ok(read("sitemap.xml").includes(`<loc>${STEWARO_CANDIDATE}/de/</loc>`));

  for (const path of ["pakete.html", "angehoerige.html", "impressum.html", "datenschutz/index.html", "nutzungsbedingungen/index.html"]) {
    assert.ok(read(path).includes(STEWARO_CANDIDATE), `${path} must be prepared for the STEWARO candidate domain`);
  }
});
