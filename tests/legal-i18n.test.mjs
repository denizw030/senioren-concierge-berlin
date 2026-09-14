import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const legalPages = [
  'impressum.html','datenschutz.html','agb.html','widerruf.html',
  'ki-transparenz.html','datenloeschung.html','vertrag-widerrufen.html'
];

test('legal locale runtime parses and contains complete EN/TR legal surfaces', () => {
  const js = read('assets/legal-i18n.js');
  assert.doesNotThrow(() => new Function(js));
  for (const page of legalPages) {
    const escaped = page.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.ok((js.match(new RegExp(`'${escaped}'`, 'g')) || []).length >= 3, `${page} is not represented across locale routing/content`);
  }
  for (const marker of [
    'Terms and Conditions | NAHWERK Concierge',
    'Privacy Policy | NAHWERK Concierge',
    'Right of Withdrawal | NAHWERK Concierge',
    'AI Transparency | NAHWERK Concierge',
    'Data Deletion | NAHWERK Concierge',
    'Legal Notice | NAHWERK Concierge',
    'Genel Hüküm ve Koşullar | NAHWERK Concierge',
    'Gizlilik Politikası | NAHWERK Concierge',
    'Cayma Hakkı | NAHWERK Concierge',
    'Yapay Zekâ Şeffaflığı | NAHWERK Concierge',
    'Veri Silme | NAHWERK Concierge',
    'Yasal Bildirim | NAHWERK Concierge'
  ]) assert.ok(js.includes(marker), `missing locale marker: ${marker}`);
});

test('every legal page boots locale before paint and loads all locale runtimes', () => {
  for (const page of legalPages) {
    const html = read(page);
    assert.match(html, /\/assets\/locale-boot\.js\?v=1/, `${page} missing locale boot`);
    assert.match(html, /\/assets\/legal-i18n\.js\?v=1/, `${page} missing legal locale runtime`);
    assert.match(html, /\/assets\/auth-i18n\.js\?v=3/, `${page} missing shared locale routing`);
    assert.match(html, /\/assets\/app-language-switcher\.js\?v=3/, `${page} missing persistent language selector`);
  }
  const withdrawal = read('vertrag-widerrufen.html');
  assert.ok(withdrawal.indexOf('/assets/legal-i18n.js?v=1') < withdrawal.indexOf('assets/electronic-withdrawal.js?v=1'), 'withdrawal localization must run before form runtime binds');
});

test('registration legal links are recognized as locale-preserving query pages', () => {
  const registration = read('registrieren.html');
  for (const target of ['datenschutz.html','agb.html','ki-transparenz.html']) {
    assert.ok(registration.includes(`href="${target}"`), `registration missing ${target}`);
  }
  const auth = read('assets/auth-i18n.js');
  for (const target of legalPages) assert.ok(auth.includes(`'${target}'`), `auth locale router missing ${target}`);
  assert.match(auth, /url\.searchParams\.set\('lang', targetLang\)/);
  assert.match(auth, /document\.querySelectorAll\('a\[href\]'\)/);
});

test('legal pages expose DE EN TR switcher coverage', () => {
  const switcher = read('assets/app-language-switcher.js');
  for (const page of legalPages) assert.ok(switcher.includes(`'${page}'`), `language switcher missing ${page}`);
  assert.match(switcher, /en:\s*\{\s*code:\s*'EN'/);
  assert.match(switcher, /tr:\s*\{\s*code:\s*'TR'/);
});

test('localized legal links stay in the selected language', () => {
  const js = read('assets/legal-i18n.js');
  assert.match(js, /url\.searchParams\.set\('lang', lang\)/);
  assert.ok(js.includes("`/${lang}/${target}`"));
  assert.ok(js.includes("'datenschutz.html','agb.html','widerruf.html','ki-transparenz.html'"));
});
