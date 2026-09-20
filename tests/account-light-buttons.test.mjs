import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const css = read("assets/account-light-buttons.css");
const konto = read("konto.html");
const clean = read("konto/index.html");

test("light account action buttons are modern and visible", () => {
  assert.match(css, /body\.account-premium-ui\.account-premium-ui\.nw-portal-light \.btn/);
  assert.match(css, /\.btn\.red:not\(:disabled\)/);
  assert.match(css, /background:linear-gradient\(180deg,#d4ad55 0%,#bd8f35 100%\)!important/);
  assert.match(css, /\.btn\.light:not\(:disabled\)/);
  assert.match(css, /background:#fff!important/);
  assert.match(css, /\.btn:disabled/);
  assert.match(css, /background:#eee7da!important/);
  assert.match(css, /opacity:1!important/);
});

test("button polish remains scoped to light account mode", () => {
  assert.doesNotMatch(css, /^\.btn\{/m);
  assert.doesNotMatch(css, /body:not\(/);
  assert.match(css, /html\[data-nw-portal-theme="light"\] body\.account-premium-ui/);
});

test("both account routes load only the dedicated button stylesheet and remain mirrored", () => {
  assert.match(konto, /assets\/account-light-buttons\.css\?v=1/);
  assert.match(clean, /assets\/account-light-buttons\.css\?v=1/);
  assert.equal(konto, clean.replace('<head><base href="/">','<head>'));
});
