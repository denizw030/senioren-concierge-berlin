import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../assets/stewaro-csp-app-live-script-1.js',import.meta.url),'utf8').replace(/^\s*import\s*\{\s*mountNahwerkLiveConcierge\s*\}\s*from\s*"[^"]+";/m,'');
const valid='t'.repeat(40);
function setup({failStart=false,failStop=false}={}){
 const actions=[];let opts;
 const controller={async start(){actions.push('start');if(failStart)throw Error('failed start')},async stop(){actions.push('stop');if(failStop)throw Error('failed stop')}};
 const window={};
 vm.runInNewContext(source,{window,document:{getElementById(){return {remove(){}}}},mountNahwerkLiveConcierge(o){opts=o;return controller}},{timeout:1000});
 return {window,actions,close(){opts?.onClose()},get token(){return opts?.getAuthToken()}};
}
test('stop clears credential from live controller',async()=>{const x=setup();assert.equal(await x.window.startNahwerkAppLive(valid),true);assert.equal(x.token,valid);assert.equal(await x.window.stopNahwerkAppLive(),true);assert.equal(x.token,'');});
test('failed start does not retain credential',async()=>{const x=setup({failStart:true});await assert.rejects(x.window.startNahwerkAppLive(valid));assert.equal(x.token,'');});
test('stop clears token even if stop throws',async()=>{const x=setup({failStop:true});await x.window.startNahwerkAppLive(valid);await assert.rejects(x.window.stopNahwerkAppLive());assert.equal(x.token,'');});
test('invalid token cannot start',async()=>{const x=setup();assert.equal(await x.window.startNahwerkAppLive('short'),false);assert.deepEqual(x.actions,[])});
test('native close clears credential before notifying host',async()=>{const x=setup();await x.window.startNahwerkAppLive(valid);x.close();assert.equal(x.token,'');});
test('valid token can be reused only by explicit new start',async()=>{const x=setup();await x.window.startNahwerkAppLive(valid);await x.window.stopNahwerkAppLive();assert.equal(x.token,'');await x.window.startNahwerkAppLive('u'.repeat(40));assert.equal(x.token,'u'.repeat(40));});
