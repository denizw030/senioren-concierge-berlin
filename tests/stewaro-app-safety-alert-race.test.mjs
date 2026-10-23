import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../assets/stewaro-app-shell.js", import.meta.url), "utf8");
function between(start, end) {
  const i = source.indexOf(start);
  const j = source.indexOf(end, i);
  assert.ok(i >= 0 && j > i, "production function boundaries must exist");
  return source.slice(i, j);
}
function harness() {
  const env = { events: [], pending: [], fetchCount: 0, notice: { hidden: true, textContent: "" } };
  const productionFunctions = [
    between("  function selectTab(", "  function setConnection("),
    between("  async function loadSafety()", "  function showSafetyAlert("),
    between("  function showSafetyAlert(", "  function prepareFidelSafetyQuestion(")
  ].join("\n");
  const factory = new Function("env", `
    let safetyAlertActive = false, safetyRequestGeneration = 0, logoutInProgress = false;
    const SAFETY_URL = "https://example.invalid/safety";
    const state = { currentTab: "overview" };
    const document = {
      querySelectorAll: () => [],
      querySelector: () => null,
      getElementById: id => id === "stewaroSafetyUnavailable" ? env.notice : null
    };
    const navigator = { onLine: true };
    const CSS = { escape: value => value };
    const AbortSignal = { timeout: () => ({}) };
    const token = () => "synthetic-test-token";
    const setText = (id, value) => env.events.push(["text", id, value]);
    const showSafetyState = name => env.events.push(["state", name]);
    const renderSafety = () => env.events.push(["render"]);
    const fetch = () => {
      env.fetchCount++;
      return new Promise((resolve, reject) => env.pending.push({ resolve, reject }));
    };
    ${productionFunctions}
    return {
      selectTab, loadSafety, showSafetyAlert,
      setLogout: value => { logoutInProgress = value; },
      read: () => ({ safetyAlertActive, safetyRequestGeneration })
    };
  `);
  return { api: factory(env), env };
}
const ok = () => ({ ok: true, json: async () => ({ ok: true, safety: { enabled: true } }) });
const flush = () => new Promise(resolve => setImmediate(resolve));
const renders = env => env.events.filter(event => event[0] === "render").length;

test("app source parses and requires the exact HTTPS app origin", () => {
  assert.doesNotThrow(() => new Function(source));
  assert.ok(source.includes('location.origin !== "https://app.stewaro.com"'));
});

test("a pending successful safety read cannot erase a phishing warning", async () => {
  const { api, env } = harness();
  const pending = api.loadSafety();
  assert.equal(env.fetchCount, 1);
  api.showSafetyAlert({ host: "lookalike.invalid" });
  assert.equal(env.fetchCount, 1);
  assert.equal(api.read().safetyAlertActive, true);
  env.pending.shift().resolve(ok());
  assert.equal(await pending, false);
  assert.equal(renders(env), 0);
  assert.deepEqual(env.events.find(event => event[0] === "state"), ["state", "blocked"]);
});

test("a pending failed safety read cannot erase a phishing warning", async () => {
  const { api, env } = harness();
  const pending = api.loadSafety();
  api.showSafetyAlert();
  env.pending.shift().reject(new Error("network failure"));
  assert.equal(await pending, false);
  assert.equal(env.notice.hidden, true);
  assert.equal(env.events.some(event => event[1] === "stewaroAppSafety" && event[2] === "Status nicht verfügbar"), false);
});

test("warning does not start a new safety request", () => {
  const { api, env } = harness();
  api.showSafetyAlert();
  assert.equal(env.fetchCount, 0);
  assert.equal(api.read().safetyAlertActive, true);
});

test("leaving warning and reopening Safety restores fresh status", async () => {
  const { api, env } = harness();
  api.showSafetyAlert();
  api.selectTab("overview");
  assert.equal(api.read().safetyAlertActive, false);
  api.selectTab("safety");
  assert.equal(env.fetchCount, 1);
  env.pending.shift().resolve(ok());
  await flush();
  assert.equal(renders(env), 1);
});

test("out-of-order safety reads cannot overwrite newer status", async () => {
  const { api, env } = harness();
  const older = api.loadSafety();
  const newer = api.loadSafety();
  assert.equal(env.fetchCount, 2);
  env.pending[1].resolve(ok());
  assert.equal(await newer, true);
  env.pending[0].resolve(ok());
  assert.equal(await older, false);
  assert.equal(renders(env), 1);
});

test("logout prevents another safety request", async () => {
  const { api, env } = harness();
  api.setLogout(true);
  assert.equal(await api.loadSafety(), false);
  assert.equal(env.fetchCount, 0);
});

test("logout blocks an already in-flight safety response", async () => {
  const { api, env } = harness();
  const pending = api.loadSafety();
  api.setLogout(true);
  env.pending.shift().resolve(ok());
  assert.equal(await pending, false);
  assert.equal(renders(env), 0);
});
