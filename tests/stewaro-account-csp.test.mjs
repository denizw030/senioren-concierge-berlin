import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { effectiveHtmlSource } from './helpers/effective-source-fs.mjs';

const hashes = JSON.parse(fs.readFileSync('tests/fixtures/stewaro-csp-original-hashes.json', 'utf8'));

// Preserve every historical CSP/auth/markup hash. The only normalized exceptions
// are the exactly authorized Account-origin canonical links and a single parser-
// blocking domain-contract script in PR #341's six Account identity pages.
function normalizeAuthorizedAccountCutover(html, page) {
  const route = page.startsWith('anmelden') ? 'anmelden'
    : page.startsWith('registrieren') ? 'registrieren'
    : page.startsWith('konto') ? 'konto' : null;
  if (!route) return html;
  const script = '  <script src="/assets/stewaro-domain-contract.js?v=1"></script>\\n'.replace('\\n','\n');
  assert.equal(html.split(script).length, 2, page + ': exact single domain-contract script');
  assert.ok(html.includes(script + '</head>'), page + ': domain contract must precede head closing');
  html = html.replace(script, '');
  if (route === 'konto') return html;
  const current = 'href="https://account.stewaro.com/' + route + '"';
  const baseline = 'href="https://nahwerkconcierge.com/' + route + '"';
  assert.equal(html.split(current).length, 2, page + ': exact single canonical link');
  return html.replace(current, baseline);
}
for (const [page, originalHash] of Object.entries(hashes)) {
  test(`${page}: auth, legal and rendering content reconstructs to the unchanged baseline`, () => {
    const html = fs.readFileSync(page, 'utf8');
    assert.doesNotMatch(html, /<style\b|\sstyle\s*=|\son[a-z]+\s*=/i);
    assert.doesNotMatch(html, /<script\b(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/i);
    assert.equal(crypto.createHash('sha256').update(effectiveHtmlSource(normalizeAuthorizedAccountCutover(html, page))).digest('hex'), originalHash);
    for (const [, asset] of html.matchAll(/(?:src|href)="\/(assets\/stewaro-csp-[^"?]+)\?v=1"/g)) {
      assert.ok(fs.readFileSync(asset, 'utf8').length > 0, `${page}: ${asset} must exist`);
    }
  });
}
test('parser-blocking first-paint theme scripts retain their IDs and order', () => {
  for (const page of ['konto.html', 'web-concierge.html']) {
    const html = fs.readFileSync(page, 'utf8');
    const tag = html.match(/<script id="nw-theme-first-paint"[^>]+><\/script>/)?.[0];
    assert.ok(tag);
    assert.doesNotMatch(tag, /\b(?:async|defer|type)=?/);
    assert.ok(html.indexOf(tag) < html.indexOf('<body'));
  }
});
test('existing app-live module and submission denial remain explicit', () => {
  assert.match(fs.readFileSync('app-live.html', 'utf8'), /<script type="module" src="\/assets\/stewaro-csp-app-live-script-1\.js\?v=2">/);
  const submit = fs.readFileSync('assets/stewaro-csp-web-concierge-submit.js', 'utf8');
  let listener;
  vm.runInNewContext(submit, { document: { querySelector: () => ({ addEventListener: (name, fn) => { assert.equal(name, 'submit'); listener = fn; } }) } });
  let prevented = false;
  listener({ preventDefault: () => { prevented = true; } });
  assert.ok(prevented);
});
