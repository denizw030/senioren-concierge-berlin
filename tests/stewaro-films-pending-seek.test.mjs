import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../assets/stewaro-films.js',import.meta.url),'utf8');

function setup(){
 const events={},handlers={},raf=[];
 const position={top:-300,height:2450};
 let time=0;
 const video={
   dataset:{tall:'tall.mp4',wide:'wide.mp4'},classList:{add(){},remove(){}},
   seeking:false,duration:20,seekCalls:0,
   get currentTime(){return time},set currentTime(v){time=v;this.seekCalls++},
   pause(){},load(){},addEventListener(k,fn){handlers[k]=fn}
 };
 const root={querySelector:()=>video,getBoundingClientRect:()=>({...position,bottom:position.top+position.height})};
 const mq={matches:false,addEventListener(){}};
 const win={innerHeight:1000,addEventListener:(k,fn)=>events[k]=fn};
 vm.runInNewContext(source,{document:{querySelectorAll:()=>[root]},window:win,matchMedia:()=>mq,requestAnimationFrame:fn=>raf.push(fn)});
 const flush=()=>{while(raf.length)raf.shift()()};
 handlers.loadedmetadata();flush();
 return {video,position,events,handlers,flush};
}
test('offscreen seeked callback must not schedule another decode',()=>{
 const x=setup();
 x.video.seeking=true;
 x.position.top=-800;
 x.events.scroll();x.flush();
 x.position.top=-3000;
 x.video.seeking=false;
 const before=x.video.seekCalls;
 x.handlers.seeked();
 assert.equal(x.video.seekCalls,before);
});
test('offscreen update clears stale pending seek before reentry',()=>{
 const x=setup();
 x.video.seeking=true;
 x.position.top=-800;
 x.events.scroll();x.flush();
 x.position.top=-3000;
 x.events.scroll();x.flush();
 x.video.seeking=false;
 const before=x.video.seekCalls;
 x.handlers.seeked();
 assert.equal(x.video.seekCalls,before);
});
test('visible seeked callback still applies latest queued frame',()=>{
 const x=setup();
 x.video.seeking=true;
 x.position.top=-800;
 x.events.scroll();x.flush();
 x.video.seeking=false;
 const before=x.video.seekCalls;
 x.handlers.seeked();
 assert.equal(x.video.seekCalls,before+1);
});
