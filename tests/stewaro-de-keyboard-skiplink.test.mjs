import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../de/index.html', import.meta.url), 'utf8');

test('German homepage has one first-tab skip navigation before header', () => {
  assert.equal((html.match(/class="stewaro-skip-link"/g) || []).length, 1);
  assert.match(html, /<body>\s*<a class="stewaro-skip-link" href="#top">Direkt zum Inhalt<\/a>\s*<header/);
});

test('skip target is focusable main content, not an unrelated section', () => {
  assert.match(html, /<main id="top" tabindex="-1">/);
  assert.equal((html.match(/<main\b/g) || []).length, 1);
});

test('skip link becomes visibly keyboard focusable with strong contrast', () => {
  assert.match(html, /\.stewaro-skip-link\s*\{[^}]*position:fixed[^}]*transform:translateY\(-200%\)/);
  assert.match(html, /\.stewaro-skip-link:focus\s*\{[^}]*transform:none[^}]*outline:3px solid #c6a35a/);
  assert.match(html, /background:#173b30;color:#fff/);
});

test('brand hero, primary navigation and no-JS access remain intact', () => {
  assert.match(html, /<h1 id="hero-title">/);
  assert.match(html, /<nav class="header-nav" aria-label="Hauptnavigation">/);
  assert.match(html, /<a class="header-cta" href="\/zugang"/);
  assert.doesNotMatch(html, /<script[^>]*>[^<]*skip-link/);
});
