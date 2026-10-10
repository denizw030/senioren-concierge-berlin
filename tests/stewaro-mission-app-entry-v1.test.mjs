import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const shell = fs.readFileSync("assets/stewaro-app-shell.js", "utf8");
const sessionSource = fs.readFileSync("assets/stewaro-phone-session-v1.js", "utf8");
const phoneView = fs.readFileSync("telefonate/ausgehend/index.html", "utf8");

function storage(initial = {}) {
  const entries = new Map(Object.entries(initial));
  return {
    getItem: key => entries.get(key) || null,
    setItem: (key, value) => entries.set(key, String(value)),
    removeItem: key => entries.delete(key)
  };
}

function phoneSessionOn(hostname, stored = {}) {
  const window = { location: { hostname } };
  const context = { window, sessionStorage: storage(stored), localStorage: storage(), Date, JSON };
  vm.runInNewContext(sessionSource, context);
  return window.STEWAROPhoneSession;
}

test("live Mission entry belongs to App host, after existing authenticated boot", () => {
  assert.match(shell, /const APP_HOST = "app\.stewaro\.com"/);
  assert.match(shell, /if \(location\.hostname !== APP_HOST \|\|/);
  assert.match(shell, /function mountOutboundMissionEntry\(\)/);
  assert.match(shell, /link\.href = "\/telefonate\/ausgehend\/"/);
  assert.match(shell, /link\.textContent = "Telefonaufträge live verfolgen →"/);
  assert.match(shell, /if \(window\.STEWARO_APP_AUTH_READY && await window\.STEWARO_APP_AUTH_READY !== true\) return;/);
  assert.ok(shell.indexOf("mountOutboundMissionEntry();") > shell.indexOf("if (window.STEWARO_APP_AUTH_READY && await"));
  assert.doesNotMatch(shell, /fetch\(["']\/phone\/outbound/);
});

test("App phone view uses the canonical Account login and no token in a URL", () => {
  const api = phoneSessionOn("app.stewaro.com");
  assert.equal(api.loginHref("/telefonate/ausgehend/"), "https://account.stewaro.com/anmelden?produkt=senioren&next=app");
  assert.equal(api.token(), "");
  assert.doesNotMatch(api.loginHref(), /session_token|handoff|bearer/i);
});

test("legacy website telephone routes keep their old login behavior", () => {
  for (const host of ["stewaro.com", "account.stewaro.com", "localhost"]) {
    assert.equal(phoneSessionOn(host).loginHref("/telefonate/ausgehend/"), "/anmelden");
  }
});

test("outbound reading is authenticated and only displays returned ASR text", () => {
  assert.match(phoneView, /stewaro-outbound-ledger-v1\.js\?v=8/);
  assert.match(phoneView, /stewaro-phone-session-v1\.js\?v=1/);
  assert.match(phoneView, /automatischer Spracherkennung/);
  assert.match(phoneView, /Zugang nur nach Anmeldung/);
  assert.doesNotMatch(phoneView, /<form[^>]+action=/);
});
