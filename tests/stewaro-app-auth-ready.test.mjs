import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const source=fs.readFileSync("assets/stewaro-app-bootstrap.js","utf8");
function start({handoff=true,session=false,ok=true}={}){
 let resolveFetch; const redirects=[]; const stored=new Map();
 if(session)stored.set("scb_web_session",JSON.stringify({session_token:"existing"}));
 const storage={getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v),removeItem:k=>stored.delete(k)};
 const window={};
 const ctx={window,location:{hostname:"app.stewaro.com",hash:handoff?"#handoff=hnd_"+"a".repeat(48):"",pathname:"/web-concierge",search:"",replace:v=>redirects.push(v)},history:{replaceState:()=>{ctx.location.hash=""}},document:{documentElement:{dataset:{},classList:{add(){}}},createElement:()=>({}),head:{appendChild(){}},querySelectorAll:()=>[]},sessionStorage:storage,localStorage:{getItem:()=>null,removeItem(){},setItem(){}},URLSearchParams,Promise,HTMLAnchorElement:class{},addEventListener(){},fetch:()=>new Promise(r=>{resolveFetch=r})};
 vm.runInNewContext(source,ctx);
 return {window,redirects,stored,ctx,claim:()=>resolveFetch({ok,json:async()=>ok?{ok:true,status:"handoff_claimed",session_token:"claimed"}:{ok:false}})};
}
test("handoff waits without sending fresh or existing app sessions to login",async()=>{
 for(const session of [false,true]){
  const x=start({session}); let settled=false;
  x.window.STEWARO_APP_AUTH_READY.then(()=>{settled=true});
  await Promise.resolve(); assert.equal(settled,false);
  assert.deepEqual(x.redirects,[]);assert.equal(x.ctx.location.hash,"");
  x.claim();assert.equal(await x.window.STEWARO_APP_AUTH_READY,false);
  assert.equal(JSON.parse(x.stored.get("scb_web_session")).session_token,"claimed");
  assert.deepEqual(x.redirects,["/web-concierge"]);
 }
});
test("failed claim blocks app initialization and returns to account login",async()=>{
 const x=start({session:true,ok:false});x.claim();
 assert.equal(await x.window.STEWARO_APP_AUTH_READY,false);
 assert.equal(x.stored.has("scb_web_session"),false);
 assert.match(x.redirects[0],/^https:\/\/account\.stewaro\.com\/anmelden/);
});
test("existing app session starts immediately; missing session blocks",async()=>{
 assert.equal(await start({handoff:false,session:true}).window.STEWARO_APP_AUTH_READY,true);
 const x=start({handoff:false});assert.equal(await x.window.STEWARO_APP_AUTH_READY,false);
 assert.match(x.redirects[0],/account\.stewaro\.com/);
});
test("runtime awaits bootstrap before reading or initializing session UI",()=>{
 const client=fs.readFileSync("assets/web-customer-concierge.js","utf8");
 assert.match(client,/async function boot\(\) \{\s*if\(location.hostname==="app.stewaro.com"&&window.STEWARO_APP_AUTH_READY\)\{\s*if\(await window.STEWARO_APP_AUTH_READY!==true\)return;/);
});
