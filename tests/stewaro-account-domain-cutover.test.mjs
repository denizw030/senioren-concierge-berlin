import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=(p)=>fs.readFileSync(p,"utf8");
const domains=read("assets/stewaro-domain-contract.js");
const auth=read("assets/auth-nav.js");
const entry=read("assets/stewaro-entry-routing.js");

test("canonical STEWARO surfaces are split website account and app",()=>{
  assert.match(domains,/PUBLIC_ORIGIN="https:\/\/stewaro\.com"/);
  assert.match(domains,/ACCOUNT_ORIGIN="https:\/\/account\.stewaro\.com"/);
  assert.match(domains,/APP_ORIGIN="https:\/\/app\.stewaro\.com"/);
  assert.match(auth,/const ACCOUNT_ORIGIN = "https:\/\/account\.stewaro\.com"/);
  assert.match(auth,/accountUrl\("\/konto"\)/);
});

test("remembered public session migrates to account with a one-time secure handoff",()=>{
  assert.match(domains,/action:"handoff_create",target:"account"/);
  assert.match(domains,/action:"handoff_claim"/);
  assert.match(domains,/target\.hash\.startsWith\("#handoff="\)/);
  assert.match(domains,/remember_me:body\.remember_me===true/);
  assert.match(domains,/localStorage\.setItem\(SESSION_KEY,JSON\.stringify\(payload\)\)/);
  assert.match(domains,/sessionMigrationPaths/);
  assert.match(domains,/document\.addEventListener\("click"/);
  assert.doesNotMatch(domains,/session_token[^\n]{0,160}(?:searchParams|\?)/);
});

test("public home routes new account entry to account.stewaro.com while preview stays isolated",()=>{
  assert.match(entry,/PROD_ACCOUNT_ORIGIN="https:\/\/account\.stewaro\.com"/);
  assert.match(entry,/STAGING_ACCOUNT_ORIGIN="https:\/\/d23le2tjpi7la\.cloudfront\.net"/);
  assert.match(entry,/accountEntry=isAccount\?"\/":\(isWebsitePreview\?STAGING_ACCOUNT_ORIGIN\+"\/":PROD_ACCOUNT_ORIGIN\+"\/"\)/);
  assert.match(entry,/PROD_ACCOUNT_ORIGIN\+"\/anmelden"/);
});

test("account surfaces load the canonical domain contract before their local application scripts",()=>{
  for(const page of [
    "zugang.html","zugang/index.html","anmelden.html","anmelden/index.html",
    "registrieren.html","registrieren/index.html","konto.html","konto/index.html",
    "concierge-anpassen.html","concierge-anpassen/index.html","payg.html","payg/index.html",
    "telefonate/index.html","zugang-uebertragen.html","zugang-uebertragen/index.html",
    "passwort-zuruecksetzen.html","passwort-zuruecksetzen/index.html",
    "email-concierge.html","email-concierge/index.html"
  ]){
    assert.match(read(page),/assets\/stewaro-domain-contract\.js\?v=1/,page);
  }
});

test("public account-aware navigation loads the same canonical domain contract",()=>{
  assert.match(auth,/domainScript\.src="\/assets\/stewaro-domain-contract\.js\?v=1"/);
  assert.match(entry,/domainScript\.src="\/assets\/stewaro-domain-contract\.js\?v=1"/);
});

test("legacy account URLs are routed canonically without changing app ownership",()=>{
  assert.match(domains,/movePublicAccountRoute/);
  assert.match(domains,/moveAccountPublicRoute/);
  assert.match(domains,/APP_ORIGIN\+parsed\.pathname/);
  assert.match(domains,/PUBLIC_ORIGIN\+parsed\.pathname/);
});
