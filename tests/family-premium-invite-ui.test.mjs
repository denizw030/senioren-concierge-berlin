import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const js=fs.readFileSync("assets/family-owner-sponsored-access.js","utf8");

test("premium family start languages include de tr en pl ar",()=>{
  for(const token of ['de:"Deutsch"','tr:"Türkisch"','en:"Englisch"','pl:"Polnisch"','ar:"Arabisch"']) assert.ok(js.includes(token));
});

test("customer copy exposes premium direct or activation fallback without provider jargon",()=>{
  assert.ok(js.includes("Einladung wird über WhatsApp zugestellt."));
  assert.ok(js.includes("Einladung über WhatsApp aktivieren"));
  assert.ok(js.includes("In WhatsApp bestätigen"));
  assert.ok(js.includes("Link kopieren"));
  assert.equal(js.includes("Meta-Template"),false);
  assert.equal(js.includes("Twilio-Template"),false);
});

test("server-issued route supports direct premium and activation fallback safely",()=>{
  assert.ok(js.includes("/send"));
  assert.ok(js.includes("outbound:data.outbound??null"));
  assert.ok(js.includes('route==="ACTIVATION_LINK"'));
  assert.ok(js.includes('route==="DIRECT_PREMIUM"'));
  assert.ok(js.includes("outbound?.provider_execution===true"));
  assert.ok(js.includes("outbound?.provider_execution===false"));
});
