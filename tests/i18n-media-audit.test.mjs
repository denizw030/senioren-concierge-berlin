import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const publicPages = [
  'index.html','prime-concierge.html','safety.html','angehoerige.html','telefonannahme.html',
  'pakete.html','leistungen.html','ablauf.html','faq.html','kontakt.html','concierges.html',
  'senioren-concierge.html','alltag-organisieren.html','dokumente-verstehen.html',
  'technik-verstehen.html','ueber-mich.html'
];

function mediaRefs(html) {
  const refs = [];
  for (const match of html.matchAll(/<(?:img|source|audio|video)\b[^>]*\b(?:src|poster)=["']([^"']+)["'][^>]*>/gi)) refs.push(match[1]);
  for (const match of html.matchAll(/<(?:img|source)\b[^>]*\bsrcset=["']([^"']+)["'][^>]*>/gi)) {
    for (const part of match[1].split(',')) refs.push(part.trim().split(/\s+/)[0]);
  }
  return refs;
}

test('every local media reference resolves on every public EN/TR and auth page', () => {
  const pages = [
    ...publicPages.flatMap(page => [`en/${page}`, `tr/${page}`]),
    'registrieren.html','anmelden.html','erster-schritt.html'
  ];
  for (const page of pages) {
    for (const raw of mediaRefs(read(page))) {
      if (!raw || /^(?:https?:|data:|blob:|#)/i.test(raw)) continue;
      const clean = raw.split(/[?#]/)[0];
      const absolute = clean.startsWith('/')
        ? path.join(root, clean.replace(/^\/+/, ''))
        : path.resolve(root, path.dirname(page), clean);
      assert.ok(fs.existsSync(absolute), `${page} has broken media reference ${raw}`);
    }
  }
});

test('runtime-created media URLs are root absolute', () => {
  const files = fs.readdirSync(path.join(root,'assets')).filter(name => name.endsWith('.js'));
  for (const name of files) {
    const js = read(path.join('assets',name));
    assert.doesNotMatch(js, /["'`]assets\//, `${name} contains a path-relative runtime asset`);
  }
  const carousel = read('assets/concierge-carousel.js');
  assert.match(carousel, /`\/assets\/voice\/samples\/\$\{key\}-\$\{code\}\.mp3/);
  const authNav = read('assets/auth-nav.js');
  assert.match(authNav, /src="\/assets\/logos\/crown\.png/);
  assert.match(authNav, /src="\/assets\/logos\/crown-white-96\.png/);
});

test('all 23 Concierge slider native DE and EN preview files exist', () => {
  const carousel = read('assets/concierge-carousel.js');
  const profiles = [...carousel.matchAll(/^\s*\["([^"]+)",.*,"([a-z]{2})"\],$/gm)].map(match => ({key:match[1], native:match[2]}));
  assert.equal(profiles.length, 23, 'expected all 23 Concierge profiles');
  for (const {key,native} of profiles) {
    for (const code of new Set([native,'de','en'])) {
      const file = path.join(root,'assets','voice','samples',`${key}-${code}.mp3`);
      assert.ok(fs.existsSync(file), `missing slider audio ${key}-${code}.mp3`);
    }
  }
});

test('localized runtime repairs late-added image and media references', () => {
  const js = read('assets/locale-runtime.js');
  assert.match(js, /repairAssetRefs/);
  assert.match(js, /attributeFilter: \['src','srcset','data-src','data-srcset','poster'\]/);
});
