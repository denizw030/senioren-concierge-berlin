import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../tr/index.html', import.meta.url), 'utf8');

test('Turkish family entry links stay in the Turkish locale', () => {
  const links = [...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*data-entry="loved-one"[^>]*>/g)].map(match => match[1]);
  assert.deepEqual(links, [
    '/tr/angehoerige?source=stewaro',
    '/tr/angehoerige',
    '/tr/angehoerige?source=stewaro',
  ]);
  assert.match(html, /STEWARO’yu kendiniz için keşfedin/);
});
