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

test("GPT-Live must await successful session validation before using a token", async () => {
  const { runInNewContext } = await import("node:vm");
  const callback = boot.match(/getAuthToken:(async\(\)=>\{[\s\S]*?\n    \}),\n    getThreadId:/)?.[1];
  assert.ok(callback, "live auth callback must be present");
  const run = ({ host="account.stewaro.com", validation, appReady=true, session="existing-token" }) => {
    const context = {
      window: {
        SCBAuth: validation ? { validateSession: validation } : undefined,
        STEWARO_APP_AUTH_READY: Promise.resolve(appReady)
      },
      location: { hostname: host },
      bridge: () => ({ sessionToken: () => session })
    };
    return runInNewContext("("+callback+")",context)();
  };

  assert.equal(await run({ validation: () => Promise.resolve(false) }), "");
  assert.equal(await run({ validation: undefined }), "");
  assert.equal(await run({ validation: () => true,host:"app.stewaro.com",appReady:false }), "");
  assert.equal(await run({ validation: () => true,host:"app.stewaro.com",appReady:true }), "existing-token");

  let settle;
  const pending = run({ validation: () => new Promise(resolve => { settle=resolve; }) });
  let settled=false;
  pending.then(()=>{settled=true;});
  await Promise.resolve();
  assert.equal(settled,false,"token exposed before session validation returned");
  settle(true);
  assert.equal(await pending,"existing-token");
  await assert.rejects(run({validation:()=>Promise.reject(new Error("not authorized"))}),/not authorized/);
});
