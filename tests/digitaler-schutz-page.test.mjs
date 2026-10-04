import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');
const page = read('digitaler-schutz.html');
const mirror = read('digitaler-schutz/index.html');
const css = read('assets/digitaler-schutz.css');
const js = read('assets/digitaler-schutz.js');
const logoCss = read('assets/nahwerk-logo-v2.css');

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
  assert.doesNotMatch(page, /ds-app-shell--active/);
  assert.doesNotMatch(page, /Dein Schutz/);
  assert.doesNotMatch(page, /Schutz ist aktiv/);
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


test('remaining scene copy keeps STEWARO as protection layer', () => {
  assert.match(page, /Ingrid tippt einmal gutgläubig auf den Link\. STEWARO prüft im Hintergrund\./);
  assert.match(page, /STEWARO hat heute einen verdächtigen Link für Ingrid blockiert\./);
  assert.doesNotMatch(page, /Ingrid tippt einmal gutgläubig auf den Link\. FIDEL prüft im Hintergrund\./);
  assert.doesNotMatch(page, /FIDEL hat Ingrid heute bei einem verdächtigen Link geschützt\./);
});

test('mobile premium story reuses the persistent canonical film stage', () => {
  assert.doesNotMatch(page, /class="ds-mobile-video"/);
  assert.match(css, /Mobile premium scroll-film/);
  assert.match(css, /height:1080svh/);
  assert.match(css, /\.ds-story \.ds-stage\{position:fixed/);
  assert.match(css, /\.ds-story\.is-mobile-story-past \.ds-stage\{position:absolute/);
  assert.match(css, /\.ds-mobile-flow\{display:none!important\}/);
});

test('mobile scrub caps perceived playback speed', () => {
  assert.match(js, /dt \* 1\.05/);
  assert.match(js, /easedStep = diff \* 0\.18/);
  assert.match(js, /if \(desktop\.matches\)/);
  assert.match(js, /requestAnimationFrame\(flushScrub\)/);
});


test('film opens immediately after header without redundant intro', () => {
  assert.doesNotMatch(page, /class="ds-intro"/);
  assert.match(page, /<main id="main">\s*<section class="ds-story"/);
  assert.match(page, /nahwerk-logo-v2\.css\?v=11/);
  assert.match(page, /digitaler-schutz\.css\?v=6/);
});

test('premium header logo glint is restrained and reduced-motion safe', () => {
  assert.match(logoCss, /STEWARO_PREMIUM_LOGO_GLINT_20261004/);
  assert.match(logoCss, /stewaroLuxuryGlint 8\.4s/);
  assert.match(logoCss, /animation-delay:\.14s/);
  assert.match(logoCss, /@keyframes stewaroLuxuryGlint/);
  assert.match(logoCss, /0%,58%/);
  assert.match(logoCss, /prefers-reduced-motion:reduce/);
});


test('mobile header overlays the opening film without reserving intro space', () => {
  assert.match(css, /\.ds-page \.top\{position:fixed!important/);
  assert.match(css, /\.ds-page #main\{margin:0!important;padding:0!important\}/);
  assert.match(css, /\.ds-story\{margin:0!important;padding:0!important\}/);
});


test('opening head-lift and look-up clip are excluded, quiet approved replacement is bounded', () => {
  assert.doesNotMatch(page, /1d420177-9f40-40a9-ac27-23207996053a/);
  for (const index of [0, 1]) {
    const tag = page.match(new RegExp('<video[^>]*data-ds-media="' + index + '"[^>]*>'))?.[0];
    assert.match(tag, /data-scrub-start="0" data-scrub-end="0.70"/);
  }
  const replacement = page.match(/<video[^>]*data-ds-media="1"[^>]*>/)?.[0];
  assert.match(replacement, /data-replacement="quiet-phone-shot"/);
  assert.match(replacement, /4ba12ffb-54eb-4304-bbe6-c2507e3ad4c2/);
  assert.match(js, /const \[start, end\] = scrubWindow\(activeMedia\)/);
  assert.match(js, /start \+ local \* \(end - start\)/);
});

test('film cannot tint the opaque white header', () => {
  assert.match(css, /html body.story-site.ds-page \.top\{background:#fff!important;background-image:none!important/);
  assert.match(css, /backdrop-filter:none!important;-webkit-backdrop-filter:none!important/);
  assert.match(css, /opacity:1!important;mix-blend-mode:normal!important/);
});

test('logo uses pure alpha shapes and gold from CSS, including the left symbol', () => {
  const wordmark = read('assets/logos/stewaro-wordmark.svg');
  assert.match(wordmark, /fill:\s*#000000/);
  assert.doesNotMatch(wordmark, /linearGradient|stop-color/);
  const active = logoCss.slice(logoCss.indexOf('/* STEWARO_PREMIUM_LOGO_GLINT_20261004'));
  assert.match(active, /mask-mode:alpha!important/);
  assert.match(active, /mask:url\("\/assets\/logos\/stewaro-wordmark\.svg"\)/);
  assert.match(active, /mask:url\("\/assets\/logos\/stewaro-icon\.svg"\)/);
  assert.doesNotMatch(active, /#8f6721|#9b6d20|url\([^)]*\)\s*!important;\s*filter/);
  assert.match(active, /background-position:-120% 50%,50% 50%!important/);
});


test('mobile hamburger stays positioned within the white header, with a white open menu', () => {
  assert.match(css, /ds-page \.top \.nav \.nav-toggle\{position:absolute!important;top:50%!important/);
  assert.match(css, /ds-page \.top \.links\.is-open\{background:#fff!important/);
});
