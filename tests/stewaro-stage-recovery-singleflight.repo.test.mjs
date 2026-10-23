import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../assets/stewaro-stage-recovery.js',import.meta.url),'utf8');
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}}
async function fixture({failFirst=false}={}){
 const events={},requests=[],waiting=deferred();let writes=0;
 const nodes=Object.fromEntries(['stageRecoveryForm','stageRecoveryStatus','stageNewPassword','stageConfirmPassword','stageSavePassword'].map(id=>[id,{
  value:'',hidden:id==='stageRecoveryForm',disabled:false,textContent:'',reportValidity:()=>true,
  addEventListener:(event,handler)=>events[event]=handler
 }]));
 const location={protocol:'https:',origin:'https://d2h3bbcracss71.cloudfront.net',hostname:'d2h3bbcracss71.cloudfront.net',pathname:'/web-concierge/stage-password-reset.html',hash:'#type=recovery&access_token=synthetic-token&refresh_token=synthetic-refresh'};
 const fetch=async(_url,options)=>{
  requests.push(options.method);
  if(options.method==='GET')return {ok:true,json:async()=>({id:'synthetic-stage-user'})};
  writes++;
  if(failFirst&&writes===1)return {ok:false};
  return waiting.promise;
 };
 vm.runInNewContext(source,{location,document:{getElementById:id=>nodes[id]},history:{replaceState(){}},URLSearchParams,fetch},{timeout:1000});
 await new Promise(r=>setImmediate(r));
 nodes.stageNewPassword.value='synthetic-password-one';
 nodes.stageConfirmPassword.value='synthetic-password-one';
 return {events,requests,waiting,nodes,writes:()=>writes};
}
const submit=x=>x.events.submit({preventDefault(){}});
test('recovery allows only one simultaneous password update',async()=>{
 const x=await fixture();const a=submit(x),b=submit(x);
 assert.equal(x.writes(),1);
 assert.equal(x.nodes.stageSavePassword.disabled,true);
 x.waiting.resolve({ok:true});await Promise.all([a,b]);
 assert.equal(x.nodes.stageRecoveryForm.hidden,true);
 assert.equal(x.nodes.stageSavePassword.disabled,false);
});
test('failed password update permits a single clean retry',async()=>{
 const x=await fixture({failFirst:true});await submit(x);
 assert.equal(x.writes(),1);
 x.nodes.stageNewPassword.value='synthetic-password-two';
 x.nodes.stageConfirmPassword.value='synthetic-password-two';
 const a=submit(x),b=submit(x);assert.equal(x.writes(),2);
 x.waiting.resolve({ok:true});await Promise.all([a,b]);
 assert.equal(x.nodes.stageRecoveryForm.hidden,true);
});
