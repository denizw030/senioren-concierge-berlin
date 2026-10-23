import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const file = process.env.STAGE_RECOVERY_SOURCE || new URL('../assets/stewaro-stage-recovery.js', import.meta.url);
const source = readFileSync(file, 'utf8');
const HOST='d2h3bbcracss71.cloudfront.net';
const path='/web-concierge/stage-password-reset.html';
const base='type=recovery&access_token=synthetic-access&refresh_token=synthetic-refresh';
async function start({origin=`https://${HOST}`, hash=`#${base}`, protocol='https:', hostname=HOST}={}){
  const requests=[], historyCalls=[];
  const nodes=new Map();
  for(const id of ['stageRecoveryForm','stageRecoveryStatus','stageNewPassword','stageConfirmPassword','stageSavePassword']){
    nodes.set(id,{value:'',hidden:id==='stageRecoveryForm',disabled:false,textContent:'',reportValidity:()=>true,addEventListener(){}});
  }
  vm.runInNewContext(source,{
    location:{origin,protocol,hostname,pathname:path,hash},
    document:{getElementById:id=>nodes.get(id)},
    history:{replaceState:(...args)=>historyCalls.push(args)},
    URLSearchParams,
    fetch:async(url,options)=>{
      requests.push({url,options,scrubbed:historyCalls.length>0});
      return {ok:true,json:async()=>({id:'synthetic-stage-only'})};
    }
  },{timeout:1000});
  await new Promise(resolve=>setImmediate(resolve));
  return {requests,historyCalls,nodes};
}
test('canonical HTTPS STAGING origin can verify a synthetic recovery identity',async()=>{
  const r=await start();
  assert.equal(r.requests.length,1);
  assert.equal(r.requests[0].url,'https://btqklftjmwtqqqdmwlnk.supabase.co/auth/v1/user');
  assert.equal(r.requests[0].scrubbed,true);
  assert.equal(r.nodes.get('stageRecoveryForm').hidden,false);
});
test('non-default HTTPS port is rejected before any token handling',async()=>{
  const r=await start({origin:`https://${HOST}:444`});
  assert.equal(r.requests.length,0);
  assert.equal(r.historyCalls.length,0);
});
test('duplicate access_token or type is rejected without contacting STAGING Auth',async()=>{
  for(const hash of [`#${base}&access_token=second`,`#${base}&type=recovery`]){
    const r=await start({hash});
    assert.equal(r.requests.length,0);
    assert.equal(r.historyCalls.length,1);
    assert.equal(r.nodes.get('stageRecoveryForm').hidden,true);
  }
});
test('unexpected recovery fragment field is rejected fail closed',async()=>{
  const r=await start({hash:`#${base}&redirect_to=https://lookalike.invalid`});
  assert.equal(r.requests.length,0);
  assert.equal(r.nodes.get('stageRecoveryForm').hidden,true);
});
test('legitimate Supabase metadata remains accepted',async()=>{
  const r=await start({hash:`#${base}&expires_in=3600&expires_at=1790000000&token_type=bearer`});
  assert.equal(r.requests.length,1);
  assert.equal(r.nodes.get('stageRecoveryForm').hidden,false);
});
test('duplicate optional metadata is rejected fail closed',async()=>{
  const r=await start({hash:`#${base}&expires_in=3600&expires_in=9999`});
  assert.equal(r.requests.length,0);
});
test('HTTP and lookalike hosts cannot initiate password recovery',async()=>{
  for(const props of [
    {origin:`http://${HOST}`,protocol:'http:'},
    {origin:`https://${HOST}.attacker.invalid`,hostname:`${HOST}.attacker.invalid`}
  ]){
    const r=await start(props);
    assert.equal(r.requests.length,0);
  }
});
test('unexpected token_type fails closed without a network request',async()=>{
  const r=await start({hash:`#${base}&token_type=mac`});
  assert.equal(r.requests.length,0);
  assert.equal(r.nodes.get('stageRecoveryForm').hidden,true);
});
test('recovery error fragments cannot authorize password reset',async()=>{
  const r=await start({hash:`#${base}&error=access_denied`});
  assert.equal(r.requests.length,0);
  assert.equal(r.nodes.get('stageRecoveryForm').hidden,true);
});
