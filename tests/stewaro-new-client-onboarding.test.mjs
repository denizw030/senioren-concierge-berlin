import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const onboarding = fs.readFileSync("assets/onboarding.js","utf8");

test("new STEWARO registration cannot select a legacy brand or persona", () => {
  assert.match(onboarding,/const product = "stewaro"/);
  assert.match(onboarding,/const productLabel = "STEWARO Concierge"/);
  assert.match(onboarding,/const conciergeValue = \(\) => "fidel"/);
  assert.match(onboarding,/const concierge = \(\) => "FIDEL"/);
  assert.match(onboarding,/concierge_profile: "FIDEL", concierge_choice: "fidel"/);
  assert.match(onboarding,/data-stewaro-fidel-authority/);
  assert.doesNotMatch(onboarding,/SENIOR_MARTIN|PRIME_MARTIN/);
  assert.doesNotMatch(onboarding,/selected:\s*choice\.dataset\.selected\s*\|\|\s*"lena"/);
  assert.doesNotMatch(onboarding,/const product = .*"prime"/);
});
