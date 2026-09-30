import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=(p)=>fs.readFileSync(p,"utf8");
const root=read("index.html");
const chat=read("web-concierge.html");
const client=read("assets/web-customer-concierge.js");
const bootstrap=read("assets/stewaro-app-bootstrap.js");
const login=read("anmelden.html");
const onboarding=read("assets/onboarding.js");

test("app host root routes to authenticated FIDEL surface while public host remains /de/",()=>{
  assert.doesNotMatch(root,/http-equiv="refresh"/i);
  assert.match(root,/window\.location\.hostname === "app\.stewaro\.com"/);
  assert.match(root,/\/web-concierge/);
  assert.match(root,/window\.location\.replace\("\/de\/"\)/);
});

test("FIDEL app surface is noindex and loads app bootstrap before runtime client",()=>{
  assert.match(chat,/meta name="robots" content="noindex,nofollow"/);
  const bootstrapPos=chat.indexOf("/assets/stewaro-app-bootstrap.js");
  const clientPos=chat.indexOf("assets/web-customer-concierge.js");
  assert.ok(bootstrapPos>0&&clientPos>bootstrapPos);
});

test("app bootstrap uses fragment-only one-time handoff and strips it before claim",()=>{
  assert.match(bootstrap,/location\.hash/);
  assert.match(bootstrap,/history\.replaceState\(null,"",location\.pathname\+location\.search\)/);
  assert.match(bootstrap,/action:"handoff_claim"/);
  assert.match(bootstrap,/^|handoff/);
  assert.doesNotMatch(bootstrap,/searchParams\.get\("handoff"\)/);
  assert.match(bootstrap,/https:\/\/account\.stewaro\.com\/anmelden\?produkt=senioren&next=app/);
});

test("canonical app host cannot fall back to public guest chat",()=>{
  assert.match(client,/canonicalAppHost=location\.hostname==="app\.stewaro\.com"/);
  assert.match(client,/canonicalAppHost&&guestMode/);
  assert.match(client,/https:\/\/account\.stewaro\.com\/anmelden\?produkt=senioren&next=app/);
});

test("app settings and account navigation leave app host safely",()=>{
  assert.match(client,/https:\/\/account\.stewaro\.com\/concierge-anpassen/);
  assert.match(bootstrap,/ACCOUNT_ORIGIN="https:\/\/account\.stewaro\.com"/);
  assert.match(bootstrap,/SITE_ORIGIN="https:\/\/stewaro\.com"/);
});

test("login and both registration completion paths preserve app handoff",()=>{
  assert.match(login,/ENTRY_APP_HANDOFF=ENTRY_PARAMS\.get\('next'\)==='app'/);
  assert.match(login,/action:'handoff_create'/);
  assert.match(login,/https:\/\/app\.stewaro\.com\/#handoff=/);
  assert.match(onboarding,/const appHandoff = params\.get\("next"\) === "app"/);
  assert.match(onboarding,/action: "handoff_create"/);
  assert.ok((onboarding.match(/void handoffToApp\(loginResult\.session_token\)/g)||[]).length>=2);
});

console.log("STEWARO_APP_LAUNCH_SHELL_V1=GREEN");
