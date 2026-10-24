import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../assets/stewaro-csp-app-live-script-1.js',import.meta.url),'utf8').replace(/^\s*import\s*\{\s*mountNahwerkLiveConcierge\s*\}\s*from\s*"[^"]+";/m,'');
const valid='t'.repeat(40);

function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
function pendingSetup(){
 const pending=[];let opts;
 const controller={start(){const d=deferred();pending.push(d);return d.promise;},async stop(){}};
 const window={};
 vm.runInNewContext(source,{window,document:{getElementById(){return {remove(){}}}},mountNahwerkLiveConcierge(o){opts=o;return controller}},{timeout:1000});
 return {window,pending,close(){opts?.onClose()},get token(){return opts?.getAuthToken()}};
}
test('a delayed start after explicit stop must not report a live session',async()=>{
 const x=pendingSetup();const starting=x.window.startNahwerkAppLive(valid);
 await x.window.stopNahwerkAppLive();x.pending[0].resolve();
 assert.equal(await starting,false);assert.equal(x.token,'');
});
test('a delayed start after native close must not report a live session',async()=>{
 const x=pendingSetup();const starting=x.window.startNahwerkAppLive(valid);
 x.close();x.pending[0].resolve();
 assert.equal(await starting,false);assert.equal(x.token,'');
});
test('older failed start must not erase a newer explicit session token',async()=>{
 const x=pendingSetup();const old=x.window.startNahwerkAppLive(valid);
 const newToken='u'.repeat(40);const newer=x.window.startNahwerkAppLive(newToken);
 x.pending[0].reject(new Error('old failure'));
 await assert.rejects(old,/old failure/);
 assert.equal(x.token,newToken);
 x.pending[1].resolve();assert.equal(await newer,true);assert.equal(x.token,newToken);
});
test('older successful start must not claim success for newer session',async()=>{
 const x=pendingSetup();const old=x.window.startNahwerkAppLive(valid);
 const newToken='u'.repeat(40);const newer=x.window.startNahwerkAppLive(newToken);
 x.pending[0].resolve();assert.equal(await old,false);
 x.pending[1].resolve();assert.equal(await newer,true);assert.equal(x.token,newToken);
});
