import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const html=fs.readFileSync("de/index.html","utf8");
const css=fs.readFileSync("assets/stewaro-home-de-base-1.css","utf8");
const js=fs.readFileSync("assets/stewaro-home-de.js","utf8");

test("German STEWARO homepage exposes login and an accessible mobile menu",()=>{
  assert.match(html,/class="header-login" href="\/anmelden">Anmelden<\/a>/);
  assert.match(html,/class="header-menu-toggle"[^>]*aria-expanded="false"[^>]*aria-controls="stewaro-mobile-menu"/);
  assert.match(html,/id="stewaro-mobile-menu" hidden/);
  assert.match(html,/class="mobile-menu-login" href="\/anmelden"/);
  for(const route of ["/pakete","/safety","/kontakt"]) assert.match(html,new RegExp(`href="${route}"`));
});

test("mobile navigation keeps CTA and hamburger visible while compacting the logo",()=>{
  assert.match(css,/@media \(max-width: 980px\)[\s\S]*?\.header-menu-toggle \{ display:inline-flex/);
  assert.match(css,/@media \(max-width: 980px\)[\s\S]*?\.header-nav a:not\(\.header-cta\) \{ display:none/);
  assert.match(css,/@media \(max-width: 600px\)[\s\S]*?\.brand-word \{ width:112px/);
  assert.match(css,/\.mobile-menu\[hidden\]\{display:none!important\}/);
});

test("mobile menu behavior is keyboard-safe and closes predictably",()=>{
  assert.match(js,/const setMobileMenu = \(open\) =>/);
  assert.match(js,/setAttribute\('aria-expanded', String\(next\)\)/);
  assert.match(js,/event\.key === 'Escape'/);
  assert.match(js,/if \(event\.target\.closest\('a'\)\) setMobileMenu\(false\)/);
  assert.match(js,/window\.innerWidth > 980/);
});

test("homepage cache-busts changed mobile navigation assets",()=>{
  assert.match(html,/stewaro-home-de-base-1\.css\?v=2/);
  assert.match(html,/stewaro-home-de\.js\?v=2/);
});
