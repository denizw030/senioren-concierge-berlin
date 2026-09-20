// EMAIL_PERSONAL_LEARNING_UI_V1_GREEN_GATE
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const js=fs.readFileSync("assets/email-account-integration.js","utf8");
const css=fs.readFileSync("assets/email-account-integration.css","utf8");
const konto=fs.readFileSync("konto.html","utf8");
const callback=fs.readFileSync("email-concierge.html","utf8");

function loadHooks(){const sandbox={console,URL,URLSearchParams};vm.createContext(sandbox);vm.runInContext(js,sandbox);return sandbox.NAHWERKEmailIntegrationTestHooks}
function response(status,body){return {status,ok:status>=200&&status<300,json:async()=>body}}
const hooks=loadHooks();
const token="s".repeat(40);
const allCaps=["EMAIL_READ","EMAIL_SEARCH","EMAIL_ATTACHMENTS","EMAIL_DRAFT","EMAIL_MAILBOX","EMAIL_SEND"];

test("email tab preserves all account tabs and family permissions",()=>{
  for(const k of ["overview","concierge","email","safety","usage","personal","access"]) assert.match(konto,new RegExp('data-account-tab="'+k+'"'));
  for(const l of ["Übersicht","Concierge","E-Mail","Safety","Nutzung","Account","Zugänge"]) assert.match(konto,new RegExp(">"+l+"<"));
  assert.match(konto,/id="familyAccessCard"/);assert.match(konto,/data-family-permission/);assert.match(konto,/FAMILY_PERMISSIONS_URL/);
});

test("frozen website email contract now targets exact PROD runtime",()=>{
  assert.equal(hooks.PLATFORM_CONTRACT,"WEBSITE_EMAIL_INTEGRATION_CONTRACT_V1");
  assert.equal(hooks.PLATFORM_CONTRACT_SHA,"d9f91bb488f5895b27a0618e1a94188f1e9ee19b");
  assert.equal(hooks.runtimeGatewayBase,"https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-email-runtime");
  assert.doesNotMatch(js,/EMAIL_GATEWAY_BASE\s*=\s*null/);
});

test("missing customer session fails closed without a network request",async()=>{
  let calls=0;const out=await hooks.gatewayRequest({token:"",path:"/email/providers",fetchImpl:async()=>{calls++;throw Error()}});
  assert.equal(calls,0);assert.equal(out.ok,false);assert.equal(out.error,"UNAUTHENTICATED");assert.equal(out.networkRequestMade,false);
});

test("authenticated PROD requests use bearer identity and JSON only for POST",async()=>{
  const seen=[];
  await hooks.gatewayRequest({token,path:"/email/providers",fetchImpl:async(u,i)=>{seen.push([u,i]);return response(200,{ok:true,providers:[]})}});
  await hooks.gatewayRequest({token,path:"/email/disconnect",method:"POST",body:{mode:"LOCAL"},fetchImpl:async(u,i)=>{seen.push([u,i]);return response(200,{ok:true,provider:"GOOGLE",state:"DISCONNECTED"})}});
  assert.match(seen[0][0],/nahwerk-email-runtime\/email\/providers$/);assert.equal(seen[0][1].headers.Authorization,"Bearer "+token);assert.equal(Object.hasOwn(seen[0][1].headers,"Content-Type"),false);
  assert.equal(seen[1][1].headers["Content-Type"],"application/json");assert.equal(seen[1][1].body,'{"mode":"LOCAL"}');
});

test("provider availability remains server authoritative",()=>{
  const rows=hooks.normalizeProviderList({ok:true,providers:[{provider:"GOOGLE",availability:"AVAILABLE",capabilities:allCaps},{provider:"MICROSOFT",availability:"CONFIGURATION_REQUIRED",capabilities:allCaps},{provider:"GENERIC",availability:"UNAVAILABLE",capabilities:allCaps},{provider:"EVIL",availability:"AVAILABLE",capabilities:allCaps}]});
  assert.equal(JSON.stringify(rows.map(x=>[x.provider,x.availability])),JSON.stringify([["GOOGLE","AVAILABLE"],["MICROSOFT","CONFIGURATION_REQUIRED"],["GENERIC","UNAVAILABLE"]]));
});

test("connection accepts exact states and only masked account hints",()=>{
  const good=hooks.normalizeConnection({ok:true,provider:"GOOGLE",state:"CONNECTED",capabilities:allCaps,account_display_hint:"d•••@gmail.com",scope_required:true,google_services:{gmail:"CONNECTED",calendar:"PERMISSION_REQUIRED",contacts:"PERMISSION_REQUIRED"}});
  assert.equal(good.state,"CONNECTED");assert.equal(good.account_display_hint,"d•••@gmail.com");assert.equal(good.scope_required,true);assert.equal(good.google_services.gmail,"CONNECTED");assert.equal(good.google_services.calendar,"PERMISSION_REQUIRED");
  assert.equal(hooks.normalizeConnection({ok:true,provider:"GOOGLE",state:"ACTIVE",capabilities:[]}),null);
  assert.equal(hooks.normalizeConnection({ok:true,provider:"GOOGLE",state:"CONNECTED",capabilities:[],account_display_hint:"deniz@gmail.com"}).account_display_hint,null);
});

test("customer controls are server authoritative and read-off also disables search and attachments",()=>{
  const allOn=Object.fromEntries(allCaps.map(k=>[k,true]));
  const good=hooks.normalizePreferences({ok:true,available_capabilities:allCaps,preferences:allOn});
  assert.equal(good.EMAIL_MAILBOX,true);assert.equal(good.EMAIL_SEND,true);
  const restricted=hooks.normalizePreferences({ok:true,available_capabilities:allCaps,preferences:{...allOn,EMAIL_READ:false}});
  assert.equal(restricted.EMAIL_READ,false);assert.equal(restricted.EMAIL_SEARCH,false);assert.equal(restricted.EMAIL_ATTACHMENTS,false);
  for(const cap of allCaps)assert.match(konto,new RegExp('value="'+cap+'"'));
  assert.match(js,/\/email\/preferences/);
});

test("preference toggles preserve the clicked state until the server confirms it",()=>{
  assert.match(js,/if \(!savingPreferences\) input\.checked = connected \? preferences\?\.\[key\] === true : false;/);
  const snapshot=js.indexOf("const requested = Object.fromEntries(capabilityInputs.map");
  const busy=js.indexOf("savingPreferences = true;",snapshot);
  assert.ok(snapshot>=0&&busy>snapshot,"clicked preference must be snapshotted before busy rendering");
  const prefLoad=js.indexOf('const preferenceData = await request("/email/preferences")');
  const connectedRender=js.indexOf("renderConnection();",prefLoad);
  assert.ok(prefLoad>=0&&connectedRender>prefLoad,"connected UI must render only after preferences are hydrated");
});

test("browser can request Google only and carries no tenant or provider secret authority",()=>{
  const body=hooks.connectPayload("GOOGLE",allCaps);assert.equal(JSON.stringify(body),JSON.stringify({provider:"GOOGLE",requested_capabilities:allCaps}));
  assert.equal(hooks.connectPayload("MICROSOFT",allCaps),null);
  for(const key of ["person_id","customer_account_id","customer_member_id","connection_id","access_token","refresh_token","client_secret"])assert.equal(Object.hasOwn(body,key),false);
});

test("connect action stays neutral and is disabled until Google is selected",()=>{
  assert.equal(hooks.connectPathForState("DISCONNECTED"),"/email/connect");
  assert.equal(hooks.connectPathForState("ERROR"),"/email/connect");
  assert.equal(hooks.connectPathForState("REAUTH_REQUIRED"),"/email/reauth");
  assert.equal(hooks.connectPathForState("SCOPE_REQUIRED"),"/email/reauth");
  assert.match(js,/obsoleteReauthButton\?\.remove\(\)/);
  assert.match(js,/obsoleteRetryButton\?\.remove\(\)/);
  assert.match(js,/connectButton\.textContent = "Verbinden"/);
  assert.match(js,/googleLabel\.textContent = "Google"/);
  assert.match(js,/connectButton\.disabled = !sessionToken\(\) \|\| selectedProvider !== "GOOGLE"/);
  assert.match(js,/Wähle oben Google aus/);
  assert.equal((js.match(/disconnectButton\.hidden = false/g)||[]).length,1);
});

test("OAuth redirect is pinned to Google Accounts HTTPS",()=>{
  assert.match(hooks.safeGoogleRedirect("https://accounts.google.com/o/oauth2/v2/auth?x=1"),/^https:\/\/accounts\.google\.com\//);
  assert.equal(hooks.safeGoogleRedirect("https://evil.example/auth"),null);assert.equal(hooks.safeGoogleRedirect("http://accounts.google.com/auth"),null);
});

test("frontend never persists provider secrets or invents send authority",()=>{
  assert.doesNotMatch(js,/localStorage\.setItem|sessionStorage\.setItem/);
  assert.doesNotMatch(js,/access_token\s*=|refresh_token\s*=|client_secret\s*=/i);
  assert.doesNotMatch(js,/\/email\/drafts\/send/);
  assert.equal(hooks.CUSTOMER_COPY.sendApproval,"E-Mails werden nur nach deiner Freigabe gesendet.");
});

test("canonical OAuth return page is private from indexing and returns to real customer account",()=>{
  assert.match(callback,/noindex,nofollow/);assert.match(callback,/no-referrer/);assert.match(callback,/email_oauth=complete/);assert.match(callback,/\/konto\?/);
});

test("customer-facing Gmail copy keeps approval semantics without internal architecture terms",()=>{
  assert.equal(hooks.CUSTOMER_COPY.capabilityHeading,"Deine E-Mail-Funktionen");
  assert.equal(hooks.CUSTOMER_COPY.dataUse,"NAHWERK verwendet deine Google-Daten nur für die Funktionen, die du aktiviert hast.");
  assert.match(hooks.CUSTOMER_COPY.continuity,/NAHWERK-Konto/);
  assert.match(hooks.CUSTOMER_COPY.continuity,/nur nach deiner Freigabe gesendet/);
  assert.doesNotMatch(Object.values(hooks.CUSTOMER_COPY).join(" "),/\b(?:PROD|Gateway|Core|CAO|person_id|Authority|serverseitig)\b/i);
  assert.match(js,/applyCustomerCopy\(\);/);
});

test("email UI remains responsive",()=>{assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);assert.match(css,/@media\(max-width:720px\)/)});

test("central Google connection shows Gmail Calendar and Contacts without disabling existing Gmail",()=>{
  assert.match(js,/Gmail/);
  assert.match(js,/Kalender/);
  assert.match(js,/Kontakte/);
  assert.match(js,/Berechtigungen aktualisieren/);
  assert.match(js,/connection\?\.scope_required/);
  assert.match(js,/syncProduct\(state === "CONNECTED"\)/);
  assert.match(js,/emailGoogleServiceStyles/);
});

test("workspace OAuth completion is accepted by the email callback surface",()=>{
  assert.match(callback,/p\.get\("integration"\)==="connected"/);
  assert.match(callback,/integration=connected/);
});
