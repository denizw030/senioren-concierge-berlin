import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync("en/index.html", "utf8");

test("English STEWARO homepage screen-reader labels match the document language", () => {
  assert.match(html, /<html lang="en">/);
  const labels = new Map([
    ["Main navigation", 1],
    ["Three simple steps", 1],
    ["Process", 1],
    ["Legal information", 1],
    ["STEWARO home page", 2],
  ]);
  for (const [label, expected] of labels) {
    const count = html.split(`aria-label="${label}"`).length - 1;
    assert.equal(count, expected, `expected ${expected} English label(s): ${label}`);
  }
  assert.doesNotMatch(
    html,
    /aria-label="(?:Hauptnavigation|In drei einfachen Schritten|Ablauf|Rechtliches|STEWARO Startseite)"/
  );
});

test("English accessibility labels preserve all three English family entry routes", () => {
  const links = [...html.matchAll(/<a[^>]+data-entry="loved-one"[^>]*>/g)].map(m => m[0]);
  assert.equal(links.length, 3);
  assert.ok(links.every(link => link.includes('href="/en/angehoerige')));
  assert.equal(links.filter(link => link.includes("?source=stewaro")).length, 2);
});
