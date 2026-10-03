import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source=fs.readFileSync("assets/stewaro-csp-konto-script-3.js","utf8");

test("account Safety no longer calls the Flow 13 n8n webhook",()=>{
  assert.doesNotMatch(source,/denizw\.app\.n8n\.cloud\/webhook\/senioren-concierge\/web\/safety/);
  assert.doesNotMatch(source,/\bSAFETY_URL\b/);
});

test("account Safety loads and saves through the secure managed runtime",()=>{
  assert.match(source,/const MANAGED_SAFETY_URL = "https:\/\/djicahhmnnamtjuqedqd\.supabase\.co\/functions\/v1\/web-managed-safety-context"/);
  assert.match(source,/fetch\(contextUrl,[\s\S]*method: "GET"/);
  assert.match(source,/fetch\(MANAGED_SAFETY_URL,[\s\S]*method: "PUT"/);
});

test("account Safety preserves both delay preferences",()=>{
  assert.match(source,/customer_call_delay_minutes: Number\(safety\.customer_call_delay_minutes \?\? 5\)/);
  assert.match(source,/emergency_contact_delay_minutes: Number\(safety\.emergency_contact_delay_minutes \?\? 3\)/);
  assert.match(source,/customer_call_delay_minutes: customerDelay/);
  assert.match(source,/emergency_contact_delay_minutes: emergencyDelay/);
});
