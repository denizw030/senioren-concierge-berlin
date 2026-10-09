import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [room,runtime] = await Promise.all([
  readFile(new URL("../assets/fidel-live-room.js",import.meta.url),"utf8"),
  readFile(new URL("../assets/stewaro-fidel-mini-3d.js",import.meta.url),"utf8")
]);

assert.match(room,/mountStewaroFidelMini3D/);
assert.match(room,/FIDEL_Mini_QUAD_BODYRIG_TEXTURED_v4_1\.glb/);
assert.match(room,/mini\?\.setSpeechLevel\?\.\(outLevel\)/);
assert.match(room,/placeholder_model:false/);
assert.match(room,/fidel-room-model-error/);

assert.match(runtime,/CanvasTexture/);
assert.match(runtime,/eyeHalf/);
assert.match(runtime,/eyeClosed/);
assert.match(runtime,/mouthAa/);
assert.match(runtime,/Idle_12/);
assert.doesNotMatch(runtime,/eyeBlinkLeft|eyeBlinkRight|morphTargetInfluences/);

console.log("STEWARO FIDEL Mini Live3D runtime contract: GREEN");
