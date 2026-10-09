// Read-only HTTPS smoke of the public phone-ledger shell; no Klient credentials or transcripts.
import assert from "node:assert/strict";
const host="https://stewaro.com";
async function request(path){
 const res=await fetch(host+path,{redirect:"follow",signal:AbortSignal.timeout(15000)});
 const body=await res.text();
 assert.equal(res.status,200,`${path}: HTTP 200 required, got ${res.status}`);
 return {res,body};
}
const {res:page,body:html}=await request("/telefonate/ausgehend/");
assert.match(html,/<title>Ausgehende Anrufe – STEWARO<\/title>/);
const cssVersion=html.match(/href="\/assets\/stewaro-outbound-ledger-v1\.css\?v=([12])"/)?.[1];
assert.ok(cssVersion,"public release has known stylesheet version");
assert.match(html,/src="\/assets\/stewaro-phone-session-v1\.js\?v=1"/);
const jsVersion=html.match(/src="\/assets\/stewaro-outbound-ledger-v1\.js\?v=([24])"/)?.[1];
assert.ok(jsVersion,"public release has known runtime version");
assert.match(html,/id="calls"/);
assert.doesNotMatch(html,/<script(?![^>]*src=)[^>]*>/i);
assert.doesNotMatch(html,/<style\b/i);
console.log("OUTBOUND_PORTAL_PUBLIC_HTML_200=GREEN");
const {body:css}=await request("/assets/stewaro-outbound-ledger-v1.css?v="+cssVersion);
assert.match(css,/\.messages/);
console.log("OUTBOUND_PORTAL_PUBLIC_CSS_200=GREEN");
const {body:js}=await request("/assets/stewaro-outbound-ledger-v1.js?v="+jsVersion);
assert.match(js,/phone\/outbound\/transcript/);
assert.match(js,/Gesprächsdauer/);
assert.match(js,/mission_verified===true/);
if(jsVersion==="4"){
 assert.match(js,/mission-outcome-failed/);
 assert.match(js,/Noch nicht überprüft/);
 assert.match(js,/resultLabel/);
}
console.log("OUTBOUND_PORTAL_PUBLIC_JS_200=GREEN");
const {body:session}=await request("/assets/stewaro-phone-session-v1.js?v=1");
assert.match(session,/remember_me!==true/);
assert.match(session,/expires_at/);
console.log("OUTBOUND_PORTAL_PUBLIC_SESSION_HELPER_200=GREEN");
const csp=page.headers.get("content-security-policy");
console.log("OUTBOUND_PORTAL_PUBLIC_CSP_HEADER="+(csp?"PRESENT":"ABSENT_HOST_HEADER"));
if(html.includes('http-equiv="Content-Security-Policy"')){
 assert.match(html,/connect-src 'self' https:\/\/djicahhmnnamtjuqedqd\.supabase\.co/);
 console.log("OUTBOUND_PORTAL_PUBLIC_CSP_META=PRESENT");
}else{
 console.log("OUTBOUND_PORTAL_PUBLIC_CSP_META=NOT_YET_PUBLISHED");
}
console.log("OUTBOUND_PORTAL_PUBLIC_READONLY=GREEN");
