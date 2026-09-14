import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = p => fs.readFileSync(path.join(root,p),"utf8");

test("localized app pages hide German first paint until catalog is ready", () => {
  for (const page of ["registrieren.html","anmelden.html","erster-schritt.html"]) {
    assert.match(read(page), /\/assets\/locale-boot\.js\?v=1/);
  }
  assert.match(read("assets/auth-i18n.js"), /revealLocalizedPage/);
});

test("registration runtime repairs mixed-language composite WhatsApp labels", () => {
  const js = read("assets/auth-i18n.js");
  assert.match(js, /repairRegistrationSurface/);
  assert.match(js, /Web account \+/);
  assert.match(js, /Web hesabı \+/);
  assert.match(js, /Welcome to/);
  assert.match(js, /Kişisel Concierge/);
});

test("runtime-created asset URLs are root absolute", () => {
  const files = fs.readdirSync(path.join(root,"assets")).filter(name => name.endsWith(".js"));
  for (const name of files) {
    const js = read(path.join("assets",name));
    assert.doesNotMatch(js, /["'`]assets\//, `${name} contains a path-relative runtime asset`);
  }
  const carousel = read("assets/concierge-carousel.js");
  assert.match(carousel, /`\/assets\/voice\/samples\/\$\{key\}-\$\{code\}\.mp3/);
});

test("every local media reference resolves from every public EN/TR and auth page", () => {
  const publicPages = [
    "index.html","prime-concierge.html","safety.html","angehoerige.html","telefonannahme.html",
    "pakete.html","leistungen.html","ablauf.html","faq.html","kontakt.html","concierges.html",
    "senioren-concierge.html","alltag-organisieren.html","dokumente-verstehen.html",
    "technik-verstehen.html","ueber-mich.html"
  ];
  const pages = [
    ...publicPages.flatMap(page => [`en/${page}`, `tr/${page}`]),
    "registrieren.html","anmelden.html","erster-schritt.html"
  ];
  const refsFrom = (html) => {
    const refs = [];
    for (const match of html.matchAll(/<(?:img|source|audio|video)\b[^>]*\b(?:src|poster)=["']([^"']+)["'][^>]*>/gi)) refs.push(match[1]);
    for (const match of html.matchAll(/<(?:img|source)\b[^>]*\bsrcset=["']([^"']+)["'][^>]*>/gi)) {
      for (const part of match[1].split(',')) refs.push(part.trim().split(/\s+/)[0]);
    }
    return refs;
  };
  for (const page of pages) {
    for (const raw of refsFrom(read(page))) {
      if (!raw || /^(?:https?:|data:|blob:|#)/i.test(raw)) continue;
      const clean = raw.split(/[?#]/)[0];
      const absolute = clean.startsWith('/')
        ? path.join(root, clean.replace(/^\/+/, ''))
        : path.resolve(root, path.dirname(page), clean);
      assert.ok(fs.existsSync(absolute), `${page} has broken media reference ${raw}`);
    }
  }
});

test("all Concierge preview audio files required by the slider exist", () => {
  const carousel = read("assets/concierge-carousel.js");
  const profiles = [...carousel.matchAll(/^\s*\["([^"]+)",.*,"([a-z]{2})"\],$/gm)].map(match => ({key:match[1], native:match[2]}));
  assert.equal(profiles.length, 23, "expected all 23 Concierge profiles");
  for (const {key,native} of profiles) {
    for (const code of new Set([native,"de","en"])) {
      const file = path.join(root,"assets","voice","samples",`${key}-${code}.mp3`);
      assert.ok(fs.existsSync(file), `missing slider audio ${key}-${code}.mp3`);
    }
  }
});

test("localized public runtime repairs late-added asset references", () => {
  const js = read("assets/locale-runtime.js");
  assert.match(js, /repairAssetRefs/);
  assert.match(js, /attributeFilter: \['src','srcset','data-src','data-srcset','poster'\]/);
});

test("overview journey copy is authored in German English and Turkish", () => {
  const js = read("assets/acquisition-v1.js");
  for (const phrase of ["Kostenlos registrieren","Register for free","Ücretsiz kayıt ol","NAHWERK stays on it","NAHWERK takipte kalır"]) {
    assert.ok(js.includes(phrase), `missing ${phrase}`);
  }
});
