import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const page=fs.readFileSync("telefonate/ausgehend/index.html","utf8");
const previous=fs.readFileSync("telefonate/index.html","utf8");
const js=fs.readFileSync("assets/stewaro-outbound-ledger-v1.js","utf8");
const phoneSession=fs.readFileSync("assets/stewaro-phone-session-v1.js","utf8");

test("independent private outbound ledger route is discoverable from existing telephone history",()=>{
 assert.match(previous,/href="\/telefonate\/ausgehend"/);
 assert.match(page,/Ausgehende Anrufe/);
 assert.match(js,/phone\/outbound\/transcript/);
 assert.match(js,/customer-outbound-ledger-v1/);
 assert.match(js,/cache:"no-store"/);
});
test("portal distinguishes call times, evidence, duration and mission outcome",()=>{
 assert.match(js,/Beginn des Telefonats/);
 assert.match(js,/Ende des Telefonats/);
 assert.match(js,/Gesprächsdauer/);
 assert.match(js,/Antwort der Zielperson/);
 assert.match(js,/Auftrag tatsächlich erfüllt/);
 assert.match(js,/mission_verified===true/);
 assert.match(js,/mission_outcome==="Auftrag nicht erledigt"/);
 assert.match(js,/mission-outcome-".*resultClass\(call\)/);
 assert.match(fs.readFileSync("assets/stewaro-outbound-ledger-v1.css","utf8"),/mission-outcome-failed/);
 assert.match(js,/Noch nicht überprüft/);
 assert.match(js,/Auftrag erledigt/);
 assert.match(js,/Abweichung festgestellt/);
 assert.match(js,/resultLabel\(call\)/);
 assert.match(page,/stewaro-outbound-ledger-v1\.js\?v=7/);
 assert.match(page,/stewaro-outbound-ledger-v1\.css\?v=2/);

 assert.match(js,/Telefonassistenz/);
 assert.match(js,/call\.assistant_name/);
 assert.match(js,/detail\.mission_issue/);
 assert.match(js,/Erfolgsnachweis/);
 assert.match(js,/call\.mission_evidence/);
 assert.match(js,/detail\.mission_evidence/);
 assert.match(js,/Terminvereinbarung – Gesprächsstand/);
 assert.match(js,/Warum noch nicht bestätigt/);
 assert.match(js,/detail\.appointment_progress/);
 assert.match(js,/detail\.appointment_evidence_kind===\"independent_provider_confirmation\"/);
 assert.match(js,/Durch Praxis bestätigter Termin/);
 assert.match(js,/detail\.appointment_starts_at/);
 assert.match(js,/detail\.appointment_provider_verified_at/);
 assert.match(js,/call\.appointment_evidence/);
 assert.match(js,/ein beendeter Anruf bestätigt keine persönliche Antwort/);
});
test("page-level CSP permits only self-hosted active assets and bound production history API",()=>{
 assert.match(page,/http-equiv="Content-Security-Policy"/);
 assert.match(page,/script-src 'self'/);
 assert.match(page,/style-src 'self'/);
 assert.match(page,/connect-src 'self' https:\/\/djicahhmnnamtjuqedqd\.supabase\.co/);
 assert.match(page,/object-src 'none'/);
 assert.doesNotMatch(page,/unsafe-inline|unsafe-eval/);
});
test("portal requires secure existing session and renders transcripts as text",()=>{
 assert.match(phoneSession,/scb_web_session/);
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
