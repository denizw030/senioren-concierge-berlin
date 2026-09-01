import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const account = read("konto.html");
const senior = read("senioren-concierge.html");
const prime = read("prime-concierge.html");

test("telephone reception lives inside Concierge without adding a main account tab", () => {
  assert.match(account, /id="telephoneReceptionCard"[\s\S]*data-account-panel="concierge"/);
  assert.equal((account.match(/data-account-tab=/g) || []).length, 5);
  assert.match(account, /Persönliche Telefonannahme/);
  assert.match(account, /Telefonannahme mit erweitertem Schutz/);
});

test("reception UI uses staging portal and safe routing guard", () => {
  assert.match(account, /nahwerk-customer-portal-staging\/portal\/telephone-reception/);
  assert.match(account, /receptionRoutingReady/);
  assert.match(account, /block_and_notify/);
  assert.match(account, /screening_level: receptionMode\.value === "senior_protection" \? "strict" : "standard"/);
  assert.match(account, /receptionEnabled\.checked && !receptionRoutingReady/);
});

test("trusted contacts reuse concierge_contacts endpoint instead of a second contact system", () => {
  assert.match(account, /RECEPTION_CONTACT_URL/);
  assert.match(account, /contact_id: contact\.id/);
  assert.match(account, /reception_trusted/);
});

test("parallel account theme and usage work remains present", () => {
  assert.match(account, /window\.NAHWERKAccountPreview = Object\.freeze/);
  assert.match(account, /id="appUsageSummary"/);
  assert.match(account, /id="whatsappUsageSummary"/);
  assert.match(account, /FREE/);
  assert.match(account, /PREMIUM PLUS/);
});

test("public pages describe reception without fraud-prevention guarantees", () => {
  assert.match(senior, /Mehr Sicherheit bei unbekannten Anrufen/);
  assert.match(senior, /Enkeltrick/);
  assert.match(senior, /keine Garantie, jeden Betrugsversuch zu erkennen/);
  assert.match(prime, /Persönliche Telefonannahme/);
  assert.match(prime, /Eltern oder Großeltern/);
});
