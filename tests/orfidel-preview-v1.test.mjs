import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
const page=read("orfidel-preview/index.html");
const css=read("assets/orfidel-preview.css");
const js=read("assets/orfidel-preview.js");
const wordmark=read("assets/logos/orfidel-wordmark-white.svg");
const crown=read("assets/logos/orfidel-crown-white.svg");

test("preview is isolated and non-indexable",()=>{
  assert.match(page,/meta name="robots" content="noindex,nofollow"/);
  assert.match(page,/\/assets\/orfidel-preview\.css\?v=2/);
  assert.match(page,/\/assets\/orfidel-preview\.js\?v=2/);
  assert.doesNotMatch(page,/NAHWERK/i);
});

test("official ORFIDEL wordmark and transparent crown assets are used",()=>{
  assert.match(page,/\/assets\/logos\/orfidel-wordmark-white\.svg/);
  assert.match(page,/\/assets\/logos\/orfidel-crown-white\.svg/);
  assert.match(wordmark,/<path /);
  assert.match(crown,/<path /);
  assert.doesNotMatch(wordmark,/<rect[^>]+fill=["']#?0{3,6}/i);
  assert.doesNotMatch(crown,/<rect/i);
});

test("ORFIDEL positioning and Fidel product story are present",()=>{
  assert.match(page,/Fidel\.\s*<span>Dein persönlicher/);
  assert.match(page,/Sag es Fidel\. Er kümmert sich darum\./);
  assert.match(page,/Verstehen → Handeln → Dranbleiben → Erledigt/);
  assert.match(page,/Du brauchst keinen weiteren Chat/);
  assert.match(page,/Du brauchst Fidel/);
});

test("preview preserves existing product entry routes",()=>{
  assert.match(page,/href="\/web-concierge"/);
  assert.match(page,/href="\/konto"/);
  assert.match(page,/href="\/impressum"/);
  assert.match(page,/href="\/datenschutz"/);
});

test("V2 adds a pinned five-scene cinematic journey",()=>{
  assert.match(page,/data-cinematic/);
  assert.equal((page.match(/data-journey-scene=/g)||[]).length,5);
  assert.match(page,/journey-action--search/);
  assert.match(page,/journey-action--mail/);
  assert.match(page,/journey-action--call/);
  assert.match(page,/journey-action--done/);
  assert.match(css,/\.cinematic-journey/);
  assert.match(css,/position:sticky/);
  assert.match(css,/--journey/);
  assert.match(js,/cinematic\.dataset\.scene/);
  assert.match(js,/journeyScenes\.forEach/);
});

test("cinematic motion includes ambient background, pointer depth and scroll choreography",()=>{
  assert.match(page,/id="ambient-field"/);
  assert.match(page,/data-fidel-surface/);
  assert.match(page,/data-workflow/);
  assert.match(page,/data-page-progress/);
  assert.match(js,/requestAnimationFrame\(draw\)/);
  assert.match(js,/IntersectionObserver/);
  assert.match(js,/--hero-progress/);
  assert.match(js,/--workflow-progress/);
  assert.match(js,/--channels-progress/);
  assert.match(js,/--finale-progress/);
  assert.match(js,/pointermove/);
  assert.match(css,/@keyframes surfaceSweep/);
  assert.match(css,/@keyframes orbitSpin/);
});

test("reduced-motion accessibility is explicitly supported",()=>{
  assert.match(js,/prefers-reduced-motion: reduce/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/\.journey-spacer\{display:none\}/);
});

test("preview is responsive for tablet and mobile",()=>{
  assert.match(css,/@media\(max-width:1050px\)/);
  assert.match(css,/@media\(max-width:720px\)/);
  assert.match(page,/meta name="viewport"/);
});

test("approval UI is demo-only and cannot trigger execution",()=>{
  assert.match(page,/Preview — keine Aktion wird ausgelöst/);
  assert.match(page,/<button type="button">Freigeben<\/button>/);
  assert.doesNotMatch(js,/fetch\(/);
  assert.doesNotMatch(js,/XMLHttpRequest/);
});
