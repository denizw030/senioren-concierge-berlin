import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const routing=fs.readFileSync("assets/stewaro-entry-routing.js","utf8");
const de=fs.readFileSync("de/index.html","utf8");
const en=fs.readFileSync("en/index.html","utf8");
const tr=fs.readFileSync("tr/index.html","utf8");

test("German homepage runtime restores direct login and an accessible mobile menu",()=>{
  assert.match(routing,/const installGermanHomeMenu=/);
  assert.match(routing,/lang==="de"/);
  assert.match(routing,/header-login-runtime/);
  assert.match(routing,/login\.href=isWebsitePreview\?STAGING_ACCOUNT_ORIGIN\+"\/anmelden":PROD_ACCOUNT_ORIGIN\+"\/anmelden"/);
  assert.match(routing,/href="\$\{isWebsitePreview\?STAGING_ACCOUNT_ORIGIN:PROD_ACCOUNT_ORIGIN\}\/anmelden" data-direct-login="true"/);
  assert.match(routing,/PROD_ACCOUNT_ORIGIN="https:\/\/account\.stewaro\.com"/);
  assert.match(routing,/aria-controls","stewaro-mobile-menu-runtime"/);
  assert.match(routing,/Menü öffnen/);
  assert.match(routing,/Für bestehende Klienten/);
  for(const route of ["/de/","/prime-concierge","/angehoerige","/digitaler-schutz","/telefonannahme","/pakete","/kontakt"]) assert.match(routing,new RegExp(`href="${route}"`));
  for(const retired of ['href="#services"','href="#for-you"','href="#family"','href="/safety"']) assert.ok(!routing.includes(retired),retired+" must not appear in the mobile menu");
});

test("direct login bypasses the public onboarding rewrite while other auth links keep canonical routing",()=>{
  assert.match(routing,/if\(!a\.hasAttribute\("data-direct-login"\)&&!a\.hasAttribute\("data-direct-registration"\)\)a\.href=accountEntry/);
  assert.match(routing,/document\.querySelectorAll\('a\[data-entry="self"\]'\)/);
  assert.match(routing,/accountEntry/);
});

test("mobile menu is compact, keyboard-safe and closes predictably",()=>{
  assert.match(routing,/@media\(max-width:980px\)/);
  assert.match(routing,/header-menu-toggle-runtime\{display:inline-flex/);
  assert.match(routing,/@media\(max-width:600px\)/);
  assert.match(routing,/brand-word\{width:112px/);
  assert.match(routing,/event\.key==="Escape"/);
  assert.match(routing,/window\.innerWidth>980/);
  assert.match(routing,/setAttribute\("aria-expanded",String\(next\)\)/);
});

test("locale homepages share the cache-busted routing adapter without changing localized content",()=>{
  for(const html of [de,en,tr]) assert.match(html,/stewaro-entry-routing\.js\?v=4/);
  assert.match(de,/lang="de"/);
  assert.match(en,/lang="en"/);
  assert.match(tr,/lang="tr"/);
});
