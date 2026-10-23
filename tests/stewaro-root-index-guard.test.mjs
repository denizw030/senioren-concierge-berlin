import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const script = root.match(/<script>([\s\S]*?)<\/script>/)?.[1];

function redirectFor(hostname, search = '?src=campaign', hash = '#handoff=hnd_test') {
  const redirects = [];
  const location = { hostname, search, hash, replace: (value) => redirects.push(value) };
  vm.runInNewContext(script, { window: { location } });
  return redirects;
}

test('root redirect page is noindex, public /de/ remains the canonical search landing', () => {
  assert.match(root, /<meta\s+name="robots"\s+content="noindex,nofollow"\s*\/>/i);
  assert.match(root, /<link rel="canonical" href="https:\/\/stewaro\.com\/de\/">/);
});

test('app host keeps the fragment-only handoff on the protected product route', () => {
  assert.deepEqual(redirectFor('app.stewaro.com'), ['/web-concierge?src=campaign#handoff=hnd_test']);
});

test('public and lookalike hosts never route to authenticated app', () => {
  for (const hostname of ['stewaro.com', 'account.stewaro.com', 'app.stewaro.com.evil.test', 'notapp.stewaro.com']) {
    assert.deepEqual(redirectFor(hostname), ['/de/?src=campaign'], hostname);
  }
});

test('no-script fallback leaves the product host for the canonical public site', () => {
  assert.match(root, /<a href="https:\/\/stewaro\.com\/de\/">Weiter zu STEWARO<\/a>/);
  assert.doesNotMatch(root, /<a href="\/de\/">Weiter zu STEWARO<\/a>/);
});

test('public redirect preserves only known navigation anchors, never auth fragments', () => {
  assert.deepEqual(redirectFor('stewaro.com', '?ref=friend', '#services'), ['/de/?ref=friend#services']);
  assert.deepEqual(redirectFor('stewaro.com', '', '#family'), ['/de/#family']);
  assert.deepEqual(redirectFor('stewaro.com', '', '#handoff=hnd_secret'), ['/de/']);
  assert.deepEqual(redirectFor('stewaro.com', '', '#foo=bar&handoff=hnd_secret'), ['/de/']);
  assert.deepEqual(redirectFor('stewaro.com', '', '#%68andoff=hnd_secret'), ['/de/']);
});
