import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=(p)=>fs.readFileSync(new URL("../"+p,import.meta.url),"utf8");

test("owner product gap shortcut is owner-gated on both account routes",()=>{
  for(const p of ["konto.html","konto/index.html"]){
    const html=read(p);
    assert.match(html,/assets\/owner-product-gaps\.css\?v=2/);
    assert.match(html,/assets\/owner-product-gaps\.js\?v=1/);
    assert.match(html,/data-owner-product-gap/);
    assert.match(html,/id="ownerProductGapBadge"/);
    assert.match(html,/href="\/produktluecken"/);
  }
  const css=read("assets/owner-product-gaps.css");
  assert.match(css,/\[data-owner-product-gap\]\{display:none!important\}/);
  assert.match(css,/body\.owner-product-gap-enabled \[data-owner-product-gap\]/);
});

test("owner product gap page is private-by-backend, dark-only and visually aligned with NAHWERK",()=>{
  for(const p of ["produktluecken.html","produktluecken/index.html"]){
    const html=read(p);
    assert.match(html,/noindex,nofollow,noarchive/);
    assert.match(html,/class="top owner-gap-header"/);
    assert.match(html,/class="hero owner-gap-hero"/);
    assert.match(html,/class="footer owner-gap-footer"/);
    assert.match(html,/assets\/owner-product-gaps\.css\?v=2/);
    assert.match(html,/id="ownerProductGapList"/);
    assert.match(html,/id="ownerGapMarkRead"/);
    assert.match(html,/id="ownerGapWeek"/);
    assert.doesNotMatch(html,/theme-toggle|Hell|Darstellung wechseln/);
  }
  const css=read("assets/owner-product-gaps.css");
  assert.match(css,/owner-gap-page\{[\s\S]*color-scheme:dark/);
  assert.match(css,/background:#05080d!important/);
  assert.match(css,/owner-gap-page \.footer/);
});

test("owner product gap client only uses authenticated web gateway",()=>{
  const js=read("assets/owner-product-gaps.js");
  assert.match(js,/\/web\/owner\/product-gaps/);
  assert.match(js,/\/web\/owner\/product-gaps\/status/);
  assert.match(js,/\/web\/owner\/product-gaps\/mark-read/);
  assert.match(js,/sessionStorage\.getItem\(SESSION_KEY\)/);
  assert.match(js,/Authorization:"Bearer "\+t/);
  assert.match(js,/e\?\.status===403/);
  assert.doesNotMatch(js,/service[_-]?role|SUPABASE_SERVICE_ROLE_KEY/i);
  for(const state of ["NEW","TRIAGED","PLANNED","BUILDING","IMPLEMENTED","IGNORED"])assert.match(js,new RegExp(state));
});
