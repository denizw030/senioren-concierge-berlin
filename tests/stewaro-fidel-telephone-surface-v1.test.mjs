import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const html = fs.readFileSync(new URL("../telefonannahme.html", import.meta.url), "utf8");

test("STEWARO telephone surface presents FIDEL as launch identity", () => {
  assert.match(html, /FIDEL, der KI-Concierge von STEWARO/);
  assert.match(html, /FIDEL Telefonannahme/);
  assert.match(html, /value="fidel">FIDEL</);
  assert.match(html, /FIDEL mit persönlichem Kontext/);
});

test("pre-provider setup stays hidden and does not claim live routing", () => {
  assert.match(html, /story-hidden-unreleased[^>]*id="einrichtung"[^>]*hidden/);
  assert.match(html, /Platform-Endpunkt ist vorbereitet, aber noch nicht deployed/);
  assert.match(html, /NUMBER_SUBMITTED/);
  assert.match(html, /ROUTING_ACTIVE/);
});

test("technical handler contract remains compatible", () => {
  assert.match(html, /value="TELEPHONE_AGENT"/);
  assert.match(html, /value="PERSONAL_CONCIERGE"/);
  assert.doesNotMatch(html, /Später nimmt Telefonagent Alexander den Anruf an/);
});
