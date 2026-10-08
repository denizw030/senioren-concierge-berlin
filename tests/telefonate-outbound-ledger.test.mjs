import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const page=fs.readFileSync("telefonate/ausgehend/index.html","utf8");
const previous=fs.readFileSync("telefonate/index.html","utf8");
const js=fs.readFileSync("assets/stewaro-outbound-ledger-v1.js","utf8");

test("independent private outbound ledger route is discoverable from existing telephone history",()=>{
 assert.match(previous,/href="\/telefonate\/ausgehend"/);
 assert.match(page,/Ausgehende Anrufe/);
 assert.match(js,/phone\/outbound\/transcript/);
 assert.match(js,/customer-outbound-ledger-v1/);
 assert.match(js,/cache:"no-store"/);
});
test("portal requires secure existing session and renders transcripts as text",()=>{
 assert.match(js,/scb_web_session/);
 assert.match(js,/Authorization:"Bearer "/);
 assert.match(js,/transcript_coverage/);
 assert.match(js,/textContent/);
 assert.match(page,/kein(?:e|er)? Audioaufnahme/i);
 assert.doesNotMatch(js,/localStorage.*session_token/);
 assert.doesNotMatch(js,/innerHTML/);
 assert.match(page,/stewaro-outbound-ledger-v1\.js/);
 assert.match(page,/stewaro-outbound-ledger-v1\.css/);
 assert.doesNotMatch(page,/<script>\s*\(/);
 assert.doesNotMatch(page,/<style>/);
});
