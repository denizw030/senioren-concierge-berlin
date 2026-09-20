import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const ui = read("assets/site-ui.js");
const konto = read("konto.html");
const clean = read("konto/index.html");

test("light account mobile navigation never falls back to dark menu surface", () => {
  assert.match(ui, /body\.account-premium-ui\.nw-portal-light \.top \.links\{/);
  assert.match(ui, /background:#fffdf8!important/);
  assert.match(ui, /border-color:rgba\(74,59,34,\.15\)!important/);
  assert.match(ui, /body\.account-premium-ui\.nw-portal-light \.top \.links :is\(a,\.auth-link,\.nw-account-link,\.nw-account-mobile,\.nw-account-logout,\.nw-language-button\)/);
  assert.match(ui, /color:#393229!important/);
});

test("account routes load the fresh shell asset and remain mirrored", () => {
  assert.match(konto, /assets\/site-ui\.js\?v=11/);
  assert.match(clean, /assets\/site-ui\.js\?v=11/);
  assert.equal(konto, clean.replace('<head><base href="/">','<head>'));
});
