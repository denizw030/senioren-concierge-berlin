import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const canonical=fs.readFileSync("assets/account-premium-ui.css","utf8");
const base=fs.readFileSync("assets/account-premium-ui-base-v2.css","utf8");
const konto=fs.readFileSync("konto.html","utf8");

test("account theme keeps the existing premium layout as an immutable base",()=>{
  assert.match(canonical,/^@import url\("\/assets\/account-premium-ui-base-v2\.css\?v=1"\);/);
  assert.match(base,/NAHWERK Account Premium UI 2026/);
  assert.match(konto,/assets\/account-premium-ui\.css\?v=2/);
});

test("canonical theme is driven by the portal theme contract rather than senior-product",()=>{
  assert.match(canonical,/data-nw-portal-theme="light"/);
  assert.match(canonical,/data-nw-portal-theme="dark"/);
  assert.match(canonical,/nw-portal-light/);
  assert.match(canonical,/nw-portal-dark/);
  assert.doesNotMatch(canonical,/body\.senior-product|data-product="senioren"/);
});

test("light mode owns the full page canvas and cannot leak the old black account background",()=>{
  assert.match(canonical,/body\.account-premium-ui\.account-premium-ui main/);
  assert.match(canonical,/body\.account-premium-ui\.account-premium-ui \.account-section/);
  assert.match(canonical,/background:#f7f3ea!important/);
  assert.match(canonical,/linear-gradient\(180deg,#fbf8f1 0%,#f7f3ea 54%,#f2ebdf 100%\)!important/);
  assert.match(canonical,/body\.account-premium-ui\.account-premium-ui \.footer/);
});

test("light mode explicitly owns cards tabs notices forms and email surfaces",()=>{
  for(const selector of [
    ".account-setup-by",".account-tabs-shell",".nw-theme-setting",".account-session-note",
    ".dash>.card",".usagebox",".profile-field input",".email-provider-card",".email-state-card"
  ]) assert.ok(canonical.includes(selector),selector);
});

test("reload stability remains part of the account shell",()=>{
  assert.match(canonical,/scrollbar-gutter:stable/);
  assert.match(canonical,/grid-template-columns:repeat\(7,minmax\(max-content,1fr\)\)/);
  assert.match(canonical,/#managedPersonContext\.nw-managed-ready:not\(\[hidden\]\) \+ #managedContextNotice:not\(\[hidden\]\)/);
});
