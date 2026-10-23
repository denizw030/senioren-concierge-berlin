import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const canonical = fs.readFileSync("anmelden.html", "utf8");
const clean = fs.readFileSync("anmelden/index.html", "utf8");
const policy = '<meta name="robots" content="noindex,nofollow,noarchive"><meta name="referrer" content="no-referrer">';

test("login routes prevent indexing and referrer disclosure", () => {
  for (const html of [canonical, clean]) {
    assert.equal((html.match(/name="robots"/g) || []).length, 1);
    assert.equal((html.match(/name="referrer"/g) || []).length, 1);
    assert.ok(html.includes(policy));
  }
});

test("privacy policy precedes external resources", () => {
  for (const html of [canonical, clean]) {
    const index = html.indexOf(policy);
    assert.ok(index > 0);
    assert.ok(index < html.indexOf('<link rel="stylesheet"'));
    assert.ok(index < html.indexOf("<script"));
  }
});

test("clean login route mirrors canonical login except root base", () => {
  assert.equal(clean.replace('<head><base href="/">', "<head>"), canonical);
});

test("login remains an interactive password form", () => {
  for (const html of [canonical, clean]) {
    assert.match(html, /id="loginForm"/);
    assert.match(html, /id="loginEmail"/);
    assert.match(html, /id="loginPassword"/);
  }
});
