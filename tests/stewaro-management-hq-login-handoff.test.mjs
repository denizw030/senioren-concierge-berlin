import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

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

test("fresh and already authenticated Owners share an idempotent HQ-only handoff", () => {
  assert.match(login, /if\(ENTRY_HQ_HANDOFF\)window\.STEWARO_HQ_LOGIN_RESUME=resumeHqHandoff/);
  assert.match(login, /setTimeout\(\(\)=>resumeHqHandoff\(body\.session_token\),120\)/);
  const source = login.match(/function resumeHqHandoff\(sessionToken\)\{[\s\S]*?\n\}/)?.[0];
  assert.ok(source);
  const calls = [];
  const messages = [];
  const context = {
    ENTRY_HQ_HANDOFF: true,
    hqHandoffInFlight: false,
    show: (message) => messages.push(message),
    handoffToTarget: (token, target) => { calls.push([token, target]); return Promise.resolve(); }
  };
  const resume = vm.runInNewContext("(" + source + ")", context);
  assert.equal(resume("validated-owner-session"), true);
  assert.equal(resume("validated-owner-session"), true, "repeat start is already in progress");
  assert.equal(resume(""), false, "empty session is never accepted");
  assert.equal(calls.length, 1, "handoff_create cannot run twice");
  assert.deepEqual(calls[0], ["validated-owner-session", "hq"]);
  assert.equal(messages.length, 1);

  const notHQ = vm.runInNewContext("(" + source + ")", {
    ...context, ENTRY_HQ_HANDOFF: false, hqHandoffInFlight: false
  });
  assert.equal(notHQ("validated-owner-session"), false);
  assert.equal(calls.length, 1, "other login intents cannot request HQ handoff");
});
