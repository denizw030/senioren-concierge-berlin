import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
const chat=read("assets/web-customer-concierge.js");
const onboarding=read("assets/onboarding.js");
const login=read("anmelden.html");
const loginClean=read("anmelden/index.html");
const registration=read("registrieren.html");
const registrationClean=read("registrieren/index.html");
const paygShell=read("assets/payg-account-shell.js");
const payg=read("payg.html");
const paygClean=read("payg/index.html");

test("guest advice has no account CTA until backend marks a real execution request",()=>{
  assert.match(chat,/\["CREATE_ACCOUNT"\]/);
  assert.match(chat,/allowed=actions\.filter\(\(action\)=>String\(action\?\.type\|\|""\)\.toUpperCase\(\)==="CREATE_ACCOUNT"\)/);
  assert.doesNotMatch(chat,/type==="SIGN_UP"/);
  assert.doesNotMatch(chat,/type==="SIGN_IN"/);
  assert.match(chat,/Auftrag sicher fortsetzen/);
  assert.match(chat,/purpose:String\(item\.purpose\|\|""\)\.toUpperCase\(\)/);
  assert.match(chat,/purpose==="ACCOUNT_REQUEST"/);
  assert.match(chat,/Anmelden oder Konto erstellen/);
  assert.match(chat,/signIn\.href=accountOnly\?/);
  assert.match(chat,/create\.textContent="Konto erstellen"/);
  assert.match(chat,/isExplicitGuestAccountIntent/);
});

test("guest browsing state stays session-scoped and reload reset does not erase the PAYG handoff key",()=>{
  assert.match(chat,/sessionStorage\.removeItem\(GUEST_VIEW_STATE_KEY\)/);
  assert.match(chat,/sessionStorage\.removeItem\(GUEST_THREAD_KEY\)/);
  assert.match(chat,/sessionStorage\.removeItem\(GUEST_TOKEN_KEY\)/);
  assert.doesNotMatch(chat,/removeItem\(GUEST_RESUME_KEY\).*resetGuestChatSessionForReload/s);
});

test("guest execution handoff preserves the exact request for both login and registration",()=>{
  assert.match(chat,/nw_guest_resume_request_v1/);
  assert.match(chat,/handoffRequest=String\(request\|\|lastGuestUserMessage\|\|""\)/);
  assert.match(chat,/signIn\.href=accountOnly\?"\/anmelden\?source=web_guest_chat":"\/anmelden\?source=web_guest_chat&next=%2Fpayg"/);
  assert.match(chat,/signIn\.addEventListener\("click",\(\)=>saveGuestExecutionHandoff\(handoffRequest\)\)/);
  assert.match(chat,/create\.addEventListener\("click",\(\)=>saveGuestExecutionHandoff\(handoffRequest\)\)/);
  assert.match(chat,/post_auth_target:"\/payg"/);
  assert.match(chat,/source=web_guest_chat&next=%2Fpayg/);
  assert.match(onboarding,/params\.get\("next"\) === "\/payg"/);
  assert.match(onboarding,/postAuthTarget = guestChatHandoff && requestedNext \? requestedNext : ""/);
  assert.match(login,/ENTRY_GUEST_HANDOFF=ENTRY_PARAMS\.get\('source'\)==='web_guest_chat'/);
  assert.match(login,/ENTRY_NEXT=ENTRY_GUEST_HANDOFF&&ENTRY_PARAMS\.get\('next'\)==='\/payg'\?'\/payg':''/);
});

test("registration and login route a guest execution to PAYG after successful authentication",()=>{
  assert.match(onboarding,/location\.href = postAuthTarget \|\|/);
  assert.match(login,/location\.href=ENTRY_NEXT\|\|'\/konto'/);
  assert.match(login,/PAYG weitergeleitet und kannst Guthaben aufladen/);
  assert.match(paygShell,/PAYG-Guthaben aufladen/);
  assert.match(paygShell,/\/web-concierge\?resume_guest=1/);
});

test("the pending guest request is never auto-executed after authentication",()=>{
  assert.match(chat,/input\.value=request/);
  assert.doesNotMatch(chat,/input\.value=request;sendTurn\(\)/);
  assert.match(chat,/localStorage\.removeItem\(GUEST_RESUME_KEY\)/);
});

test("clean auth and PAYG routes remain mirrored",()=>{
  assert.equal(login,loginClean.replace('<head><base href="/">','<head>'));
  assert.equal(registration,registrationClean.replace('<head><base href="/">','<head>'));
  assert.equal(payg,paygClean.replace('<head><base href="/">','<head>'));
});

test("guest flow loads the refreshed assets only on the touched product surfaces",()=>{
  assert.match(registration,/assets\/onboarding\.js\?v=26/);
  assert.match(payg,/assets\/payg-account-shell\.js\?v=2/);
  assert.match(payg,/assets\/payg-account-shell\.css\?v=2/);
});


test("explicit account CTA stays non-PAYG while execution CTA supports both auth paths",()=>{
  assert.match(chat,/accountOnly=purpose==="ACCOUNT_REQUEST"/);
  assert.match(chat,/signIn\.href=accountOnly/);
  assert.match(chat,/create\.href=accountOnly/);
  assert.match(chat,/if\(!accountOnly\)\{/);
  assert.match(chat,/Wenn du bereits ein NAHWERK Konto hast/);
  assert.match(chat,/saveGuestExecutionHandoff/);
  assert.match(chat,/renderGuestAccountActions\(\[\{type:"CREATE_ACCOUNT",purpose:"ACCOUNT_REQUEST"/);
});
