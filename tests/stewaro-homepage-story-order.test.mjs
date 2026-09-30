import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const locales = ['de','en','tr'];
const markers = [
  ['hero', '<section class="hero'],
  ['promise', '<section class="promise'],
  ['care', '<section class="care-section'],
  ['leaf', '<section class="cinematic leaf-scene'],
  ['services', '<section class="services'],
  ['how', '<section class="how '],
  ['audience', '<section class="audience'],
  ['precision', '<section class="precision'],
  ['trust', '<section class="trust'],
  ['contact', '<section class="contact']
];

for (const locale of locales) {
  test(`${locale}: homepage follows conversion story order`, () => {
    const html = fs.readFileSync(`${locale}/index.html`, 'utf8');
    const positions = markers.map(([name, marker]) => [name, html.indexOf(marker)]);
    for (const [name, pos] of positions) assert.ok(pos >= 0, `${locale}: missing ${name}`);
    for (let i = 0; i < positions.length - 1; i++) {
      assert.ok(positions[i][1] < positions[i + 1][1],
        `${locale}: ${positions[i][0]} must precede ${positions[i + 1][0]}`);
    }
  });

  test(`${locale}: leaf and clockwork animations remain present after reorder`, () => {
    const html = fs.readFileSync(`${locale}/index.html`, 'utf8');
    assert.match(html, /class="cinematic-image leaf-image leaf-video"/);
    assert.match(html, /class="mechanism-image mechanism-video"/);
    assert.match(html, /const updateLeafVideo = \(\) => \{/);
    assert.match(html, /const updateMechanismVideo = \(\) => \{/);
  });
}
