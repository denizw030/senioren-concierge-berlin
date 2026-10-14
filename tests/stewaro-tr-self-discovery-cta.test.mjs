import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../tr/index.html', import.meta.url), 'utf8');
test('Turkish self-discovery CTA retains correct registration route and self role', () => {
  const links = [...html.matchAll(/<a\b[^>]*data-entry="self"[^>]*>[\s\S]*?<\/a>/g)]
    .map(match => match[0]).filter(link => link.includes('STEWARO’yu kendiniz için keşfedin'));
  assert.equal(links.length, 1);
  assert.match(links[0], /href="\/registrieren\?lang=tr"/);
  assert.doesNotMatch(html, /Kendim için STEWARO’yu tanıyın/);
});
