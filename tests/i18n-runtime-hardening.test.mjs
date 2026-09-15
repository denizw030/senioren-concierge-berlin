import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = p => fs.readFileSync(path.join(root,p),"utf8");

test("localized app pages hide German first paint until catalog is ready", () => {
  for (const page of ["registrieren.html","anmelden.html","erster-schritt.html"]) {
    assert.match(read(page), /\/assets\/locale-boot\.js\?v=\d+/);
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
