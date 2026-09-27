import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const access=fs.readFileSync("zugang.html","utf8");
const accessClean=fs.readFileSync("zugang/index.html","utf8");
const homepage=fs.readFileSync("de/index.html","utf8");
const register=fs.readFileSync("registrieren.html","utf8");
const login=fs.readFileSync("anmelden.html","utf8");
const routing=fs.readFileSync("assets/stewaro-entry-routing.js","utf8");
const entry=fs.readFileSync("assets/stewaro-account-entry.js","utf8");
const flow=fs.readFileSync("assets/stewaro-account-flow.js","utf8");
const onboarding=fs.readFileSync("assets/onboarding.js","utf8");

test("unified STEWARO account entry is minimal and route-parity safe",()=>{
  assert.equal(accessClean,access);
  assert.match(access,/Für wen ist STEWARO gedacht/);
  assert.match(access,/data-access-self/);
  assert.match(access,/data-access-other/);
  assert.match(access,/id="stewaroEntryEmail"/);
  assert.doesNotMatch(access,/type="password"|ownerFirstName|ownerLastName|Tarif auswählen/);
});

test("loved-one entry belongs to MyParentGuard while self entry belongs to STEWARO account",()=>{
  assert.match(entry,/https:\/\/myparentguard\.com\/\?source=stewaro-account/);
  assert.match(routing,/https:\/\/account\.stewaro\.com/);
  assert.match(routing,/https:\/\/myparentguard\.com/);
  assert.match(homepage,/href="\/zugang" data-entry="self"/);
  assert.match(homepage,/myparentguard\.com\/\?source=stewaro/);
});

test("legacy public auth navigation converges on one account entry",()=>{
  assert.match(routing,/auth-link\.login-link,a\.auth-link\.register-link/);
  assert.match(routing,/a\.href=accountEntry/);
});

test("self registration cannot create a loved-one STEWARO path",()=>{
  assert.match(register,/name="setupFor" value="self" checked hidden/);
  assert.doesNotMatch(register,/name="setupFor" value="other"/);
  assert.match(register,/myparentguard\.com\/\?source=stewaro-registration/);
});

test("self registration captures required postal code and keeps FIDEL fixed",()=>{
  assert.match(register,/id="ownerPostalCode"/);
  assert.match(register,/autocomplete="postal-code"/);
  assert.match(register,/pattern="\[0-9\]\{5\}"/);
  assert.match(register,/name="conciergeChoice" value="fidel"/);
  assert.match(onboarding,/account_holder_postal_code/);
  assert.match(onboarding,/postal_code/);
});

test("unified account flow keeps one-field login and progressive registration presentation",()=>{
  assert.match(login,/stewaro-account-entry\.css/);
  assert.match(login,/stewaro-account-flow\.js/);
  assert.match(register,/stewaro-account-entry\.css/);
  assert.match(register,/stewaro-account-flow\.js/);
  assert.match(flow,/account-flow-email-field/);
  assert.match(flow,/Noch kein Konto\? Konto erstellen/);
  assert.match(flow,/Schritt /);
  assert.match(flow,/ownerPostalCode/);
  assert.match(flow,/steps=\[/);
});
