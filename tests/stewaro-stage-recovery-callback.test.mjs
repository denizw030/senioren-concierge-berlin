import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../assets/stewaro-stage-recovery.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../web-concierge/stage-password-reset.html", import.meta.url), "utf8");
const STAGE_AUTH = "https://btqklftjmwtqqqdmwlnk.supabase.co/auth/v1/";

async function start({ hostname = "d2h3bbcracss71.cloudfront.net", path = "/web-concierge/stage-password-reset.html",
  hash = "", reply = () => ({ ok: false, json: async () => ({}) }) } = {}) {
  const events = new Map(), requests = [], historyCalls = [];
  const nodes = {};
  for (const id of ["stageRecoveryForm", "stageRecoveryStatus", "stageNewPassword",
                    "stageConfirmPassword", "stageSavePassword"]) {
    nodes[id] = { value: "", hidden: id === "stageRecoveryForm", disabled: false, textContent: "",
      reportValidity: () => true,
      addEventListener: (name, action) => events.set(name, action) };
  }
  const document = { getElementById: id => nodes[id] ?? null };
  const history = { replaceState: (...args) => historyCalls.push(args) };
  const fetch = async (url, options) => {
    requests.push({ url, options, wasScrubbed: historyCalls.length > 0 });
    return reply(url, options);
  };
  vm.runInNewContext(source, {
    location: { protocol: "https:", hostname, pathname: path, hash },
    document, history, fetch, URLSearchParams
  }, { timeout: 500 });
  await new Promise(resolve => setImmediate(resolve));
  return { nodes, events, requests, historyCalls };
}

test("different host: no reset handling or network", async () => {
  const r = await start({ hostname: "account.stewaro.com", hash: "#type=recovery&access_token=a&refresh_token=b" });
  assert.equal(r.requests.length, 0);
  assert.equal(r.historyCalls.length, 0);
  assert.equal(r.events.size, 0);
});
test("wrong link type or PKCE code without recovery token fails closed", async () => {
  for (const hash of ["#type=signup&access_token=x&refresh_token=y", "#error=access_denied", ""]) {
    const r = await start({ hash });
    assert.equal(r.requests.length, 0);
    assert.equal(r.nodes.stageRecoveryForm.hidden, true);
    assert.equal(r.historyCalls.length, 1);
  }
});
test("valid recovery token: URL scrub precedes /user verification", async () => {
  const r = await start({
    hash: "#type=recovery&access_token=test-token&refresh_token=test-refresh",
    reply: async () => ({ ok: true, json: async () => ({ id: "isolated-staging-user" }) })
  });
  assert.equal(r.requests.length, 1);
  assert.equal(r.requests[0].url, STAGE_AUTH + "user");
  assert.equal(r.requests[0].options.method, "GET");
  assert.equal(r.requests[0].wasScrubbed, true);
  assert.equal(r.nodes.stageRecoveryForm.hidden, false);
  assert.equal(r.requests[0].options.credentials, "omit");
  assert.equal(r.requests[0].options.referrerPolicy, "no-referrer");
});
test("server rejection keeps form hidden and no password update", async () => {
  const r = await start({
    hash: "#type=recovery&access_token=test-token&refresh_token=test-refresh"
  });
  assert.equal(r.nodes.stageRecoveryForm.hidden, true);
  assert.equal(r.requests.length, 1);
});
test("verified STAGING identity permits only explicit password update", async () => {
  const r = await start({
    hash: "#type=recovery&access_token=test-token&refresh_token=test-refresh",
    reply: async (url, opts) => opts.method === "GET"
      ? { ok: true, json: async () => ({ id: "stage-user" }) }
      : { ok: true, json: async () => ({}) }
  });
  assert.equal(r.requests.length, 1);
  r.nodes.stageNewPassword.value = "temporary-strong-stage-password";
  r.nodes.stageConfirmPassword.value = "temporary-strong-stage-password";
  const save = r.events.get("submit");
  assert.equal(typeof save, "function");
  await save({ preventDefault() {} });
  assert.equal(r.requests.length, 2);
  assert.equal(r.requests[1].url, STAGE_AUTH + "user");
  assert.equal(r.requests[1].options.method, "PUT");
  assert.equal(r.requests[1].options.wasScrubbed, true);
  assert.equal(r.nodes.stageNewPassword.value, "");
  assert.equal(r.nodes.stageConfirmPassword.value, "");
  assert.equal(r.nodes.stageRecoveryForm.hidden, true);
  assert.match(r.nodes.stageRecoveryStatus.textContent, /aktualisiert/);
});
test("mismatching new passwords never call Auth", async () => {
  const r = await start({
    hash: "#type=recovery&access_token=test-token&refresh_token=test-refresh",
    reply: async () => ({ ok: true, json: async () => ({ id: "stage-user" }) })
  });
  r.nodes.stageNewPassword.value = "stage-password-alpha";
  r.nodes.stageConfirmPassword.value = "stage-password-beta";
  await r.events.get("submit")({ preventDefault() {} });
  assert.equal(r.requests.length, 1);
});
test("only isolated STAGING backend and local assets, no token storage", () => {
  assert.match(source, /location\.hostname !== HOST/);
  assert.match(source, /history\.replaceState/);
  assert.doesNotMatch(source, /(?:localStorage|sessionStorage|console\.log)/);
  assert.doesNotMatch(source, /djicahhmnnamtjuqedqd|ta832v8wah/);
  assert.match(html, /name="referrer" content="no-referrer"/);
  assert.match(html, /default-src 'none'/);
  assert.match(html, /script-src 'self'/);
  assert.match(html, /name="robots" content="noindex,nofollow"/);
  assert.match(html, /type="password"/);
});
