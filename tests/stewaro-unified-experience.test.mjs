import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");

test("STEWARO unified experience owns the customer-facing visual shell", () => {
  const css = read("assets/stewaro-unified.css");
  assert.match(css, /--stewaro-bg:#f7f3eb/);
  assert.match(css, /html body \.top\{/);
  assert.match(css, /background:rgba\(255,255,255,\.965\)!important/);
  assert.match(css, /url\("\/assets\/logos\/stewaro-icon\.svg"\)/);
  assert.match(css, /stewaro-wordmark\.svg/);
  assert.match(css, /linear-gradient\(108deg,#75531c/);
  assert.match(css, /body\.login-image-page main::after/);
  assert.match(css, /content:none!important/);
  assert.match(css, /body\.pricing-page/);
  assert.match(css, /body\.account-premium-ui/);
  assert.match(css, /body\.web-concierge-page/);
});

test("shared runtime loaders install STEWARO presentation and favicon without changing runtime authority", () => {
  const clean = read("assets/clean-url.js");
  const ui = read("assets/site-ui.js");
  for (const source of [clean, ui]) {
    assert.match(source, /\/assets\/stewaro-unified\.css\?v=20260927-1/);
    assert.match(source, /\/assets\/logos\/stewaro-icon\.svg\?v=1/);
  }
  assert.match(ui, /return readStoredPortalTheme\(\) \|\| 'dark';/);
});

test("login no longer references the legacy red-blue person artwork", () => {
  const logoCss = read("assets/nahwerk-logo-v2.css");
  const brandCss = read("assets/brand-2026.css");
  const login = read("anmelden.html");
  assert.doesNotMatch(logoCss, /nahwerk-red-blue-hero-web-lossless/);
  assert.doesNotMatch(brandCss, /body\.login-image-page[^\n]*[\s\S]{0,500}prime-concierge-odysx\.png/);
  assert.doesNotMatch(login, /nahwerk-red-blue-hero-web-lossless|prime-concierge-odysx\.png/);
});

test("legacy shared logo hooks resolve to STEWARO instead of NAHWERK in visible header paths", () => {
  const siteCss = read("assets/site.css");
  const logoCss = read("assets/nahwerk-logo-v2.css");
  assert.match(siteCss, /logos\/stewaro-icon\.svg/);
  assert.match(logoCss, /logos\/stewaro-icon\.svg/);
});


test("canonical STEWARO brand assets are the only STEWARO SVG logo sources", () => {
  const iconPath = "assets/logos/stewaro-icon.svg";
  const wordmarkPath = "assets/logos/stewaro-wordmark.svg";
  assert.equal(fs.existsSync(iconPath), true);
  assert.equal(fs.existsSync(wordmarkPath), true);
  assert.equal(fs.existsSync("assets/logos/stewaro-mark.svg"), false);

  const icon = read(iconPath);
  const wordmark = read(wordmarkPath);
  assert.match(icon, /viewBox="0 0 553\.29 687\.49"/);
  assert.match(icon, /#735320/);
  assert.match(icon, /#fff1c9/);
  assert.match(wordmark, /viewBox="0 0 720\.32 98\.58"/);
  assert.match(wordmark, /#73531f/);
  assert.match(wordmark, /#fff0c8/);
});
