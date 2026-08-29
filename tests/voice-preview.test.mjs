import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const profiles=[
["nilo","Nilo","cedar","approved"],["mira","Mira","marin","approved"],["lena","Lena","coral","approved"],["lukas","Lukas","alloy","approved"],
["hartmut","Hartmut","ballad","hearing_test"],["frida","Frida","sage","approved"],["asha","Asha","shimmer","hearing_test"],["sari","Sari","coral","approved"],
["leyla","Leyla","marin","approved"],["noor","Noor","sage","approved"],["sofia","Sofia","shimmer","approved"],["camille","Camille","marin","approved"],
["anna","Anna","coral","hearing_test_optional"],["olena","Olena","shimmer","hearing_test"],["mei","Mei","sage","approved"],["amara","Amara","coral","hearing_test"],
["kwame","Kwame","cedar","validation"],["zuri","Zuri","shimmer","hearing_test"],["jabari","Jabari","alloy","hearing_test"],["arjun","Arjun","cedar","validation"],
["wei","Wei","ballad","hearing_test"],["yuki","Yuki","marin","validation"],["ren","Ren","alloy","hearing_test_optional"]
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
  assert.ok(src.includes("voice-samples/\${key}.mp3"));
});

test("all 23 static MP3 samples exist and are non-empty",()=>{
  for(const [key] of profiles){
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

test("selection and voice buttons are siblings, never nested",()=>{
  const carousel=read("assets/concierge-carousel.js");
  const overview=read("assets/concierge-overview.js");
  assert.match(carousel,/card\.appendChild\(selectButton\);[\s\S]*card\.appendChild\(voiceControl\)/);
  assert.match(overview,/card\.appendChild\(button\);[\s\S]*card\.appendChild\(voiceControl\)/);
  assert.doesNotMatch(carousel,/selectButton\.appendChild\(voiceControl\)/);
  assert.doesNotMatch(overview,/button\.appendChild\(voiceControl\)/);
});

test("every real concierge surface loads preview assets before carousel",()=>{
  for(const page of pages){
    const html=read(page);
    const css=html.indexOf("concierge-voice-preview.css?v=1");
    const js=html.indexOf("concierge-voice-preview.js?v=1");
    const carousel=html.indexOf("concierge-carousel.js?v=8");
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
