import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const siteUi=fs.readFileSync("assets/site-ui.js","utf8");
const account=fs.readFileSync("konto.html","utf8");
const accountClean=fs.readFileSync("konto/index.html","utf8");

test("account portal replaces rounded cards with navigation-tone inset dividers",()=>{
  assert.match(siteUi,/ACCOUNT_PORTAL_OPEN_DIVIDERS_V1_20260921/);
  assert.match(siteUi,/\.dash>\.card,[\s\S]*?\.account-overview-link/);
  assert.match(siteUi,/border-radius:0!important/);
  assert.match(siteUi,/background-color:transparent!important/);
  assert.match(siteUi,/transparent 5mm,[\s\S]*?var\(--account-nav-line\) 5mm/);
  assert.match(siteUi,/var\(--account-nav-line\) calc\(100% - 5mm\)/);
});

test("overview and two-column portal groups use centered vertical dividers",()=>{
  assert.match(siteUi,/\.account-overview-link:nth-child\(2n\+1\):not\(:first-child\)/);
  assert.match(siteUi,/customer-number-summary\[data-account-panel="overview"\]/);
  assert.match(siteUi,/owner-product-gap-shortcut\[data-account-panel="overview"\]/);
  assert.match(siteUi,/:is\(\.usagegrid,\.safety-hub,\.fraud-protection-grid\)/);
  assert.match(siteUi,/background-size:1px 100%,100% 1px!important/);
});

test("mobile portal removes vertical separators while preserving horizontal structure",()=>{
  assert.match(siteUi,/@media\(max-width:760px\)/);
  assert.match(siteUi,/grid-template-columns:1fr!important/);
  assert.match(siteUi,/background-size:100% 1px!important/);
});

test("only account routes receive the new site-ui cache version",()=>{
  assert.match(account,/assets\/site-ui\.js\?v=17/);
  assert.match(accountClean,/assets\/site-ui\.js\?v=17/);
});
