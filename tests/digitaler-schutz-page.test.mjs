import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');
const page = read('digitaler-schutz.html');
const mirror = read('digitaler-schutz/index.html');
const css = read('assets/digitaler-schutz.css');
const js = read('assets/digitaler-schutz.js');

test('clean route mirror only adds base href', () => {
  const normalized = mirror.replace('<head><base href="/">', '<head>');
  assert.equal(normalized, page);
});

test('all eight canonical scenes are present', () => {
  const scenes = [...page.matchAll(/data-ds-overlay="(\d)"/g)].map((m) => Number(m[1]));
  assert.deepEqual(scenes, [0,1,2,3,4,5,6,7]);
  assert.match(page, /Verdächtiger Link blockiert\./);
  assert.match(page, /FIDEL passt mit auf\./);
  assert.match(page, /Keine Nachrichteninhalte wurden geteilt\./);
});

test('approved live-action media IDs are wired', () => {
  for (const id of [
    '99f251fd-ffa4-4c0a-ad86-fc39bf0dfe84',
    '1d420177-9f40-40a9-ac27-23207996053a',
    '4ba12ffb-54eb-4304-bbe6-c2507e3ad4c2',
    '1f16f1f5-4b44-47ba-ad7b-7c5a486618e3',
    'dda81b2a-84b7-4c6b-80ef-eddac4cade49'
  ]) assert.match(page, new RegExp(id));
});

test('video is muted, inline and never autoplay', () => {
  assert.doesNotMatch(page, /\bautoplay\b/i);
  const videos = [...page.matchAll(/<video\b[^>]*>/g)].map((m) => m[0]);
  assert.equal(videos.length, 5);
  for (const tag of videos) {
    assert.match(tag, /\bmuted\b/);
    assert.match(tag, /\bplaysinline\b/);
  }
});

test('reduced-motion fallback and responsive mobile flow exist', () => {
  assert.match(css, /prefers-reduced-motion\s*:\s*reduce/);
  assert.match(css, /@media\s*\(max-width:900px\)/);
  assert.match(page, /class="ds-mobile-flow"/);
});

test('scroll ranges match canonical scene map', () => {
  for (const pair of ['[0.00, 0.12]','[0.12, 0.25]','[0.25, 0.36]','[0.36, 0.48]','[0.48, 0.60]','[0.60, 0.73]','[0.73, 0.86]','[0.86, 1.00]']) {
    assert.ok(js.includes(pair), 'missing range ' + pair);
  }
});


test('app surfaces are clean code-rendered replicas of the approved UI', () => {
  assert.doesNotMatch(page, /d2ol7oe51mr4n9\.cloudfront\.net/);
  assert.match(page, /Schutz einrichten/);
  assert.match(page, /Lege fest, wie STEWARO verdächtige Links prüft und wie FIDEL dich informiert\./);
  assert.match(page, /Prüfen, blockieren und verständlich informieren\./);
  assert.match(page, /Schutz aktivieren/);
  assert.match(page, /Dein Schutz/);
  assert.match(page, /Schutz ist aktiv/);
  assert.match(page, /STEWARO prüft im Hintergrund\. FIDEL erklärt dir, wenn etwas wichtig ist\./);
  assert.match(page, /STEWARO hat den verdächtigen Link blockiert\./);
  assert.match(page, /Die Nachricht wurde geprüft\. Der Link war auffällig und wurde vorsorglich nicht geöffnet\./);
  assert.match(page, /Ich habe die Nachricht geprüft\. Wenn du möchtest, erkläre ich dir, was daran auffällig war\./);
  assert.match(page, /Verstanden/);
  assert.match(css, /\.ds-app-shell/);
});

test('story copy does not contradict the setup screen', () => {
  const sceneOne = page.match(/data-ds-overlay="0"[\s\S]*?data-ds-overlay="1"/)?.[0] || '';
  assert.match(sceneOne, /Einrichtung/);
  assert.doesNotMatch(sceneOne, /ds-status-pill">Aktiv/);
});

test('privacy notification stays hidden until its second phase', () => {
  assert.match(css, /\.ds-consent-card,\.ds-notification-card\{[^}]*opacity:0/);
  assert.match(css, /\.ds-privacy-line\{[^}]*opacity:0/);
  assert.match(css, /data-phase="2"[^}]*\.ds-notification-card/);
});


test('website narrative matches app role language', () => {
  assert.match(page, /STEWARO prüft verdächtige Links im Hintergrund\. FIDEL erklärt, wenn etwas wichtig ist/);
  assert.match(page, /STEWARO hat den verdächtigen Link vorsorglich blockiert\./);
  assert.match(page, /STEWARO prüft\. Leise\./);
  assert.match(page, /FIDEL erklärt nur, wenn etwas wichtig ist\./);
  assert.doesNotMatch(page, /FIDEL hat die Seite vorsorglich gestoppt/);
  assert.doesNotMatch(page, /FIDEL prüft verdächtige Links, bevor etwas passieren kann/);
});

test('mobile story suppresses the global floating concierge to protect the UI', () => {
  assert.match(css, /\.ds-page \.nw-floating-concierge\{display:none!important\}/);
});
