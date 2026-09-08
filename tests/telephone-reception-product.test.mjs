import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { webcrypto } from "node:crypto";

const r=(p)=>fs.readFileSync(p,"utf8");
const page=r("telefonannahme.html");
const js=r("assets/telephone-reception-product.js");
const home=r("index.html");
const services=r("leistungen.html");
const pricing=r("pakete.html");
const registration=r("registrieren.html");

function memoryStorage(initial={}) {
  const map=new Map(Object.entries(initial));
  return {
    getItem:(k)=>map.has(k)?map.get(k):null,
    setItem:(k,v)=>map.set(k,String(v)),
    removeItem:(k)=>map.delete(k),
    dump:()=>Object.fromEntries(map)
  };
}
function loadHooks() {
  const sandbox={
    console,
    crypto:webcrypto,
    TextEncoder,
    Uint8Array,
    document:{getElementById:()=>null}
  };
  vm.createContext(sandbox);
  vm.runInContext(js,sandbox,{filename:"telephone-reception-product.js"});
  return sandbox.NAHWERKTelephoneReceptionTestHooks;
}
function response(status,body) {
  return {status,ok:status>=200&&status<300,json:async()=>body};
}
const hooks=loadHooks();
const validPayload={
  productScope:"STANDALONE",
  billingMode:"SUBSCRIPTION",
  existingLandline:"+49 30 1234567",
  currentProvider:"Telekom",
  handlerMode:"TELEPHONE_AGENT",
  telephoneAgent:"james",
  callbackNumber:"+49 30 7654321"
};
const success201={
  ok:true,status:"number_submitted",state:"NUMBER_SUBMITTED",duplicate:false,
  routing_active:false,porting_active:false,provider_called:false
};
const replay200={...success201,duplicate:true};

test("telephone reception remains a separate product without invented prices",()=>{
  assert.match(page,/NAHWERK geht für Sie ans Telefon/);
  assert.match(page,/Telefonannahme Standalone/);
  assert.match(page,/Concierge \+ Telefonannahme/);
  assert.match(page,/Abo/);
  assert.match(page,/Pay as you go/);
  assert.doesNotMatch(page,/\b\d+[,.]\d{2}\s*€/);
});

test("closed platform contract SHA and prepared-but-not-deployed truth are explicit",()=>{
  assert.match(js,/b9cae952e1c9cdae45a238d9cd902a9f2d798452/);
  assert.match(page,/b9cae952e1c9cdae45a238d9cd902a9f2d798452/);
  assert.match(js,/PREPARED_NUMBER_ONBOARDING_ENDPOINT = "https:\/\/djicahhmnnamtjuqedqd\.supabase\.co\/functions\/v1\/nahwerk-telephone-reception-onboarding\/number\/submit"/);
  assert.match(js,/const NUMBER_ONBOARDING_ENDPOINT = null/);
  assert.match(page,/Platform-Endpunkt ist vorbereitet, aber noch nicht deployed/);
  assert.doesNotMatch(page,/Endpunkt fehlt noch/);
});

test("endpoint null produces zero network requests",async()=>{
  let calls=0;
  const out=await hooks.submitNumber({
    endpoint:null,token:"x".repeat(40),payload:validPayload,
    fetchImpl:async()=>{calls++;throw new Error("must not run")},
    storage:memoryStorage(),cryptoImpl:webcrypto
  });
  assert.equal(out.kind,"endpoint_not_deployed");
  assert.equal(out.networkRequestMade,false);
  assert.equal(calls,0);
});

test("authenticated submit uses exact headers and allowlisted payload only",async()=>{
  const storage=memoryStorage();
  let captured;
  const dirty={...validPayload,person_id:"forbidden",customer_account_id:"forbidden",state:"ROUTING_ACTIVE",provider_called:true,ownership_evidence:"x"};
  const out=await hooks.submitNumber({
    endpoint:"http://127.0.0.1/mock-number-submit",token:"session-token-1234567890",
    payload:dirty,storage,cryptoImpl:webcrypto,
    fetchImpl:async(url,init)=>{captured={url,init};return response(201,success201)}
  });
  assert.equal(out.kind,"number_submitted");
  assert.equal(captured.url,"http://127.0.0.1/mock-number-submit");
  assert.equal(captured.init.method,"POST");
  assert.equal(captured.init.headers.Authorization,"Bearer session-token-1234567890");
  assert.equal(captured.init.headers["Content-Type"],"application/json");
  assert.match(captured.init.headers["Idempotency-Key"],/^[A-Za-z0-9._:-]{16,200}$/);
  const body=JSON.parse(captured.init.body);
  assert.deepEqual(Object.keys(body),["productScope","billingMode","existingLandline","currentProvider","handlerMode","telephoneAgent","callbackNumber"]);
  for(const forbidden of ["person_id","customer_account_id","customer_member_id","state","ownership_evidence","provider_evidence","routing_active","porting_active","provider_called"]) {
    assert.equal(Object.hasOwn(body,forbidden),false,forbidden);
  }
});

test("201 first submit requires duplicate false and exact NUMBER_SUBMITTED safety flags",async()=>{
  const out=await hooks.submitNumber({
    endpoint:"http://127.0.0.1/mock",token:"token",payload:validPayload,
    storage:memoryStorage(),cryptoImpl:webcrypto,fetchImpl:async()=>response(201,success201)
  });
  assert.equal(out.kind,"number_submitted");
  assert.equal(out.duplicate,false);
  assert.equal(out.state,"NUMBER_SUBMITTED");
});

test("200 replay requires duplicate true",async()=>{
  const out=await hooks.submitNumber({
    endpoint:"http://127.0.0.1/mock",token:"token",payload:validPayload,
    storage:memoryStorage(),cryptoImpl:webcrypto,fetchImpl:async()=>response(200,replay200)
  });
  assert.equal(out.kind,"number_submitted");
  assert.equal(out.duplicate,true);
});

test("malformed success variants fail closed",async()=>{
  const badBodies=[
    {...success201,ok:false},
    {...success201,status:"routing_active"},
    {...success201,state:"ROUTING_ACTIVE"},
    {...success201,routing_active:true},
    {...success201,porting_active:true},
    {...success201,provider_called:true},
    {...success201,duplicate:true}
  ];
  for(const body of badBodies){
    const out=await hooks.submitNumber({
      endpoint:"http://127.0.0.1/mock",token:"token",payload:validPayload,
      storage:memoryStorage(),cryptoImpl:webcrypto,fetchImpl:async()=>response(201,body)
    });
    assert.equal(out.kind,"invalid_canonical_submit_response");
  }
  const wrongReplay=await hooks.submitNumber({
    endpoint:"http://127.0.0.1/mock",token:"token",payload:validPayload,
    storage:memoryStorage(),cryptoImpl:webcrypto,fetchImpl:async()=>response(200,{...success201,duplicate:false})
  });
  assert.equal(wrongReplay.kind,"invalid_canonical_submit_response");
});

test("409 idempotency conflict is terminal for the same pending payload and does not mint a new retry key",async()=>{
  const storage=memoryStorage();
  let calls=0,key;
  const fetchImpl=async(_url,init)=>{calls++;key??=init.headers["Idempotency-Key"];assert.equal(init.headers["Idempotency-Key"],key);return response(409,{ok:false,status:"idempotency_conflict"})};
  const first=await hooks.submitNumber({endpoint:"http://127.0.0.1/mock",token:"token",payload:validPayload,storage,cryptoImpl:webcrypto,fetchImpl});
  const second=await hooks.submitNumber({endpoint:"http://127.0.0.1/mock",token:"token",payload:validPayload,storage,cryptoImpl:webcrypto,fetchImpl});
  assert.equal(first.kind,"idempotency_conflict");
  assert.equal(second.kind,"idempotency_conflict");
  assert.equal(second.blockedReplay,true);
  assert.equal(calls,1);
});

test("409 number already submitted stops further submit loops for the same payload",async()=>{
  const storage=memoryStorage();
  let calls=0;
  const fetchImpl=async()=>{calls++;return response(409,{ok:false,status:"number_already_submitted"})};
  const first=await hooks.submitNumber({endpoint:"http://127.0.0.1/mock",token:"token",payload:validPayload,storage,cryptoImpl:webcrypto,fetchImpl});
  const second=await hooks.submitNumber({endpoint:"http://127.0.0.1/mock",token:"token",payload:validPayload,storage,cryptoImpl:webcrypto,fetchImpl});
  assert.equal(first.kind,"number_already_submitted");
  assert.equal(second.kind,"number_already_submitted");
  assert.equal(calls,1);
});

test("uncertain retry reuses the same idempotency key and never auto-retries",async()=>{
  const storage=memoryStorage();
  const keys=[];
  let calls=0;
  const first=await hooks.submitNumber({
    endpoint:"http://127.0.0.1/mock",token:"token",payload:validPayload,storage,cryptoImpl:webcrypto,
    fetchImpl:async(_url,init)=>{calls++;keys.push(init.headers["Idempotency-Key"]);throw new Error("network uncertain")}
  });
  assert.equal(first.kind,"uncertain_network_error");
  assert.equal(calls,1);
  const second=await hooks.submitNumber({
    endpoint:"http://127.0.0.1/mock",token:"token",payload:validPayload,storage,cryptoImpl:webcrypto,
    fetchImpl:async(_url,init)=>{calls++;keys.push(init.headers["Idempotency-Key"]);return response(201,success201)}
  });
  assert.equal(second.kind,"number_submitted");
  assert.equal(calls,2);
  assert.equal(keys[0],keys[1]);
});

test("malformed response keeps pending key for a deliberate retry",async()=>{
  const storage=memoryStorage();
  const keys=[];
  await hooks.submitNumber({
    endpoint:"http://127.0.0.1/mock",token:"token",payload:validPayload,storage,cryptoImpl:webcrypto,
    fetchImpl:async(_url,init)=>{keys.push(init.headers["Idempotency-Key"]);return response(201,{...success201,routing_active:true})}
  });
  await hooks.submitNumber({
    endpoint:"http://127.0.0.1/mock",token:"token",payload:validPayload,storage,cryptoImpl:webcrypto,
    fetchImpl:async(_url,init)=>{keys.push(init.headers["Idempotency-Key"]);return response(201,success201)}
  });
  assert.equal(keys[0],keys[1]);
});

test("role guards remain fail closed",()=>{
  assert.equal(hooks.roleAllowed({productScope:"STANDALONE",handlerMode:"TELEPHONE_AGENT",personalConciergeAllowed:false}),true);
  assert.equal(hooks.roleAllowed({productScope:"STANDALONE",handlerMode:"PERSONAL_CONCIERGE",personalConciergeAllowed:true}),false);
  assert.equal(hooks.roleAllowed({productScope:"CONCIERGE_BUNDLE",handlerMode:"PERSONAL_CONCIERGE",personalConciergeAllowed:false}),false);
  assert.equal(hooks.roleAllowed({productScope:"CONCIERGE_BUNDLE",handlerMode:"PERSONAL_CONCIERGE",personalConciergeAllowed:true}),true);
  assert.equal(hooks.roleAllowed({productScope:"CONCIERGE_BUNDLE",handlerMode:"TELEPHONE_AGENT",personalConciergeAllowed:false}),true);
});

test("client phone check is UX-only while server authority remains explicit",()=>{
  assert.match(js,/clientseitige Prüfung dient nur der Eingabehilfe/);
  assert.match(js,/Server-Normalisierung und Server-Validierung bleiben maßgeblich/);
});

test("only routing or porting active are active states",()=>{
  assert.match(js,/new Set\(\["ROUTING_ACTIVE", "PORTING_ACTIVE"\]\)/);
  for(const state of ["NUMBER_SUBMITTED","OWNERSHIP_PENDING","OWNERSHIP_VERIFIED","PROVIDER_SETUP_PENDING","ROUTING_PENDING","PORTING_PENDING","ROUTING_ACTIVE","PORTING_ACTIVE","ROUTING_FAILED"]) assert.ok(page.includes(state),state);
  assert.match(page,/Nie automatisch aktiv/);
});

test("senior fixed-line and shared-context product regressions stay intact",()=>{
  assert.match(page,/Kein Smartphone nötig/);
  assert.match(page,/normales Festnetztelefon/);
  assert.match(page,/Keine App, kein QR-Code, keine Push-Nachricht/);
  assert.match(page,/Kein Weitererzählen\. Kein Informationsverlust\. Ein NAHWERK/);
  assert.match(page,/Hausverwaltung/);
});

test("product integration, pricing, hero and header regressions stay intact",()=>{
  for(const body of [home,services,pricing,registration]) assert.match(body,/telefonannahme\.html/);
  assert.match(home,/nahwerk-overview-hero-weboptimized-hq\.webp/);
  assert.match(home,/Ein Concierge, der nicht nur antwortet\. Sondern sich kümmert\./);
  assert.match(home,/body\.overview-page\.nw-header-scrolled \.top/);
  assert.match(home,/rgba\(7,\s*7,\s*6,\s*0\.82\)/);
  assert.match(pricing,/SUBSCRIPTION[\s\S]{0,120}PAYG/);
});
