import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pages = [
  'index.html','prime-concierge.html','safety.html','angehoerige.html','telefonannahme.html',
  'pakete.html','leistungen.html','ablauf.html','faq.html','kontakt.html',
  'senioren-concierge.html','alltag-organisieren.html','dokumente-verstehen.html',
  'technik-verstehen.html','ueber-mich.html'
];
const localized = new Set(pages);
const authTargets = new Set(['registrieren','anmelden','registrieren.html','anmelden.html']);

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
        const url = new URL(href, 'https://stewaro.com/');
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
    const candidate = hrefs(html).map(decodeHref).find((href) => href.includes('/registrieren') && href.includes('produkt=prime') && href.includes('paket=free'));
    assert.ok(candidate, `${lang}/prime-concierge.html has no intact primary registration CTA`);
    const url = new URL(candidate, 'https://stewaro.com/');
    assert.equal(url.pathname, '/registrieren');
    assert.equal(url.searchParams.get('produkt'), 'prime');
    assert.equal(url.searchParams.get('paket'), 'free');
    assert.equal(url.searchParams.get('lang'), lang);
  });
}

test('auth entry pages load locale and persistent language selector runtimes', () => {
  for (const page of ['registrieren.html','anmelden.html','erster-schritt.html']) {
    const html = read(page);
    assert.match(html, /assets\/auth-i18n\.js\?v=\d+/, `${page} must load a versioned auth-i18n runtime`);
    assert.match(html, /assets\/app-language-switcher\.js\?v=\d+/, `${page} must keep a versioned language selector visible`);
  }
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

test('registration keeps FIDEL fixed and ships no legacy photo slider', () => {
  const registration = read('registrieren.html');
  assert.match(registration, /stewaro-fixed-concierge-card/);
  assert.match(registration, /name="conciergeChoice" value="fidel"/);
  assert.doesNotMatch(registration, /data-concierge-carousel|auth-slider-i18n\.js/);
});

test('registration redirects preserve the active locale', () => {
  const onboarding = read('assets/onboarding.js');
  assert.match(onboarding, /NAHWERKLocale\?\.href\("erster-schritt\.html"\)/);
  assert.match(onboarding, /NAHWERKLocale\?\.href\("anmelden\.html"\)/);
});
