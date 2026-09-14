import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pages = [
  'index.html','prime-concierge.html','safety.html','angehoerige.html','telefonannahme.html',
  'pakete.html','leistungen.html','ablauf.html','faq.html','kontakt.html','concierges.html',
  'senioren-concierge.html','alltag-organisieren.html','dokumente-verstehen.html',
  'technik-verstehen.html','ueber-mich.html'
];
const localized = new Set(pages);
const authTargets = new Set(['registrieren.html','anmelden.html']);

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function hrefs(html) {
  return [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)].map((m) => m[1]);
}

function decodeHref(href) {
  return href.replace(/&amp;/g, '&');
}

for (const lang of ['en', 'tr']) {
  test(`${lang}: every localized public page keeps the selected language`, () => {
    for (const page of pages) {
      const html = read(`${lang}/${page}`);
      assert.doesNotMatch(html, /amp%3B/i, `${lang}/${page} contains a malformed encoded HTML entity in a URL`);
      for (const rawHref of hrefs(html)) {
        const href = decodeHref(rawHref);
        if (!href || href.startsWith('#') || /^(?:https?:|mailto:|tel:|javascript:)/i.test(href)) continue;
        const url = new URL(href, 'https://nahwerkconcierge.com/');
        const base = url.pathname.split('/').filter(Boolean).pop() || 'index.html';
        if (localized.has(base)) {
          assert.ok(url.pathname.startsWith(`/${lang}/`), `${lang}/${page} leaks localized link ${href} back to DE`);
        }
        if (authTargets.has(base)) {
          assert.equal(url.searchParams.get('lang'), lang, `${lang}/${page} auth link ${href} loses lang=${lang}`);
        }
      }
    }
  });

  test(`${lang}: Personal Concierge primary registration CTA preserves product, plan and language`, () => {
    const html = read(`${lang}/prime-concierge.html`);
    const candidate = hrefs(html).map(decodeHref).find((href) => href.includes('registrieren.html') && href.includes('produkt=prime') && href.includes('paket=free'));
    assert.ok(candidate, `${lang}/prime-concierge.html has no intact primary registration CTA`);
    const url = new URL(candidate, 'https://nahwerkconcierge.com/');
    assert.equal(url.pathname, '/registrieren.html');
    assert.equal(url.searchParams.get('produkt'), 'prime');
    assert.equal(url.searchParams.get('paket'), 'free');
    assert.equal(url.searchParams.get('lang'), lang);
  });
}

test('auth entry pages load locale, slider and persistent language selector runtimes', () => {
  for (const page of ['registrieren.html','anmelden.html','erster-schritt.html']) {
    const html = read(page);
    assert.match(html, /assets\/auth-i18n\.js\?v=\d+/, `${page} must load auth-i18n runtime`);
    assert.match(html, /assets\/auth-slider-i18n\.js\?v=\d+/, `${page} must load auth slider locale runtime`);
    assert.match(html, /assets\/app-language-switcher\.js\?v=\d+/, `${page} must keep the language selector visible`);
  }
});

test('auth slider locale runtime covers the visible German carousel copy', () => {
  const sliderI18n = read('assets/auth-slider-i18n.js');
  for (const copy of [
    'Warm, ruhig, modern und strukturiert.',
    'Die Hörprobe startet in der Herkunftssprache. Die Sprache können Sie direkt darunter wechseln.',
    'Stimme anhören',
    'Sprache',
    'Ausgewählt'
  ]) {
    assert.ok(sliderI18n.includes(copy), `missing slider localization source: ${copy}`);
  }
});

test('registration redirects preserve the active locale', () => {
  const onboarding = read('assets/onboarding.js');
  assert.match(onboarding, /NAHWERKLocale\?\.href\("erster-schritt\.html"\)/);
  assert.match(onboarding, /NAHWERKLocale\?\.href\("anmelden\.html"\)/);
});
