import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');
const page = read('digitaler-schutz.html');
const mirror = read('digitaler-schutz/index.html');
const css = read('assets/digitaler-schutz.css');
const js = read('assets/digitaler-schutz.js');

test('clean route mirror only adds base href', () => {
  const normalized = mirror.replace('<head><base href="/">', '<head>');
  assert.equal(normalized, page);
});

test('all eight canonical scenes are present', () => {
  const scenes = [...page.matchAll(/data-ds-overlay="(\d)"/g)].map((m) => Number(m[1]));
  assert.deepEqual(scenes, [0,1,2,3,4,5,6,7]);
  assert.match(page, /Verdächtiger Link blockiert\./);
  assert.match(page, /FIDEL passt mit auf\./);
  assert.match(page, /Keine Nachrichteninhalte wurden geteilt\./);
});

test('approved live-action media IDs are wired', () => {
  for (const id of [
    '99f251fd-ffa4-4c0a-ad86-fc39bf0dfe84',
    '1d420177-9f40-40a9-ac27-23207996053a',
    '4ba12ffb-54eb-4304-bbe6-c2507e3ad4c2',
    '1f16f1f5-4b44-47ba-ad7b-7c5a486618e3',
    'dda81b2a-84b7-4c6b-80ef-eddac4cade49'
  ]) assert.match(page, new RegExp(id));
});

test('video is muted, inline and never autoplay', () => {
  assert.doesNotMatch(page, /\bautoplay\b/i);
  const videos = [...page.matchAll(/<video\b[^>]*>/g)].map((m) => m[0]);
  assert.equal(videos.length, 5);
  for (const tag of videos) {
    assert.match(tag, /\bmuted\b/);
    assert.match(tag, /\bplaysinline\b/);
  }
});

test('reduced-motion fallback and responsive mobile flow exist', () => {
  assert.match(css, /prefers-reduced-motion\s*:\s*reduce/);
  assert.match(css, /@media\s*\(max-width:900px\)/);
  assert.match(page, /class="ds-mobile-flow"/);
});

test('scroll ranges match canonical scene map', () => {
  for (const pair of ['[0.00, 0.12]','[0.12, 0.25]','[0.25, 0.36]','[0.36, 0.48]','[0.48, 0.60]','[0.60, 0.73]','[0.73, 0.86]','[0.86, 1.00]']) {
    assert.ok(js.includes(pair), 'missing range ' + pair);
  }
});
