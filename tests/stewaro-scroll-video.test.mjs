import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('de/index.html', 'utf8');

test('STEWARO reliability scene uses the scroll-controlled mechanism video', () => {
  const precision = html.match(/<section class="precision[\s\S]*?<\/section>/)?.[0] || '';
  assert.match(precision, /<video class="mechanism-image mechanism-video"/);
  assert.match(precision, /muted\s+playsinline\s+preload="metadata"/);
  assert.match(precision, /<source src="https:\/\/d2ol7oe51mr4n9\.cloudfront\.net\/.+\.mp4" type="video\/mp4"/);
  assert.doesNotMatch(precision, /<img class="mechanism-image"/);
  assert.doesNotMatch(precision, /autoplay/i);
});

test('scroll position scrubs the same video bidirectionally', () => {
  assert.match(html, /const updateMechanismVideo = \(\) => \{/);
  assert.match(html, /const progress = clamp01\(\(window\.innerHeight - rect\.top\) \/ travel\);/);
  assert.match(html, /const target = progress \* Math\.max\(0, mechanismVideo\.duration - 0\.04\);/);
  assert.match(html, /mechanismVideo\.currentTime = target/);
  assert.match(html, /window\.addEventListener\('scroll'/);
});

test('mechanism video is lazy-warmed and reduced-motion safe', () => {
  assert.match(html, /IntersectionObserver/);
  assert.match(html, /rootMargin: '900px 0px'/);
  assert.match(html, /prefers-reduced-motion: reduce/);
  assert.match(html, /mechanismVideo\.currentTime = 0/);
  assert.match(html, /mechanismVideo\.pause\(\)/);
});
