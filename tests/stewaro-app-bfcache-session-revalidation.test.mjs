import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../assets/stewaro-app-bootstrap.js',import.meta.url),'utf8');
const KEY='scb_web_session',EXP='2099-01-01T00:00:00Z';
const LOGIN='https://account.stewaro.com/anmelden?produkt=senioren&next=app';
const valid={ok:true,status:'session_valid',person_id:'p1',customer_account_id:'a1',expires_at:EXP,idle_expires_at:EXP};
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function boot(){
 const events=new Map(),data=new Map([[KEY,JSON.stringify({session_token:'tok1',person_id:'p1',customer_account_id:'a1'})]]);
 const remembered=new Map(),redirects=[],calls=[],shell={hidden:false};
 const storage=map=>({getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)});
 const document={visibilityState:'visible',documentElement:{dataset:{},classList:{add(){}}},createElement:()=>({}),head:{appendChild(){}},
  getElementById:id=>id==='stewaroAppShell'?shell:null,querySelectorAll:()=>[],addEventListener(){}};
 const location={hostname:'app.stewaro.com',origin:'https://app.stewaro.com',pathname:'/web-concierge',search:'',hash:'',replace:url=>redirects.push(url)};
 const window={};
 const context={window,document,location,sessionStorage:storage(data),localStorage:storage(remembered),
  URLSearchParams,HTMLAnchorElement:class{},addEventListener:(name,fn)=>events.set(name,fn),setTimeout,clearTimeout,
  fetch:(url,options)=>new Promise(resolve=>calls.push({url,options,reply:(body,ok=true)=>resolve({ok,json:async()=>body})}))};
 vm.runInNewContext(source,context,{timeout:1000});
 return {events,data,remembered,redirects,calls,shell,window};
}
async function ready(){
 const x=boot();assert.equal(x.calls.length,1);x.calls[0].reply(valid);
 assert.equal(await x.window.STEWARO_APP_AUTH_READY,true);return x;
}
test('cached page hides private UI and revalidates before showing it',async()=>{
 const x=await ready();x.events.get('pagehide')({persisted:true});
 assert.equal(x.shell.hidden,true);
 x.events.get('pageshow')({persisted:true});await settle();
 assert.equal(x.calls.length,2);assert.equal(x.shell.hidden,true);
 x.calls[1].reply(valid);assert.equal(await x.window.STEWARO_APP_AUTH_READY,true);
 assert.equal(x.shell.hidden,false);assert.deepEqual(x.redirects,[]);
});
test('revoked cached session never reveals private App',async()=>{
 const x=await ready();x.events.get('pagehide')({persisted:true});
 x.events.get('pageshow')({persisted:true});await settle();
 x.calls[1].reply({...valid,status:'revoked'});
 assert.equal(await x.window.STEWARO_APP_AUTH_READY,false);
 assert.equal(x.shell.hidden,true);assert.deepEqual(x.redirects,[LOGIN]);
 assert.equal(x.data.has(KEY),false);
});
test('late cached response cannot undo logout',async()=>{
 const x=await ready();x.events.get('pagehide')({persisted:true});
 x.events.get('pageshow')({persisted:true});const gate=x.window.STEWARO_APP_AUTH_READY;
 await settle();x.data.delete(KEY);x.window.STEWARO_APP_AUTH_READY=Promise.resolve(false);
 x.calls[1].reply(valid);assert.equal(await gate,false);
 assert.equal(x.shell.hidden,true);assert.deepEqual(x.redirects,[]);
});
test('expired cached identity redirects without network',async()=>{
 const x=await ready();x.events.get('pagehide')({persisted:true});
 const s=JSON.parse(x.data.get(KEY));s.idle_expires_at='2000-01-01T00:00:00Z';
 x.data.set(KEY,JSON.stringify(s));x.events.get('pageshow')({persisted:true});
 assert.equal(x.calls.length,1);assert.equal(x.shell.hidden,true);
 assert.deepEqual(x.redirects,[LOGIN]);
});
test('repeated cache restores remain single-flight',async()=>{
 const x=await ready();x.events.get('pagehide')({persisted:true});
 x.events.get('pageshow')({persisted:true});x.events.get('pageshow')({persisted:true});
 await settle();assert.equal(x.calls.length,2);
 x.calls[1].reply(valid);assert.equal(await x.window.STEWARO_APP_AUTH_READY,true);
});
test('normal navigation does not add session requests',async()=>{
 const x=await ready();x.events.get('pagehide')({persisted:false});
 assert.equal(x.shell.hidden,false);x.events.get('pageshow')({persisted:false});
 await settle();assert.equal(x.calls.length,1);
});
