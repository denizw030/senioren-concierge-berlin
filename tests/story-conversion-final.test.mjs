import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=(p)=>fs.readFileSync(p,"utf8");
const visibleText=(html)=>html
  .replace(/<section[^>]*\bhidden\b[^>]*>[\s\S]*?<\/section>/gi," ")
  .replace(/<script[\s\S]*?<\/script>/gi," ")
  .replace(/<style[\s\S]*?<\/style>/gi," ")
  .replace(/<[^>]+>/g," ")
  .replace(/\s+/g," ")
  .trim();

test("homepage follows the current STEWARO FIDEL narrative",()=>{
  const home=read("de/index.html");
  const copy=visibleText(home);
  for(const statement of [
    "Jemand, der sich kümmert.",
    "FIDEL ist Ihr persönlicher Concierge",
    "Sie sagen, was gebraucht wird. FIDEL übernimmt",
    "Sie sagen, was Sie brauchen. FIDEL kümmert sich um den Rest."
  ]) assert.ok(copy.includes(statement),statement);
  assert.match(home,/class="hero-image hero-video"/);
  assert.match(home,/class="site-header"/);
  assert.match(home,/class="site-footer"/);
  assert.doesNotMatch(copy,/Google findet\. KI versteht\. NAHWERK erledigt|NAHWERK|Nilo|Mira|Hartmut|Frida/);
});

test("public story avoids fear-first and surveillance positioning",()=>{
  const pages=["de/index.html","prime-concierge.html","angehoerige.html","safety.html","telefonannahme.html"];
  const text=pages.map(p=>visibleText(read(p))).join("\n");
  for(const forbidden of [
    "Was wenn deine Eltern stürzen?",
    "Willst du wissen, ob bei deinen Eltern alles okay ist?",
    "Du möchtest wissen, ob bei deinen Eltern alles in Ordnung ist?"
  ]) assert.equal(text.includes(forbidden),false,forbidden);
  assert.match(visibleText(read("safety.html")),/keine permanente Überwachung/i);
  assert.match(visibleText(read("angehoerige.html")),/Keine automatische Einsicht/i);
});

test("unreleased telephone setup and warm-transfer implementation stay out of the public page",()=>{
  const page=read("telefonannahme.html");
  const publicCopy=visibleText(page);
  assert.doesNotMatch(page,/story-hidden-unreleased|id="einrichtung"|telephoneReceptionSetupForm|NUMBER_SUBMITTED|ROUTING_PENDING|PORTING_PENDING/);
  assert.doesNotMatch(publicCopy,/Festnetz-Warm-Transfer|Telefonannahme einrichten|Platform-Endpunkt/);
  assert.match(publicCopy,/Telefonfunktionen werden nur nach der vorgesehenen Einrichtung/);
});

test("core product pages share STEWARO navigation and FIDEL identity",()=>{
  for(const p of ["prime-concierge.html","senioren-concierge.html","safety.html","angehoerige.html","telefonannahme.html"]){
    const html=read(p);
    assert.match(html,/STEWARO/);
    assert.match(html,/stewaro-icon\.svg|<strong>STEWARO<\/strong>/);
    assert.doesNotMatch(visibleText(html),/NAHWERK|Nilo|Mira|Hartmut|Frida/);
  }
  assert.match(visibleText(read("prime-concierge.html")),/FIDEL/);
  assert.match(visibleText(read("senioren-concierge.html")),/FIDEL/);
  assert.match(visibleText(read("telefonannahme.html")),/FIDEL/);
});

test("family stays respectful and person-centered",()=>{
  const family=visibleText(read("angehoerige.html"));
  assert.match(family,/Keine automatische Einsicht/i);
  assert.match(family,/Privatsphäre/i);
  assert.doesNotMatch(family,/Hilflos|Pflegefall|überwachen/i);
});

test("safety remains calm, deliberate and bounded",()=>{
  const safety=visibleText(read("safety.html"));
  assert.match(safety,/bewusst eingerichtet/i);
  assert.match(safety,/keine permanente Überwachung/i);
  assert.doesNotMatch(safety,/Panik|Notfall deiner Eltern/i);
});
