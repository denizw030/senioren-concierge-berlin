import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const json = (path) => JSON.parse(read(path));

const gateway = json("docs/shared-write-candidates/web-concierge-gateway-v1.json");
const detach = json("docs/shared-write-candidates/payg-payment-method-detach-v1.json");
const rights = json("docs/shared-write-candidates/payg-consumer-rights-v1.json");
const sql = read("docs/shared-write-candidates/20260912_web_account_shared_prod.sql");
const handoff = read("docs/web-account-shared-prod-change-set-v1.md");
const webClient = read("assets/web-customer-concierge.js");
const detachClient = read("assets/payg-payment-method-remove-guard.js");
const rightsClient = read("assets/payg-consumer-rights-guard.js");
const withdrawalClient = read("assets/electronic-withdrawal.js");

test("Web Gateway contract is exact, PROD-only and browser identity has zero authority", () => {
  assert.equal(gateway.contract_version,"web-concierge-gateway-v1");
  assert.equal(gateway.environment,"prod");
  assert.equal(gateway.endpoint,"https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/web-concierge-gateway");
  assert.equal(gateway.auth.browser_may_supply_identity,false);
  assert.deepEqual(gateway.auth.server_identity,["person_id","customer_account_id","customer_member_id"]);
  assert.equal(gateway.server_identity_resolution.uniqueness_proof,"UNIQUE(customer_account_id, person_id)");
  assert.equal(gateway.readiness.required_response.channel,"WEB");
  assert.equal(gateway.readiness.required_response.authoritative,true);
  assert.equal(gateway.readiness.required_response.cao_authoritative,true);
  assert.equal(gateway.readiness.required_response.shadow,false);
});

test("browser implementation is pinned to the frozen Web Gateway contract", () => {
  assert.match(webClient,/web-concierge-gateway-v1/);
  assert.match(webClient,/\/functions\/v1\/web-concierge-gateway/);
  assert.match(webClient,/cao_authoritative === true/);
  assert.match(webClient,/delivery\.shadow === false/);
  assert.match(webClient,/delivery\.deliver === true/);
  assert.doesNotMatch(webClient,/customer-portal-staging/);
});

test("payment detach contract uses canonical DETACHED state and reconciliation", () => {
  assert.equal(detach.contract_version,"payg-payment-method-detach-v1");
  assert.equal(detach.database.canonical_final_status,"DETACHED");
  assert.deepEqual(detach.preconditions.block_topup_statuses_for_method,["CREATED","PROVIDER_PENDING"]);
  assert.equal(detach.reconciliation.browser_success_before_reconciliation,false);
  assert.equal(detach.response_success.status,"payment_method_detached");
  assert.match(detachClient,/payg-payment-method-detach-v1/);
  assert.match(detachClient,/stillActive/);
});

test("PAYG consumer-rights contract binds evidence, durable confirmation and withdrawal", () => {
  assert.equal(rights.contract_version,"payg-consumer-rights-v1");
  assert.equal(rights.payg_state_required.authoritative,true);
  assert.equal(rights.payg_state_required.electronic_withdrawal_function,true);
  assert.equal(rights.quote_approval.atomic_rpc,"payg_approve_action_quote_with_consumer_rights_v1");
  assert.equal(rights.durable_order_confirmation.required_delivery_state_before_execution,"SENT");
  assert.equal(rights.electronic_withdrawal.prohibit_reason_requirement,true);
  assert.equal(rights.electronic_withdrawal.success_response.confirmation_delivery_state,"SENT");
  assert.match(rightsClient,/legal_text_sha256/);
  assert.match(withdrawalClient,/confirmation_delivery_state === "SENT"/);
});

test("candidate migration contains every required authoritative persistence primitive", () => {
  for (const name of [
    "payg_payment_method_detach_operations_v1",
    "payg_consumer_rights_evidence_v1",
    "payg_order_confirmations_v1",
    "payg_withdrawal_requests_v1",
    "payg_prepare_payment_method_detach_v1",
    "payg_mark_payment_method_provider_detached_v1",
    "payg_finalize_payment_method_detach_v1",
    "payg_approve_action_quote_with_consumer_rights_v1",
    "payg_mark_order_confirmation_sent_v1",
    "payg_consumer_rights_execution_ready_v1"
  ]) assert.ok(sql.includes(name),`missing ${name}`);
  assert.match(sql,/CANDIDATE ONLY\. DO NOT APPLY WHILE ANOTHER SHARED WRITER HOLDS THE PROD SLOT/);
  assert.match(sql,/CONSUMER_RIGHTS_CONFIRMATION_PENDING/);
});

test("shared handoff freezes activation order and the low-cost real E2E candidate", () => {
  assert.match(handoff,/READY_FOR_SHARED_WRITE = YES/);
  assert.match(handoff,/READY_FOR_REAL_CUSTOMER_WEB_ACCOUNT_E2E = NO/);
  assert.match(handoff,/appointment\.search/);
  assert.match(handoff,/web_research/);
  assert.match(handoff,/29` cents|29 cents|€0\.29/);
  assert.match(handoff,/QUOTED -> APPROVED -> HELD -> CAPTURED/);
  assert.match(handoff,/exactly \*\*€0\.29\*\*/);
  assert.match(handoff,/Owner approval/);
});

test("new customer clients and frozen contracts contain no STAGING or Shadow destination", () => {
  for (const source of [webClient,detachClient,rightsClient,withdrawalClient,JSON.stringify(gateway),JSON.stringify(detach),JSON.stringify(rights)]) {
    assert.doesNotMatch(source,/customer-portal-staging|btqklftjmwtqqqdmwlnk/i);
  }
});
