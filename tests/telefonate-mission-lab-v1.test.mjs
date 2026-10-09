import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const page=readFileSync("telefonate/testen/index.html","utf8");
const source=readFileSync("assets/stewaro-call-lab-v1.js","utf8");
const css=readFileSync("assets/stewaro-call-lab-v1.css","utf8");
const ledger=readFileSync("telefonate/ausgehend/index.html","utf8");
test("dedicated mobile-friendly outbound testing route linked from existing ledger",()=>{
 assert.match(ledger,/href="\/telefonate\/testen\/"/);
 assert.match(page,/Gespräche testen/);
 assert.match(page,/stewaro-call-lab-v1\.js/);
 assert.match(page,/stewaro-phone-session-v1\.js/);
 assert.match(css,/@media\(max-width:660px\)/);
});
test("24 named diverse use cases, not placeholder samples",()=>{
 const ids=[...source.matchAll(/"id": "([a-z-]+)"/g)].map(x=>x[1]);
 assert.equal(ids.length,24);
 assert.equal(new Set(ids).size,24);
 for(const id of ["arzt-termin","apotheke-bestand","streit-klaeren","freund-gruss","behoerde","handwerker","restaurant","reklamation","bank"])assert.ok(ids.includes(id),id);
 assert.match(source,/die Sichtweisen nicht verzerren/);
});
test("no automatic dispatch, provider call, sensitive storage or payment path",()=>{
 assert.doesNotMatch(source,/\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|\bdial\s*\(|callProvider|paymentIntent|autoSubmit|window\.location\.search/);
 assert.doesNotMatch(source,/innerHTML|eval\s*\(|document\.write\s*\(/);
 assert.match(source,/Starte KEINEN Anruf/);
 assert.match(source,/ausdrückliche Zustimmung/);
 assert.match(page,/kein echter Anruf/i);
 assert.match(page,/nichts wird automatisch gesendet/i);
});
test("Fidel handoff is same-origin and never auto-submits or crosses session origins",()=>{
 assert.match(page,/href="\/web-concierge\/"/);
 assert.doesNotMatch(page,/target="_blank"|http-equiv="refresh"|<iframe/);
 assert.match(source,/STEWAROPhoneSession\?\.token\(\)/);
 assert.match(source,/if\(!token\)/);
 assert.match(source,/preview\.value=brief\(\)/);
});
test("private session and explicit intent remain mandatory; no PII persistence",()=>{
 assert.match(page,/autocomplete="off"/);
 assert.match(page,/maxlength="1400"/);
 assert.match(page,/script-src 'self'/);
 assert.match(page,/connect-src 'self'/);
 assert.doesNotMatch(page,/unsafe-inline|unsafe-eval/);
 assert.match(source,/ausdrücklicher Zustimmung/);
});
test("mission results are never conflated with phone status; personal evaluation only",()=>{
 assert.match(source,/Ein beendeter Anruf ist kein Beweis/);
 assert.match(page,/kein technischer oder verbindlicher Nachweis|nur Deine eigene Test-Notiz/i);
 assert.match(page,/Outbound-Anrufprotokoll/i);
});
test("syntactically valid standalone asset",()=>{new vm.Script(source)});
