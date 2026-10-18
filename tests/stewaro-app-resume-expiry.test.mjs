import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../assets/stewaro-app-bootstrap.js',import.meta.url),'utf8');
const KEY='scb_web_session';
const LOGIN='https://account.stewaro.com/anmelden?produkt=senioren&next=app';

function start(){
  const events=new Map(),redirects=[],data=new Map([[KEY,JSON.stringify({
    session_token:'synthetic-token',person_id:'synthetic-person',
    customer_account_id:'synthetic-account',remember_me:false
  })]]),remembered=new Map();
  const storage=map=>({
    getItem:key=>map.get(key)??null,
    setItem:(key,value)=>map.set(key,value),
    removeItem:key=>map.delete(key)
  });
  const document={
    visibilityState:'visible',
    documentElement:{dataset:{},classList:{add(){}}},
    createElement:()=>({}),head:{appendChild(){}},
    addEventListener:(name,fn)=>events.set(name,fn),
    querySelectorAll:()=>[]
  };
  const location={
    hostname:'app.stewaro.com',pathname:'/web-concierge',search:'',hash:'',
    replace:url=>redirects.push(url)
  };
  const context={
    window:{},document,location,
    sessionStorage:storage(data),localStorage:storage(remembered),
    addEventListener:(name,fn)=>events.set(name,fn),
    URLSearchParams,HTMLAnchorElement:class{},setTimeout,clearTimeout,
    fetch:async()=>({ok:true,json:async()=>({
      ok:true,status:'session_valid',person_id:'synthetic-person',
      customer_account_id:'synthetic-account',
      expires_at:'2099-01-01T00:00:00Z',idle_expires_at:'2099-01-01T00:00:00Z'
    })})
  };
  vm.runInNewContext(source,context,{timeout:1000});
  return {events,redirects,data,remembered,document,context};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function expire(state,key){
  const session=JSON.parse(state.data.get(KEY));
  session[key]='2000-01-01T00:00:00Z';
  state.data.set(KEY,JSON.stringify(session));
}

test('valid resumed session stays available',async()=>{
  const x=start();
  assert.equal(await x.context.window.STEWARO_APP_AUTH_READY,true);
  x.events.get('pageshow')();
  await settle();
  assert.deepEqual(x.redirects,[]);
  assert.equal(x.data.has(KEY),true);
});
test('idle expiry clears identity and redirects once',async()=>{
  const x=start();
  assert.equal(await x.context.window.STEWARO_APP_AUTH_READY,true);
  expire(x,'idle_expires_at');
  x.events.get('pageshow')();
  await settle();
  assert.deepEqual(x.redirects,[LOGIN]);
  assert.equal(x.data.has(KEY),false);
  assert.equal(x.remembered.has(KEY),false);
});
test('absolute expiry clears identity',async()=>{
  const x=start();
  assert.equal(await x.context.window.STEWARO_APP_AUTH_READY,true);
  expire(x,'expires_at');
  x.events.get('focus')();
  await settle();
  assert.deepEqual(x.redirects,[LOGIN]);
});
test('missing session fails closed',async()=>{
  const x=start();
  assert.equal(await x.context.window.STEWARO_APP_AUTH_READY,true);
  x.data.delete(KEY);
  x.events.get('pageshow')();
  await settle();
  assert.deepEqual(x.redirects,[LOGIN]);
});
test('duplicate events do not multiply redirects',async()=>{
  const x=start();
  assert.equal(await x.context.window.STEWARO_APP_AUTH_READY,true);
  expire(x,'idle_expires_at');
  x.events.get('pageshow')();
  x.events.get('focus')();
  x.events.get('visibilitychange')();
  await settle();
  assert.deepEqual(x.redirects,[LOGIN]);
});
test('hidden tab redirects only after becoming visible',async()=>{
  const x=start();
  assert.equal(await x.context.window.STEWARO_APP_AUTH_READY,true);
  expire(x,'idle_expires_at');
  x.document.visibilityState='hidden';
  x.events.get('visibilitychange')();
  await settle();
  assert.deepEqual(x.redirects,[]);
  x.document.visibilityState='visible';
  x.events.get('visibilitychange')();
  await settle();
  assert.deepEqual(x.redirects,[LOGIN]);
});
