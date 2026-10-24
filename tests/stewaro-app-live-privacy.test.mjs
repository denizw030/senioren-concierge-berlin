import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const htmlRoutes = ['app-live.html', 'app-live/index.html'];

test('both native FIDEL Live entry routes block search indexing and referrer disclosure', () => {
  for (const route of htmlRoutes) {
    const html = read(route);
    assert.match(html, /<meta\s+name="robots"\s+content="noindex,nofollow">/i, route);
    assert.match(html, /<meta\s+name="referrer"\s+content="no-referrer">/i, route);
    assert.match(html, /<script type="module" src="\/assets\/stewaro-csp-app-live-script-1\.js\?v=2"><\/script>/, route);
    assert.doesNotMatch(html, /(?:session_token|access_token|handoff)=/i, route);
  }
});

test('clean native FIDEL Live route matches the canonical entry except for root base', () => {
  assert.equal(read('app-live/index.html').replace('<head><base href="/">', '<head>'), read('app-live.html'));
});

test('crawler rules explicitly exclude native FIDEL Live route', () => {
  for (const path of ['/app-live', '/telefonate', '/zugang']) {
    assert.ok(read('robots.txt').split('\n').includes('Disallow: ' + path), path);
  }
});
