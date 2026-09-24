import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const ui=fs.readFileSync("assets/site-ui.js","utf8");
const konto=fs.readFileSync("konto.html","utf8");
const clean=fs.readFileSync("konto/index.html","utf8");

test("overview lower grid cannot override hidden state on non-overview tabs",()=>{
  assert.match(
    ui,
    /\.account-overview-lower-highlights\[data-account-panel="overview"\]:not\(\[hidden\]\)\{[\s\S]*?display:grid!important/
  );
  assert.doesNotMatch(
    ui,
    /\.account-overview-lower-highlights\[data-account-panel="overview"\]\{[\s\S]{0,300}?display:grid!important/
  );
});

test("account routes load the fixed site-ui asset",()=>{
  assert.match(konto,/assets\/site-ui\.js\?v=24/);
  assert.match(clean,/assets\/site-ui\.js\?v=24/);
});
