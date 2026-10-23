import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(process.env.FILM_SOURCE || new URL('../assets/stewaro-films.js', import.meta.url), 'utf8');
function setup() {
  const callbacks = {}, events = {}, raf = [];
  let currentTime = 0;
  const video = {
    dataset: { wide: 'film-wide.mp4', tall: 'film-tall.mp4' },
    classList: { add() {}, remove() {} },
    seeking: false, duration: 20, pauseCalls: 0, seekCalls: 0,
    get currentTime() { return currentTime; },
    set currentTime(t) { currentTime = t; this.seekCalls++; },
    pause() { this.pauseCalls++; }, load() {},
    addEventListener(k, fn) { callbacks[k] = fn; }
  };
  const pos = { top: -350, height: 2450 };
  const root = { querySelector: () => video, getBoundingClientRect: () => ({ ...pos, bottom: pos.top + pos.height }) };
  const doc = { visibilityState: 'visible', querySelectorAll: () => [root], addEventListener(k, fn) { events[k] = fn; } };
  const win = { innerHeight: 1000, addEventListener(k, fn) { events[k] = fn; } };
  const mq = { matches: false, addEventListener() {} };
  vm.runInNewContext(source, { document: doc, window: win, matchMedia: () => mq, requestAnimationFrame: fn => raf.push(fn) });
  const flush = () => { while (raf.length) raf.shift()(); };
  callbacks.loadedmetadata(); flush();
  video.pauseCalls = 0; video.seekCalls = 0;
  return { video, pos, doc, events, callbacks, flush };
}

test('background tab does not pause or seek visible film on scroll', () => {
  const x = setup();
  x.doc.visibilityState = 'hidden';
  x.events.scroll(); x.flush();
  assert.equal(x.video.pauseCalls, 0);
  assert.equal(x.video.seekCalls, 0);
});

test('returning to foreground resumes correct film position', () => {
  const x = setup();
  x.doc.visibilityState = 'hidden';
  x.pos.top = -700;
  x.events.visibilitychange(); x.flush();
  x.doc.visibilityState = 'visible';
  x.events.visibilitychange(); x.flush();
  assert.equal(x.video.seekCalls, 1);
  assert.ok(x.video.currentTime > 0);
});

test('seek completion in background never consumes stale pending frame', () => {
  const x = setup();
  x.video.seeking = true;
  x.events.scroll(); x.flush();
  x.doc.visibilityState = 'hidden';
  x.video.seeking = false;
  const before = x.video.seekCalls;
  x.callbacks.seeked();
  assert.equal(x.video.seekCalls, before);
  x.pos.top = -700;
  x.doc.visibilityState = 'visible';
  x.events.visibilitychange(); x.flush();
  assert.equal(x.video.seekCalls, before + 1);
});
