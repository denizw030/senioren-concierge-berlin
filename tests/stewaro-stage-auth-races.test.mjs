import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../assets/stewaro-stage-auth.js',import.meta.url),'utf8');
const STORE='stewaro_stage_auth_session_v1';
const reply=(ok,body)=>({ok,json:async()=>body});
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject};};
async function settle(){for(let i=0;i<18;i++)await Promise.resolve();}
function harness({origin='https://d2h3bbcracss71.cloudfront.net',oldToken=null}={}){
  const saved=new Map();if(oldToken)saved.set(STORE,JSON.stringify({token:oldToken,created:Date.now()}));
  const elements={};
  for(const name of ['#stewaroStageAuthForm','#stewaroStageEmail','#stewaroStagePassword','#stewaroStageResult','#stewaroStageLogin','#stewaroStageSignUp','#stewaroStageLogout']){
    elements[name]={value:'',hidden:false,disabled:false,handlers:{},addEventListener(type,fn){this.handlers[type]=fn;},reportValidity(){return true;}};
  }
  elements['#stewaroStageEmail'].value='stage@example.test';
  elements['#stewaroStagePassword'].value='stage-password';
  const box={className:'',innerHTML:'',setAttribute(){},querySelector:selector=>elements[selector]};
  const status={textContent:''},log={replaceChildren(child){this.child=child}};
  const calls=[];
  const context={
    location:{origin,hostname:new URL(origin).hostname},Date,JSON,Promise,
    sessionStorage:{getItem:key=>saved.get(key)||null,setItem:(key,val)=>saved.set(key,val),removeItem:key=>saved.delete(key)},
    document:{getElementById:id=>id==='webConciergeStatus'?status:id==='webConciergeLog'?log:null,createElement:()=>box},
    fetch:(url,init)=>{const d=deferred();calls.push({url,init,d});return d.promise;}
  };
  vm.runInNewContext(source,context,{filename:'stewaro-stage-auth.js'});
  const submit=()=>elements['#stewaroStageAuthForm'].handlers.submit({preventDefault(){}});
  const signup=()=>elements['#stewaroStageSignUp'].handlers.click();
  const logout=()=>elements['#stewaroStageLogout'].handlers.click();
  const token=()=>{try{return JSON.parse(saved.get(STORE)||'null')?.token||null}catch{return null}};
  const next=async (fragment,body,ok=true)=>{const c=calls.find(x=>x.url.includes(fragment)&&!x.handled);assert.ok(c,"missing "+fragment+": "+calls.map(x=>x.url));c.handled=true;c.d.resolve(reply(ok,body));await settle();return c;};
  return {calls,saved,elements,status,log,submit,signup,logout,token,next};
}

test('restored old identity cannot replace a newer successful login',async()=>{
  const h=harness({oldToken:'old'});
  assert.equal(h.calls.length,1);
  h.submit();
  await h.next('grant_type=password',{access_token:'new'});
  const fresh=h.calls.find(x=>x.init.headers?.Authorization==='Bearer new');
  assert.ok(fresh);
  fresh.d.resolve(reply(true,{id:'new-person'}));await settle();
  assert.equal(h.token(),'new');
  h.calls[0].d.resolve(reply(true,{id:'old-person'}));await settle();
  assert.equal(h.token(),'new');
  assert.equal(h.elements['#stewaroStageAuthForm'].hidden,true);
});

test('late restore rejection cannot clear a newer session',async()=>{
  const h=harness({oldToken:'old'});
  h.submit();await h.next('grant_type=password',{access_token:'new'});
  const fresh=h.calls.find(x=>x.init.headers?.Authorization==='Bearer new');
  fresh.d.resolve(reply(true,{id:'new-person'}));await settle();
  h.calls[0].d.reject(new Error('old connection failed'));await settle();
  assert.equal(h.token(),'new');
  assert.match(h.elements['#stewaroStageResult'].textContent,/bestätigt/);
});

test('logout invalidates a late successful login',async()=>{
  const h=harness();
  h.submit();h.logout();
  await h.next('grant_type=password',{access_token:'late'});
  assert.equal(h.token(),null);
  assert.equal(h.elements['#stewaroStageAuthForm'].hidden,false);
  assert.match(h.elements['#stewaroStageResult'].textContent,/beendet/);
  assert.equal(h.calls.filter(x=>x.url.endsWith('/user')).length,0);
});

test('a second login wins over an earlier delayed token response',async()=>{
  const h=harness();
  h.submit();h.submit();
  const requests=h.calls.filter(x=>x.url.includes('grant_type=password'));
  assert.equal(requests.length,2);
  requests[1].d.resolve(reply(true,{access_token:'second'}));await settle();
  await h.next('/user',{id:'second-person'});
  requests[0].d.resolve(reply(true,{access_token:'first'}));await settle();
  assert.equal(h.token(),'second');
  assert.equal(h.calls.filter(x=>x.url.endsWith('/user')).length,1);
});

test('late signup cannot override newer login',async()=>{
  const h=harness();
  h.signup();h.submit();
  await h.next('grant_type=password',{access_token:'login'});
  await h.next('/user',{id:'login-person'});
  await h.next('/signup',{access_token:'signup'});
  assert.equal(h.token(),'login');
  assert.equal(h.calls.filter(x=>x.url.endsWith('/user')).length,1);
});

test('stage login refuses HTTP and nonstandard ports, and exact HTTPS works',()=>{
  for(const origin of ['http://d2h3bbcracss71.cloudfront.net','https://d2h3bbcracss71.cloudfront.net:8443','https://d2h3bbcracss71.cloudfront.net.evil.test']){
    const h=harness({origin});
    assert.equal(h.log.child,undefined,origin);
    assert.equal(h.calls.length,0,origin);
  }
  const h=harness();
  assert.ok(h.log.child);
});
