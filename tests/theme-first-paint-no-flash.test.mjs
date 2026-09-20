import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const routes = [
  "konto.html","konto/index.html",
  "web-concierge.html","web-concierge/index.html",
  "concierge-anpassen.html","concierge-anpassen/index.html",
  "payg.html","payg/index.html",
  "senioren-concierge.html","senioren-concierge/index.html",
  "angehoerige.html","angehoerige/index.html"
];

test("theme-aware pages set persisted theme before the first stylesheet paint", () => {
  for (const path of routes) {
    const html = read(path);
    const boot = html.indexOf('id="nw-theme-first-paint"');
    const css = html.indexOf('rel="stylesheet"');
    assert.ok(boot >= 0, `${path}: missing first-paint bootstrap`);
    assert.ok(css < 0 || boot < css, `${path}: bootstrap must run before stylesheets`);
    assert.match(html, /localStorage\.getItem\("nw_portal_theme_v1"\)/, path);
    assert.match(html, /nw-theme-first-paint body\{visibility:hidden!important\}/, path);
    assert.match(html, /DOMContentLoaded/, path);
  }
});

test("authenticated clean routes stay mirrored after first-paint fix", () => {
  for (const [root, clean] of [
    ["konto.html","konto/index.html"],
    ["web-concierge.html","web-concierge/index.html"],
    ["concierge-anpassen.html","concierge-anpassen/index.html"],
    ["payg.html","payg/index.html"]
  ]) {
    assert.equal(read(root), read(clean).replace('<head><base href="/">','<head>'), `${root} mirror`);
  }
});
