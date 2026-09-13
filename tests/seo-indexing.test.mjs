import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const DOMAIN = 'https://nahwerkconcierge.com';

const blocked = [
  '/anmelden.html', '/registrieren.html', '/konto.html', '/payg.html',
  '/web-concierge.html', '/passwort-zuruecksetzen.html',
  '/zugang-uebertragen.html', '/concierge-anpassen.html',
  '/martin-anpassen.html', '/voice-audition.html',
  '/vertrag-widerrufen.html', '/erster-schritt.html'
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

test('sitemap contains only existing canonical public pages', () => {
  const urls = extractLocs(read('sitemap.xml'));
  assert.equal(urls.length, new Set(urls).size, 'duplicate sitemap URL');
  for (const path of blocked) assert.ok(!urls.includes(`${DOMAIN}${path}`), `blocked path in sitemap: ${path}`);

  for (const url of urls) {
    assert.ok(url.startsWith(`${DOMAIN}/`), `wrong sitemap host: ${url}`);
    const { pathname } = new URL(url);
    const file = pathname === '/' ? 'index.html' : pathname.endsWith('/') ? `${pathname.slice(1)}index.html` : pathname.slice(1);
    assert.ok(existsSync(resolve(root, file)), `missing sitemap target: ${file}`);
    const html = read(file);
    assert.match(html, /<title>[^<]+<\/title>/i, `${file}: missing title`);
    assert.match(html, /<meta\s+[^>]*name=["']description["'][^>]*content=["'][^"']+["'][^>]*>/i, `${file}: missing description`);
    assert.ok(!/name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html), `${file}: noindex in sitemap`);
    const canonical = pathname === '/' ? `${DOMAIN}/` : `${DOMAIN}${pathname}`;
    assert.ok(html.includes(`href="${canonical}"`) || html.includes(`href='${canonical}'`), `${file}: canonical mismatch`);
  }
});

test('homepage publishes Open Graph and structured-data runtime', () => {
  const home = read('index.html');
  assert.match(home, /property=["']og:url["'][^>]*content=["']https:\/\/nahwerkconcierge\.com\/["']/s);
  assert.match(home, /property=["']og:image["']/s);
  const runtime = read('assets/site-ui.js');
  assert.match(runtime, /data-nw-structured-data/);
  assert.match(runtime, /https:\/\/schema\.org/);
  assert.match(runtime, /NAHWERK Concierge/);
});
