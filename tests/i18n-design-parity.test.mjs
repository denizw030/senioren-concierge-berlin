import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pages = [
  'index.html',
  'prime-concierge.html',
  'safety.html',
  'angehoerige.html',
  'telefonannahme.html',
  'pakete.html',
  'leistungen.html',
  'ablauf.html',
  'faq.html',
  'kontakt.html',
  'concierges.html',
  'senioren-concierge.html',
  'alltag-organisieren.html',
  'dokumente-verstehen.html',
  'technik-verstehen.html',
  'ueber-mich.html',
];

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function normalizeAsset(value) {
  if (!value) return value;
  if (/^https?:\/\//i.test(value)) return value;
  return '/' + value.replace(/^\.\//, '').replace(/^\//, '');
}

function stylesheetRefs(html) {
  return [...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi)]
    .map((m) => normalizeAsset(m[1]));
}

function scriptRefs(html) {
  return [...html.matchAll(/<script\b[^>]*src=["']([^"']+)["'][^>]*>/gi)]
    .map((m) => normalizeAsset(m[1]));
}

function imageRefs(html) {
  return [...html.matchAll(/<(?:img|source)\b[^>]*(?:src|srcset)=["']([^"']+)["'][^>]*>/gi)]
    .map((m) => normalizeAsset(m[1]));
}

function styleBlocks(html) {
  return [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
}

function bodyClass(html) {
  const body = html.match(/<body\b[^>]*class=["']([^"']*)["'][^>]*>/i);
  return body ? body[1].trim().replace(/\s+/g, ' ') : '';
}

for (const page of pages) {
  test(`${page}: EN/TR keep exact German PROD visual structure`, () => {
    const de = read(page);
    assert.doesNotMatch(de, /international\.css/i);

    for (const lang of ['en', 'tr']) {
      const locale = read(`${lang}/${page}`);
      assert.doesNotMatch(locale, /international\.css/i, `${lang}/${page} must not use a separate locale design stylesheet`);
      assert.match(locale, /class=["'][^"']*nahwerk-mark[^"']*["']/, `${lang}/${page} must use the current NAHWERK logo mark`);
      assert.deepEqual(stylesheetRefs(locale), stylesheetRefs(de), `${lang}/${page} stylesheet stack changed`);
      assert.deepEqual(scriptRefs(locale), scriptRefs(de), `${lang}/${page} script stack changed`);
      assert.deepEqual(imageRefs(locale), imageRefs(de), `${lang}/${page} visual assets changed`);
      assert.deepEqual(styleBlocks(locale), styleBlocks(de), `${lang}/${page} inline visual CSS changed`);
      assert.equal(bodyClass(locale), bodyClass(de), `${lang}/${page} body layout classes changed`);
    }
  });
}
