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
  const legacyMark = "stewaro-" + "mark.svg";
  assert.equal(fs.existsSync("assets/logos/" + legacyMark), false);
  assert.deepEqual(
    fs.readdirSync("assets/logos").filter((name) => /^stewaro.*\.svg$/i.test(name)).sort(),
    ["stewaro-icon.svg", "stewaro-wordmark.svg"]
  );

  const icon = read(iconPath);
  const wordmark = read(wordmarkPath);
  assert.match(icon, /viewBox="0 0 553\.29 687\.49"/);
  assert.match(icon, /#735320/);
  assert.match(icon, /#fff1c9/);
  assert.match(wordmark, /viewBox="0 0 720\.32 98\.58"/);
  assert.match(wordmark, /#73531f/);
  assert.match(wordmark, /#fff0c8/);
});


test("canonical STEWARO branding has no active legacy mark reference or generated text wordmark", () => {
  const legacyMark = "stewaro-" + "mark.svg";
  const roots = ["."];
  const allowedExt = /\.(?:css|html|js|mjs|yml|yaml)$/i;
  const ignored = (path) =>
    path === ".git" ||
    path.startsWith(".git/") ||
    path.startsWith("stewaro-site/") ||
    path.startsWith("orfidel-preview/") ||
    path.startsWith("android-app/") ||
    path.startsWith("ios-app/") ||
    path.includes("/node_modules/");

  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const path = dir === "." ? entry.name : dir + "/" + entry.name;
      if (ignored(path)) continue;
      if (entry.isDirectory()) walk(path);
      else if (allowedExt.test(path)) files.push(path);
    }
  };
  for (const root of roots) if (fs.existsSync(root)) walk(root);

  const legacyRefs = files.filter((path) => read(path).includes(legacyMark));
  assert.deepEqual(legacyRefs, [], "active files must not reference the superseded STEWARO mark");

  for (const path of ["assets/stewaro-unified.css", "assets/stewaro-brand-shell.css", "assets/nahwerk-logo-v2.css"]) {
    assert.doesNotMatch(read(path), /content:\s*["']STEWARO["']/);
  }
});

test("header keeps wordmark and symbol in gold-only synchronized sheen", () => {
  const css = read("assets/stewaro-unified.css");
  assert.match(css, /STEWARO_CANONICAL_WORDMARK_GUARD_20260928/);
  assert.match(css, /linear-gradient\(108deg,#b89045 0%,#d1ad63 15%,#ead49a 31%,#fff3d0 42%,#d0aa5a 55%,#edd9a5 69%,#c49a4a 84%,#dfc680 100%\)/);
  const active = css.slice(css.indexOf("/* STEWARO_CANONICAL_WORDMARK_GUARD_20260928 */"));
  assert.doesNotMatch(active, /#75531c|#8a611e/);
  assert.match(css, /-webkit-mask:url\("\/assets\/logos\/stewaro-icon\.svg"\) center\/contain no-repeat!important/);
  assert.match(css, /mask:url\("\/assets\/logos\/stewaro-icon\.svg"\) center\/contain no-repeat!important/);
  assert.match(css, /data:image\/svg\+xml;base64,/);
  assert.match(css, /mask-mode:alpha!important/);
  assert.match(css, /filter:none!important/);
  assert.match(css, /animation:stewaroUnifiedSheen 8s ease-in-out infinite alternate!important/);
  assert.match(css, /@keyframes stewaroUnifiedSheen\{from\{background-position:0% 50%\}to\{background-position:100% 50%\}\}/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)[\s\S]*animation:none!important/);
});
