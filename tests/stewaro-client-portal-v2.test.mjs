import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=(p)=>fs.readFileSync(p,"utf8");
const shared=read("assets/stewaro-client-portal-v2.css");
const accountNav=read("assets/account-portal-text-nav-v1.css");

test("client portal V2 defines the canonical STEWARO material system",()=>{
  assert.match(shared,/STEWARO CLIENT PORTAL V2/);
  for(const token of ["--scp-bg:#f6f1e7","--scp-green:#10271f","--scp-gold:#a98548","--scp-paper:#fffdf9"])
    assert.ok(shared.includes(token),token);
  assert.match(shared,/prefers-reduced-motion:reduce/);
});

test("account center V2 fixes mobile card clipping and keeps every destination directly reachable",()=>{
  assert.match(accountNav,/STEWARO CLIENT PORTAL V2 — ACCOUNT CENTER FINAL OVERRIDES/);
  assert.match(accountNav,/grid-template-columns:repeat\(12,minmax\(0,1fr\)\)!important/);
  assert.match(accountNav,/@media\(max-width:760px\)[\s\S]*?grid-template-columns:1fr!important/);
  assert.match(accountNav,/overflow-x:auto!important/);
  assert.match(accountNav,/\.account-overview-highlights\[data-account-panel="overview"\]>\.account-overview-link:nth-child\(1\)/);
});

test("account HTML stays on the protected CSP reconstruction path",()=>{
  for(const page of ["konto.html","konto/index.html"]){
    const html=read(page);
    assert.match(html,/assets\/account-portal-text-nav-v1\.css\?v=16/);
    assert.doesNotMatch(html,/stewaro-client-portal-v2\.css/);
  }
});

test("all account-adjacent client surfaces load the shared STEWARO portal layer",()=>{
  for(const page of [
    "concierge-anpassen.html","concierge-anpassen/index.html",
    "payg.html","payg/index.html",
    "zugang-uebertragen.html","zugang-uebertragen/index.html",
    "passwort-zuruecksetzen.html","passwort-zuruecksetzen/index.html",
    "email-concierge.html","email-concierge/index.html",
    "telefonate/index.html"
  ]){
    const html=read(page);
    assert.match(html,/stewaro-client-portal-v2\.css\?v=1/,page);
  }
});

test("clean routes remain mirrored with canonical html routes",()=>{
  const pairs=[
    ["concierge-anpassen.html","concierge-anpassen/index.html"],
    ["payg.html","payg/index.html"],
    ["zugang-uebertragen.html","zugang-uebertragen/index.html"],
    ["passwort-zuruecksetzen.html","passwort-zuruecksetzen/index.html"],
    ["email-concierge.html","email-concierge/index.html"]
  ];
  for(const [root,clean] of pairs){
    assert.equal(read(root),read(clean).replace('<head><base href="/">','<head>'),root);
  }
});

test("specialized FIDEL chat app remains isolated from the account redesign",()=>{
  assert.doesNotMatch(read("web-concierge/index.html"),/stewaro-client-portal-v2\.css/);
  assert.match(read("web-concierge/index.html"),/class="web-concierge-page"/);
});
