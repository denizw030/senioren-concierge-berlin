import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const profiles=[
["nilo","Nilo","cedar","approved"],["mira","Mira","marin","hearing_test"],["lena","Lena","coral","hearing_test"],["lukas","Lukas","alloy","hearing_test"],
["hartmut","Hartmut","onyx","approved"],["frida","Frida","sage","hearing_test"],["asha","Asha","shimmer","hearing_test"],["sari","Sari","coral","hearing_test"],
["leyla","Leyla","marin","hearing_test"],["noor","Noor","sage","hearing_test"],["sofia","Sofia","shimmer","hearing_test"],["camille","Camille","marin","hearing_test"],
["anna","Anna","coral","hearing_test"],["olena","Olena","shimmer","hearing_test"],["mei","Mei","sage","hearing_test"],["amara","Amara","coral","hearing_test"],
["kwame","Kwame","cedar","hearing_test"],["zuri","Zuri","shimmer","hearing_test"],["jabari","Jabari","alloy","hearing_test"],["arjun","Arjun","cedar","hearing_test"],
["wei","Wei","ballad","hearing_test"],["yuki","Yuki","marin","hearing_test"],["ren","Ren","alloy","hearing_test"]
];
const nativeLanguages={nilo:"es",mira:"es",lena:"de",lukas:"de",hartmut:"de",frida:"de",asha:"hi",sari:"id",leyla:"tr",noor:"ar",sofia:"es",camille:"fr",anna:"pl",olena:"uk",mei:"zh",amara:"tw",kwame:"tw",zuri:"sw",jabari:"sw",arjun:"pa",wei:"zh",yuki:"ja",ren:"ja"};
const pages=["index.html","prime-concierge.html","senioren-concierge.html","registrieren.html","concierge-anpassen.html"];
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
  assert.ok(src.includes("assets/voice/samples/\${key}-\${code}.mp3?v=multilingual-20260829-1"));
});

test("all 65 multilingual runtime previews plus Lars reserve exist and are non-empty",()=>{
  let count=0;
  for(const [key] of profiles){
    const langs=[...new Set([nativeLanguages[key],"de","en"])];
    for(const lang of langs){
      const file=path.join(root,"assets/voice/samples",key+"-"+lang+".mp3");
      const stat=fs.statSync(file);
      assert.ok(stat.size>20000,key+"-"+lang+" sample unexpectedly small");
      assert.ok(stat.size<260000,key+"-"+lang+" sample unexpectedly large");
      count++;
    }
  }
  assert.equal(count,65);
  const reserve=fs.statSync(path.join(root,"assets/voice/samples/lars.mp3"));
  assert.ok(reserve.size>20000);
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
  assert.match(overview,/if\(v\)q\.appendChild\(v\)/);
  assert.doesNotMatch(overview,/card\.appendChild\(voiceControl\)/);
  assert.doesNotMatch(css,/position:absolute/);
});

test("every real concierge surface loads preview assets before carousel",()=>{
  for(const page of pages){
    const html=read(page);
    const css=html.indexOf("concierge-voice-preview.css");
    const js=html.indexOf("concierge-voice-preview.js");
    const carousel=html.indexOf("concierge-carousel.js");
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


test("runtime senior status mirrors published voice state",()=>{
  const src=read("assets/concierge-carousel.js");
  assert.match(src,/\["hartmut","Hartmut",[\s\S]{0,120}"onyx","approved"/);
  assert.match(src,/\["frida","Frida",[\s\S]{0,120}"sage","hearing_test"/);
  assert.doesNotMatch(src,/voice_rework/);
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
  assert.match(carousel,/\.nw-carousel-card\{/);
  assert.match(carousel,/border-radius:28px;/);
  assert.match(carousel,/overflow:hidden/);
  assert.match(carousel,/isolation:isolate/);
  assert.match(carousel,/aspect-ratio:480\/722;/);
  assert.match(carousel,/object-fit:cover/);
  assert.match(overview,/\.concierge-overview-card\{[\s\S]*border-radius:22px;[\s\S]*overflow:hidden;/);
});

test("optimized lifestyle assets are assigned by audience",()=>{
  const senior=read("senioren-concierge.html");
  const home=read("index.html");
  const services=read("leistungen.html");
  assert.match(senior,/assets\/lifestyle\/senior-man-phone\.webp/);
  assert.match(home,/assets\/lifestyle\/senior-woman-overview\.webp/);
  assert.match(services,/assets\/lifestyle\/young-woman-kitchen\.webp/);
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

test("published runtime matrix and native greetings are reflected in the catalog",()=>{
  const src=read("assets/concierge-carousel.js");
  assert.match(src,/Hola, ich bin Nilo/);
  assert.match(src,/Namaste, ich bin Asha/);
  assert.match(src,/Merhaba, ich bin Leyla/);
  assert.match(src,/Bonjour, ich bin Camille/);
  assert.match(src,/\["nilo","Nilo",[\s\S]{0,100}"cedar","approved"/);
  assert.match(src,/\["lukas","Lukas",[\s\S]{0,100}"alloy","hearing_test"/);
  assert.match(src,/\["hartmut","Hartmut",[\s\S]{0,100}"onyx","approved"/);
  assert.match(src,/\["leyla","Leyla",[\s\S]{0,100}"marin","hearing_test"/);
  assert.match(src,/\["camille","Camille",[\s\S]{0,100}"marin","hearing_test"/);
  assert.match(src,/\["arjun","Arjun",[\s\S]{0,100}"cedar","hearing_test"/);
  assert.match(src,/\["wei","Wei",[\s\S]{0,100}"ballad","hearing_test"/);
  assert.match(src,/\["jabari","Jabari",[\s\S]{0,100}"alloy","hearing_test"/);
});

test("voice audition distinguishes 23 runtime personas from Lars reserve",()=>{
  const html=read("voice-audition.html");
  assert.match(html,/23 Runtime-Stimmen\. Eine Reserve\./);
  assert.match(html,/window\.NAHWERK_CONCIERGES/);
  assert.match(html,/key:"lars"/);
  assert.match(html,/nicht Teil der aktuell veröffentlichten 23er-Runtime/);
});

test("mobile menu is viewport fixed beneath sticky header",()=>{
  const auth=read("assets/auth-nav.js");
  assert.match(auth,/position:fixed!important/);
  assert.match(auth,/--nw-mobile-menu-top/);
  assert.match(auth,/syncMenuTop/);
  assert.match(auth,/position:sticky!important/);
});

test("native-first language controls are complete for all 23 personas",()=>{
  const catalog=read("assets/concierge-carousel.js");
  const ui=read("assets/concierge-voice-preview.js");
  for(const [key] of profiles){
    const native=nativeLanguages[key];
    assert.match(catalog,new RegExp('\\["'+key+'","[^"]+"[\\s\\S]{0,260}"'+native+'"\\]'));
  }
  assert.match(catalog,/sampleAudioByLanguage/);
  assert.match(catalog,/previewLanguages/);
  assert.match(ui,/nw-voice-preview-language-select/);
  assert.match(ui,/await play\(entry\)/);
  assert.match(ui,/select\.addEventListener\("change"/);
});

test("every origin group starts with its own greeting",()=>{
  const src=read("assets/concierge-carousel.js");
  for(const greeting of ["Hola, ich bin Nilo","Hola, ich bin Mira","Hallo, ich bin Lena","Guten Tag, ich bin Hartmut","Namaste, ich bin Asha","Halo, ich bin Sari","Merhaba, ich bin Leyla","Marhaba, ich bin Noor","Bonjour, ich bin Camille","Dzień dobry, ich bin Anna","Pryvit, ich bin Olena","Nǐ hǎo, ich bin Mei","Akwaaba, ich bin Amara","Akwaaba, ich bin Kwame","Jambo, ich bin Zuri","Jambo, ich bin Jabari","Sat Sri Akal, ich bin Arjun","Konnichiwa, ich bin Yuki"]){
    assert.ok(src.includes(greeting),greeting+" missing");
  }
});

test("portrait clicks route to registration while voice controls stay separate",()=>{
  const carousel=read("assets/concierge-carousel.js");
  const overview=read("assets/concierge-overview.js");
  assert.match(carousel,/document\.createElement\(registerUrl\?"a":"button"\)/);
  assert.match(carousel,/target\.searchParams\.set\("concierge",profile\.key\)/);
  assert.match(overview,/concierge-overview-card-media/);
  assert.match(overview,/registrieren\.html\?produkt=prime&concierge=/);
});

test("app-free wording, future free app, senior logo and light first paint are present",()=>{
  const home=read("index.html");
  const senior=read("senioren-concierge.html");
  const brand=read("assets/brand-2026.css");
  const registration=read("registrieren.html");
  assert.match(home,/Keine zusätzliche App notwendig/);
  assert.match(home,/NAHWERK App ist in Entwicklung/);
  assert.match(senior,/Keine zusätzliche App notwendig/);
  assert.match(senior,/NAHWERK App ist in Entwicklung/);
  assert.match(senior,/class="mark nahwerk-mark"/);
  assert.match(brand,/body\.senior-product \.brandtext strong:after[\s\S]*color:#8b8f96!important/);
  assert.match(brand,/body\.senior-product \.brandtext span:before[\s\S]*color:#858990!important/);
  assert.match(registration,/name="theme-color" content="#fffdf9"/);
  assert.match(registration,/registration-first-paint/);
});

test("concierge world page starts with interactive region controls and no legacy full grid",()=>{
  const html=read("concierges.html");
  const js=read("assets/concierge-overview.js");
  assert.match(html,/id="continentOptions" data-world-only="true"/);
  for(const region of ["Europa","Asien","Afrika","Nordamerika","Südamerika","Australien"]){
    assert.match(html,new RegExp('data-region="'+region+'"'));
  }
  assert.doesNotMatch(html,/id="conciergeOverviewGrid"/);
  assert.doesNotMatch(html,/id="showAllConcierges"/);
  assert.match(js,/WORLD_ONLY/);
  assert.match(js,/Nordamerika/);
  assert.match(js,/Südamerika/);
  assert.match(js,/Australien/);
});

test("family registration message is optional and uses the existing notes contract",()=>{
  const html=read("registrieren.html");
  const onboarding=read("assets/onboarding.js");
  assert.match(html,/id="familyMessage"/);
  assert.match(html,/Persönliche Nachricht für die unterstützte Person/);
  assert.match(onboarding,/familyMessageValue/);
  assert.match(onboarding,/Persönliche Nachricht der einrichtenden Person/);
  assert.match(onboarding,/initial_notes:/);
  assert.doesNotMatch(onboarding,/family_message\s*:/);
});