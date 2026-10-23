import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const flat = readFileSync(new URL("../registrieren.html", import.meta.url), "utf8");
const clean = readFileSync(new URL("../registrieren/index.html", import.meta.url), "utf8");

test("registration clean route mirrors flat route except root base", () => {
  assert.equal(clean.replace('<head><base href="/">', "<head>"), flat);
});

for (const [name, html] of [["flat", flat], ["clean", clean]]) {
  test(`${name} registration blocks indexing and URL referrer disclosure before assets`, () => {
    const head = html.split("</head>", 1)[0];
    assert.equal((head.match(/<meta name="robots"/g) || []).length, 1);
    assert.equal((head.match(/<meta name="referrer"/g) || []).length, 1);
    assert.match(head, /<meta name="robots" content="noindex,nofollow,noarchive" \/>/);
    assert.match(head, /<meta name="referrer" content="no-referrer" \/>/);
    assert.ok(head.indexOf('name="viewport"') < head.indexOf('name="robots"'));
    assert.ok(head.indexOf('name="referrer"') < head.indexOf("<link"));
    assert.match(html, /<form[^>]*id="signupForm"/);
    assert.match(html, /assets\/onboarding\.js/);
  });
}
