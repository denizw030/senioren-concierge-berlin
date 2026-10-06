import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

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
