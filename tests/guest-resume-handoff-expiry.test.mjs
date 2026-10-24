import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../assets/web-customer-concierge.js',import.meta.url),'utf8');
const match=source.match(/if\(new URLSearchParams\(location\.search\)\.get\("resume_guest"\)==="1"\)\{[\s\S]*?\n      \}/);
assert.ok(match,'the live guest resume block must be present');
const snippet=match[0];
const KEY='nw_guest_resume_request_v1';
const NOW=Date.parse('2026-10-24T07:00:00Z');
class Input { constructor(){this.value='';} }
function resume(handoff,{query='?resume_guest=1',throwRead=false,throwRemove=false}={}){
  const store=new Map(); if(handoff!==undefined)store.set(KEY,typeof handoff==='string'?handoff:JSON.stringify(handoff));
  const input=new Input();let resized=0;
  const context={URLSearchParams,location:{search:query},GUEST_RESUME_KEY:KEY,
    localStorage:{getItem:k=>{if(throwRead)throw Error('blocked');return store.get(k)||null;},removeItem:k=>{if(throwRemove)throw Error('blocked');store.delete(k);}},
    document:{getElementById:()=>input},HTMLTextAreaElement:Input,resizeInput:()=>resized++,
    Date:class extends Date{static now(){return NOW;}},Number};
  vm.runInNewContext(snippet,context,{timeout:1000});
  return {value:input.value,resized,remaining:store.has(KEY)};
}
const fresh={request:'PRIVATE_NOTE',created_at:new Date(NOW-60_000).toISOString(),post_auth_target:'/payg'};
test('fresh explicitly PAYG-bound request is shown exactly once',()=>{assert.deepEqual(resume(fresh),{value:'PRIVATE_NOTE',resized:1,remaining:false});});
test('expired request is not shown and is consumed',()=>{assert.deepEqual(resume({...fresh,created_at:new Date(NOW-86_400_001).toISOString()}),{value:'',resized:0,remaining:false});});
test('future-dated request is not shown and is consumed',()=>{assert.deepEqual(resume({...fresh,created_at:new Date(NOW+1).toISOString()}),{value:'',resized:0,remaining:false});});
test('wrong continuation target is rejected',()=>{assert.deepEqual(resume({...fresh,post_auth_target:'/konto'}),{value:'',resized:0,remaining:false});});
test('malformed JSON is consumed without UI failure',()=>{assert.deepEqual(resume('{bad'),{value:'',resized:0,remaining:false});});
test('nonstring request is rejected',()=>{assert.deepEqual(resume({...fresh,request:{toString:null}}),{value:'',resized:0,remaining:false});});
test('exact 24 hour boundary remains valid',()=>{assert.equal(resume({...fresh,created_at:new Date(NOW-86_400_000).toISOString()}).value,'PRIVATE_NOTE');});
test('unrequested continuation does not touch stored handoff',()=>{assert.deepEqual(resume(fresh,{query:''}),{value:'',resized:0,remaining:true});});
test('storage read blocked fails closed',()=>{assert.deepEqual(resume(fresh,{throwRead:true}),{value:'',resized:0,remaining:false});});

test('storage deletion blocked fails closed rather than replaying',()=>{assert.deepEqual(resume(fresh,{throwRemove:true}),{value:'',resized:0,remaining:true});});
