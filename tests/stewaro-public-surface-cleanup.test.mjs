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

test("obsolete public QA, persona compatibility and standalone V1 surfaces are removed",()=>{
  for(const file of [
    "voice-audition.html","voice-audition/index.html",
    "martin-anpassen.html","martin-anpassen/index.html",
    ".github/workflows/stewaro-site-v1.yml","tests/stewaro-site-v1.test.mjs"
  ]){
    assert.equal(fs.existsSync(file),false,file+" should be removed");
  }
  assert.equal(fs.existsSync("stewaro-site"),false,"duplicate standalone STEWARO Site V1 should be removed");
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

test("telephone page is a professional client-facing FIDEL surface",()=>{
  const root=read("telefonannahme.html");
  const clean=read("telefonannahme/index.html");
  const css=read("assets/telephone-reception-product.css");
  const normalize=(html)=>html.replace('<head><base href="/">','<head>');

  assert.equal(normalize(clean),root,"telephone clean route must mirror the root route");

  for(const label of ["Startseite","Concierge","Für Angehörige","Digitaler Schutz","Telefon","Preise","Kontakt"]){
    assert.ok(root.includes(`>${label}</a>`),label+" missing from telephone navigation");
  }

  for(const retired of [
    "Alexander","Luisa","Konrad","James",
    "Platform-Endpunkt ist vorbereitet",
    "NUMBER_SUBMITTED","OWNERSHIP_PENDING","ROUTING_PENDING","PORTING_PENDING",
    "telephoneReceptionSetupForm","telephone-reception-product.js","Modelle ansehen"
  ]){
    assert.ok(!root.includes(retired),retired+" must not be public on telephone page");
    assert.ok(!clean.includes(retired),retired+" must not be public on telephone clean route");
  }

  assert.match(root,/Telefonannahme mit FIDEL/);
  assert.match(root,/Mehr Ruhe, wenn das Telefon klingelt/);
  assert.match(root,/Sie behalten die Kontrolle/);
  assert.match(root,/Ein Concierge\. Ein Kontext\./);
  assert.doesNotMatch(root,/\bdein(?:e|em|en|er|es)?\b/i);
  assert.doesNotMatch(root,/\bdich\b/i);

  assert.match(css,/--tr-cream:#f6f1e7/);
  assert.match(css,/--tr-green:#123a31/);
  assert.match(css,/\.tr-call-card/);
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(css,/prefers-reduced-motion/);
});
