import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const page=fs.readFileSync("telefonate/ausgehend/index.html","utf8");
const previous=fs.readFileSync("telefonate/index.html","utf8");
test("independent private outbound ledger route is discoverable from existing telephone history",()=>{
 assert.match(previous,/href="\/telefonate\/ausgehend"/);
 assert.match(page,/Ausgehende Anrufe/);
 assert.match(page,/phone\/outbound\/transcript/);
 assert.match(page,/customer-outbound-ledger-v1/);
 assert.match(page,/cache:"no-store"/);
});
test("portal requires secure existing session and renders transcripts as text",()=>{
 assert.match(page,/scb_web_session/);
 assert.match(page,/Authorization:"Bearer "/);
 assert.match(page,/transcript_coverage/);
 assert.match(page,/textContent/);
 assert.match(page,/kein(?:e|er)? Audioaufnahme/i);
 assert.doesNotMatch(page,/localStorage.*session_token/);
 assert.doesNotMatch(page,/innerHTML/);
});
