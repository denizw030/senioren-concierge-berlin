import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const DOMAIN = 'https://nahwerkconcierge.com';

const blocked = [
  '/anmelden', '/registrieren', '/konto', '/payg',
  '/web-concierge', '/passwort-zuruecksetzen',
  '/zugang-uebertragen', '/concierge-anpassen',
  '/martin-anpassen', '/voice-audition',
  '/vertrag-widerrufen', '/erster-schritt'
];

const extractLocs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

test('robots exposes sitemap and protects non-search PROD surfaces', () => {
  const robots = read('robots.txt');
  assert.match(robots, /^User-agent:\s*\*/m);
  assert.match(robots, /Sitemap:\s*https:\/\/nahwerkconcierge\.com\/sitemap\.xml/);
  for (const path of blocked) assert.ok(robots.includes(`Disallow: ${path}`), `missing robots block ${path}`);
  for (const dir of ['/.github/', '/android-app/', '/api/', '/docs/', '/scripts/', '/tests/']) {
    assert.ok(robots.includes(`Disallow: ${dir}`), `missing robots block ${dir}`);
  }
});

test('root homepage redirects to the canonical German locale', () => {
  const redirect = read('index.html');
  assert.match(redirect, /http-equiv=["']refresh["'][^>]*url=\/de\//i);
  assert.match(redirect, /window\.location\.replace\(["']\/de\/["']\)/);
  assert.match(redirect, /rel=["']canonical["'][^>]*href=["']https:\/\/nahwerkconcierge\.com\/de\/["']/i);
});

test('sitemap contains only existing canonical public pages', () => {
  const urls = extractLocs(read('sitemap.xml'));
  assert.equal(urls.length, new Set(urls).size, 'duplicate sitemap URL');
  assert.ok(urls.includes(`${DOMAIN}/de/`), 'German homepage /de/ missing from sitemap');
  assert.ok(!urls.includes(`${DOMAIN}/`), 'redirect-only root homepage must not be indexed');
  assert.ok(urls.every((url) => !/\.html(?:$|[?#])/i.test(url)), 'sitemap must contain no .html URLs');
  for (const path of blocked) assert.ok(!urls.includes(`${DOMAIN}${path}`), `blocked path in sitemap: ${path}`);

  for (const url of urls) {
    assert.ok(url.startsWith(`${DOMAIN}/`), `wrong sitemap host: ${url}`);
    const { pathname } = new URL(url);
    const candidate = pathname.endsWith('/') ? `${pathname.slice(1)}index.html` : pathname.slice(1);
    const file = existsSync(resolve(root, candidate)) && statSync(resolve(root, candidate)).isDirectory() ? `${candidate}/index.html` : candidate;
    assert.ok(existsSync(resolve(root, file)), `missing sitemap target: ${file}`);
    const html = read(file);
    assert.match(html, /<title>[^<]+<\/title>/i, `${file}: missing title`);
    assert.match(html, /<meta\s+[^>]*name=["']description["'][^>]*content=["'][^"']+["'][^>]*>/i, `${file}: missing description`);
    assert.ok(!/name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html), `${file}: noindex in sitemap`);
    const canonical = `${DOMAIN}${pathname}`;
    assert.ok(html.includes(`href="${canonical}"`) || html.includes(`href='${canonical}'`), `${file}: canonical mismatch`);
  }
});

test('German homepage publishes Open Graph and structured-data runtime', () => {
  const home = read('de/index.html');
  assert.match(home, /property=["']og:url["'][^>]*content=["']https:\/\/nahwerkconcierge\.com\/de\/["']/s);
  assert.match(home, /property=["']og:image["']/s);
  const runtime = read('assets/site-ui.js');
  assert.match(runtime, /data-nw-structured-data/);
  assert.match(runtime, /https:\/\/schema\.org/);
  assert.match(runtime, /NAHWERK Concierge/);
});
