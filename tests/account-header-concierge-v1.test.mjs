import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const konto=fs.readFileSync("konto.html","utf8");
const css=fs.readFileSync("assets/account-header-concierge.css","utf8");
const js=fs.readFileSync("assets/account-header-concierge.js","utf8");

test("account loads a dedicated selected-concierge header shortcut",()=>{
  assert.match(konto,/assets\/account-header-concierge\.css\?v=\d+/);
  assert.match(konto,/assets\/account-header-concierge\.js\?v=1/);
  assert.match(js,/id = "accountHeaderConcierge"/);
  assert.match(js,/href = "\/web-concierge"/);
  assert.match(js,/Dein Concierge/);
  assert.match(js,/öffnen und chatten/);
});

test("header concierge mirrors only the already-authoritative central persona",()=>{
  assert.match(js,/source\.dataset\.personaSource === "central"/);
  assert.match(js,/data-overview-concierge-avatar/);
  assert.match(js,/source\.textContent/);
  assert.doesNotMatch(js,/\bfetch\s*\(/);
  assert.doesNotMatch(js,/nahwerk-web-gateway|customer-portal-staging/i);
  assert.doesNotMatch(js,/\bNilo\b|\bLena\b|\bLeyla\b|\bKonrad\b/i);
});

test("header shortcut is responsive and does not crowd very small screens",()=>{
  assert.match(css,/@media\(max-width:1280px\) and \(min-width:521px\)/);
  assert.match(css,/right:clamp\(230px,33vw,360px\)/);
  assert.match(css,/@media\(max-width:520px\)/);
  assert.match(css,/\.nw-header-concierge\{display:none!important\}/);
});
