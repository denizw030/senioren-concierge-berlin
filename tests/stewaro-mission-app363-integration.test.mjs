import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const shell = fs.readFileSync("assets/stewaro-app-shell.js", "utf8");
const bootstrap = fs.readFileSync("assets/stewaro-app-bootstrap.js", "utf8");
const live = fs.readFileSync("assets/stewaro-outbound-ledger-v1.js", "utf8");
const page = fs.readFileSync("telefonate/ausgehend/index.html", "utf8");
const session = fs.readFileSync("assets/stewaro-phone-session-v1.js", "utf8");

test("latest Account/App FIDEL shell and one-time handoff remain intact", () => {
  assert.ok(shell.includes('const APP_HOST = "app.stewaro.com"'));
  assert.ok(shell.includes("STEWARO_APP_AUTH_READY"));
  assert.ok(shell.includes("mountTodayShortcuts();"));
  assert.ok(shell.includes("mountOutboundMissionEntry();"));
  assert.ok(shell.includes("function mountOutboundMissionEntry()"));
  assert.ok(shell.includes('link.href = "/telefonate/ausgehend/"'));
  assert.ok(bootstrap.includes("ACCOUNT_SESSION_TRANSFER"));
  assert.ok(bootstrap.includes("handoff_claim"));
  assert.ok(shell.indexOf("mountOutboundMissionEntry();") > shell.indexOf("if (window.STEWARO_APP_AUTH_READY && await"));
});

test("App Mission uses same-origin route and authenticated read-only API", () => {
  assert.ok(session.includes("scb_web_session"));
  assert.ok(session.includes("https://account.stewaro.com/anmelden?produkt=senioren&next=app"));
  assert.ok(live.includes('Authorization:"Bearer "'));
  assert.ok(live.includes("job_bound===true"));
  assert.ok(page.includes('id="outbound-live"'));
  assert.ok(live.includes('document.visibilityState==="hidden"'));
  assert.ok(!live.includes("joinConference"));
  assert.ok(!shell.includes('link.href = "https://stewaro.com/telefonate/ausgehend/"'));
});
