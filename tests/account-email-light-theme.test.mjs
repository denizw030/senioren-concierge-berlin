import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const css = read("assets/account-premium-ui.css");
const konto = read("konto.html");
const clean = read("konto/index.html");

test("account email dynamic provider UI follows light theme", () => {
  assert.match(css, /E-Mail light parity v7/);
  assert.match(css, /#accountEmailCard \.email-logo-provider-card/);
  assert.match(css, /background:linear-gradient\(145deg,#fff,#fbf7ef\)!important/);
  assert.match(css, /\.email-provider-connect-modal/);
  assert.match(css, /background:#fffdf8!important/);
  assert.match(css, /\.email-provider-connect-field input/);
});

test("account pages load the cache-busted theme asset", () => {
  assert.match(konto, /assets\/account-premium-ui\.css\?v=7/);
  assert.match(clean, /assets\/account-premium-ui\.css\?v=7/);
});

test("clean account route remains mirrored", () => {
  assert.equal(konto, clean.replace('<head><base href="/">','<head>'));
});
