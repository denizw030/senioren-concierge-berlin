import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
const page=read("orfidel-preview/index.html");
const css=read("assets/orfidel-preview.css");
const js=read("assets/orfidel-preview.js");
const wordmark=read("assets/logos/orfidel-wordmark-white.svg");
const crown=read("assets/logos/orfidel-crown-white.svg");

test("preview stays isolated and non-indexable",()=>{
  assert.match(page,/meta name="robots" content="noindex,nofollow"/);
  assert.match(page,/\/assets\/orfidel-preview\.css\?v=3/);
  assert.match(page,/\/assets\/orfidel-preview\.js\?v=3/);
  assert.doesNotMatch(page,/NAHWERK/i);
});

test("official ORFIDEL SVG assets are used throughout the preview",()=>{
  assert.match(page,/\/assets\/logos\/orfidel-wordmark-white\.svg/);
  assert.match(page,/\/assets\/logos\/orfidel-crown-white\.svg/);
  assert.match(wordmark,/<path /);
  assert.match(crown,/<path /);
  assert.doesNotMatch(crown,/<rect/i);
});

test("V3 uses a minimal editorial black-white visual system",()=>{
  assert.match(css,/--bg:#000/);
  assert.match(css,/--fg:#f5f5f3/);
  assert.doesNotMatch(page,/ambient-field/);
  assert.doesNotMatch(page,/journey-grid/);
  assert.doesNotMatch(page,/fidel-surface/);
  assert.doesNotMatch(css,/particle/i);
});

test("ORFIDEL product story is reduced to a few strong statements",()=>{
  assert.match(page,/Sag es Fidel\. Er kümmert sich darum\./);
  assert.match(page,/Eine KI, die <em>etwas tut\.<\/em>/);
  assert.match(page,/Nicht nur eine Antwort\. Ein Ergebnis\./);
  assert.match(page,/Du brauchst keinen weiteren Chat/);
  assert.match(page,/Du brauchst Fidel/);
});

test("four-scene pinned sequence drives request to result",()=>{
  assert.match(page,/data-sequence/);
  assert.equal((page.match(/data-scene="/g)||[]).length,4);
  assert.match(page,/DU SAGST ES/);
  assert.match(page,/FIDEL VERSTEHT/);
  assert.match(page,/FIDEL HANDELT/);
  assert.match(page,/ERLEDIGT/);
  assert.match(css,/\.sequence-sticky/);
  assert.match(css,/position:sticky/);
  assert.match(js,/scenes\.forEach/);
  assert.match(js,/data-sequence-counter/);
});

test("preview preserves existing product entry routes",()=>{
  assert.match(page,/href="\/web-concierge"/);
  assert.match(page,/href="\/konto"/);
  assert.match(page,/href="\/impressum"/);
  assert.match(page,/href="\/datenschutz"/);
});

test("scroll choreography stays simple and dependency-free",()=>{
  assert.match(js,/requestAnimationFrame\(update\)/);
  assert.match(js,/--hero-p/);
  assert.match(js,/--manifesto-p/);
  assert.match(js,/--sequence-p/);
  assert.match(js,/--channels-p/);
  assert.doesNotMatch(js,/fetch\(/);
  assert.doesNotMatch(js,/XMLHttpRequest/);
  assert.doesNotMatch(js,/canvas/i);
});

test("preview is responsive and reduced-motion aware",()=>{
  assert.match(css,/@media\(max-width:980px\)/);
  assert.match(css,/@media\(max-width:700px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(js,/prefers-reduced-motion: reduce/);
});

test("approval UI remains demo-only",()=>{
  assert.match(page,/Preview — keine Aktion wird ausgelöst/);
  assert.match(page,/<button type="button">Freigeben<\/button>/);
  assert.doesNotMatch(js,/fetch\(/);
});
