import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const shell=fs.readFileSync("assets/stewaro-app-shell.js","utf8");
const bootstrap=fs.readFileSync("assets/stewaro-app-bootstrap.js","utf8");
const live=fs.readFileSync("assets/stewaro-outbound-ledger-v1.js","utf8");
const page=fs.readFileSync("telefonate/ausgehend/index.html","utf8");
const session=fs.readFileSync("assets/stewaro-phone-session-v1.js","utf8");

test("protected Account/App integration remains on the same authenticated App shell",()=>{
  assert.match(shell,/const APP_HOST = "app\\.stewaro\\.com"/);
  assert.match(shell,/STEWARO_APP_AUTH_READY/);
  assert.match(shell,/mountTodayShortcuts\\(\\);/);
  assert.match(shell,/function mountOutboundMissionEntry\\(\\)/);
  assert.match(shell,/mountOutboundMissionEntry\\(\\);/);
  assert.match(shell,/link\\.href = "\\/telefonate\\/ausgehend\\/"/);
  assert.match(shell,/https:\\/\\/account\\.stewaro\\.com/);
  assert.match(bootstrap,/ACCOUNT_SESSION_TRANSFER/);
  assert.match(bootstrap,/handoff_claim/);
});

test("Live mission reads authenticated App session; no token in navigation",()=>{
  assert.match(session,/scb_web_session/);
  assert.match(session,/https:\\/\\/account\\.stewaro\\.com\\/anmelden\\?produkt=senioren&next=app/);
  assert.match(live,/Authorization:"Bearer "/);
  assert.match(live,/job_bound===true/);
  assert.match(page,/id="outbound-live"/);
  assert.match(live,/document\\.visibilityState==="hidden"/);
  assert.doesNotMatch(live,/fetch\\([^)]*method:"POST"/);
  assert.doesNotMatch(shell,/session_token.*location\\.href/);
});
