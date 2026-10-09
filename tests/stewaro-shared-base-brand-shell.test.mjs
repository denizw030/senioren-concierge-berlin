import { homepageSource } from './helpers/homepage-source.mjs';
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

test("STEWARO shared-base brand shell is wired without forking runtime", () => {
  const siteCss = read("assets/site.css");
  const shellCss = read("assets/stewaro-brand-shell.css");
  const siteUi = read("assets/site-ui.js");
  const home = homepageSource("de/index.html");
  const matrix = read("docs/STEWARO-MIGRATION-MATRIX-20260927.md");

  assert.match(siteCss, /stewaro-brand-shell\.css/);
  assert.match(shellCss, /logos\/stewaro-icon\.svg/);
  assert.match(shellCss, /stewaro-wordmark\.svg/);
  assert.match(siteUi, /STEWARO_SHARED_BASE_BRAND_ADAPTER_V1/);
  assert.match(siteUi, /Presentation-only migration layer/);
  assert.match(siteUi, /normalizeNavPath/);
  assert.match(siteUi, /\["\/digitaler-schutz", "Digitaler Schutz"\]/);
  assert.match(siteUi, /\["\/pakete", "Preise"\]/);
  assert.match(siteUi, /\["\/angehoerige", "Für Angehörige"\]/);

  assert.match(home, /<title>STEWARO — Persönlicher Concierge<\/title>/);
  assert.match(home, /Jemand, der sich kümmert\./);
  assert.match(home, /Ihr persönlicher Concierge für Alltag, Organisation und alles, was erledigt werden muss\./);
  assert.match(home, /Unterstützt durch moderne KI\./);
  assert.match(home, /<video class="hero-image hero-video" autoplay muted playsinline preload="auto"/);
  assert.doesNotMatch(home, /<video class="hero-image hero-video"[^>]*\bloop\b/);
  assert.match(home, /<source src="\/assets\/media\/stewaro-hero-pferd\.mp4" type="video\/mp4"/);
  assert.match(home, /poster="data:image\/webp;base64,/);
  assert.doesNotMatch(home, /<img class="hero-image"/);
  assert.match(home, /prefers-reduced-motion: reduce/);
  assert.match(home, /heroVideo\.pause\(\)/);
  assert.match(home, /heroVideo\.addEventListener\('ended'/);
  assert.match(home, /brand-icon-light[\s\S]*stewaro-icon\.svg/);
  assert.match(home, /\.brand-word[\s\S]*stewaro-wordmark\.svg/);
  assert.match(home, /<nav class="footer-legal" aria-label="Rechtliches">/);
  for (const route of ["/impressum","/datenschutz","/nutzungsbedingungen","/ki-transparenz"]) {
    assert.match(home, new RegExp(`href="${route}"`));
  }
  assert.match(home, /id="stewaro-precision-fullbleed-v1"/);
  assert.match(home, /\.precision\{[\s\S]*min-height:clamp\(760px,92svh,980px\)!important/);
  assert.match(home, /\.mechanism-frame\{[\s\S]*position:absolute!important;[\s\S]*inset:0!important;[\s\S]*width:100%!important;[\s\S]*height:100%!important/);
  assert.match(home, /\.precision-copy\{[\s\S]*backdrop-filter:blur\(20px\) saturate\(125%\)!important/);
  assert.match(home, /background:[\s\S]*rgba\(11,14,12,\.56\)[\s\S]*rgba\(4,6,5,\.50\)/);
  const heroVideo = fs.statSync("assets/media/stewaro-hero-pferd.mp4");
  assert.ok(heroVideo.size > 100_000 && heroVideo.size < 6_000_000, "hero video must stay web-optimized while allowing the 1080p master replacement");

  assert.match(matrix, /stewaro-site\/.*removed/i);
  assert.match(matrix, /existing production website\/customer-account/i);

  // Legacy runtime identifiers must remain available during the migration.
  assert.match(siteUi, /nw_portal_theme_v1/);
});

test("header logo uses stable champagne gold with a mobile-safe specular sweep", () => {
  const home = homepageSource("de/index.html");
  const deSource = read("de/index.html");
  const gold = read("assets/stewaro-home-de-stewaro-gold-brand-v2.css");
  assert.match(home, /class="brand-shine" aria-hidden="true"/);
  assert.match(gold, /background-size:100% 100% !important/);
  assert.match(gold, /stewaroHeaderGoldShine/);
  assert.match(gold, /translate3d\(440%,0,0\)/);
  assert.match(gold, /will-change:transform,opacity/);
  assert.match(gold, /animation:stewaroHeaderGoldShine 15\.6s/);
  assert.match(gold, /width:calc\(var\(--stewaro-logo-icon\) \+ var\(--stewaro-logo-gap\) \+ var\(--stewaro-logo-word-w\)\)/);
  assert.doesNotMatch(gold, /--stewaro-logo-word-w:112px/);
  assert.match(deSource, /stewaro-home-de-stewaro-gold-brand-v2\.css\?v=2/);
  assert.match(gold, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(gold, /stewaroPremiumGold/);
});

test("production domain configuration uses canonical STEWARO host", () => {
  const cname = read("CNAME");
  assert.equal(cname.trim(), "stewaro.com");
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


test("legacy NAH/WERK pseudo text cannot leak beside the STEWARO SVG wordmark", () => {
  const unified = read("assets/stewaro-unified.css");
  const legacyLogo = read("assets/nahwerk-logo-v2.css");
  for (const css of [unified, legacyLogo]) {
    assert.match(css, /brandtext strong::after[\s\S]*content:none!important/);
    assert.match(css, /stewaro-wordmark\.svg/);
  }
});


test("privacy page uses the STEWARO legal hub without false EU-only claims", () => {
  const privacy = read("datenschutz/index.html");
  assert.match(privacy, /id="stewaro-privacy-hub-v1"/);
  assert.match(privacy, /class="privacy-docbar"/);
  assert.match(privacy, /DSGVO als verbindlicher Maßstab/);
  assert.match(privacy, /Drittlandübermittlungen/);
  assert.match(privacy, /Amazon Web Services \(AWS\)/);
  assert.match(privacy, /OpenAI/);
  assert.match(privacy, /Meta\/WhatsApp/);
  assert.match(privacy, /Sprach-, Bild- und Telefonverarbeitung/);
  assert.doesNotMatch(privacy, /100\s*%\s*DSGVO|alle Daten[^<]*ausschließlich[^<]*EU|keinerlei Daten[^<]*Drittstaat/i);
  for (const route of ["/datenschutz/","/nutzungsbedingungen/","/ki-transparenz","/datenloeschung","/impressum","/widerruf"]) {
    assert.match(privacy, new RegExp(`href="${route.replace(/[.*+?^$\{\}()|[\]\\]/g, "\\$&")}"`));
  }
});
