import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const canonical=fs.readFileSync("konto.html","utf8");
const clean=fs.readFileSync("konto/index.html","utf8");

test("clean /konto route stays byte-equivalent to canonical account except root base",()=>{
  const normalized=clean.replace('<head><base href="/">','<head>');
  assert.equal(normalized,canonical);
});

test("both account entries expose the same current response-channel and header assets",()=>{
  for(const html of [canonical,clean]){
    assert.match(html,/account-response-channel\.css\?v=6/);
    assert.match(html,/account-response-channel\.js\?v=6/);
    assert.match(html,/account-header-concierge\.css\?v=2/);
    assert.match(html,/account-header-concierge\.js\?v=1/);
    assert.match(html,/0,06 € pro Antwort/);
    assert.match(html,/id="responseChannelSave">Speichern<\/button>/);
  }
});
