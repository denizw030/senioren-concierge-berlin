import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../assets/stewaro-app-shell.js", import.meta.url), "utf8");
const marker = "  window.STEWAROAppShell = Object.freeze({";

function harness() {
  assert.ok(source.includes(marker));
  const label = { textContent: "" };
  const nodes = {
    stewaroAppConnection: { classList: { toggle() {} }, querySelector: () => label }
  };
  let online = true;
  const observers = [];
  function status(text = "Online", connected = true) {
    return { textContent: text, classList: { contains: key => key === "is-online" && connected } };
  }
  nodes.webConciergeStatus = status();
  class Observer {
    constructor(callback) { this.callback = callback; this.active = false; observers.push(this); }
    observe(node) { this.node = node; this.active = true; }
    disconnect() { this.active = false; }
  }
  const window = {};
  const instrumented = source.replace(marker, "  window.__statusTest = syncConnectionFromChat;\n" + marker);
  vm.runInNewContext(instrumented, {
    location: { origin: "https://app.stewaro.com" },
    document: {
      documentElement: { dataset: { stewaroApp: "1" } },
      readyState: "loading",
      getElementById: id => nodes[id] || null,
      addEventListener() {}
    },
    window,
    navigator: { get onLine() { return online; } },
    MutationObserver: Observer,
    addEventListener() {}
  }, { timeout: 2000 });
  assert.equal(typeof window.__statusTest, "function");
  return {
    sync: window.__statusTest,
    status,
    setOnline: value => { online = value; },
    replace: value => { nodes.webConciergeStatus = value; },
    label: () => label.textContent,
    active: () => observers.filter(item => item.active),
    trigger: () => observers.filter(item => item.active).forEach(item => item.callback())
  };
}

test("repeated sync does not accumulate observers", () => {
  const h = harness();
  h.sync(); h.sync(); h.sync();
  assert.equal(h.active().length, 1);
  assert.equal(h.label(), "FIDEL verbunden");
});

test("stale Online chat label cannot mask device offline state", () => {
  const h = harness();
  h.sync(); h.setOnline(false); h.trigger();
  assert.equal(h.label(), "Offline");
});

test("replacing a chat node disconnects the previous observer", () => {
  const h = harness();
  h.sync();
  const previous = h.active()[0];
  h.replace(h.status("Verbinde …", false)); h.sync();
  assert.equal(previous.active, false);
  assert.equal(h.active().length, 1);
  assert.equal(h.label(), "Verbinde …");
});

test("removing chat status releases the observer", () => {
  const h = harness();
  h.sync(); h.replace(null); h.sync();
  assert.equal(h.active().length, 0);
});

test("online recovery uses current error status with one observer", () => {
  const h = harness();
  h.sync(); h.setOnline(false); h.trigger();
  assert.equal(h.label(), "Offline");
  h.setOnline(true); h.replace(h.status("Verbindung fehlgeschlagen", false)); h.sync();
  assert.equal(h.label(), "Verbindung gestört");
  assert.equal(h.active().length, 1);
});
