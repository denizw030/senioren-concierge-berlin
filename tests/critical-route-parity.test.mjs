import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

function read(path){
  return fs.readFileSync(path,"utf8");
}

function normalizeCleanRoute(html){
  return html.replace('<head><base href="/">','<head>');
}

for(const [canonicalPath,cleanPath] of [
  ["konto.html","konto/index.html"],
  ["web-concierge.html","web-concierge/index.html"],
  ["zugang-uebertragen.html","zugang-uebertragen/index.html"],
  ["erster-schritt.html","erster-schritt/index.html"],
  ["passwort-zuruecksetzen.html","passwort-zuruecksetzen/index.html"],
  ["vertrag-widerrufen.html","vertrag-widerrufen/index.html"],
  ["alltag-organisieren.html","alltag-organisieren/index.html"],
  ["dokumente-verstehen.html","dokumente-verstehen/index.html"],
  ["technik-verstehen.html","technik-verstehen/index.html"],
  ["prime-concierge.html","prime-concierge/index.html"],
]){
  test(`${cleanPath} mirrors ${canonicalPath} except root base`,()=>{
    assert.equal(normalizeCleanRoute(read(cleanPath)),read(canonicalPath));
  });
}
