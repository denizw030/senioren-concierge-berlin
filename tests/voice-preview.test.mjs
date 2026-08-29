import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const profiles=[
["nilo","Nilo","onyx","hearing_test"],["mira","Mira","marin","hearing_test"],["lena","Lena","coral","hearing_test"],["lukas","Lukas","ash","hearing_test"],
["hartmut","Hartmut","ballad","voice_rework"],["frida","Frida","sage","voice_rework"],["asha","Asha","shimmer","hearing_test"],["sari","Sari","nova","hearing_test"],
["leyla","Leyla","coral","hearing_test"],["noor","Noor","sage","hearing_test"],["sofia","Sofia","verse","hearing_test"],["camille","Camille","nova","hearing_test"],
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
  assert.ok(src.includes("voice-samples/\${key}.mp3?v=persona-20260829-2"));
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
    const css=html.indexOf("concierge-voice-preview.css?v=4");
    const js=html.indexOf("concierge-voice-preview.js?v=4");
    const carousel=html.indexOf("concierge-carousel.js?v=10");
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


test("rejected senior voices are marked for rework",()=>{
  const src=read("assets/concierge-carousel.js");
  assert.match(src,/\["hartmut","Hartmut",[\s\S]{0,120}"voice_rework"/);
  assert.match(src,/\["frida","Frida",[\s\S]{0,120}"voice_rework"/);
  const ui=read("assets/concierge-voice-preview.js");
  assert.match(ui,/Stimme wird überarbeitet/);
  assert.match(ui,/button\.disabled = true/);
});

test("senior surface opens on Frida with Hartmut adjacent",()=>{
  const html=read("senioren-concierge.html");
  assert.match(html,/data-variant="senior"/);
  assert.match(html,/data-selected="frida"/);
  const src=read("assets/concierge-carousel.js");
  const hartmut=src.indexOf('["hartmut","Hartmut"');
  const frida=src.indexOf('["frida","Frida"');
  assert.ok(hartmut>=0 && frida>hartmut);
});

test("shared shell preserves scroll and uses split NAH WERK brand",()=>{
  const auth=read("assets/auth-nav.js");
  const ui=read("assets/site-ui.js");
  const brand=read("assets/brand-2026.css");
  assert.match(auth,/preserveViewport/);
  assert.match(auth,/event\.preventDefault\(\)/);
  assert.doesNotMatch(ui,/classList\.toggle\('menu-open'/);
  assert.match(brand,/body\.menu-open \{ overflow:visible; \}/);
  assert.match(brand,/content:"NAH"!important/);
  assert.match(brand,/content:"WERK"/);
  assert.match(brand,/color:#d4af37!important/);
  assert.match(brand,/color:#c6c9cf/);
});

test("carousel and overview use one clipped radius owner",()=>{
  const carousel=read("assets/concierge-carousel.css");
  const overview=read("assets/concierge-overview.css");
  assert.match(carousel,/\.nw-carousel-card\{[\s\S]*border-radius:28px;[\s\S]*overflow:hidden;[\s\S]*isolation:isolate;/);
  assert.match(carousel,/aspect-ratio:480\/722;/);
  assert.match(carousel,/object-fit:cover;/);
  assert.match(overview,/\.concierge-overview-card\{[\s\S]*border-radius:22px;[\s\S]*overflow:hidden;/);
});

test("real lifestyle assets are assigned by audience",()=>{
  const senior=read("senioren-concierge.html");
  const home=read("index.html");
  const services=read("leistungen.html");
  assert.match(senior,/NAHWERK-Concierge-Älterer-Mann-am-Handy-Zuhause-auf-Stuhl\.png/);
  assert.match(home,/NAHWERK-Concierge-Frau-Wohnzimmer\.png/);
  assert.match(services,/NAHWERK-Concierge-junge-Frau-Küche\.png/);
  assert.match(services,/services-hero-layout/);
});

test("dark pages restore multi-colour ambient depth and responsive gutter",()=>{
  const brand=read("assets/brand-2026.css");
  assert.match(brand,/rgba\(58,111,224,\.115\)/);
  assert.match(brand,/rgba\(131,67,174,\.09\)/);
  assert.match(brand,/rgba\(34,153,157,\.075\)/);
  assert.match(brand,/--nw-gutter:clamp\(20px,3\.5vw,48px\)/);
  assert.match(brand,/calc\(100% - var\(--nw-gutter\) - var\(--nw-gutter\)\)/);
});

test("registration action is a centered 44px flex control",()=>{
  const css=read("assets/concierge-carousel.css");
  assert.match(css,/\.nw-carousel-status\{[\s\S]*align-items:center;[\s\S]*justify-content:center;[\s\S]*height:44px;/);
});

test("quality-gated greetings are reflected in the catalog",()=>{
  const src=read("assets/concierge-carousel.js");
  assert.match(src,/Hola, ich bin Nilo/);
  assert.match(src,/Namaste, ich bin Asha/);
  assert.match(src,/Merhaba, ich bin Leyla/);
  assert.match(src,/Bonjour, ich bin Camille/);
  assert.match(src,/\["nilo","Nilo",[\s\S]{0,100}"onyx"/);
  assert.match(src,/\["lukas","Lukas",[\s\S]{0,100}"ash"/);
  assert.match(src,/\["camille","Camille",[\s\S]{0,100}"nova"/);
});