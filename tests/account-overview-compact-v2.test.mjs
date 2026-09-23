import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const account=fs.readFileSync("konto.html","utf8");
const portalNav=fs.readFileSync("assets/account-portal-text-nav-v1.css","utf8");

test("account hero is compact and contains only the personal-area title",()=>{
  const start=account.indexOf('<section class="hero account-hero">');
  const end=account.indexOf("</section>",start);
  const hero=account.slice(start,end);
  assert.match(hero,/Dein persönlicher Bereich\./);
  assert.doesNotMatch(hero,/Mein Bereich/);
  assert.doesNotMatch(hero,/Verwalte deinen Account/);
  assert.match(account,/\.account-hero\{\s*min-height:96px!important;/);
  assert.match(account,/\.account-hero h1\{[^}]*font-size:clamp\(1\.9rem,3\.1vw,2\.75rem\)!important;/s);
});

test("overview keeps two primary compact account facts, four lower facts and three symmetric quick links",()=>{
  assert.equal((account.match(/class="card summary-card/g)||[]).length,2);
  assert.match(account,/class="account-overview-highlights account-overview-lower-highlights"/);
  assert.equal((account.match(/<article class="account-overview-link (?:plan-summary|customer-number-summary|overview-saved-info|owner-product-gap-shortcut)/g)||[]).length,4);
  assert.equal((account.match(/class="account-overview-link"/g)||[]).length,3);
  assert.match(account,/\.summary-card\{[^}]*min-height:132px!important;/s);
  assert.match(account,/\.account-overview-highlights\{[^}]*gap:12px!important;/s);
  assert.match(account,/\.account-overview-link\{[^}]*min-height:108px!important;/s);
  assert.match(account,/\.account-overview-link::after\{[^}]*content:"›"/s);
});

test("overview remains responsive without sacrificing the compact desktop hierarchy",()=>{
  assert.match(account,/@media\(max-width:900px\)/);
  assert.match(account,/\.summary-card\{grid-column:span 6!important\}/);
  assert.match(account,/@media\(max-width:700px\)/);
  assert.match(account,/\.account-overview-highlights\{grid-template-columns:1fr!important/);
});


test("final portal navigation is text-first, borderless and vertically compact",()=>{
  assert.match(account,/assets\/account-portal-text-nav-v1\.css\?v=1/);
  assert.match(portalNav,/body\.account-premium-ui \.account-hero\{\s*min-height:64px!important;/);
  assert.match(portalNav,/body\.account-premium-ui \.account-section\{\s*padding-top:12px!important;/);
  assert.match(portalNav,/body\.account-premium-ui \.account-tabs-shell\{[^}]*border:0!important;[^}]*background:transparent!important;[^}]*box-shadow:none!important;/s);
  assert.match(portalNav,/body\.account-premium-ui \.account-tabs-modern \.account-tab\{[^}]*border:0!important;[^}]*border-radius:0!important;[^}]*background:transparent!important;[^}]*box-shadow:none!important;/s);
  assert.match(portalNav,/body\.account-premium-ui \.account-tabs-modern \.account-tab-icon\{\s*display:none!important;/);
  assert.match(portalNav,/\.account-tab\[aria-selected="true"\]::after\{\s*opacity:1!important;/);
});

test("mobile portal navigation keeps all seven text destinations visible in a symmetric 4 plus 3 layout",()=>{
  assert.match(portalNav,/@media\(max-width:760px\)[\s\S]*?grid-template-columns:repeat\(8,minmax\(0,1fr\)\)!important;/);
  assert.match(portalNav,/\.account-tab:nth-child\(5\)\{\s*grid-column:2\/span 2!important;/);
  assert.match(portalNav,/\.account-tab:nth-child\(6\)\{\s*grid-column:4\/span 2!important;/);
  assert.match(portalNav,/\.account-tab:nth-child\(7\)\{\s*grid-column:6\/span 2!important;/);
});
