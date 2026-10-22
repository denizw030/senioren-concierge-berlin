import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Re-run against the actual project asset, not a copy of its auth logic.
const source = readFileSync(new URL("../assets/stewaro-stage-auth.js", import.meta.url), "utf8");
const STAGE = "https://btqklftjmwtqqqdmwlnk.supabase.co/auth/v1/";
const HOST = "d2h3bbcracss71.cloudfront.net";

function boot(hostname = HOST, respond = () => ({ ok: false, json: async () => ({}) })) {
  const handlers = new Map();
  const elements = {};
  const ids = [
    "stewaroStageAuthForm", "stewaroStageEmail", "stewaroStagePassword",
    "stewaroStageResult", "stewaroStageLogin", "stewaroStageSignUp",
    "stewaroStageLogout", "stewaroStageRecover"
  ];
  for (const id of ids) {
    elements[id] = {
      id, value: id === "stewaroStageEmail" ? "test@example.invalid"
        : id === "stewaroStagePassword" ? "test-only-password" : "",
      textContent: "", disabled: false, hidden: id === "stewaroStageLogout",
      addEventListener: (kind, cb) => handlers.set(id + ":" + kind, cb),
      checkValidity: () => true, reportValidity: () => true,
    };
  }
  const section = {
    setAttribute() {}, innerHTML: "",
    querySelector(selector) { return elements[selector.slice(1)] ?? null; }
  };
  const resultStatus = { textContent: "" };
  const log = { replaceChildren() {} };
  const document = {
    getElementById(id) {
      return id === "webConciergeLog" ? log
        : id === "webConciergeStatus" ? resultStatus : null;
    },
    createElement() { return section; }
  };
  const storage = new Map();
  const sessionStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key),
  };
  const requests = [];
  const fetch = async (url, options) => {
    requests.push({ url, options });
    return respond(url, options);
  };
  new Function("location", "document", "sessionStorage", "fetch", source)(
    { hostname }, document, sessionStorage, fetch
  );
  return { handlers, elements, storage, requests, resultStatus };
}

test("STAGING auth does not initialize on PROD or arbitrary hosts", () => {
  const state = boot("account.stewaro.com");
  assert.equal(state.handlers.size, 0);
  assert.equal(state.requests.length, 0);
});

test("recovery remains disabled and never sends mail or calls a URL", async () => {
  const state = boot();
  assert.equal(state.elements.stewaroStageRecover.disabled, true);
  await state.handlers.get("stewaroStageRecover:click")();
  assert.equal(state.requests.length, 0);
});

test("failed password login leaves no token, hides password and stays on STAGING Auth", async () => {
  const state = boot();
  await state.handlers.get("stewaroStageAuthForm:submit")({ preventDefault() {} });
  assert.equal(state.requests.length, 1);
  assert.equal(state.requests[0].url, STAGE + "token?grant_type=password");
  assert.equal(state.elements.stewaroStagePassword.value, "");
  assert.equal(state.storage.size, 0);
  assert.match(state.elements.stewaroStageResult.textContent, /Anmeldung fehlgeschlagen/);
});

test("successful sign-in verifies user server-side before tab-only token is saved", async () => {
  const state = boot(HOST, async (url) => {
    if (url.endsWith("/token?grant_type=password")) {
      return { ok: true, json: async () => ({ access_token: "fake-test-token" }) };
    }
    if (url.endsWith("/user")) {
      return { ok: true, json: async () => ({ id: "stage-test-id" }) };
    }
    throw new Error("unexpected request");
  });
  await state.handlers.get("stewaroStageAuthForm:submit")({ preventDefault() {} });
  assert.equal(state.requests.length, 2);
  assert.ok(state.requests.every(request => request.url.startsWith(STAGE)));
  assert.match(state.elements.stewaroStageResult.textContent, /STAGING-Anmeldung bestätigt/);
  assert.equal(state.elements.stewaroStageAuthForm.hidden, true);
  assert.equal(state.elements.stewaroStageLogout.hidden, false);
  assert.equal(JSON.parse(state.storage.get("stewaro_stage_auth_session_v1")).token, "fake-test-token");
  assert.equal(state.elements.stewaroStagePassword.value, "");
});

test("STAGING source has no PROD gateway call and reset remains opt-in", () => {
  assert.match(source, /STAGE_RECOVERY_ENABLED=false/);
  assert.match(source, /if\(!STAGE_RECOVERY_ENABLED\)return/);
  assert.doesNotMatch(source, /djicahhmnnamtjuqedqd\.supabase\.co/);
  assert.doesNotMatch(source, /ta832v8wah\.execute-api/);
});
