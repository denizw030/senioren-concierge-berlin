import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const join = fs.readFileSync('assets/stewaro-client-call-join.js','utf8');
const webLive = fs.readFileSync('assets/web-live-concierge.js','utf8');
const appLive = fs.readFileSync('assets/stewaro-csp-app-live-script-1.js','utf8');
const webA = fs.readFileSync('web-concierge.html','utf8');
const webB = fs.readFileSync('web-concierge/index.html','utf8');
const appA = fs.readFileSync('app-live.html','utf8');
const appB = fs.readFileSync('app-live/index.html','utf8');
const vendor = fs.readFileSync('assets/vendor/twilio-voice-sdk-2.18.5.min.js','utf8');

test('Twilio Voice SDK 2.18.5 is vendored locally',()=>{
  assert.ok(vendor.length > 250000);
  assert.match(vendor,/Twilio\.Device/);
  assert.doesNotMatch(join,/https:\/\/(?:sdk|media)\.twilio/i);
});

test('client join is incoming-only and requires explicit user acceptance',()=>{
  assert.match(join,/device\.on\("incoming",bindCall\)/);
  assert.match(join,/kind!=="stewaro_join"/);
  assert.match(join,/currentCall\.accept\(\{rtcConstraints:\{audio:true\}\}\)/);
  assert.match(join,/data-call-join-accept/);
  assert.match(join,/Gespräch beitreten/);
  const incomingPos=join.indexOf('function bindCall');
  const acceptClick=join.indexOf('accept?.addEventListener("click"');
  const acceptCall=join.indexOf('currentCall.accept',acceptClick);
  assert.ok(incomingPos >= 0 && acceptClick > incomingPos && acceptCall > acceptClick);
});

test('explicit decline is authenticated before rejecting WebRTC call',()=>{
  const declinePos=join.indexOf('decline?.addEventListener("click"');
  const brokerPos=join.indexOf('"/live/call-join/decline"',declinePos);
  const rejectPos=join.indexOf('call.reject()',declinePos);
  assert.ok(declinePos >= 0 && brokerPos > declinePos && rejectPos > brokerPos);
});

test('web and app surfaces register the same secure call-join controller',()=>{
  assert.match(webLive,/createStewaroClientCallJoin/);
  assert.match(webLive,/channel:"WEB"/);
  assert.match(appLive,/createStewaroClientCallJoin/);
  assert.match(appLive,/channel:"APP"/);
});

test('both mirrored routes load local SDK and call-join CSS',()=>{
  for(const html of [webA,webB,appA,appB]){
    assert.match(html,/stewaro-client-call-join\.css\?v=1/);
    assert.match(html,/vendor\/twilio-voice-sdk-2\.18\.5\.min\.js/);
  }
  const normalize=(html)=>html.replace('<base href="/">','');
  assert.equal(normalize(webB),webA);
  assert.equal(normalize(appB),appA);
});

test('voice token never lives in persistent browser storage',()=>{
  assert.doesNotMatch(join,/localStorage|indexedDB/);
  assert.doesNotMatch(join,/TWILIO_(?:ACCOUNT|AUTH|API)|service_role/i);
  assert.match(join,/device\.updateToken\(payload\.token\)/);
});
