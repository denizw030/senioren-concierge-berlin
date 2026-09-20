import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const site=fs.readFileSync("assets/site.css","utf8");
const account=fs.readFileSync("assets/account-premium-ui.css","utf8");

test("global dark footer is pure black with no gradient or shadow",()=>{
  assert.match(site,/GLOBAL DARK FOOTER CONTRACT v2/);
  assert.match(site,/background:\s*#000 !important/);
  assert.match(site,/background-image:\s*none !important/);
  assert.match(site,/box-shadow:\s*none !important/);
  assert.match(site,/footer\.footer > \.wrap/);
  assert.match(site,/footer\.footer \.footergrid/);
  assert.match(site,/footer\.footer \.footbottom/);
  assert.match(site,/footer\.footer::before/);
  assert.match(site,/footer\.footer::after/);
});

test("account dark theme reasserts pure black after account theme css",()=>{
  assert.match(account,/Account dark footer contract v2/);
  assert.match(account,/data-nw-portal-theme="dark"/);
  assert.match(account,/nw-portal-dark/);
  assert.match(account,/background:#000!important/);
  assert.match(account,/background-image:none!important/);
});

test("light account footer remains explicitly non-black",()=>{
  assert.match(account,/data-nw-portal-theme="light"/);
  assert.match(account,/\.footer\{background:#ece4d8!important/);
});

test("DE EN TR overview and account routes cache-bust the global footer css",()=>{
  for(const path of ["de/index.html","en/index.html","tr/index.html","konto.html","konto/index.html"]){
    const html=fs.readFileSync(path,"utf8");
    assert.match(html,/assets\/site\.css\?v=25/,path);
  }
  for(const path of ["konto.html","konto/index.html"]){
    const html=fs.readFileSync(path,"utf8");
    assert.match(html,/assets\/account-premium-ui\.css\?v=6/,path);
  }
});
