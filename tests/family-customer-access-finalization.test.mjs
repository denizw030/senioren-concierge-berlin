import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { webcrypto } from "node:crypto";

const family=fs.readFileSync("assets/family-owner-sponsored-access.js","utf8");
const konto=fs.readFileSync("konto.html","utf8");
const css=fs.readFileSync("assets/account-premium-ui.css","utf8");

function hooks(){
  const sandbox={console,URL,TextEncoder,Uint8Array,crypto:webcrypto,Intl};
  vm.createContext(sandbox);
  vm.runInContext(family,sandbox);
  return sandbox.NAHWERKFamilyOwnerTestHooks;
}
function storage(){
  const m=new Map();
  return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};
}
function response(status,body){return {status,ok:status>=200&&status<300,json:async()=>body}}

const h=hooks();
const token="x".repeat(40);
const customer={ok:true,family_manager:{role:"CUSTOMER",can_manage_family_people:true,can_manage_sponsored_entitlements:false},browser_actor_authority:false};
const owner={ok:true,family_manager:{role:"OWNER",can_manage_family_people:true,can_manage_sponsored_entitlements:true},browser_actor_authority:false};

test("normal customer gets Family people management but never entitlement admin",()=>{
  assert.equal(h.operatorContextAllowed(customer),true);
  assert.equal(h.canManageEntitlements(customer),false);
  assert.equal(h.operatorContextAllowed(owner),true);
  assert.equal(h.canManageEntitlements(owner),true);
  assert.equal(h.operatorContextAllowed({...customer,browser_actor_authority:true}),false);
});

test("universal searchable picker covers required BCP47 product examples",()=>{
  const entries=h.languagePickerEntries();
  for(const code of ["de","tr","en","fr","es","my","ar","pl","uk","pt-BR","ru","it","el","fa","hi","ur","vi","zh","ja","ko"]){
    assert.ok(entries.some(entry=>entry.code===code),code);
  }
  assert.ok(entries.length>150);
  const burmese=entries.find(entry=>entry.code==="my");
  assert.match(burmese.display,/Burmesisch/);
  assert.equal(h.resolveLanguagePickerValue(burmese.display,entries),"my");
  assert.equal(h.resolveLanguagePickerValue("my",entries),null);
  assert.equal(h.normalizeLanguage("not a tag"),null);
});

test("picker UI is searchable keyboard-native and screenreader described",()=>{
  assert.match(konto,/id="familyPreferredLanguage" type="search"/);
  assert.match(konto,/list="familyLanguageOptions"/);
  assert.match(konto,/aria-describedby="familyLanguageHint"/);
  assert.match(konto,/id="familyLanguageOptions"/);
  assert.match(konto,/Technische Sprachcodes sind nicht erforderlich/);
  assert.doesNotMatch(konto,/Sprachcode \(BCP 47\)/);
});

test("customer invitation payload carries no admin entitlement requirement",async()=>{
  const input={
    first_name:"Mya",last_name:"Example",relationship:"MOTHER",
    whatsapp_number:"+491700000011",preferred_language:"my",
    concierge_choice:"leyla",form_of_address:"DU",personal_message:"",
    contact_consent_attested:true,entitlements:[]
  };
  const payload=h.invitationPayload(input);
  assert.deepEqual(JSON.parse(JSON.stringify(payload.entitlements)),[]);
  let sent;
  const result=await h.createInvitation({
    base:"http://127.0.0.1/mock",token,input,storage:storage(),cryptoImpl:webcrypto,
    fetchImpl:async(_url,init)=>{
      sent=JSON.parse(init.body);
      return response(201,{ok:true,state:"MESSAGE_PENDING",duplicate:false,outbound:{provider_execution:false}});
    }
  });
  assert.equal(result.ok,true);
  assert.deepEqual(sent.entitlements,[]);
  assert.equal(sent.preferred_language,"my");
});

test("multiple persons stay distinct in website model",()=>{
  const rows=h.mergeServerPeople({ok:true,people:[]},{ok:true,invitations:[
    {id:"00000000-0000-4000-8000-000000000101",first_name:"Mutter",last_name:"A",relationship:"MOTHER",preferred_language:"tr",concierge_choice:"leyla",state:"MESSAGE_PENDING"},
    {id:"00000000-0000-4000-8000-000000000102",first_name:"Vater",last_name:"B",relationship:"FATHER",preferred_language:"ar",concierge_choice:"leyla",state:"MESSAGE_PENDING"},
    {id:"00000000-0000-4000-8000-000000000103",first_name:"Tante",last_name:"C",relationship:"RELATIVE",preferred_language:"pl",concierge_choice:"leyla",state:"MESSAGE_PENDING"}
  ]});
  assert.equal(rows.length,3);
  assert.deepEqual(rows.map(x=>x.language),["tr","ar","pl"]);
});

test("privacy and OWNER-only quota copy are explicit",()=>{
  assert.match(konto,/keine privaten Chats, Memories, Aufgaben oder persönlichen Inhalte/);
  assert.match(konto,/eigenen privaten Concierge-Kontext/);
  assert.match(konto,/id="familyQuotaSection"/);
  assert.match(family,/document\.getElementById\("familyQuotaSection"\)\.hidden=!ownerAdmin/);
  assert.match(family,/canManageEntitlements\(operatorBody\)\?buildEntitlements[^:]+:\[\]/);
});

test("mobile premium composition covers phone and tablet widths",()=>{
  for(const width of ["768px","390px","360px"])assert.ok(css.includes("@media(max-width:"+width+")"),width);
  assert.match(css,/:focus-visible/);
});

test("provider execution remains a server-confirmed false boundary",async()=>{
  const input={first_name:"A",last_name:"B",relationship:"OTHER",whatsapp_number:"+491700000012",preferred_language:"ar",concierge_choice:"leyla",form_of_address:"DU",personal_message:"",contact_consent_attested:true,entitlements:[]};
  const r=await h.createInvitation({base:"http://127.0.0.1/mock",token,input,storage:storage(),cryptoImpl:webcrypto,fetchImpl:async()=>response(201,{ok:true,state:"MESSAGE_SENT",outbound:{provider_execution:true}})});
  assert.equal(r.ok,false);
  assert.equal(r.kind,"invalid_server_confirmation");
});
