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
const accountCss=fs.readFileSync("assets/stewaro-account-entry.css","utf8");

test("unified STEWARO account entry is minimal and route-parity safe",()=>{
  assert.equal(accessClean,access);
  assert.match(access,/Für wen ist STEWARO gedacht/);
  assert.match(access,/data-access-self/);
  assert.match(access,/data-access-other/);
  assert.match(access,/id="stewaroEntryEmail"/);
  assert.doesNotMatch(access,/type="password"|ownerFirstName|ownerLastName|Tarif auswählen/);
});

test("audience choices stay visually symmetric and text-only",()=>{
  assert.match(access,/stewaro-account-entry\.css\?v=2/);
  assert.match(access,/<button class="stewaro-access-choice primary"[^>]*data-access-self>[\s\S]*?<strong>Für mich<\/strong>[\s\S]*?<\/button>/);
  assert.match(access,/<button class="stewaro-access-choice"[^>]*data-access-other>[\s\S]*?<strong>Für eine andere Person<\/strong>[\s\S]*?<\/button>/);
  assert.doesNotMatch(access,/Eigenen STEWARO Zugang anmelden oder erstellen/);
  assert.doesNotMatch(access,/Weiter zu MyParentGuard · powered by STEWARO/);
  assert.match(accountCss,/\.stewaro-access-choice\{[\s\S]*display:flex;align-items:center;justify-content:center/);
  assert.match(accountCss,/\.stewaro-access-choice,\.stewaro-access-submit\{[\s\S]*min-height:64px[\s\S]*text-align:center/);
});

test("loved-one entry stays on the verified STEWARO Family surface",()=>{
  assert.match(entry,/PARENT="\/angehoerige\?source=stewaro-account"/);
  assert.match(routing,/PROD_ACCOUNT_ORIGIN="https:\/\/account\.stewaro\.com"/);
  assert.match(routing,/accountEntry=isAccount\?"\/"\:\(isWebsitePreview\?STAGING_ACCOUNT_ORIGIN\+"\/"\:PROD_ACCOUNT_ORIGIN\+"\/"\)/);
  assert.match(routing,/parentEntry="\/angehoerige\?source=stewaro"/);
  assert.match(homepage,/href="#family"/);
  assert.match(homepage,/href="\/zugang" data-entry="self"/);
  assert.match(homepage,/href="\/angehoerige\?source=stewaro" data-entry="loved-one"/);
  assert.doesNotMatch(homepage,/myparentguard\.com/);
});

test("account entry cache-busts the repaired loved-one redirect",()=>{
  assert.match(access,/stewaro-account-entry\.js\?v=2/);
  assert.match(accessClean,/stewaro-account-entry\.js\?v=2/);
});

test("legacy public auth navigation converges on one account entry",()=>{
  assert.match(routing,/auth-link\.login-link,a\.auth-link\.register-link/);
  assert.match(routing,/a\.href=accountEntry/);
  assert.match(routing,/d357yw2h09cpne\.cloudfront\.net/);
  assert.match(routing,/https:\/\/d23le2tjpi7la\.cloudfront\.net/);
});

test("Family CTA activates the existing other-person registration mode without exposing a duplicate chooser",()=>{
  assert.match(register,/name="setupFor" value="self" checked hidden/);
  assert.match(register,/name="setupFor" value="other" hidden data-family-setup-mode/);
  assert.match(register,/href="\/angehoerige\?source=stewaro-registration"/);
  assert.doesNotMatch(register,/myparentguard\.com/);
  assert.match(onboarding,/params\.get\("fuer"\) === "andere"/);
  assert.match(onboarding,/otherSetup\.checked = true/);
  assert.match(onboarding,/selfRegistrationScope/);
  assert.match(onboarding,/selfScope\.hidden = !self/);
  assert.match(routing,/data-direct-registration/);
});

test("registration assigns postal code to the correct person and keeps FIDEL fixed",()=>{
  assert.match(register,/id="ownerPostalCode"/);
  assert.match(register,/id="recipientPostalCode"/);
  assert.match(register,/Postleitzahl des Klienten/);
  assert.match(register,/pattern="\[0-9\]\{5\}"/);
  assert.match(register,/name="conciergeChoice" value="fidel"/);
  assert.match(onboarding,/account_holder_postal_code: self \?/);
  assert.match(onboarding,/postal_code: self \?/);
  assert.match(onboarding,/recipientPostalCode/);
  assert.match(register,/id="recipientStreetAddress"/);
  assert.match(onboarding,/street_address: self \?/);
  assert.match(onboarding,/account_holder_postal_code: "",\n      postal_code: ""/);
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
  assert.match(flow,/const screens=\[\]/);
  assert.match(flow,/stewaro-account-flow-brand/);
  assert.match(accountCss,/STEWARO_ACCOUNT_FLOW_HARD_RESET_V2/);
  assert.match(accountCss,/body\.login-image-page\.stewaro-account-flow[\s\S]*\.hero[\s\S]*display:none!important/);
});


test("account password screen renders canonical icon and wordmark centered without legacy mark hooks",()=> {
  assert.match(flow,/stewaro-account-flow-icon/);
  assert.match(flow,/src="\/assets\/logos\/stewaro-icon\.svg"/);
  assert.match(flow,/stewaro-account-flow-wordmark/);
  assert.match(flow,/src="\/assets\/logos\/stewaro-wordmark\.svg"/);
  assert.doesNotMatch(flow,/class="mark"[^>]*><\/span><span class="word"/);
  assert.match(accountCss,/STEWARO_ACCOUNT_LOGIN_BRAND_AND_CENTER_20260928/);
  assert.match(accountCss,/main>\.section\{[\s\S]*justify-content:center!important;[\s\S]*align-items:center!important/);
  assert.match(accountCss,/\.loginwrap\{[\s\S]*margin-inline:auto!important/);
});


test("email step uses direct, natural client-facing copy",()=>{
  assert.match(access,/Geben Sie Ihre E-Mail-Adresse ein\. Danach geht es direkt weiter\./);
  assert.doesNotMatch(access,/ruhigen Schritt/);
  assert.equal(accessClean,access);
});
