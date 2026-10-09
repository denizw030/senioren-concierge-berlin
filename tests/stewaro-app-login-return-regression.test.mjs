import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const auth = fs.readFileSync("assets/auth-nav.js", "utf8");
const login = fs.readFileSync("assets/stewaro-csp-anmelden-script-1.js", "utf8");
const accountNav = fs.readFileSync("assets/stewaro-account-app-navigation.js", "utf8");
const app = fs.readFileSync("assets/stewaro-app-bootstrap.js", "utf8");
const home = fs.readFileSync("index.html", "utf8");

function resolveDestination(page, search) {
  const code = auth.match(/  function signedInDestination\(currentPage, search\) \{[\s\S]*?\n  \}/)?.[0];
  assert.ok(code, "post-auth redirect helper exists");
  const fn = vm.runInNewContext("(" + code.trim() + ")", { URLSearchParams });
  return fn(page, search);

}

test("signed-in app-aware login preserves FIDEL goal through validation and delayed session recovery", () => {
  assert.equal(resolveDestination("anmelden.html", "?produkt=senioren&next=app"), "/konto?stewaro_app=1");
  assert.equal(resolveDestination("anmelden.html", "?next=app&lang=tr"), "/konto?stewaro_app=1");
  assert.equal((auth.match(/const destination = signedInDestination\(current, location\.search\);/g) || []).length, 2);
  assert.equal((auth.match(/if \(destination\) location\.replace\(accountUrl\(destination\)\);/g) || []).length, 2);
  assert.match(accountNav, /new URLSearchParams\(location\.search\)\.get\("stewaro_app"\) === "1"/);
  assert.match(accountNav, /action: "handoff_create", target: "app"/);
  assert.match(login, /const ENTRY_APP_HANDOFF=ENTRY_PARAMS\.get\('next'\)==='app'/);
  assert.match(login, /handoffToTarget\(body\.session_token,'app'\)/);
});

test("only the exact App intent is forwarded; no external redirects, HQ or registration escalation", () => {
  for (const search of ["", "?next=https%3A%2F%2Fevil.example", "?next=//evil.example", "?next=hq", "?next=app%2Ffake"]) {
    assert.equal(resolveDestination("anmelden.html", search), "/konto");
  }
  assert.equal(resolveDestination("registrieren.html", "?next=app"), "/konto");
  assert.equal(resolveDestination("konto.html", "?next=app"), "/konto");
  assert.equal(resolveDestination("anmelden.html", "?next=App"), "/konto");
});

test("App handoff survives same-origin root to chat redirect without putting a session into the query", () => {
  const script = home.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script);
  const token = "hnd_" + "a".repeat(48);
  const seen = [];
  const where = {hostname: "app.stewaro.com", search: "", hash: "#handoff=" + token, replace: (dest) => seen.push(dest)};
  vm.runInNewContext(script, {window: {location: where}});
  assert.deepEqual(seen, ["/web-concierge#handoff=" + token]);
  assert.match(app, /history\.replaceState\(null,"",location\.pathname\+location\.search\)/);
  assert.match(app, /action:"handoff_claim"/);
  assert.doesNotMatch(seen[0], /session_token|Bearer|\?handoff/);
});
