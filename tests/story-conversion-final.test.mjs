import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=(p)=>fs.readFileSync(p,"utf8");
const visibleText=(html)=>html
  .replace(/<section[^>]*\bhidden\b[^>]*>[\s\S]*?<\/section>/gi," ")
  .replace(/<[^>]+>/g," ")
  .replace(/\s+/g," ")
  .trim();

test("homepage follows the frozen six-step story exactly",()=>{
  const home=read("index.html");
  const steps=[...home.matchAll(/data-story-step="([1-6])"/g)].map(m=>m[1]);
  assert.deepEqual(steps,["1","2","3","4","5","6"]);
  const positions=[
    "Ein persönlicher Concierge, der erledigt.",
    "Echte Demo",
    "Da sein, auch wenn Sie nicht da sein können.",
    "Unterstützung, ohne Selbstständigkeit abzunehmen.",
    "Ein Concierge. Dasselbe Gespräch. Egal über welchen Weg.",
    "Geben Sie die erste Aufgabe ab."
  ].map(s=>home.indexOf(s));
  positions.forEach((p,i)=>assert.ok(p>=0,`story marker ${i+1} exists`));
  for(let i=1;i<positions.length;i++) assert.ok(positions[i]>positions[i-1],`story marker ${i+1} follows marker ${i}`);
});

test("core marketing statements are preserved verbatim",()=>{
  const home=visibleText(read("index.html"));
  for(const statement of [
    "Ein persönlicher Concierge, der erledigt.",
    "Google findet. KI versteht. NAHWERK erledigt.",
    "Da sein, auch wenn Sie nicht da sein können.",
    "Unterstützung, ohne Selbstständigkeit abzunehmen.",
    "Ein Concierge. Dasselbe Gespräch. Egal über welchen Weg."
  ]) assert.ok(home.includes(statement),statement);
});

test("FREE entry copy explains trial, limits and online credit without live gift-card marketing",()=>{
  const js=read("assets/acquisition-v1.js");
  assert.match(js,/Kostenlos registrieren/);
  assert.match(js,/chatten, Fragen stellen, Aufgaben vorbereiten und eine echte Concierge-Ausführung ausprobieren/);
  assert.match(js,/Keine Zahlungsdaten erforderlich\. Kein automatisches Upgrade\./);
  assert.match(js,/Guthaben schon ab 5 € online aufladen/);
  assert.match(js,/bis zu 50 App-Dialoge \/ Monat/);
  assert.match(js,/bis zu 20 WhatsApp-Dialoge \/ Monat/);
  assert.match(js,/1 echte Concierge-Ausführung/);
  assert.match(js,/FUTURE COPY — erst nach produktiver Verfügbarkeit im UI aktivieren/);
  const renderedMarkup=read("index.html");
  assert.doesNotMatch(renderedMarkup,/Guthabenkarten ab 10 €/);
});

test("demo makes Auftrag Freigabe Durchführung Ergebnis immediately explicit",()=>{
  const home=read("index.html");
  const start=home.indexOf('id="demo"');
  const end=home.indexOf('data-story-step="3"',start);
  assert.ok(start>=0&&end>start);
  const demo=home.slice(start,end);
  const labels=["<h3>Auftrag</h3>","<h3>Freigabe</h3>","<h3>Durchführung</h3>","<h3>Ergebnis</h3>"];
  const positions=labels.map(x=>demo.indexOf(x));
  positions.forEach((p,i)=>assert.ok(p>=0,labels[i]));
  for(let i=1;i<positions.length;i++)assert.ok(positions[i]>positions[i-1],labels[i]);
});

test("public story avoids fear-first and surveillance positioning",()=>{
  const pages=["index.html","prime-concierge.html","angehoerige.html","safety.html","telefonannahme.html"];
  const text=pages.map(p=>visibleText(read(p))).join("\n");
  for(const forbidden of [
    "Was wenn deine Eltern stürzen?",
    "Willst du wissen, ob bei deinen Eltern alles okay ist?",
    "Du möchtest wissen, ob bei deinen Eltern alles in Ordnung ist?"
  ]) assert.equal(text.includes(forbidden),false,forbidden);
  assert.match(visibleText(read("safety.html")),/keine permanente Überwachung/i);
  assert.match(visibleText(read("angehoerige.html")),/Keine automatische Einsicht/i);
});

test("unreleased telephone setup and warm-transfer marketing stay hidden",()=>{
  const page=read("telefonannahme.html");
  assert.match(page,/class="tr-section story-hidden-unreleased" hidden aria-hidden="true"[\s\S]*Festnetz-Warm-Transfer/);
  assert.match(page,/id="einrichtung" hidden aria-hidden="true"/);
  assert.match(page,/Platform-Endpunkt ist vorbereitet, aber noch nicht deployed/);
  const publicCopy=visibleText(page);
  assert.doesNotMatch(publicCopy,/Festnetz-Warm-Transfer|Telefonannahme einrichten|Platform-Endpunkt ist vorbereitet/);
  assert.match(publicCopy,/Weitere Telefonfunktionen werden erst öffentlich gezeigt, wenn sie für den jeweiligen Zugang eingerichtet sind/);
});

test("story product pages share the same brand layer and navigation logic",()=>{
  for(const p of ["index.html","prime-concierge.html","safety.html","angehoerige.html","telefonannahme.html"]){
    const html=read(p);
    assert.match(html,/assets\/story-conversion-final\.css\?v=1/,p);
    assert.match(html,/href="prime-concierge\.html">Concierge<\/a>/,p);
    assert.match(html,/href="safety\.html">Safety<\/a>/,p);
    assert.match(html,/href="angehoerige\.html">Family<\/a>/,p);
    assert.match(html,/href="telefonannahme\.html">Telefon<\/a>/,p);
  }
});

test("family stays respectful and person-centered",()=>{
  const family=visibleText(read("angehoerige.html"));
  assert.match(family,/Unterstützung, ohne Selbstständigkeit abzunehmen/);
  assert.match(family,/eigenen Concierge/i);
  assert.match(family,/eigener Sprache|Sprache selbst wählen/i);
  assert.match(family,/Privatsphäre/i);
  assert.doesNotMatch(family,/Hilflos|Pflegefall|überwachen/i);
});

test("safety remains calm, deliberate and bounded",()=>{
  const safety=visibleText(read("safety.html"));
  assert.match(safety,/Da sein, auch wenn Sie nicht da sein können/);
  assert.match(safety,/bewusst eingerichtet/i);
  assert.match(safety,/keinen medizinischen Notruf|ersetzt keinen medizinischen Notruf/i);
  assert.doesNotMatch(safety,/Sturz|Panik|Notfall deiner Eltern/i);
});
