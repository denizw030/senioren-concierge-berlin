import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read=(path)=>fs.readFileSync(path,"utf8");

test("public navigation exposes only the canonical STEWARO surface set",()=>{
  const routing=read("assets/stewaro-entry-routing.js");
  const ui=read("assets/site-ui.js");
  for(const route of ["/de/","/prime-concierge","/angehoerige","/digitaler-schutz","/telefonannahme","/pakete","/kontakt"]){
    assert.ok(routing.includes(`href="${route}"`),route+" missing from mobile navigation");
    assert.ok(ui.includes(`["${route}",`),route+" missing from shared navigation");
  }
  for(const route of ["/leistungen","/ablauf","/senioren-concierge","/ueber-mich","/alltag-organisieren","/dokumente-verstehen","/technik-verstehen","/safety"]){
    assert.ok(!ui.includes(`["${route}",`),route+" must not be a primary navigation target");
  }
});

test("obsolete public QA and persona compatibility routes are removed",()=>{
  for(const file of ["voice-audition.html","voice-audition/index.html","martin-anpassen.html","martin-anpassen/index.html"]){
    assert.equal(fs.existsSync(file),false,file+" should be removed");
  }
});

test("sitemap contains only launch-facing public surfaces",()=>{
  const xml=read("sitemap.xml");
  for(const path of ["/de/","/prime-concierge","/angehoerige","/digitaler-schutz","/telefonannahme","/pakete","/faq","/kontakt","/impressum","/datenschutz/"]){
    assert.ok(xml.includes("https://stewaro.com"+path),path+" missing");
  }
  for(const path of ["/leistungen","/ablauf","/senioren-concierge","/ueber-mich","/alltag-organisieren","/dokumente-verstehen","/technik-verstehen","/safety"]){
    assert.ok(!xml.includes("<loc>https://stewaro.com"+path+"</loc>"),path+" should not be indexed as a primary public surface");
  }
});
