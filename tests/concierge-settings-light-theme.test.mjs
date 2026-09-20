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
