import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

test('English family entry links keep English locale', () => {
  const html = readFileSync('en/index.html', 'utf8');
  const links = [...html.matchAll(/<a[^>]+data-entry="loved-one"[^>]*>/g)].map(m => m[0]);
  assert.equal(links.length, 3);
  assert.ok(links.every(link => link.includes('href="/en/angehoerige')));
  assert.equal(links.filter(link => link.includes('?source=stewaro')).length, 2);
  assert.ok(existsSync('en/angehoerige/index.html'));
});
