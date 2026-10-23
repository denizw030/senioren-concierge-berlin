import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function runLocale(locale, reducedMotion = false) {
  const html = readFileSync(new URL(`../${locale}/index.html`, import.meta.url), 'utf8');
  const script = html.match(/<script>\s*(\(\(\) => \{[\s\S]*?\}\)\(\);)\s*<\/script>/);
  assert.ok(script, `${locale}: homepage scroll script exists`);
  const rects = {
    leaf: { top: -2100, bottom: -1500, height: 600 },
    clock: { top: 1700, bottom: 2300, height: 600 }
  };
  const video = () => {
    let time = 4;
    const writes = [];
    return {
      duration: 10, writes,
      get currentTime() { return time; },
      set currentTime(value) { writes.push(value); time = value; },
      pause() {}, load() {}, addEventListener() {}
    };
  };
  const leaf = video();
  const clock = video();
  const elements = {
    '.leaf-video': leaf,
    '.leaf-scene': { getBoundingClientRect: () => rects.leaf },
    '.mechanism-video': clock,
    '.precision': { getBoundingClientRect: () => rects.clock }
  };
  const listeners = {};
  const document = {
    querySelector: selector => elements[selector] || null,
    querySelectorAll: () => []
  };
  const window = {
    innerHeight: 800,
    matchMedia: () => ({ matches: reducedMotion, addEventListener() {} }),
    addEventListener: (name, handler) => { listeners[name] = handler; }
  };
  vm.runInNewContext(script[1], {
    window, document,
    requestAnimationFrame: callback => callback(),
    sessionStorage: { setItem() {} }
  });
  assert.equal(typeof listeners.scroll, 'function');
  return { leaf, clock, rects, scroll: () => listeners.scroll() };
}

for (const locale of ['en', 'tr']) {
  test(`${locale}: offscreen films do not seek on initial load or repeated scrolling`, () => {
    const app = runLocale(locale);
    app.scroll();
    app.scroll();
    assert.deepEqual(app.leaf.writes, []);
    assert.deepEqual(app.clock.writes, []);
  });

  test(`${locale}: visible films scrub; leaving viewport stops seeking; reentry resumes`, () => {
    const app = runLocale(locale);
    app.rects.leaf = { top: 100, bottom: 600, height: 500 };
    app.rects.clock = { top: 250, bottom: 750, height: 500 };
    app.scroll();
    assert.ok(app.leaf.writes.length > 0);
    assert.ok(app.clock.writes.length > 0);
    const firstLeaf = app.leaf.writes.length;
    const firstClock = app.clock.writes.length;
    app.rects.leaf = { top: -2200, bottom: -1700, height: 500 };
    app.rects.clock = { top: 1800, bottom: 2300, height: 500 };
    app.scroll();
    assert.equal(app.leaf.writes.length, firstLeaf);
    assert.equal(app.clock.writes.length, firstClock);
    app.rects.leaf = { top: 120, bottom: 620, height: 500 };
    app.scroll();
    assert.ok(app.leaf.writes.length > firstLeaf);
  });

  test(`${locale}: reduced-motion preference still resets films to first frame`, () => {
    const app = runLocale(locale, true);
    assert.deepEqual(app.leaf.writes, [0]);
    assert.deepEqual(app.clock.writes, [0]);
  });
}
