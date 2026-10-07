import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT=path.resolve(new URL("..", import.meta.url).pathname);
const read=(p)=>fs.readFileSync(path.join(ROOT,p),"utf8");

const FLAT=read("web-concierge.html");
const CLEAN=read("web-concierge/index.html");
const JOIN=read("assets/stewaro-customer-call-join.js");
const CSS=read("assets/stewaro-customer-call-join.css");
const SDK=read("assets/vendor/twilio-voice-sdk-2.18.5.min.js");

test("Web Concierge mirrors load the pinned Voice SDK before the STEWARO join client",()=>{
  for(const html of [FLAT,CLEAN]){
    const sdk=html.indexOf('/assets/vendor/twilio-voice-sdk-2.18.5.min.js');
    const join=html.indexOf('/assets/stewaro-customer-call-join.js?v=1');
    assert.ok(sdk>0);
    assert.ok(join>sdk);
    assert.ok(html.includes('/assets/stewaro-customer-call-join.css?v=1'));
  }
});

test("Twilio Voice SDK is vendored and pinned locally",()=>{
  assert.ok(SDK.length>250000);
  assert.match(SDK,/Twilio/);
});

test("customer call join is authenticated, incoming-only and WEB/APP aware",()=>{
  assert.match(JOIN,/scb_web_session/);
  assert.match(JOIN,/Authorization: "Bearer " \+ bearer/);
  assert.match(JOIN,/location\.hostname === "app\.stewaro\.com" \? "APP" : "WEB"/);
  assert.match(JOIN,/\/call-join\/token/);
  assert.match(JOIN,/incoming_only !== true/);
  assert.match(JOIN,/device\.on\("incoming"/);
  assert.match(JOIN,/await device\.register\(\)/);
});

test("customer must explicitly accept and can explicitly decline without automatic acceptance",()=>{
  assert.match(JOIN,/Gespräch beitreten/);
  assert.match(JOIN,/Nicht jetzt/);
  assert.match(JOIN,/call\.accept\(/);
  assert.match(JOIN,/await post\("\/call-join\/decline"/);
  const declineStart=JOIN.indexOf('await post("/call-join/decline"');
  const reject=JOIN.indexOf("call.reject?.()", declineStart);
  assert.ok(declineStart>0);
  assert.ok(reject>declineStart);
  assert.doesNotMatch(JOIN,/device\.on\("incoming",[\s\S]{0,160}call\.accept\(/);
});

test("incoming calls are fail-closed to STEWARO conference context",()=>{
  assert.match(JOIN,/kind !== "stewaro_join"/);
  assert.match(JOIN,/UUID\.test\(conferenceId\)/);
  assert.match(JOIN,/call\.reject\?\.\(\)/);
});

test("UI does not claim PSTN zero-cost, only that no extra mobile call is built",()=>{
  assert.match(JOIN,/kein zusätzlicher Mobilfunkanruf/);
  assert.doesNotMatch(JOIN,/kostenlos|0,00/);
  assert.match(CSS,/STEWARO_CUSTOMER_CALL_WEBRTC_JOIN_V1_20261007/);
});
