import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const css=fs.readFileSync("assets/account-portal-text-nav-v1.css","utf8");

test("mobile V2 suppresses the legacy duplicate menu shell",()=>{
  assert.match(css,/STEWARO PORTAL MOBILE RUNTIME CONFLICT FIX/);
  assert.match(css,/#nwMobileAccountNav\{\s*display:none!important/);
  assert.match(css,/\.account-tabs-shell\{[\s\S]*?display:block!important/);
});

test("mobile overview can never collapse into a half-width column",()=>{
  assert.match(css,/\.dash >\s*\.account-overview-highlights\[data-account-panel="overview"\]:not\(\[hidden\]\):not\(\[data-account-tab-visible="false"\]\)\{[\s\S]*?grid-column:1\/-1!important;[\s\S]*?grid-template-columns:minmax\(0,1fr\)!important;[\s\S]*?width:100%!important/);
  assert.match(css,/\.account-overview-highlights\[data-account-panel="overview"\] >\s*\.account-overview-link\{[\s\S]*?grid-column:1\/-1!important;[\s\S]*?width:100%!important/);
});
