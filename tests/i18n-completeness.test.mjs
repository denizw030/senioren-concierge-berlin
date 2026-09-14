import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const publicPages = [
  'index.html','prime-concierge.html','safety.html','angehoerige.html','telefonannahme.html',
  'pakete.html','leistungen.html','ablauf.html','faq.html','kontakt.html','concierges.html',
  'senioren-concierge.html','alltag-organisieren.html','dokumente-verstehen.html',
  'technik-verstehen.html','ueber-mich.html'
];
// Only pages that are currently wired to the shared auth locale runtime belong in
// this strict catalog-completeness guard. Account/PAYG/customer tools have their
// own rollout and must not block a public index copy edit from being mirrored.
const authPages = ['registrieren.html','anmelden.html','erster-schritt.html'];

const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const clean = (value) => String(value || '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

function bodyHtml(html) {
  const match = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  return match ? match[1] : html;
}

function visibleValues(html) {
  let body = bodyHtml(html)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|noscript|template|svg)\b[\s\S]*?<\/\1\s*>/gi, '');
  const values = new Set();
  for (const match of body.matchAll(/>([^<>]+)</g)) {
    const value = clean(match[1]);
    if (value && /[A-Za-zÄÖÜäöüßÀ-ÿ]/.test(value)) values.add(value);
  }
  for (const match of body.matchAll(/\b(?:aria-label|title|placeholder|alt)=["']([^"']+)["']/gi)) {
    const value = clean(match[1]);
    if (value && /[A-Za-zÄÖÜäöüßÀ-ÿ]/.test(value)) values.add(value);
  }
  return values;
}

const germanWord = /\b(?:eine|einer|einem|einen|der|die|das|den|dem|des|und|oder|aber|für|mit|von|ohne|über|unter|bei|wenn|dass|damit|wird|werden|ist|sind|kann|können|soll|sollen|muss|müssen|nicht|noch|auch|dein|deine|deiner|du|Sie|Ihr|Ihre|ihnen|ihre|Menschen|Unterstützung|Registrieren|Anmelden|Leistungen|Datenschutz|Impressum|Pakete|Zugang|auswählen|Hörprobe|Sprache|Stimme|erklärt|einrichten|persönlich|Persönlicher|Senioren|Angehörige|Kundenkonto|Abmelden|Menü|Passwort|zurücksetzen|Speichern|Ändern|Aufladen|Guthaben|Nutzung|Einstellungen|Nachricht|Senden|Aufgabe|Concierge wechseln|Telefonnummer|E-Mail|Bestätigen|Weiter|Zurück)\b/i;
const germanish = (value) => /[äöüßÄÖÜ]/.test(value) || germanWord.test(value);

const allowedShared = new Set([
  'NAHWERK','NAHWERK Concierge','NAHWERK Safety','NAHWERK Safety Check','NAHWERK Family',
  'WhatsApp','Family','Safety','FREE','STANDARD','PLUS','PREMIUM','PREMIUM PLUS','FAMILY','FAQ','ODYSX',
  'Lena','James','Konrad','Alexander','Luisa','Leyla','Martin','Nilo','Mira','Hartmut','Sarah','Camila',
  'Eleni','Zofia','Mei','Yuna','Amara','Emily','David','Arthur','Kenji','Sofia','Isabella','Fatima','Ana','Giulia','Malik','Lukas',
  'PayPal','Visa','Mastercard','Stripe','Uber','Berlin','Europe/Berlin','DE','EN','TR','EUR','GPT','AI','112'
]);

function loadAuthCatalog(lang) {
  const merged = {};
  for (let i = 1; i <= 4; i++) Object.assign(merged, JSON.parse(read(`locales/${lang}-auth${i}.json`)));
  return merged;
}

for (const lang of ['en','tr']) {
  test(`${lang}: all 16 public pages contain no unchanged German visible copy`, () => {
    const leaks = [];
    for (const page of publicPages) {
      const source = visibleValues(read(page));
      const localized = visibleValues(read(`${lang}/${page}`));
      for (const value of source) {
        if (!localized.has(value)) continue;
        if (allowedShared.has(value)) continue;
        if (!germanish(value)) continue;
        leaks.push(`${page}: ${value}`);
      }
    }
    assert.deepEqual(leaks, [], `${lang.toUpperCase()} unchanged German copy:\n${leaks.join('\n')}`);
  });

  test(`${lang}: localized auth entry pages have catalog coverage for visible German copy`, () => {
    const catalog = loadAuthCatalog(lang);
    const missing = [];
    for (const page of authPages) {
      for (const value of visibleValues(read(page))) {
        if (allowedShared.has(value)) continue;
        if (!germanish(value)) continue;
        if (Object.hasOwn(catalog, value)) continue;
        missing.push(`${page}: ${value}`);
      }
    }
    assert.deepEqual(missing, [], `${lang.toUpperCase()} auth entry catalog gaps:\n${missing.join('\n')}`);
  });
}

test('every localized public page loads the shared runtime locale repair', () => {
  for (const lang of ['en','tr']) {
    for (const page of publicPages) {
      assert.match(read(`${lang}/${page}`), /assets\/locale-runtime\.js\?v=\d+/, `${lang}/${page} missing locale-runtime.js`);
    }
  }
});

test('localized auth entry pages load localization runtime and locale boot', () => {
  for (const page of authPages) {
    const html = read(page);
    assert.match(html, /assets\/auth-i18n\.js\?v=\d+/, `${page} missing auth-i18n.js`);
    assert.match(html, /assets\/locale-boot\.js\?v=\d+/, `${page} missing locale-boot.js`);
  }
});

test('runtime repair covers dynamic ODYSX, menu and hybrid Concierge welcome copy', () => {
  const runtime = read('assets/locale-runtime.js');
  assert.match(runtime, /\.odysx-info-bar/);
  assert.match(runtime, /Eine Marke von/);
  assert.match(runtime, /Menü öffnen/);
  assert.match(runtime, /Persönlicher Concierge\\'e hoş geldiniz/);
  assert.match(runtime, /Senioren Concierge\\'e hoş geldiniz/);
});
