import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('privacy notice publishes the same controller identity as the current imprint', () => {
  const privacy = read('datenschutz.html');
  assert.match(privacy, /<h2>1\. Verantwortlicher<\/h2>/);
  assert.match(privacy, /NAHWERK Concierge/);
  assert.match(privacy, /Deniz Wannenmacher/);
  assert.match(privacy, /Osdorfer Straße 108/);
  assert.match(privacy, /12207 Berlin/);
  assert.match(privacy, /dw@nahwerkconcierge\.com/);
  assert.doesNotMatch(privacy, /aria-label="Kontaktdaten des Verantwortlichen"/);
});

test('pricing page marks Tarife, not Leistungen, as the current navigation item', () => {
  const pricing = read('pakete.html');
  assert.match(pricing, /<a href="leistungen\.html">Leistungen<\/a><a class="active" href="pakete\.html" aria-current="page">Tarife<\/a>/);
  assert.doesNotMatch(pricing, /<a class="active" href="leistungen\.html">Leistungen<\/a>/);
});

test('launch-readiness cleanup does not change frozen public prices or FREE quotas', () => {
  const pricing = read('pakete.html');
  for (const expected of ['0 €', '5,99 €', '10,99 €', '19,99 €', '34,99 €', '59,66 €']) {
    assert.ok(pricing.includes(expected), `missing frozen price ${expected}`);
  }
  assert.ok(pricing.includes('50 App-Dialoge · 20 WhatsApp-Dialoge'));
});
