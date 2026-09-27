import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const excludedPrefixes = ["stewaro-site/","orfidel-preview/","tests/","oauth/"];
const excludedExact = new Set([]);
const walk = (dir) => fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry => {
  const full = path.join(dir,entry.name);
  if(entry.isDirectory()) return walk(full);
  return [path.relative(root,full).replaceAll("\\","/")];
});
const customerHtml = walk(root)
  .filter(file => file.endsWith(".html"))
  .filter(file => !excludedPrefixes.some(prefix => file.startsWith(prefix)))
  .filter(file => !excludedExact.has(file));

const loadsUnified = (file,html) =>
  /stewaro-unified\.css|stewaro-account-entry\.css|assets\/site\.css|assets\/brand-2026\.css|assets\/clean-url\.js|assets\/site-ui\.js/.test(html) ||
  (file === "de/index.html" && /stewaro-precision-fullbleed-v1|brand-word/.test(html));

test("every customer-facing HTML route receives the STEWARO design system", () => {
  const missing = customerHtml.filter(file => !loadsUnified(file,fs.readFileSync(file,"utf8")));
  assert.deepEqual(missing, [], "Pages without STEWARO shared design: " + missing.join(", "));
});

test("registration and concierge settings no longer ship photo sliders", () => {
  for(const file of ["registrieren.html","registrieren/index.html","concierge-anpassen.html","concierge-anpassen/index.html"]){
    const html=fs.readFileSync(file,"utf8");
    assert.doesNotMatch(html,/<(?:div|section)[^>]+data-concierge-carousel|<link[^>]+concierge-carousel\.css|<script[^>]+concierge-carousel\.js|<script[^>]+auth-slider-i18n\.js/);
    assert.match(html,/stewaro-fixed-concierge-card/);
    assert.match(html,/name="conciergeChoice" value="fidel"/);
  }
});

test("shared STEWARO stylesheet suppresses legacy public photo carousels", () => {
  const css=fs.readFileSync("assets/stewaro-unified.css","utf8");
  assert.match(css,/No photo sliders\/carousels in the STEWARO customer experience/);
  assert.match(css,/\.prime-hero-carousel/);
  assert.match(css,/\[data-concierge-carousel\]/);
  assert.match(css,/display:none!important/);
});

test("shared first-paint styles import STEWARO unified design", () => {
  const site=fs.readFileSync("assets/site.css","utf8");
  const brand=fs.readFileSync("assets/brand-2026.css","utf8");
  assert.match(site,/stewaro-unified\.css\?v=20260928-3/);
  assert.match(brand,/stewaro-unified\.css\?v=20260928-3/);
});
