import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../assets/stewaro-app-bootstrap.js',import.meta.url),'utf8');
const KEY='scb_web_session';
const session={session_token:'old-token',person_id:'person-1',customer_account_id:'account-1'};
const expiry={expires_at:'2099-01-01T00:00:00Z',idle_expires_at:'2099-01-01T00:00:00Z'};
const valid={ok:true,status:'session_valid',person_id:'person-1',customer_account_id:'account-1',...expiry};
const response=body=>({ok:true,json:async()=>body});
function boot({origin='https://app.stewaro.com',hash='',saved=true,replaceStateThrows=false}={}){
  let resolve;
  const values=new Map(saved?[[KEY,JSON.stringify(session)]]:[]),persistent=new Map(),redirects=[],calls=[];
  const storage=map=>({getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)});
  const location={hostname:'app.stewaro.com',origin,hash,pathname:'/web-concierge',search:'',replace:v=>redirects.push(v)};
  const document={visibilityState:'visible',documentElement:{dataset:{},classList:{add(){}}},createElement:()=>({}),head:{appendChild(){}},querySelectorAll:()=>[],addEventListener(){}};
  const window={};
  const context={window,location,document,sessionStorage:storage(values),localStorage:storage(persistent),URLSearchParams,HTMLAnchorElement:class{},
    history:{replaceState:()=>{if(replaceStateThrows)throw new Error('SecurityError');location.hash=''}},addEventListener(){},setTimeout:()=>1,clearTimeout(){},
    fetch:(url,opts)=>{calls.push({url,opts});return new Promise(r=>{resolve=r})}};
  vm.runInNewContext(source,context,{timeout:1000});
  return {window,values,redirects,calls,reply:body=>resolve(response(body)),read:()=>values.has(KEY)?JSON.parse(values.get(KEY)):null};
}

test('only canonical HTTPS App origin can start identity requests',async()=>{
  for(const origin of ['http://app.stewaro.com','https://app.stewaro.com:444','https://app.stewaro.com.evil.test']){
    const x=boot({origin,hash:'#handoff=hnd_'+'A'.repeat(40)});
    assert.equal(x.calls.length,0);assert.deepEqual(x.redirects,[]);
    assert.equal(await x.window.STEWARO_APP_AUTH_READY,false);
  }
});
test('claimed session must include identity and both future expirations',async()=>{
  const x=boot({hash:'#handoff=hnd_'+'B'.repeat(40)});
  x.reply({ok:true,status:'handoff_claimed',session_token:'new-token'});
  assert.equal(await x.window.STEWARO_APP_AUTH_READY,false);
  assert.equal(x.read(),null);assert.equal(x.redirects.length,1);
});
test('valid handoff still installs a complete server-issued session',async()=>{
  const x=boot({hash:'#handoff=hnd_'+'C'.repeat(40)});
  x.reply({ok:true,status:'handoff_claimed',session_token:'new-token',person_id:'p2',customer_account_id:'a2',...expiry});
  assert.equal(await x.window.STEWARO_APP_AUTH_READY,false);
  assert.equal(x.read().session_token,'new-token');assert.deepEqual(x.redirects,['/web-concierge']);
});
test('late successful session check cannot undo logout',async()=>{
  const x=boot(),gate=x.window.STEWARO_APP_AUTH_READY;
  x.values.delete(KEY);x.window.STEWARO_APP_AUTH_READY=Promise.resolve(false);
  x.reply(valid);assert.equal(await gate,false);assert.equal(x.read(),null);assert.deepEqual(x.redirects,[]);
});
test('late failed session check cannot remove newer login',async()=>{
  const x=boot(),gate=x.window.STEWARO_APP_AUTH_READY;
  x.values.set(KEY,JSON.stringify({...session,session_token:'newer-token'}));
  x.reply({ok:false,status:'revoked'});
  assert.equal(await gate,false);assert.equal(x.read().session_token,'newer-token');assert.deepEqual(x.redirects,[]);
});
test('late handoff cannot restore a token after another auth gate supersedes it',async()=>{
  const x=boot({hash:'#handoff=hnd_'+'D'.repeat(40)}),gate=x.window.STEWARO_APP_AUTH_READY;
  x.window.STEWARO_APP_AUTH_READY=Promise.resolve(false);
  x.reply({ok:true,status:'handoff_claimed',session_token:'late-token',person_id:'p2',customer_account_id:'a2',...expiry});
  assert.equal(await gate,false);assert.equal(x.read(),null);assert.deepEqual(x.redirects,[]);
});
test('legacy Account redirect is limited to exact HTTPS Account origin',()=>{
  for(const origin of ['https://account.stewaro.com','http://account.stewaro.com','https://account.stewaro.com:444']){
    const redirects=[];
    vm.runInNewContext(source,{location:{hostname:'account.stewaro.com',origin,pathname:'/web-concierge',replace:u=>redirects.push(u)}},{timeout:1000});
    assert.deepEqual(redirects,origin==='https://account.stewaro.com'?['/konto?stewaro_app=1']:[]);
  }
});

test('one-time handoff fails closed if browser refuses URL fragment removal',async()=>{
  const x=boot({hash:'#handoff=hnd_'+'E'.repeat(40),replaceStateThrows:true});
  assert.equal(x.calls.length,0,'never send the claim while its secret remains in the URL');
  assert.equal(x.read(),null,'discard any previous local identity');
  assert.deepEqual(x.redirects,['https://account.stewaro.com/anmelden?produkt=senioren&next=app']);
  assert.equal(await x.window.STEWARO_APP_AUTH_READY,false);
});
