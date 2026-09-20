import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const account=fs.readFileSync("konto.html","utf8");
const css=fs.readFileSync("assets/account-response-channel.css","utf8");
const js=fs.readFileSync("assets/account-response-channel.js","utf8");

test("response channel UI keeps Web and App in their own chats",()=>{
  assert.match(account,/Web und App bleiben übersichtlich im jeweiligen Chat/);
  assert.match(account,/Antwort im Web-Chat/);
  assert.match(account,/Antwort im App-Chat/);
  assert.match(account,/Diese Auswahl verändert Web und App nicht/);
});

test("persistent selector is explicitly scoped to WhatsApp jobs",()=>{
  assert.match(account,/WhatsApp-Aufträge/);
  assert.match(account,/name="responseChannel" value="SAME_CHANNEL"/);
  assert.match(account,/name="responseChannel" value="EMAIL"/);
  assert.match(account,/name="responseChannel" value="CALL"/);
  assert.doesNotMatch(account,/name="responseChannel" value="APP"/);
  assert.doesNotMatch(account,/name="responseChannel" value="WHATSAPP"/);
  assert.match(js,/stored==="WHATSAPP"\?"SAME_CHANNEL":stored/);
  assert.match(js,/WhatsApp-Aufträge werden künftig per/);
});

test("WhatsApp option discloses the per-answer transmission fee clearly",()=>{
  assert.match(account,/Für Unternehmensantworten über WhatsApp fallen Meta-Gebühren an/);
  assert.match(account,/0,06 € pro Antwort/);
  assert.match(account,/id="responseChannelSave">Speichern<\/button>/);
  assert.doesNotMatch(account,/WhatsApp-Antwortweg speichern/);
  assert.match(js,/save\.textContent="Speichern"/);
  assert.match(css,/\.response-channel-fee-note/);
});

test("single answers can be delivered elsewhere without changing defaults",()=>{
  assert.match(account,/Einzelne Antwort anders zustellen/);
  assert.match(account,/Schick mir diese Übersicht per E-Mail/);
  assert.match(account,/Nur diese Antwort wird dann zusätzlich auf dem gewünschten Weg zugestellt/);
});

test("response channel layout is symmetric and responsive",()=>{
  assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css,/@media\(max-width:820px\)/);
  assert.match(css,/@media\(max-width:620px\)/);
  assert.match(css,/response-channel-option:has\(input:checked\)/);
});

test("response channel assets are cache-busted together",()=>{
  assert.match(account,/assets\/account-response-channel\.css\?v=5/);
  assert.match(account,/assets\/account-response-channel\.js\?v=5/);
});
