import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(process.env.FILM_SOURCE || new URL('../assets/stewaro-films.js', import.meta.url), 'utf8');
function setup() {
  const raf = [];
  const events = {};
  const mq = { mobile: { matches: false, addEventListener() {} }, reduced: { matches: false, addEventListener() {} } };
  const positions = [ {top: -100, height: 2450}, {top: 2400, height: 2450}, {top: -5000, height: 2450} ];
  const videos = positions.map((_, i) => {
    let time = 0;
    const callbacks = {};
    return {
      dataset: {wide: `wide-${i}.mp4`, tall: `tall-${i}.mp4`},
      classList: {add() {}, remove() {}},
      pauseCalls: 0, seekCalls: 0, loadCalls: 0, seeking: false,
      duration: 20, muted: false,
      get currentTime() { return time; },
      set currentTime(x) { time = x; this.seekCalls++; },
      pause() { this.pauseCalls++; },
      load() { this.loadCalls++; },
      addEventListener(k, cb) { callbacks[k] = cb; },
      emit(k) { callbacks[k]?.(); },
      reset() { this.pauseCalls = 0; this.seekCalls = 0; },
    };
  });
  const roots = videos.map((video, i) => ({
    querySelector() { return video; },
    getBoundingClientRect() { const p=positions[i]; return {top:p.top, height:p.height, bottom:p.top+p.height}; }
  }));
  const win = { innerHeight: 1000, addEventListener(name, cb) { events[name]=cb; } };
  vm.runInNewContext(source, {
    document: {querySelectorAll: () => roots}, window: win,
    matchMedia: q => q.includes('max-width') ? mq.mobile : mq.reduced,
    requestAnimationFrame: cb => { raf.push(cb); },
  });
  const flush = () => { while (raf.length) raf.shift()(); };
  videos.forEach(v => v.emit('loadedmetadata'));
  flush();
  videos.forEach(v => v.reset());
  return {videos, positions, events, mq, flush};
}

test('visible film still scrubs to correct scroll position', () => {
  const {videos, positions, events, flush} = setup();
  positions[0].top = -300;
  events.scroll(); flush();
  assert.equal(videos[0].pauseCalls, 1);
  assert.equal(videos[0].seekCalls, 1);
  assert.ok(Math.abs(videos[0].currentTime - (300 / 1450) * 19.45) < 0.001);
});

test('fully offscreen films never pause or seek on scroll', () => {
  const {videos, events, flush} = setup();
  events.scroll(); flush();
  for (const i of [1,2]) {
    assert.equal(videos[i].pauseCalls, 0, `offscreen video ${i} paused`);
    assert.equal(videos[i].seekCalls, 0, `offscreen video ${i} sought`);
  }
});

test('newly visible film resumes correct scroll scrubbing', () => {
  const {videos, positions, events, flush} = setup();
  positions[0].top=-2600;
  positions[1].top=-400;
  events.scroll(); flush();
  assert.equal(videos[0].pauseCalls,0);
  assert.equal(videos[1].pauseCalls,1);
  assert.equal(videos[1].seekCalls,1);
  assert.ok(videos[1].currentTime>0);
});

test('reduced-motion preference never seeks', () => {
  const {videos, mq, events, flush} = setup();
  mq.reduced.matches=true;
  events.scroll(); flush();
  assert.equal(videos.reduce((sum,v)=>sum+v.seekCalls,0),0);
});
