import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const deepCss = read("assets/email-multi-account-v1.css");
const loader = read("assets/email-provider-logo-connect-v3.js");
const konto = read("konto.html");
const clean = read("konto/index.html");

test("late-loaded multi-account E-Mail UI follows account light theme at source", () => {
  assert.match(deepCss, /LIGHT account parity/);
  assert.match(deepCss, /\.email-multi-account-concierge/);
  assert.match(deepCss, /background:radial-gradient\(460px 240px/);
  assert.match(deepCss, /\.email-multi-account-field select/);
  assert.match(deepCss, /background:#fff!important/);
  assert.match(deepCss, /\.email-multi-account-detail-body/);
});

test("deep multi-account stylesheet is cache-busted by its dynamic loader", () => {
  assert.match(loader, /email-multi-account-v1\.css\?v=[0-9-]+/);
  assert.match(konto, /email-provider-logo-connect-v3\.js\?v=[0-9-]+/);
  assert.match(clean, /email-provider-logo-connect-v3\.js\?v=[0-9-]+/);
});

test("account routes remain mirrored after deep E-Mail fix", () => {
  assert.equal(konto, clean.replace('<head><base href="/">','<head>'));
});
