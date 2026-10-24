import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../assets/stewaro-app-shell.js", import.meta.url), "utf8");
const KEY = "scb_web_session";

function harness({ origin = "https://app.stewaro.com", voiceUi = false } = {}) {
  const data = new Map([[KEY, JSON.stringify({ session_token: "session-A" })]]);
  const nodes = new Map();
  const requests = [];
  const input = { value: "fidel_warm", checked: true, disabled: false, listeners: {},
    addEventListener(type, handler) { this.listeners[type] = handler; } };
  const section = { setAttribute() {}, querySelectorAll: () => [input] };
  const host = { lastElementChild: null, insertBefore(value) { this.section = value; } };
  function node(id) {
    if (id === "stewaroFidelVoiceSetting") return host.section || null;
    if (!nodes.has(id)) nodes.set(id, {
      textContent: "", hidden: false, setAttribute(name, value) { this[name] = value; }
    });
    return nodes.get(id);
  }
  const document = {
    documentElement: { dataset: { stewaroApp: "1" } },
    readyState: "loading",
    addEventListener() {},
    getElementById: node,
    querySelector(selector) {
      if (voiceUi && selector === ".stewaro-app-more") return host;
      if (voiceUi && selector.startsWith('input[name="stewaroFidelVoice"]')) return input;
      return null;
    },
    querySelectorAll: () => [],
    createElement: () => section
  };
  const sessionStorage = {
    getItem: key => data.get(key) || null,
    setItem: (key, value) => data.set(key, value),
    removeItem: key => data.delete(key)
  };
  const window = { STEWARO_APP_AUTH_READY: Promise.resolve(true) };
  const context = {
    window, document, sessionStorage, localStorage: { removeItem() {} },
    location: { origin, replace() {} },
    navigator: { onLine: true },
    AbortSignal: { timeout: () => undefined },
    CSS: { escape: value => value },
    HTMLTextAreaElement: class {},
    Event: class {},
    addEventListener() {},
    fetch(url, options) {
      return new Promise(resolve => requests.push({
        url, options,
        reply(body, ok = true) { resolve({ ok, json: async () => body }); }
      }));
    }
  };
  vm.runInNewContext(source, context, { timeout: 1000 });
  function reply(path, body, index = 0, ok = true) {
    const request = requests.filter(item => item.url.includes(path))[index];
    assert.ok(request, "expected pending request for " + path);
    request.reply(body, ok);
  }
  return { window, data, node, requests, reply, input };
}

function replyAll(h, { email = "private@example.test", safety = true, voice = "fidel_warm", index = 0 } = {}) {
  h.reply("web-profile", { ok: true, profile: { email } }, index);
  h.reply("web-managed-safety-context", { ok: true, safety: { enabled: safety } }, index);
  h.reply("/voice-options", { ok: true, selected: voice }, index);
}

test("late profile, safety and voice data never cross identities", async () => {
  const h = harness();
  const pending = h.window.STEWAROAppShell.refresh();
  h.data.set(KEY, JSON.stringify({ session_token: "session-B" }));
  replyAll(h);
  await pending;
  assert.equal(h.node("stewaroAppEmail").textContent, "");
  assert.equal(h.node("stewaroAppSafety").textContent, "");
  assert.equal(h.node("stewaroFidelVoiceStatus").textContent, "");
});

test("out-of-order refreshes keep the newest account data", async () => {
  const h = harness();
  const oldRequest = h.window.STEWAROAppShell.refresh();
  const newRequest = h.window.STEWAROAppShell.refresh();
  replyAll(h, { email: "new@example.test", safety: true, voice: "fidel_klar", index: 1 });
  await Promise.resolve();
  replyAll(h, { email: "old@example.test", safety: false, voice: "fidel_warm", index: 0 });
  await Promise.all([oldRequest, newRequest]);
  assert.equal(h.node("stewaroAppEmail").textContent, "new@example.test");
  assert.equal(h.node("stewaroAppSafety").textContent, "Schutz aktiv");
  assert.equal(h.node("stewaroFidelVoiceStatus").textContent, "FIDEL Klar ist ausgewählt.");
});

test("late failures after local logout do not show stale notices", async () => {
  const h = harness();
  const pending = h.window.STEWAROAppShell.refresh();
  h.data.delete(KEY);
  h.reply("web-profile", { ok: false }, 0, false);
  h.reply("web-managed-safety-context", { ok: false }, 0, false);
  h.reply("/voice-options", { ok: false }, 0, false);
  await pending;
  assert.equal(h.node("stewaroAppDataNotice").textContent, "");
  assert.equal(h.node("stewaroAppSafety").textContent, "");
  assert.equal(h.node("stewaroFidelVoiceStatus").textContent, "");
});

test("current authenticated identity still renders its own data", async () => {
  const h = harness();
  const pending = h.window.STEWAROAppShell.refresh();
  replyAll(h, { email: "current@example.test" });
  await pending;
  assert.equal(h.node("stewaroAppEmail").textContent, "current@example.test");
  assert.equal(h.node("stewaroAppSafety").textContent, "Schutz aktiv");
  assert.equal(h.node("stewaroFidelVoiceStatus").textContent, "FIDEL Warm ist ausgewählt.");
});

test("late voice save never updates the next identity's settings", async () => {
  const h = harness({ voiceUi: true });
  const initial = h.window.STEWAROAppShell.refresh();
  replyAll(h, { voice: "fidel_klar" });
  await initial;
  assert.equal(h.node("stewaroFidelVoiceStatus").textContent, "FIDEL Klar ist ausgewählt.");
  h.input.checked = true;
  const saving = h.input.listeners.change();
  assert.equal(h.requests.filter(item => item.url.includes("/voice-preference")).length, 1);
  h.data.set(KEY, JSON.stringify({ session_token: "session-B" }));
  h.reply("/voice-preference", { ok: true, selected: "fidel_warm" });
  await saving;
  assert.equal(h.node("stewaroFidelVoiceStatus").textContent, "FIDEL Klar ist ausgewählt.");
});

test("noncanonical lookalike origin cannot mount the app shell", () => {
  const h = harness({ origin: "https://app.stewaro.com.attacker.example" });
  assert.equal(h.window.STEWAROAppShell, undefined);
  assert.equal(h.requests.length, 0);
});

test("real current-session errors still show a truthful unavailable status", async () => {
  const h = harness();
  const pending = h.window.STEWAROAppShell.refresh();
  h.reply("web-profile", { ok: false }, 0, false);
  h.reply("web-managed-safety-context", { ok: false }, 0, false);
  h.reply("/voice-options", { ok: false }, 0, false);
  await pending;
  assert.match(h.node("stewaroAppDataNotice").textContent, /nicht geladen/);
  assert.equal(h.node("stewaroAppSafety").textContent, "Status nicht verfügbar");
  assert.equal(h.node("stewaroFidelVoiceStatus").textContent, "Stimmenauswahl ist gerade nicht verfügbar.");
});
