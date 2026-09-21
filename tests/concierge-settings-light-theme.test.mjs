import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const page = read("concierge-anpassen.html");
const clean = read("concierge-anpassen/index.html");

test("Concierge settings light theme matches the account light palette", () => {
  assert.match(page, /concierge-settings-light-parity-v7/);
  assert.match(page, /background:#f7f3ea!important/);
  assert.match(page, /\.concierge-settings-section>\.wrap/);
  assert.match(page, /background:transparent!important/);
  assert.match(page, /\.nw-carousel-stage/);
  assert.match(page, /\.nw-carousel-card img/);
  assert.match(page, /background:#fff!important/);
});

test("Concierge settings dark mode matches the canonical account dark palette", () => {
  assert.match(page, /concierge-settings-dark-parity-v1/);
  assert.match(page, /html\[data-nw-portal-theme="dark"\] body\.concierge-portal-settings\{/);
  assert.match(page, /background:#030405!important/);
  assert.match(page, /linear-gradient\(180deg,#030405 0%,#06090d 48%,#030405 100%\)!important/);
  assert.match(page, /background-color:#0b0f14!important/);
  assert.match(page, /color:#f5f3ee!important/);
  assert.match(page, /\.nw-carousel-card\.is-active/);
  assert.match(page, /\.nw-voice-preview-language-select/);
  assert.match(page, /footer\.footer/);
});

test("voice preview language control is a centered white button", () => {
  assert.match(page, /\.nw-voice-preview-language-select/);
  assert.match(page, /width:min\(100%,190px\)!important/);
  assert.match(page, /margin:0 auto!important/);
  assert.match(page, /text-align:center!important/);
  assert.match(page, /text-align-last:center!important/);
  assert.match(page, /background:#fff!important/);
});

test("clean Concierge settings route remains mirrored", () => {
  assert.equal(page, clean.replace('<head><base href="/">','<head>'));
});
