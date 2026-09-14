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

test('auth entry pages load locale and persistent language selector runtimes', () => {
  for (const page of ['registrieren.html','anmelden.html','erster-schritt.html']) {
    const html = read(page);
    assert.match(html, /assets\/auth-i18n\.js\?v=4/, `${page} must load current auth-i18n runtime`);
    assert.match(html, /assets\/app-language-switcher\.js\?v=2/, `${page} must keep the current language selector visible`);
  }
  assert.match(read('registrieren.html'), /assets\/auth-slider-i18n\.js\?v=2/, 'registration must load current slider locale runtime');
});

test('auth language selector switches directly without auth link rewriting', () => {
  const appSwitcher = read('assets/app-language-switcher.js');
  assert.match(appSwitcher, /dataset\.nwLanguageTarget/);
  assert.match(appSwitcher, /location\.assign\(hrefFor\(key\)\)/);
  assert.doesNotMatch(appSwitcher, /document\.createElement\('a'\)/);
});

test('public and auth mobile language controls pin to the menu button geometry', () => {
  for (const file of ['assets/language-switcher.js','assets/app-language-switcher.js']) {
    const source = read(file);
    assert.match(source, /const pinToToggle/);
    assert.match(source, /toggle\.getBoundingClientRect\(\)/);
    assert.match(source, /button\.style\.height = height/);
    assert.match(source, /const gap = 10/);
  }
});

test('auth slider locale runtime and catalogs cover visible carousel copy', () => {
  const sliderI18n = read('assets/auth-slider-i18n.js');
  const trAuth = read('locales/tr-auth4.json');
  const enAuth = read('locales/en-auth4.json');
  for (const copy of [
    'Warm, ruhig, modern und strukturiert.',
    'Die Hörprobe startet in der Herkunftssprache. Die Sprache können Sie direkt darunter wechseln.',
    'Stimme anhören',
    'Sprache',
    'Ausgewählt'
  ]) {
    assert.ok(sliderI18n.includes(copy), `missing slider runtime localization source: ${copy}`);
    assert.ok(trAuth.includes(copy), `missing Turkish auth catalog slider copy: ${copy}`);
    assert.ok(enAuth.includes(copy), `missing English auth catalog slider copy: ${copy}`);
  }
});

test('registration redirects preserve the active locale', () => {
  const onboarding = read('assets/onboarding.js');
  assert.match(onboarding, /NAHWERKLocale\?\.href\("erster-schritt\.html"\)/);
  assert.match(onboarding, /NAHWERKLocale\?\.href\("anmelden\.html"\)/);
});
