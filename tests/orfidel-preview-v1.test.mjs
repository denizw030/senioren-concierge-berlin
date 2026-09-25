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
  assert.match(page,/\/assets\/orfidel-preview\.css\?v=4/);
  assert.match(page,/\/assets\/orfidel-preview\.js\?v=4/);
  assert.doesNotMatch(page,/NAHWERK/i);
});

test("official ORFIDEL SVG assets remain the brand authority",()=>{
  assert.match(page,/\/assets\/logos\/orfidel-wordmark-white\.svg/);
  assert.match(page,/\/assets\/logos\/orfidel-crown-white\.svg/);
  assert.match(wordmark,/<path /);
  assert.match(crown,/<path /);
  assert.doesNotMatch(crown,/<rect/i);
});

test("V4 loads the cinematic motion stack",()=>{
  assert.match(page,/gsap@3\.13\.0\/dist\/gsap\.min\.js/);
  assert.match(page,/gsap@3\.13\.0\/dist\/ScrollTrigger\.min\.js/);
  assert.match(page,/lenis@1\.3\.11\/dist\/lenis\.min\.js/);
  assert.match(js,/three@0\.180\.0\/build\/three\.module\.js/);
  assert.match(js,/gsap\.registerPlugin\(ScrollTrigger\)/);
  assert.match(js,/new window\.Lenis/);
  assert.match(js,/new THREE\.WebGLRenderer/);
});

test("hero is a scroll-driven brand sequence instead of a static landing hero",()=>{
  assert.match(page,/data-hero-cinema/);
  assert.match(page,/id="fidel-canvas"/);
  assert.match(page,/data-hero-logo/);
  assert.match(page,/data-hero-crown/);
  assert.match(page,/data-hero-copy/);
  assert.match(js,/trigger: hero/);
  assert.match(js,/heroLogo/);
  assert.match(js,/heroCrown/);
  assert.match(js,/heroCopy/);
});

test("request-to-result story is a five-scene cinematic sequence",()=>{
  assert.match(page,/data-story/);
  assert.equal((page.match(/data-story-scene="/g)||[]).length,5);
  assert.match(page,/DU SAGST ES/);
  assert.match(page,/FIDEL VERSTEHT/);
  assert.match(page,/FIDEL HANDELT/);
  assert.match(page,/FIDEL BLEIBT DRAN/);
  assert.match(page,/ERLEDIGT/);
  assert.match(js,/activateScene/);
  assert.match(js,/storyProgress/);
});

test("capabilities use horizontal scroll choreography",()=>{
  assert.match(page,/data-work/);
  assert.match(page,/data-work-track/);
  assert.equal((page.match(/class="work-card"/g)||[]).length,5);
  assert.match(js,/workTrack\.scrollWidth/);
  assert.match(js,/gsap\.to\(workTrack/);
  assert.match(css,/\.work-track/);
});

test("cross-channel section is animated around one shared Fidel core",()=>{
  assert.match(page,/EIN FIDEL\. ÜBERALL\./);
  assert.equal((page.match(/class="channel-node /g)||[]).length,5);
  assert.match(js,/channels\.querySelectorAll\("\.channel-node"\)/);
  assert.match(js,/channel-core/);
});

test("motion dependencies fail gracefully and reduced motion is supported",()=>{
  assert.match(js,/motion-fallback/);
  assert.match(js,/prefers-reduced-motion: reduce/);
  assert.match(css,/\.motion-fallback/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

test("preview preserves existing product and legal entry routes",()=>{
  assert.match(page,/href="\/web-concierge"/);
  assert.match(page,/href="\/konto"/);
  assert.match(page,/href="\/impressum"/);
  assert.match(page,/href="\/datenschutz"/);
});

test("approval UI remains demo-only",()=>{
  assert.match(page,/Preview — keine Aktion wird ausgelöst/);
  assert.match(page,/<button type="button">Freigeben<\/button>/);
  assert.doesNotMatch(js,/fetch\(/);
  assert.doesNotMatch(js,/XMLHttpRequest/);
});
