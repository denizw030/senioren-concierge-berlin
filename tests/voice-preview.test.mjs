import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=(p)=>fs.readFileSync(p,"utf8");
const visible=(html)=>html.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();

test("public STEWARO concierge surfaces use the fixed FIDEL identity",()=>{
  for(const file of ["registrieren.html","concierge-anpassen.html","prime-concierge.html","senioren-concierge.html"]){
    const html=read(file), copy=visible(html);
    assert.match(copy,/FIDEL/);
    assert.doesNotMatch(copy,/NAHWERK|Hartmut|Frida|Nilo|Mira/);
    assert.doesNotMatch(html,/<script[^>]+concierge-carousel\.js|<link[^>]+concierge-carousel\.css/);
  }
});

test("registration and settings do not load legacy persona carousel assets",()=>{
  for(const file of ["registrieren.html","registrieren/index.html","concierge-anpassen.html","concierge-anpassen/index.html"]){
    const html=read(file);
    assert.match(html,/stewaro-fixed-concierge-card/);
    assert.match(html,/name="conciergeChoice" value="fidel"/);
    assert.doesNotMatch(html,/concierge-carousel\.js|concierge-carousel\.css|concierge-voice-preview\.js|concierge-voice-preview\.css/);
  }
});

test("FIDEL gold orb is shared by Web Concierge and Live surfaces",()=>{
  const orb=read("assets/fidel-gold-orb.js");
  const web=read("web-concierge.html");
  const live=read("assets/nahwerk-live-concierge.js");
  const app=read("app-live.html");
  assert.match(orb,/FIDEL GOLD GLASS ORB RUNTIME/);
  assert.match(orb,/mountFidelGoldOrb/);
  assert.match(web,/data-fidel-orb/);
  assert.match(live,/mountFidelGoldOrb/);
  assert.match(app,/FIDEL Live \| STEWARO/);
});

test("gold orb and Live UI preserve reduced-motion and contain no frontend secret",()=>{
  const body=[read("assets/fidel-gold-orb.js"),read("assets/nahwerk-live-concierge.js"),read("assets/web-live-concierge.js")].join("\n");
  assert.match(body,/prefers-reduced-motion|reduce/);
  assert.doesNotMatch(body,/sk-[A-Za-z0-9_-]{12,}|OPENAI_API_KEY/);
});

test("international concierge gallery remains intentionally retired for STEWARO launch",()=>{
  assert.equal(fs.existsSync("concierges.html"),false);
  assert.equal(fs.existsSync("concierges/index.html"),false);
  const css=read("assets/stewaro-unified.css");
  assert.match(css,/a\[href="\/concierges"\]/);
  assert.match(css,/display:none!important/);
});

test("telephone voice presentation remains FIDEL, not separate concierge personas",()=>{
  const phone=read("telefonannahme.html");
  const copy=visible(phone);
  assert.match(copy,/FIDEL am Telefon/);
  assert.match(copy,/FIDEL Stimme/);
  assert.doesNotMatch(copy,/Deine Telefonagenten|Wähle die Persönlichkeit/);
});
