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


test('legacy clean-url runtime marks .html compatibility routes noindex before redirect', () => {
  const runtime = read('assets/clean-url.js');
  assert.match(runtime, /noindex,follow/);
  assert.match(runtime, /link\[rel="canonical"\]/);
  assert.match(runtime, /location\.replace/);
});

test('known indexed legacy prime-concierge URLs are explicit noindex redirects', () => {
  const pairs = [['prime-concierge.html', '/prime-concierge'], ['en/prime-concierge.html', '/en/prime-concierge'], ['tr/prime-concierge.html', '/tr/prime-concierge']];
  for (const pair of pairs) {
    const file = pair[0], target = pair[1];
    const html = read(file);
    assert.match(html, /name=["']robots["'][^>]*content=["']noindex,follow["']/i, file);
    assert.ok(html.includes('url=' + target), file + ': missing refresh target');
    assert.ok(html.includes('https://nahwerkconcierge.com' + target), file + ': canonical target mismatch');
  }
});

test('sitemap publishes hreflang clusters without .html URLs', () => {
  const xml = read('sitemap.xml');
  assert.match(xml, /xmlns:xhtml=["']http:\/\/www\.w3\.org\/1999\/xhtml["']/);
  const hrefs = [
    'https://nahwerkconcierge.com/de/',
    'https://nahwerkconcierge.com/en/',
    'https://nahwerkconcierge.com/tr/',
    'https://nahwerkconcierge.com/prime-concierge',
    'https://nahwerkconcierge.com/en/prime-concierge',
    'https://nahwerkconcierge.com/tr/prime-concierge'
  ];
  for (const href of hrefs) assert.ok(xml.includes('href="' + href + '"'), 'missing hreflang href: ' + href);
  assert.ok(!/href=["'][^"']*\.html/i.test(xml), 'hreflang must not expose .html URLs');
});

test('homepage structured data covers locale homes and core entity types', () => {
  const runtime = read('assets/site-ui.js');
  for (const path of ["'/de'", "'/en'", "'/tr'"]) assert.ok(runtime.includes(path), 'missing locale path ' + path);
  for (const type of ["'Organization'", "'WebSite'", "'Service'", "'SoftwareApplication'"]) {
    assert.ok(runtime.includes(type), 'missing schema type ' + type);
  }
});

test('public search landing pages contain no ImageWhatsApp artifact', () => {
  const urls = extractLocs(read('sitemap.xml'));
  for (const url of urls) {
    const pathname = url.startsWith(DOMAIN) ? url.slice(DOMAIN.length) : url;
    const candidate = pathname.endsWith('/') ? pathname.slice(1) + 'index.html' : pathname.slice(1);
    const file = existsSync(resolve(root, candidate)) && statSync(resolve(root, candidate)).isDirectory() ? candidate + '/index.html' : candidate;
    const html = read(file);
    assert.ok(!/Image\s*WhatsApp/i.test(html), file + ': ImageWhatsApp artifact found');
  }
});
