import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const shell = fs.readFileSync("assets/stewaro-app-shell.js", "utf8");
const style = fs.readFileSync("assets/stewaro-app.css", "utf8");

test("My Day is account-gated, uses existing app palette, and does not forge task status", () => {
  assert.match(shell, /location\.hostname !== APP_HOST/);
  assert.match(shell, /STEWARO_APP_TODAY_SHORTCUTS_V1/);
  assert.match(shell, /mountTodayShortcuts\(\)/);
  assert.match(style, /--stewaro-ivory:#f7f3eb/);
  assert.match(style, /--stewaro-forest:#173126/);
  assert.match(style, /--stewaro-gold:#c79a3d/);
  assert.match(style, /@media\(max-width:650px\)/);
  assert.match(style, /prefers-reduced-motion:reduce/);
  assert.match(shell, /Auftragsstände werden nicht geschätzt/);
  assert.doesNotMatch(shell, /TODAY_INTENTS[\s\S]*?function todayChatNotice[\s\S]*?fetch\(/);
});

function mockApp(hostname = "app.stewaro.com") {
  const elements = new Map();
  let boot;
  let inserted = 0;
  const events = [];

  class FakeElement {
    constructor() {
      this.value = "";
      this.disabled = false;
      this.hidden = false;
      this.attributes = {};
      this.handlers = {};
      this.classList = { add() {}, remove() {}, toggle() {}, contains() { return false; } };
    }
    setAttribute(key, value) { this.attributes[key] = value; }
    getAttribute(key) { return this.attributes[key] || ""; }
    addEventListener(name, fn) { this.handlers[name] = fn; }
    dispatchEvent(event) { events.push(event.type); }
    focus() { events.push("focus"); }
    prepend(node) { elements.set(node.id, node); }
    querySelector(key) { return key === ".stewaro-app-hero-card" ? hero : null; }
    querySelectorAll(selector) {
      const attr = selector === "[data-stewaro-today-action]" ? "data-stewaro-today-action"
        : selector === "[data-stewaro-today-open]" ? "data-stewaro-today-open" : null;
      if (!attr) return [];
      return [...String(this.innerHTML || "").matchAll(new RegExp(attr + '="([^"]+)"', "g"))].map((match) => {
        const item = new FakeElement();
        item.setAttribute(attr, match[1]);
        return item;
      });
    }
    insertAdjacentElement(position, node) {
      assert.equal(position, "afterend");
      inserted++;
      elements.set(node.id, node);
    }
  }
  class FakeInput extends FakeElement {}
  const hero = new FakeElement();
  const overview = new FakeElement();
  overview.setAttribute("data-stewaro-app-panel", "overview");
  const fidel = new FakeElement();
  fidel.setAttribute("data-stewaro-app-panel", "fidel");
  elements.set("stewaroAppShell", new FakeElement());
  elements.set("stewaroAppFidelMount", new FakeElement());
  const input = new FakeInput();
  elements.set("webConciergeInput", input);
  const document = {
    readyState: "loading",
    documentElement: { dataset: { stewaroApp: "1" } },
    createElement() { return new FakeElement(); },
    getElementById(id) { return elements.get(id) || null; },
    querySelector(q) {
      if (q === '[data-stewaro-app-panel="overview"]') return overview;
      return null;
    },
    querySelectorAll(q) {
      return q === "[data-stewaro-app-panel]" ? [overview, fidel] : [];
    },
    addEventListener(name, fn) { if (name === "DOMContentLoaded") boot = fn; }
  };
  const window = { STEWARO_APP_AUTH_READY: Promise.resolve(true), addEventListener() {} };
  const ctx = {
    window, document,
    location: { hostname },
    sessionStorage: { getItem() { return JSON.stringify({ session_token: "test-only" }); } },
    navigator: { onLine: true },
    HTMLTextAreaElement: FakeInput,
    MutationObserver: class { observe() {} },
    Event: class { constructor(type) { this.type = type; } },
    AbortSignal: { timeout() { return {}; } },
    fetch: async () => ({ ok: false, json: async () => ({ ok: false }) }),
    addEventListener() {},
    Promise, Object, CSS, console
  };
  vm.runInNewContext(shell, ctx);
  return {
    ctx, events, input, getToday: () => elements.get("stewaroAppToday"),
    getTab: () => window.STEWAROAppShell,
    get inserted() { return inserted; },
    boot: async () => { if (boot) await boot(); }
  };
}

test("authenticated app mounts My Day once, but not on public site", async () => {
  const active = mockApp();
  await active.boot();
  assert.ok(active.getToday());
  assert.equal(active.inserted, 1);
  await active.boot();
  assert.equal(active.inserted, 1);
  const publicSite = mockApp("stewaro.com");
  await publicSite.boot();
  assert.equal(publicSite.getToday(), undefined);
});

test("quick action only drafts into FIDEL; existing text is preserved", async () => {
  const app = mockApp();
  await app.boot();
  const buttons = app.getToday().querySelectorAll("[data-stewaro-today-action]");
  assert.equal(buttons.length, 4);
  assert.deepEqual(buttons.map((b) => b.getAttribute("data-stewaro-today-action")),
    ["appointment", "reminder", "document", "tasks"]);
  buttons[1].handlers.click();
  assert.match(app.input.value, /Erinnerung einzurichten/);
  assert.ok(app.events.includes("input"));
  const draft = app.input.value;
  buttons[3].handlers.click();
  assert.equal(app.input.value, draft, "existing unsent draft must be preserved");
  assert.ok(app.getTab(), "existing canonical app navigation stays active");
});

test("unavailable FIDEL composer remains fail-closed", async () => {
  const app = mockApp();
  await app.boot();
  app.input.disabled = true;
  const buttons = app.getToday().querySelectorAll("[data-stewaro-today-action]");
  buttons[0].handlers.click();
  assert.equal(app.input.value, "");
  assert.match(app.ctx.document.getElementById("stewaroAppTodayChatNotice").textContent, /verbindet sich noch/);
});
