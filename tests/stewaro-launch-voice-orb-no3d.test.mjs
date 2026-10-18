import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const boot = read("assets/web-live-concierge.js");
const live = read("assets/nahwerk-live-concierge.js");
const orb = read("assets/fidel-gold-orb.js");
const page = read("web-concierge/index.html");

test("FIDEL launch disables the optional 3D room but keeps the existing live controller", () => {
  assert.match(boot, /mountNahwerkLiveConcierge\(\{/);
  assert.match(boot, /fidelRoom:\s*false\s*,/);
  assert.doesNotMatch(boot, /fidelRoom:\s*true\s*,/);
});

test("the familiar round FIDEL orb remains mounted in the live screen", () => {
  assert.match(page, /canvas data-fidel-orb data-fidel-orb-state="idle"/);
  assert.match(boot, /mountFidelGoldOrb\(headerOrbCanvas/);
  assert.match(live, /const fidelOrb=mountFidelGoldOrb\(orbCanvas/);
});

test("real microphone/output audio still animates the orb", () => {
  assert.match(live, /const inLevel=rms\(micMeter\?\.analyser\)/);
  assert.match(live, /const rawOutLevel=rms\(outMeter\?\.analyser\)/);
  assert.match(live, /fidelOrb\?\.setAudio\(inLevel,outLevel\)/);
  assert.match(orb, /setAudio\(inLevel=0,outLevel=0\)/);
});

test("existing live voice and mute/interrupt paths are preserved", () => {
  assert.match(live, /new RTCPeerConnection/);
  assert.match(live, /getUserMedia\(\{audio:true,video:false\}\)/);
  assert.match(live, /micStream\?\.getAudioTracks\(\)\?\.forEach\(t=>t\.enabled=!muted\)/);
});
