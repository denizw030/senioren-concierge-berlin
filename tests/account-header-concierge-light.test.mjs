import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const css = read("assets/account-header-concierge.css");
const konto = read("konto.html");
const clean = read("konto/index.html");

test("header concierge badge follows light account theme only", () => {
  assert.match(css, /body\.account-premium-ui\.nw-portal-light \.nw-header-concierge\{/);
  assert.match(css, /background:#fffdf8!important/);
  assert.match(css, /\.nw-header-concierge-copy strong\{/);
  assert.match(css, /color:#201d17!important/);
  assert.match(css, /\.nw-header-concierge-chat\{/);
  assert.match(css, /color:#8b6828!important/);
});

test("account routes load the fresh header concierge stylesheet and remain mirrored", () => {
  assert.match(konto, /assets\/account-header-concierge\.css\?v=2/);
  assert.match(clean, /assets\/account-header-concierge\.css\?v=2/);
  assert.equal(konto, clean.replace('<head><base href="/">','<head>'));
});
