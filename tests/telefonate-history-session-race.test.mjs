import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const page=readFileSync('telefonate/index.html','utf8');
const script=page.match(/<script>\s*([\s\S]*?)\s*<\/script>/)?.[1];
assert.ok(script,'phone history inline loader exists');
const tick=()=>new Promise(resolve=>setImmediate(resolve));

function setup(initialToken='A'.repeat(48)){
  let currentToken=initialToken,resolveFetch,rejectFetch;
  const state={className:'notice',hidden:false,textContent:'',children:[],replaceChildren(...nodes){this.children=nodes;}};
  const list={hidden:true,children:[],replaceChildren(...nodes){this.children=nodes;},appendChild(node){this.children.push(node);},set innerHTML(value){if(value==='')this.children=[];}};
  const document={documentElement:{dataset:{}},getElementById:id=>id==='phoneState'?state:list,
    createElement:tag=>({tagName:tag,href:'',textContent:'',innerHTML:'',className:''}),createTextNode:textContent=>({textContent})};
  const handlers={};
  const window={STEWAROPhoneSession:{token:()=>currentToken,loginHref:()=>'/anmelden'},addEventListener:(name,fn)=>{handlers[name]=fn;}};
  const fetch=(url,options)=>new Promise((resolve,reject)=>{resolveFetch=resolve;rejectFetch=reject;});
  runInNewContext(script,{window,document,localStorage:{getItem:()=>null},fetch,Date,Number,String,Array,JSON});
  return {state,list,dispatch:(name,event={})=>handlers[name]?.(event),setToken:value=>{currentToken=value;},respond:(status,body)=>resolveFetch({status,ok:status>=200&&status<300,json:async()=>body}),reject:()=>rejectFetch(new Error('offline'))};
}
const ok={ok:true,environment:'PROD',authoritative:true,raw_transcripts_included:false,calls:[{title:'Private call A',summary:'Confidential A'}]};

test('a delayed history response never shows previous identity calls',async()=>{
  const t=setup();t.setToken('B'.repeat(48));t.respond(200,ok);await tick();
  assert.equal(t.list.hidden,true);
  assert.equal(t.list.children.length,0);
  assert.match(t.state.textContent,/Sitzung.*geändert/);
});

test('a delayed old 401 does not present a login failure for the new identity',async()=>{
  const t=setup();t.setToken('B'.repeat(48));t.respond(401,{});await tick();
  assert.equal(t.list.hidden,true);assert.equal(t.list.children.length,0);
  assert.equal(t.state.className,'notice');
});

test('a late old-network failure does not present a new-session error',async()=>{
  const t=setup();t.setToken('B'.repeat(48));t.reject();await tick();
  assert.equal(t.state.className,'notice');
  assert.equal(t.list.hidden,true);
});

test('the unchanged authenticated session can still render verified call history',async()=>{
  const t=setup();t.respond(200,ok);await tick();
  assert.equal(t.list.hidden,false);assert.equal(t.list.children.length,1);
  assert.match(t.list.children[0].innerHTML,/Private call A/);
});

test('no session remains fail-closed and offers the existing login',async()=>{
  const t=setup('');await tick();
  assert.equal(t.list.hidden,true);assert.equal(t.state.className,'error');
  assert.equal(t.state.children[1].href,'/anmelden');
});

test('an unchanged expired session still uses the existing login handoff',async()=>{
  const t=setup();t.respond(401,{});await tick();
  assert.equal(t.state.className,'error');assert.equal(t.list.hidden,true);
  assert.equal(t.state.children[1].href,'/anmelden');
});

test('non-authoritative history never renders private calls',async()=>{
  const t=setup();t.respond(200,{...ok,authoritative:false});await tick();
  assert.equal(t.list.hidden,true);assert.equal(t.list.children.length,0);
  assert.equal(t.state.className,'error');
});

test('pagehide removes private history before a browser back-forward cache restore',async()=>{
  const t=setup();t.respond(200,ok);await tick();
  assert.equal(t.list.children.length,1);
  t.dispatch('pagehide');
  assert.equal(t.list.hidden,true);assert.equal(t.list.children.length,0);
  assert.equal(t.state.className,'notice');
  t.dispatch('pageshow',{persisted:true});
  t.respond(200,ok);await tick();
  assert.equal(t.list.hidden,false);assert.equal(t.list.children.length,1);
});

test('a pre-pagehide response cannot repopulate private history after navigation',async()=>{
  const t=setup();t.dispatch('pagehide');t.respond(200,ok);await tick();
  assert.equal(t.list.hidden,true);assert.equal(t.list.children.length,0);
  assert.equal(t.state.className,'notice');
});

test('a visible private call list is cleared when the account changes before refocus',async()=>{
  const t=setup();t.respond(200,ok);await tick();
  assert.equal(t.list.children.length,1);
  t.setToken('B'.repeat(48));t.dispatch('focus');
  assert.equal(t.list.hidden,true);assert.equal(t.list.children.length,0);
  assert.match(t.state.textContent,/Sitzung.*geändert/);
});

test('a cross-tab session change immediately hides previously rendered private calls',async()=>{
  const t=setup();t.respond(200,ok);await tick();
  assert.equal(t.list.children.length,1);
  t.dispatch('storage',{key:'scb_web_session'});
  assert.equal(t.list.hidden,true);assert.equal(t.list.children.length,0);
  assert.equal(t.state.className,'notice');
});

test('an unrelated theme storage event preserves verified private calls',async()=>{
  const t=setup();t.respond(200,ok);await tick();
  t.dispatch('storage',{key:'nw_portal_theme_v1'});
  assert.equal(t.list.hidden,false);assert.equal(t.list.children.length,1);
});

test('a pending old response cannot repopulate history after cross-tab logout',async()=>{
  const t=setup();t.dispatch('storage',{key:'scb_web_session'});
  t.respond(200,ok);await tick();
  assert.equal(t.list.hidden,true);assert.equal(t.list.children.length,0);
});
