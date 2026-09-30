import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const locales = ['de', 'en', 'tr'];
const leafSource = 'e54f2b64-7398-4d9e-95e4-245b1cec8abb.mp4';

for (const locale of locales) {
  const html = fs.readFileSync(`${locale}/index.html`, 'utf8');

  test(`${locale}: Ruhe section uses web-optimized scroll-controlled leaf video`, () => {
    const leaf = html.match(/<section class="cinematic leaf-scene"[\s\S]*?<\/section>/)?.[0] || '';
    assert.match(leaf, /<video class="cinematic-image leaf-image leaf-video"/);
    assert.match(leaf, new RegExp(leafSource.replaceAll('.', '\\.')));
    assert.match(leaf, /muted\s+playsinline\s+preload="metadata"/);
    assert.doesNotMatch(leaf, /<img class="cinematic-image leaf-image"/);
  });

  test(`${locale}: leaf scrub runtime is bidirectional and lazy-warmed`, () => {
    assert.match(html, /const updateLeafVideo = \(\) => \{/);
    assert.match(html, /const progress = clamp01\(\(window\.innerHeight - rect\.top\) \/ travel\);/);
    assert.match(html, /leafVideo\.currentTime = target/);
    assert.match(html, /leafWarmup = new IntersectionObserver/);
    assert.match(html, /rootMargin: '900px 0px'/);
    assert.match(html, /updateLeafVideo\(\);/);
  });
}

test('leaf integration preserves the clockwork scroll video', () => {
  const html = fs.readFileSync('de/index.html', 'utf8');
  assert.match(html, /class="mechanism-image mechanism-video"/);
  assert.match(html, /const updateMechanismVideo = \(\) => \{/);
});
