import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../assets/stewaro-home-de.js', import.meta.url), 'utf8');

function setup({ reducedMotion = false } = {}) {
  const sections = {
    '.leaf-scene': { top: -2200, bottom: -1700, height: 500 },
    '.precision': { top: 1800, bottom: 2300, height: 500 }
  };
  const makeVideo = () => {
    let time = 4;
    const writes = [];
    return {
      duration: 10,
      writes,
      get currentTime() { return time; },
      set currentTime(value) { writes.push(value); time = value; },
      pause() {},
      load() {},
      addEventListener() {}
    };
  };
  const leaf = makeVideo();
  const mechanism = makeVideo();
  const listeners = {};
  const elements = {
    '.leaf-video': leaf,
    '.leaf-scene': { getBoundingClientRect: () => sections['.leaf-scene'] },
    '.mechanism-video': mechanism,
    '.precision': { getBoundingClientRect: () => sections['.precision'] }
  };
  const window = {
    innerHeight: 800,
    matchMedia: () => ({ matches: reducedMotion, addEventListener() {} }),
    addEventListener: (type, fn) => { listeners[type] = fn; }
  };
  const document = {
    querySelector: (selector) => elements[selector] || null,
    querySelectorAll: () => []
  };
  vm.runInNewContext(source, { window, document, requestAnimationFrame: (fn) => fn() });
  return { leaf, mechanism, sections, scroll: () => listeners.scroll() };
}

test('offscreen leaf and clockwork never seek during initial load or repeated scrolls', () => {
  const app = setup();
  app.scroll();
  app.scroll();
  assert.deepEqual(app.leaf.writes, []);
  assert.deepEqual(app.mechanism.writes, []);
});

test('visible films still scrub; leaving viewport stops seeking and re-entry resumes', () => {
  const app = setup();
  app.sections['.leaf-scene'] = { top: 200, bottom: 700, height: 500 };
  app.sections['.precision'] = { top: 250, bottom: 750, height: 500 };
  app.scroll();
  assert.ok(app.leaf.writes.length > 0);
  assert.ok(app.mechanism.writes.length > 0);
  const leafCount = app.leaf.writes.length;
  const mechanismCount = app.mechanism.writes.length;
  app.sections['.leaf-scene'] = { top: -2000, bottom: -1500, height: 500 };
  app.sections['.precision'] = { top: 2000, bottom: 2500, height: 500 };
  app.scroll();
  assert.equal(app.leaf.writes.length, leafCount);
  assert.equal(app.mechanism.writes.length, mechanismCount);
  app.sections['.leaf-scene'] = { top: 100, bottom: 600, height: 500 };
  app.scroll();
  assert.ok(app.leaf.writes.length > leafCount);
});

test('reduced-motion preference still resets both films to their first frame', () => {
  const app = setup({ reducedMotion: true });
  assert.deepEqual(app.leaf.writes, [0]);
  assert.deepEqual(app.mechanism.writes, [0]);
});
