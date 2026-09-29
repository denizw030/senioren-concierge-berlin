import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const visible = (html) => html.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();

test("canonical STEWARO brand assets exist",()=>{
  for(const file of ["assets/logos/stewaro-icon.svg","assets/logos/stewaro-wordmark.svg","assets/fidel-gold-orb.js"])
    assert.equal(existsSync(new URL(file,root)),true,file);
});

test("Prime and senior public surfaces expose one FIDEL identity",()=>{
  for(const file of ["prime-concierge.html","senioren-concierge.html"]){
    const html=read(file), copy=visible(html);
    assert.match(copy,/STEWARO/);
    assert.match(copy,/FIDEL/);
    assert.match(html,/stewaro-fixed-concierge-card/);
    assert.doesNotMatch(copy,/NAHWERK|Nilo|Mira|Hartmut|Frida/);
    assert.doesNotMatch(html,/data-concierge-carousel/);
  }
});

test("senior page keeps real-world examples and bounded claims",()=>{
  const copy=visible(read("senioren-concierge.html"));
  assert.match(copy,/Uber|Taxi/);
  assert.match(copy,/Bevor Kosten entstehen/);
  assert.match(copy,/Betrug/);
  assert.match(copy,/keine Garantie, jeden Betrugsversuch zu erkennen/i);
});

test("current launch tariff matrix is consistent and uses Klienten language",()=>{
  const pricing=visible(read("pakete.html"));
  for(const value of [
    "0 € / Monat","20 WhatsApp-Nachrichten",
    "5,99 € / Monat","30 WhatsApp-Nachrichten",
    "10,99 € / Monat","50 WhatsApp-Nachrichten",
    "19,99 € / Monat","100 WhatsApp-Nachrichten",
    "34,99 € / Monat","160 WhatsApp-Nachrichten",
    "59,66 € / Monat","300 WhatsApp-Nachrichten"
  ]) assert.ok(pricing.includes(value),value);
  assert.doesNotMatch(pricing,/Kundennachrichten|Kundenkonto|Kundenbereich/);
});

test("FIDEL remains the same concierge across configured channels",()=>{
  const prime=visible(read("prime-concierge.html"));
  const senior=visible(read("senioren-concierge.html"));
  assert.match(prime,/FIDEL/);
  assert.match(prime,/Welche WhatsApp- oder Telefonfunktionen verfügbar sind/);
  assert.match(senior,/Ihr Concierge bleibt auch am Telefon derselbe/);
});
