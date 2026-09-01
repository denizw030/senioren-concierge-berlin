import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const carousel = read("assets/concierge-carousel.js");
const overview = read("assets/concierge-overview.js");
const colours = read("assets/brand-2026.css");
const onboarding = read("assets/onboarding.js");
const packages = read("pakete.html");
const prime = read("prime-concierge.html");
const senior = read("senioren-concierge.html");
const visibleText = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

test("all 23 optimized concierge card and large images are present", () => {
  const profileBlock = carousel.match(/const profiles = \[([\s\S]*?)\]\.map/);
  assert.ok(profileBlock, "profile catalogue exists");
  const keys = [...profileBlock[1].matchAll(/\["([a-z]+)",/g)].map((match) => match[1]);
  assert.equal(keys.length, 23);
  for (const key of keys) {
    for (const size of ["card", "large"]) {
      const file = new URL(`assets/concierges/${size}/${key}.webp`, root);
      assert.equal(existsSync(file), true, `${size}/${key}.webp exists`);
      assert.ok(statSync(file).size > 10_000, `${size}/${key}.webp is not empty`);
    }
  }
});

test("overview uses deterministic native image loading with a large-image fallback", () => {
  assert.equal(overview.includes("IntersectionObserver"), false);
  assert.equal(overview.includes("dataset.src"), false);
  assert.match(overview, /cardImage\.loading = index < 4 \? "eager" : "lazy"/);
  assert.match(overview, /cardImage\.src = profile\.cardImage \|\| profile\.image/);
  assert.match(overview, /cardImage\.src = profile\.largeImage/);
});

test("dark pages share the premium gold colour atmosphere while senior mode stays excluded", () => {
  assert.match(colours, /body:not\(\.senior-product\):not\(\[data-product="senioren"\]\) main/);
  assert.match(colours, /rgba\(212,175,55,/);
  assert.match(colours, /\.senior-product \.request-card/);
});

test("senior and personal pages advertise useful real-world requests with approval boundaries", () => {
  assert.match(visibleText(senior), /Kannst du mir einen Uber besorgen/);
  assert.match(visibleText(senior), /Bevor Kosten entstehen/);
  assert.match(visibleText(senior), /Ist diese Nachricht echt oder vielleicht Betrug/);
  assert.match(visibleText(prime), /Plane mir ein entspanntes Wochenende in Lissabon/);
  assert.match(visibleText(prime), /Buchungen, Käufe oder andere kostenpflichtige Schritte/);
});

test("current launch tariff matrix is consistent in packages and registration", () => {
  for (const value of [
    "50 App-Dialoge",
    "20 WhatsApp-Dialoge",
    "5,99 € / Monat",
    "100 App-Dialoge",
    "30 WhatsApp-Dialoge",
    "10,99 € / Monat",
    "180 App-Dialoge",
    "50 WhatsApp-Dialoge",
    "19,99 € / Monat",
    "400 App-Dialoge",
    "100 WhatsApp-Dialoge",
    "34,99 € / Monat",
    "750 App-Dialoge",
    "160 WhatsApp-Dialoge",
    "59,99 € / Monat",
    "1.200 App-Dialoge",
    "300 WhatsApp-Dialoge"
  ]) {
    assert.equal(visibleText(packages).includes(value), true, `${value} is shown on package page`);
    assert.equal(onboarding.includes(value), true, `${value} is used in registration`);
  }
  assert.match(onboarding, /bookable: false/);
  assert.match(visibleText(packages), /eine kostenpflichtige Bestellung wird erst möglich/);
});
