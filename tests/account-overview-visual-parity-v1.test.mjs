import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const css=fs.readFileSync("assets/account-overview-visual-parity-v1.css","utf8");
const konto=fs.readFileSync("konto.html","utf8");
const clean=fs.readFileSync("konto/index.html","utf8");

test("all account tabs load one final overview-parity presentation layer",()=>{
  for(const html of [konto,clean]){
    assert.match(html,/assets\/account-overview-visual-parity-v1\.css\?v=1/);
    const link=html.lastIndexOf('assets/account-overview-visual-parity-v1.css?v=1');
    const headEnd=html.lastIndexOf("</head>");
    assert.ok(link>0 && link<headEnd && headEnd-link<220);
  }
});

test("portal parity reuses the exact Overview ambient palette in dark mode",()=>{
  assert.match(css,/radial-gradient\(980px 640px at -6% 28%,rgba\(122,112,63,\.18\),transparent 66%\)/);
  assert.match(css,/radial-gradient\(920px 620px at 48% 10%,rgba\(91,39,72,\.16\),transparent 69%\)/);
  assert.match(css,/linear-gradient\(145deg,#050607 0%,#09080d 48%,#050508 100%\)/);
});

test("email safety usage account access and concierge share the open Overview language",()=>{
  for(const selector of [
    ".usagebox",
    ".safety-hub-card",
    ".email-provider-card",
    ".email-capability",
    ".mfa-method",
    ".access-person",
    ".access-right",
    ".family-owner-panel",
    ".response-channel-option",
    ".reception-check"
  ]) assert.ok(css.includes(selector), selector+" missing");
  assert.match(css,/border-radius:0!important/);
  assert.match(css,/background-color:transparent!important/);
  assert.match(css,/var\(--nw-parity-line\)/);
});

test("visual parity layer cannot change portal behavior",()=>{
  assert.doesNotMatch(css,/\bdisplay\s*:/);
  assert.doesNotMatch(css,/\[hidden\]/);
  assert.doesNotMatch(css,/pointer-events\s*:/);
  assert.doesNotMatch(css,/\.btn\b/);
  assert.doesNotMatch(css,/\binput\b/);
});

test("canonical and clean account routes stay mirrored",()=>{
  const normalize=(value)=>value.replace('<head><base href="/">','<head>');
  assert.equal(normalize(clean),konto);
});
