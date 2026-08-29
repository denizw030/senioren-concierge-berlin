import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const profiles=[
["nilo","Nilo","cedar","hearing_test"],["mira","Mira","marin","hearing_test"],["lena","Lena","coral","hearing_test"],["lukas","Lukas","alloy","hearing_test"],
["hartmut","Hartmut","ballad","voice_rework"],["frida","Frida","sage","voice_rework"],["asha","Asha","shimmer","hearing_test"],["sari","Sari","nova","hearing_test"],
["leyla","Leyla","coral","hearing_test"],["noor","Noor","sage","hearing_test"],["sofia","Sofia","verse","hearing_test"],["camille","Camille","marin","hearing_test"],
["anna","Anna","nova","hearing_test"],["olena","Olena","shimmer","hearing_test"],["mei","Mei","sage","hearing_test"],["amara","Amara","coral","hearing_test"],
["kwame","Kwame","cedar","hearing_test"],["zuri","Zuri","shimmer","hearing_test"],["jabari","Jabari","onyx","hearing_test"],["arjun","Arjun","ash","hearing_test"],
["wei","Wei","echo","hearing_test"],["yuki","Yuki","marin","hearing_test"],["ren","Ren","alloy","hearing_test"]
];
const pages=["index.html","prime-concierge.html","senioren-concierge.html","concierges.html","registrieren.html","concierge-anpassen.html"];
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

test("canonical catalog contains exactly 23 voice mappings",()=>{
  const src=read("assets/concierge-carousel.js");
  assert.equal(profiles.length,23);
  for(const [key,name,voice,status] of profiles){
    const start=src.indexOf('["'+key+'","'+name+'"');
    assert.ok(start>=0,key+" missing from catalog");
    const row=src.slice(start,start+240);
    assert.ok(row.includes('"'+voice+'","'+status+'"'),key+" voice/status mismatch");
  }
  assert.ok(src.includes("voice-samples/\${key}.mp3?v=persona-20260829-1"));
});

test("all 24 persona-tuned static MP3 samples exist and are non-empty",()=>{
  const audioKeys=[...profiles.map(([key])=>key),"lars"];
  assert.equal(audioKeys.length,24);
  for(const key of audioKeys){
    const file=path.join(root,"assets/concierges/voice-samples",key+".mp3");
    const stat=fs.statSync(file);
    assert.ok(stat.size>50000,key+" sample unexpectedly small");
    assert.ok(stat.size<200000,key+" sample unexpectedly large");
  }
});

test("voice preview is lazy, user initiated and single-player",()=>{
  const src=read("assets/concierge-voice-preview.js");
  assert.match(src,/audio\.preload\s*=\s*"none"/);
  assert.doesNotMatch(src,/autoplay\s*=\s*true/);
  assert.match(src,/if \(active && active !== entry\) stop\(active\)/);
  assert.match(src,/addEventListener\("pagehide", stopAll\)/);
  assert.match(src,/aria-pressed/);
});

test("voice controls live in dedicated action rows, never on concierge images",()=>{
  const carousel=read("assets/concierge-carousel.js");
  const overview=read("assets/concierge-overview.js");
  const css=read("assets/concierge-voice-preview.css");
  assert.match(carousel,/nw-carousel-actions/);
  assert.match(carousel,/nw-carousel-voice-host/);
  assert.doesNotMatch(carousel,/card\.appendChild\(voiceControl\)/);
  assert.match(overview,/concierge-overview-actions/);
  assert.match(overview,/actions\.appendChild\(voiceControl\)/);
  assert.doesNotMatch(overview,/card\.appendChild\(voiceControl\)/);
  assert.doesNotMatch(css,/position:absolute/);
});

test("every real concierge surface loads preview assets before carousel",()=>{
  for(const page of pages){
    const html=read(page);
    const css=html.indexOf("concierge-voice-preview.css?v=3");
    const js=html.indexOf("concierge-voice-preview.js?v=3");
    const carousel=html.indexOf("concierge-carousel.js?v=9");
    assert.ok(css>=0,page+" missing preview CSS");
    assert.ok(js>=0,page+" missing preview JS");
    assert.ok(carousel>js,page+" must load preview JS before carousel");
  }
});

test("frontend contains no OpenAI endpoint or API key",()=>{
  const files=["assets/concierge-carousel.js","assets/concierge-voice-preview.js",...pages];
  const text=files.map(read).join("\n");
  assert.doesNotMatch(text,/api\.openai\.com/i);
  assert.doesNotMatch(text,/sk-[A-Za-z0-9_-]{12,}/);
  assert.doesNotMatch(text,/OPENAI_API_KEY/);
});
