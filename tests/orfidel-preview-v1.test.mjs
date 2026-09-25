import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
const page=read("orfidel-preview/index.html");
const css=read("assets/orfidel-preview.css");
const js=read("assets/orfidel-preview.js");

test("preview is isolated and non-indexable",()=>{
  assert.match(page,/meta name="robots" content="noindex,nofollow"/);
  assert.match(page,/\/assets\/orfidel-preview\.css/);
  assert.match(page,/\/assets\/orfidel-preview\.js/);
  assert.doesNotMatch(page,/NAHWERK/i);
});

test("ORFIDEL positioning and Fidel product story are present",()=>{
  assert.match(page,/Fidel\.\s*<span>Dein persönlicher/);
  assert.match(page,/Sag es Fidel\. Er kümmert sich darum\./);
  assert.match(page,/Verstehen → Handeln → Dranbleiben → Erledigt/);
  assert.match(page,/Du brauchst keine weitere App/);
  assert.match(page,/Du brauchst jemanden, der es erledigt/);
});

test("preview preserves existing product entry routes",()=>{
  assert.match(page,/href="\/web-concierge"/);
  assert.match(page,/href="\/konto"/);
  assert.match(page,/href="\/impressum"/);
  assert.match(page,/href="\/datenschutz"/);
});

test("cinematic motion includes ambient background, pointer depth and scroll workflow",()=>{
  assert.match(page,/id="ambient-field"/);
  assert.match(page,/data-fidel-surface/);
  assert.match(page,/data-workflow/);
  assert.match(js,/requestAnimationFrame\(draw\)/);
  assert.match(js,/IntersectionObserver/);
  assert.match(js,/--workflow-progress/);
  assert.match(js,/pointermove/);
  assert.match(css,/@keyframes surfaceSweep/);
  assert.match(css,/@keyframes orbitSpin/);
});

test("reduced-motion accessibility is explicitly supported",()=>{
  assert.match(js,/prefers-reduced-motion: reduce/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
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
