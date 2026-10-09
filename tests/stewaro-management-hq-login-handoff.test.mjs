import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const navigation = fs.readFileSync("assets/auth-nav.js", "utf8");
const domains = fs.readFileSync("assets/stewaro-domain-contract.js", "utf8");

const login = fs.readFileSync("assets/stewaro-csp-anmelden-script-1.js", "utf8");
const clean = fs.readFileSync("anmelden/index.html", "utf8");
const flat = fs.readFileSync("anmelden.html", "utf8");

test("HQ login intent is explicit and cannot be triggered by next=hq alone", () => {
  assert.match(login, /ENTRY_PARAMS\.get\('produkt'\)==='internal-hq'&&ENTRY_PARAMS\.get\('next'\)==='hq'/);
});

test("HQ handoff asks the canonical session authority for target hq", () => {
  assert.match(login, /JSON\.stringify\(\{action:'handoff_create',target:hq\?'hq':'app'\}\)/);
  assert.match(login, /hq[^A-Za-z0-9]+stewaro[^A-Za-z0-9]+com/);
  assert.match(login, /handoff_hq_aal2_required/);
});

test("HQ route does not offer self-registration", () => {
  assert.match(login, /if\(ENTRY_HQ_HANDOFF\)[\s\S]*a\.hidden=true/);
});

test("both login route mirrors load the shared login script", () => {
  for (const html of [clean, flat]) {
    assert.match(html, /stewaro-csp-anmelden-script-1\.js/);
  }
});

test("signed-in HQ intent stays on login instead of redirecting to /konto", () => {
  const code = navigation.match(/  function signedInDestination\(currentPage, search\) \{[\s\S]*?\n  \}/)?.[0];
  assert.ok(code);
  const destination = vm.runInNewContext("(" + code.trim() + ")", {URLSearchParams});
  assert.equal(destination("anmelden.html", "?produkt=internal-hq&next=hq"), null);
  assert.equal(destination("anmelden.html", "?next=hq"), "/konto");
  assert.equal(destination("anmelden.html", "?produkt=senioren&next=hq"), "/konto");
  assert.equal(destination("anmelden.html", "?produkt=internal-hq&next=https://evil.invalid"), "/konto");
  assert.equal(destination("registrieren.html", "?produkt=internal-hq&next=hq"), "/konto");
  assert.equal((navigation.match(/if \(destination\) location\.replace\(accountUrl\(destination\)\);/g)||[]).length, 2);
});

test("stale public HQ login link goes to Account with intent intact, never /konto", () => {
  const replaced = [];
  const location = {
    hostname:"stewaro.com", origin:"https://stewaro.com", pathname:"/anmelden",
    search:"?produkt=internal-hq&next=hq", hash:"",
    replace: (value) => replaced.push(value)
  };
  const storage = {getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
  const document = {addEventListener:()=>{}};
  const window = {};
  vm.runInNewContext(domains, {location,document,window,sessionStorage:storage,localStorage:storage,URL,URLSearchParams});
  assert.equal(replaced.length, 1);
  assert.equal(replaced[0], "https://account.stewaro.com/anmelden?produkt=internal-hq&next=hq");
});
