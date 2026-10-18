import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../fidel-erleben/index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../assets/stewaro-films.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../assets/stewaro-films.js', import.meta.url), 'utf8');

test('exactly three scroll-only films; six independent sources without old logo outro', () => {
  assert.equal((html.match(/data-scene(?=\s|>)/g) || []).length, 3);
  const urls = [...html.matchAll(/data-(?:wide|tall)="([^"]+)"/g)].map(m => m[1]);
  assert.equal(urls.length, 6);
  assert.equal(new Set(urls).size, 6);
  assert(urls.every(url => url.startsWith('https://') && url.endsWith('.mp4')));
  assert(!urls.some(url => /abe70dbb|39ec898f|0e01f79c/.test(url)));
});

test('only video on dark green background: no light canvas, prose or controls', () => {
  for (const unwanted of ['film-intro', 'film-copy', 'film-final', 'film-progress', 'film-controls', 'film-number', 'data-play', '<header', '<footer', '<button']) {
    assert(!html.includes(unwanted), 'Unexpected page furniture: ' + unwanted);
  }
  assert(css.includes('--film-green: #173126'));
  assert(css.includes('height: 100svh'));
  assert(css.includes('object-fit: contain'));
  assert(!/#f7f3eb|#eee7da|#e9eee7/.test(css));
});

test('scroll seeking and iPhone portrait selection remain accessible', () => {
  for (const term of ['IntersectionObserver', 'loadedmetadata', 'currentTime', 'playsinline', 'prefers-reduced-motion', 'requestAnimationFrame']) {
    assert((html + css + js).includes(term), 'Missing scroll safety feature: ' + term);
  }
  assert(html.includes('href="/de/"'));
  assert(html.includes('stewaro-films.js?v=2'));
  assert(!js.includes('data-play'));
  assert(!html.includes('stewaro-home-de.js') && !html.includes('leaf-video') && !html.includes('mechanism-video'));
});
