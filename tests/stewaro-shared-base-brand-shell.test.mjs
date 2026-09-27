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
  assert.match(siteUi, /ensureNavLink\(nav, "\/safety", "Sicherheit"\)/);
  assert.match(siteUi, /ensureNavLink\(nav, "\/pakete", "Preise"\)/);

  assert.match(home, /<title>STEWARO — Persönlicher Concierge<\/title>/);
  assert.match(home, /Jemand, der sich kümmert\./);
  assert.match(home, /Ihr persönlicher Concierge für Alltag, Organisation und alles, was erledigt werden muss\./);
  assert.match(home, /Unterstützt durch moderne KI\./);

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
