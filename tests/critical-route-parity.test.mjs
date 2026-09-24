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
]){
  test(`${cleanPath} mirrors ${canonicalPath} except root base`,()=>{
    assert.equal(normalizeCleanRoute(read(cleanPath)),read(canonicalPath));
  });
}
