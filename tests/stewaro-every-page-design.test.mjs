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
  (["de/index.html","en/index.html","tr/index.html"].includes(file) && /stewaro-precision-fullbleed-v1|brand-word/.test(html));

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


test("migrated residual public routes expose STEWARO instead of legacy brand copy", () => {
  const pages = [
    "404.html",
    "zugang-uebertragen.html","zugang-uebertragen/index.html",
    "erster-schritt.html","erster-schritt/index.html",
    "passwort-zuruecksetzen.html","passwort-zuruecksetzen/index.html",
    "vertrag-widerrufen.html","vertrag-widerrufen/index.html",
    "alltag-organisieren.html","alltag-organisieren/index.html",
    "dokumente-verstehen.html","dokumente-verstehen/index.html",
    "technik-verstehen.html","technik-verstehen/index.html",
    "prime-concierge.html","prime-concierge/index.html",
    "senioren-concierge.html","senioren-concierge/index.html",
    "ueber-mich.html","ueber-mich/index.html",
  ];
  for (const file of pages) {
    const visible = fs.readFileSync(file,"utf8")
      .replace(/<script[\s\S]*?<\/script>/gi," ")
      .replace(/<style[\s\S]*?<\/style>/gi," ")
      .replace(/<!--([\s\S]*?)-->/g," ")
      .replace(/https:\/\/nahwerkconcierge\.com/gi," ")
      .replace(/assets\/nahwerk-[^"'\s>]*/gi," ")
      .replace(/<[^>]+>/g," ");
    assert.doesNotMatch(visible, /NAHWERK|Nahwerk/, `${file} exposes legacy public branding`);
    assert.match(fs.readFileSync(file,"utf8"), /STEWARO/);
  }
});


test("international concierge route is intentionally absent from STEWARO launch", () => {
  for (const file of [
    "concierges.html","concierges/index.html",
    "en/concierges.html","en/concierges/index.html",
    "tr/concierges.html","tr/concierges/index.html"
  ]) {
    assert.equal(fs.existsSync(file), false, file + " must stay absent until international scope is approved");
  }
  const sitemap=fs.readFileSync("sitemap.xml","utf8");
  assert.doesNotMatch(sitemap,/\/concierges(?:<|")/);
  const css=fs.readFileSync("assets/stewaro-unified.css","utf8");
  assert.match(css,/a\[href="\/concierges"\]/);
});

test("STEWARO senior and about surfaces keep FIDEL as the single concierge identity", () => {
  for (const file of ["senioren-concierge.html","senioren-concierge/index.html","ueber-mich.html","ueber-mich/index.html"]) {
    const html=fs.readFileSync(file,"utf8");
    const visible=html
      .replace(/<script[\s\S]*?<\/script>/gi," ")
      .replace(/<style[\s\S]*?<\/style>/gi," ")
      .replace(/<[^>]+>/g," ");
    assert.match(visible,/STEWARO/);
    assert.match(visible,/FIDEL/);
    assert.doesNotMatch(visible,/NAHWERK|Nahwerk|Hartmut|Alexander|Nilo|Mira|ODYSX/);
  }
});


test("Gate 1 keeps public STEWARO identity on FIDEL and Klienten terminology", () => {
  const registration=fs.readFileSync("registrieren.html","utf8");
  assert.match(registration,/Ich bin FIDEL/);
  assert.doesNotMatch(registration,/Ich bin Lena oder Mira/);

  const account=fs.readFileSync("konto.html","utf8");
  assert.match(account,/Klientenbereich/);
  assert.match(account,/FIDEL · Stimme Konrad/);
  assert.match(account,/FIDEL · Stimme Alexander/);
  assert.doesNotMatch(account,/const conciergeNames = \{ nilo: "Nilo"/);

  for (const file of ["email-concierge.html","payg.html"]) {
    assert.doesNotMatch(fs.readFileSync(file,"utf8"),/Kundenkonto/);
  }
  for (const file of ["safety.html","concierge-anpassen.html","kontakt.html"]) {
    assert.doesNotMatch(fs.readFileSync(file,"utf8"),/Kundenbereich/);
  }
  assert.doesNotMatch(fs.readFileSync("kontakt.html","utf8"),/Kundenservice|Bestehende Kunden|bereits Kunde/);

  const phone=fs.readFileSync("telefonannahme.html","utf8");
  assert.match(phone,/FIDEL am Telefon/);
  assert.match(phone,/FIDEL Stimme/);
  assert.doesNotMatch(phone,/Deine Telefonagenten|Wähle die Persönlichkeit/);

  const web=fs.readFileSync("web-concierge.html","utf8");
  assert.match(web,/<title>FIDEL \| STEWARO<\/title>/);
  assert.match(web,/id="webConciergeTitle">FIDEL</);
  assert.match(web,/data-fidel-orb/);

  const app=fs.readFileSync("app-live.html","utf8");
  assert.match(app,/<title>FIDEL Live \| STEWARO<\/title>/);
  assert.match(app,/FIDEL wird vorbereitet/);

  for (const file of ["senioren-concierge.html","prime-concierge.html"]) {
    assert.match(fs.readFileSync(file,"utf8"),/stewaro-icon\.svg/);
    assert.doesNotMatch(fs.readFileSync(file,"utf8"),/nahwerk-concierge-gold-transparent\.svg/);
  }

  for (const file of ["en/senioren-concierge.html","tr/senioren-concierge.html"]) {
    const visible=fs.readFileSync(file,"utf8")
      .replace(/<script[\s\S]*?<\/script>/gi," ")
      .replace(/<style[\s\S]*?<\/style>/gi," ")
      .replace(/<[^>]+>/g," ");
    assert.match(visible,/FIDEL/);
    assert.doesNotMatch(visible,/NAHWERK|Hartmut|Alexander/);
  }
});
