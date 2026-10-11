import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source=fs.readFileSync("assets/stewaro-outbound-ledger-v1.js","utf8");
const start=source.indexOf("const get=async path=>");
const end=source.indexOf("const resultLabel",start);
assert.ok(start>=0&&end>start,"exact production request handler exists");
const getSource=source.slice(start,end);
const makeGetter=new Function("token","fetch","authRequired","ROOT","viewActive",getSource+"; return get;");
const A="a".repeat(40),B="b".repeat(40);
const payload=()=>({ok:true,authoritative:true,environment:"PROD",
  phone_contract:"customer-outbound-ledger-v1",calls:[]});
const good=()=>({status:200,ok:true,json:async()=>payload()});
const makeHarness=(initial=A,fetcher=async()=>good(),viewActive=true)=>{
  let active=initial;
  const get=makeGetter(()=>active,fetcher,
    ()=>Object.assign(new Error("Session expired"),{code:"AUTH_REQUIRED"}),
    "https://example.invalid",viewActive);
  return {get,setToken:t=>{active=t}};
};
const delayed=()=>{let release;const promise=new Promise(r=>{release=r});return {promise,release}};
async function hasCode(work,code){
  try {await work();return false} catch(err){return err.code===code}
}

test("valid immutable session returns bound authoritative phone ledger",async()=>{
  let sent;
  const h=makeHarness(A,async(uri,request)=>{sent={uri,request};return good()});
  const result=await h.get("/phone/outbound");
  assert.deepEqual(result.calls,[]);
  assert.equal(sent.request.headers.Authorization,"Bearer "+A);
  assert.equal(sent.request.cache,"no-store");
});
test("no token is refused before fetch",async()=>{
  let count=0;const h=makeHarness("",async()=>{count++;return good()});
  assert.ok(await hasCode(()=>h.get("/phone/outbound"),"AUTH_REQUIRED"));
  assert.equal(count,0);
});
test("401 is always treated as lost authorization",async()=>{
  const h=makeHarness(A,async()=>({...good(),status:401,ok:false}));
  assert.ok(await hasCode(()=>h.get("/phone/outbound"),"AUTH_REQUIRED"));
});
test("session token replaced while fetch is pending rejects old response",async()=>{
  const gate=delayed(),h=makeHarness(A,()=>gate.promise);
  const pending=h.get("/phone/outbound");
  h.setToken(B);gate.release(good());
  assert.ok(await hasCode(()=>pending,"AUTH_REQUIRED"));
});
test("session ended while fetch is pending rejects old response",async()=>{
  const gate=delayed(),h=makeHarness(A,()=>gate.promise);
  const pending=h.get("/phone/outbound");
  h.setToken("");gate.release(good());
  assert.ok(await hasCode(()=>pending,"AUTH_REQUIRED"));
});
test("session swapped while response JSON is pending cannot render stale private data",async()=>{
  const gate=delayed(),h=makeHarness(A,async()=>({...good(),json:()=>gate.promise}));
  const pending=h.get("/phone/outbound");
  await Promise.resolve();h.setToken(B);gate.release(payload());
  assert.ok(await hasCode(()=>pending,"AUTH_REQUIRED"));
});
test("already inactive view refuses a request before fetch",async()=>{
  let calls=0;const h=makeHarness(A,async()=>{calls++;return good()},false);
  assert.ok(await hasCode(()=>h.get("/phone/outbound"),"AUTH_REQUIRED"));
  assert.equal(calls,0);
});
test("session ended while JSON is pending cannot render private data",async()=>{
  const gate=delayed(),h=makeHarness(A,async()=>({...good(),json:()=>gate.promise}));
  const pending=h.get("/phone/outbound");
  await Promise.resolve();h.setToken("");gate.release(payload());
  assert.ok(await hasCode(()=>pending,"AUTH_REQUIRED"));
});
test("unauthorized envelope fails closed even for a valid stable token",async()=>{
  const h=makeHarness(A,async()=>({...good(),json:async()=>({...payload(),authoritative:false})}));
  await assert.rejects(()=>h.get("/phone/outbound"),/nicht sicher geladen/);
});
test("generic network errors cannot authorize previous user data",async()=>{
  const h=makeHarness(A,async()=>{throw new Error("network outage")});
  await assert.rejects(()=>h.get("/phone/outbound"),/network outage/);
});
test("logout and navigation handlers erase previous DOM data, not only hide it",()=>{
  assert.match(source,/const err=text=>\{root\.replaceChildren\(\)/);
  assert.match(source,/liveStopped=true;clearTimeout\(liveTimer\);trackedCallId="";\s*root\.replaceChildren\(\);root\.hidden=true/);
  assert.match(source,/window\.addEventListener\("pagehide",\(\)=>\{[\s\S]{0,220}root\.replaceChildren\(\);root\.hidden=true;liveClear\(\)/);
  assert.match(source,/liveClear=\(\)=>\{liveCalls\?\.replaceChildren\(\);liveTranscript\?\.replaceChildren\(\)/);
  assert.match(source,/window\.addEventListener\("pageshow",event=>\{if\(event\.persisted\)window\.location\.reload\(\)\}\)/);
  assert.match(source,/viewActive=false;liveStopped=true/);
  assert.match(source,/if\(!viewActive\)return;\s*const list=/);
  assert.match(source,/if\(!viewActive\)return;\s*liveTranscript\.replaceChildren\(\)/);
});
test("source remains read-only and cannot place paid calls",()=>{
  assert.doesNotMatch(source,/joinConference|startNewCall|triggerPaidCall|call\/outbound\/start/);
  assert.match(source,/cache:"no-store"/);
  assert.match(source,/phone\/outbound\/transcript/);
});
