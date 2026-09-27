import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

test("STEWARO shared-base brand shell is wired without forking runtime", () => {
  const siteCss = read("assets/site.css");
  const shellCss = read("assets/stewaro-brand-shell.css");
  const siteUi = read("assets/site-ui.js");
  const home = read("de/index.html");
  const matrix = read("docs/STEWARO-MIGRATION-MATRIX-20260927.md");

  assert.match(siteCss, /stewaro-brand-shell\.css/);
  assert.match(shellCss, /logos\/stewaro-mark\.svg/);
  assert.match(shellCss, /content:"STEWARO"/);
  assert.match(siteUi, /STEWARO_SHARED_BASE_BRAND_ADAPTER_V1/);
  assert.match(siteUi, /Presentation-only migration layer/);
  assert.match(siteUi, /normalizeNavPath/);
  assert.match(siteUi, /\["\/safety", "Sicherheit"\]/);
  assert.match(siteUi, /\["\/pakete", "Preise"\]/);
  assert.match(siteUi, /\["\/angehoerige", "Für Angehörige"\]/);

  assert.match(home, /<title>STEWARO — Persönlicher Concierge<\/title>/);
  assert.match(home, /Jemand, der sich kümmert\./);
  assert.match(home, /Ihr persönlicher Concierge für Alltag, Organisation und alles, was erledigt werden muss\./);
  assert.match(home, /Unterstützt durch moderne KI\./);
  assert.match(home, /<video class="hero-image hero-video" autoplay muted loop playsinline preload="metadata"/);
  assert.match(home, /<source src="\/assets\/media\/stewaro-hero-pferd\.mp4" type="video\/mp4"/);
  assert.match(home, /poster="data:image\/webp;base64,/);
  assert.doesNotMatch(home, /<img class="hero-image"/);
  assert.match(home, /prefers-reduced-motion: reduce/);
  assert.match(home, /heroVideo\.pause\(\)/);
  const heroVideo = fs.statSync("assets/media/stewaro-hero-pferd.mp4");
  assert.ok(heroVideo.size > 100_000 && heroVideo.size < 600_000, "hero video must stay web-optimized");

  assert.match(matrix, /stewaro-site\/.*frozen/i);
  assert.match(matrix, /existing production website\/customer-account/i);

  // Legacy runtime identifiers must remain available during the migration.
  assert.match(siteUi, /nw_portal_theme_v1/);
});

test("production domain configuration is untouched by brand-shell block", () => {
  const cname = read("CNAME");
  assert.equal(cname.trim(), "nahwerkconcierge.com");
  assert.doesNotMatch(read("assets/stewaro-brand-shell.css"), /CNAME|DNS|nameserver/i);
});

test("changed clean routes remain exact mirrors of their canonical pages", () => {
  for (const name of [
    "anmelden","registrieren","konto","web-concierge","safety","pakete","payg",
    "telefonannahme","angehoerige","leistungen","ablauf","faq","kontakt","concierge-anpassen"
  ]) {
    const canonical = read(`${name}.html`);
    const clean = read(`${name}/index.html`).replace('<head><base href="/">','<head>');
    assert.equal(clean, canonical, `${name} clean route diverged`);
  }
});


test("migrated STEWARO surfaces have no static visible NAHWERK branding", () => {
  const pages = [
    "anmelden.html","registrieren.html","konto.html","web-concierge.html","safety.html",
    "pakete.html","payg.html","telefonannahme.html","angehoerige.html","leistungen.html",
    "ablauf.html","faq.html","kontakt.html","concierge-anpassen.html","de/index.html",
    "email-concierge.html"
  ];
  for (const page of pages) {
    const source = read(page)
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<!--([\s\S]*?)-->/g, " ")
      .replace(/<[^>]+>/g, " ");
    assert.doesNotMatch(source, /NAHWERK|Nahwerk/, `${page} exposes legacy branding in static visible content`);
  }
});
