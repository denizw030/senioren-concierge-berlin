import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const konto=fs.readFileSync("konto.html","utf8");
const clean=fs.readFileSync("konto/index.html","utf8");
const siteUi=fs.readFileSync("assets/site-ui.js","utf8");
const navCss=fs.readFileSync("assets/account-portal-text-nav-v1.css","utf8");

for(const [name,html] of [["konto.html",konto],["konto/index.html",clean]]){
  test(name+" gives every account panel a dedicated tab-visibility state",()=>{
    assert.match(html,/document\.body\.dataset\.accountActivePanel = validName/);
    assert.match(html,/panel\.dataset\.accountTabVisible = active \? "true" : "false"/);
    assert.match(html,/panel\.hidden = !active/);
    assert.match(html,/assets\/site-ui\.js\?v=25/);
    assert.match(html,/assets\/account-portal-text-nav-v1\.css\?v=16/);
  });
}

test("final injected account CSS makes inactive tab panels impossible to display",()=>{
  const marker=siteUi.indexOf("ACCOUNT_PANEL_VISIBILITY_AUTHORITY_V2_20260924");
  assert.ok(marker>=0);
  const tail=siteUi.slice(marker,siteUi.indexOf("document.head.appendChild(style)",marker));
  assert.match(tail,/\[data-account-panel\]\[data-account-tab-visible="false"\]\{[\s\S]*?display:none!important/);
  assert.match(tail,/\[data-account-panel\]\[hidden\]\{[\s\S]*?display:none!important/);
});

test("static overview grid may only force display while its tab is actually visible",()=>{
  assert.match(
    navCss,
    /\.account-overview-highlights\[data-account-panel="overview"\]:not\(\[hidden\]\):not\(\[data-account-tab-visible="false"\]\)\{[\s\S]*?display:grid!important/
  );
  assert.doesNotMatch(
    navCss,
    /\.account-overview-highlights\[data-account-panel="overview"\]\{[\s\S]{0,260}?display:grid!important/
  );
});

test("later component-level hidden writes cannot become tab-routing authority",()=>{
  assert.match(konto,/managedContextNotice\.hidden = !managed/);
  assert.match(konto,/panel\.dataset\.accountTabVisible = active \? "true" : "false"/);
  assert.match(siteUi,/\[data-account-panel\]\[data-account-tab-visible="false"\]/);
});
