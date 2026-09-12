# NAHWERK Web / Kundenkonto — Shared PROD Change-Set v1

Stand: 2026-09-12

`READY_FOR_SHARED_WRITE = YES`

`READY_FOR_REAL_CUSTOMER_WEB_ACCOUNT_E2E = NO`

Dieser Change-Set ist vorbereitet, aber darf erst angewendet werden, wenn der einzige Shared Platform/Core/CAO PROD Write Slot frei ist.

## A. Fresh PROD facts

- Supabase PROD project: `djicahhmnnamtjuqedqd`.
- Core: `nahwerk-concierge-core` v43 ACTIVE.
- Core v43 accepts `channel=WEB`, but `coreV1DeliveryDecision` is hard-coded authoritative only for WhatsApp.
- `adapter_core_route_web`: disabled, rollout 0, mode `shadow_only`.
- `central_orchestrator_authoritative`: disabled for WEB.
- Web session returns `person_id` + `customer_account_id`.
- `customer_members` has `UNIQUE(customer_account_id, person_id)`, so gateway can resolve the canonical `customer_member_id` server-side without trusting the browser.
- Core accepts service auth with Supabase service credentials / configured Supabase secret keys; browser must never receive them.
- `customer_payment_methods_v1.status` already supports `DETACHED`.
- There is no payment detach RPC/action yet.
- There is no consumer-rights / electronic-withdrawal persistence contract yet.
- Current CAO DB claim/transition path already owns exact-once execution and PAYG reserve/capture. Do not create a second execution engine.

## B. Apply order once Shared slot is free

### B1. Database migration

Apply exactly the candidate migration:

`docs/shared-write-candidates/20260912_web_account_shared_prod.sql`

It adds only:

- `payg_payment_method_detach_operations_v1`
- `payg_consumer_rights_evidence_v1`
- `payg_order_confirmations_v1`
- `payg_withdrawal_requests_v1`
- prepare/provider-detached/finalize payment-detach RPCs
- atomic WEB quote approval + consumer-rights-evidence RPC
- durable-order-confirmation state RPC
- `payg_consumer_rights_execution_ready_v1(action_id)` guard

No existing PAYG price, wallet balance, quote or usage rows are rewritten by the migration.

### B2. `web-payg-checkout` vNext — payment detach

Add action `detach_payment_method`.

Request accepted from browser:

```json
{
  "action": "detach_payment_method",
  "payment_method_id": "uuid",
  "idempotency_key": "payment-detach-..."
}
```

Server sequence:

1. Validate existing web session.
2. Ignore browser account/person identity; use session identity.
3. Call `payg_prepare_payment_method_detach_v1`.
4. If returned state is `COMPLETED`, return authoritative idempotent success.
5. Require provider=`stripe` and provider customer/method binding from server result.
6. Call Stripe `POST /v1/payment_methods/{provider_payment_method_id}/detach`.
7. Only after Stripe confirms detach: `payg_mark_payment_method_provider_detached_v1`.
8. Call `payg_finalize_payment_method_detach_v1`.
9. Return only after DB state is final:

```json
{
  "ok": true,
  "status": "payment_method_detached",
  "contract_version": "payg-payment-method-detach-v1",
  "authoritative": true,
  "payment_method_id": "same uuid"
}
```

Failure/retry rule:

- Provider detached + DB finalize failed => operation stays `PROVIDER_DETACHED`; retry only finalization, never show browser success early.
- Method with `CREATED` or `PROVIDER_PENDING` topup is blocked.
- No local browser deletion.

`web-payg` GET must expose only when this path is operational:

```json
{
  "payment_method_capabilities": {
    "contract_version": "payg-payment-method-detach-v1",
    "authoritative": true,
    "detach_supported": true
  }
}
```

### B3. `web-payg` vNext — PAYG Consumer Rights

For WEB `approve_quote`, `consumer_rights_evidence` becomes mandatory.

Required browser evidence:

- quote_id
- `contract_version=payg-consumer-rights-v1`
- legal_text_version
- legal_text_sha256
- immediate_performance_requested=true
- withdrawal_expiry_acknowledged=true
- accepted_at_client

Server must ignore client identity and bind evidence itself to:

- person_id
- customer_account_id
- customer_member_id
- quote_id
- action_id
- approval_id
- canonical action approval evidence hash
- server_received_at
- source_channel=WEB

For WEB paid service quote approval, call `payg_approve_action_quote_with_consumer_rights_v1`; do not expose naked `payg_approve_action_quote_v1` through the web route.

After atomic evidence + quote approval:

1. Build immutable order confirmation with exact service description, amount, currency, approval timestamp and legal-text version.
2. Send it through the approved durable-medium transactional delivery path to the authenticated person's confirmed email.
3. Mark `payg_order_confirmations_v1.delivery_state=SENT` only after actual delivery provider acceptance.
4. If confirmation cannot be sent, quote may remain approved but CAO execution stays fail-closed.

`web-payg` GET exposes Consumer Rights ready only when all parts are operational:

```json
{
  "consumer_rights": {
    "contract_version": "payg-consumer-rights-v1",
    "authoritative": true,
    "electronic_withdrawal_function": true,
    "electronic_withdrawal_url": "https://nahwerkconcierge.com/vertrag-widerrufen.html",
    "immediate_performance_consent_evidence": true,
    "order_confirmation_durable_medium": true,
    "legal_text_version": "immutable-version",
    "legal_text_sha256": "64-lowercase-hex"
  }
}
```

### B4. New public Edge Function `web-payg-consumer-rights`

Contract: `payg-consumer-rights-v1`.

CORS only NAHWERK production origins. No login required for electronic withdrawal function.

Actions:

#### `readiness`
Return ready only if DB persistence + durable confirmation sender are healthy:

```json
{
  "ok": true,
  "contract_version": "payg-consumer-rights-v1",
  "authoritative": true,
  "electronic_withdrawal_function": true,
  "durable_confirmation": true
}
```

#### `withdraw`
Accept only:

- consumer_name
- contract_reference
- confirmation_email
- `statement=WITHDRAW`

No reason required. Apply IP/request rate limiting and generic anti-enumeration responses.

Server sequence:

1. Normalize and validate fields.
2. Resolve reference internally if possible, without exposing whether a contract exists.
3. Insert immutable `payg_withdrawal_requests_v1` with server receipt timestamp and request fingerprint.
4. Send durable confirmation containing the withdrawal statement plus receipt date/time to `confirmation_email`.
5. Mark confirmation SENT only after delivery provider acceptance.
6. Only then return:

```json
{
  "ok": true,
  "status": "withdrawal_received",
  "contract_version": "payg-consumer-rights-v1",
  "authoritative": true,
  "confirmation_delivery_state": "SENT",
  "received_at": "server ISO timestamp"
}
```

### B5. CAO execution guard

Patch the canonical claim path, not the website.

In `cao_claim_canonical_action_v1`, after fixed PAYG quote/approval binding and before wallet reserve/provider claim:

- if `source_channel='WEB'` and the action has an entgeltlicher fixed PAYG quote, require `payg_consumer_rights_execution_ready_v1(action_id)=true`.
- otherwise fail closed with stable reason `CONSUMER_RIGHTS_CONFIRMATION_PENDING`.

Do not change existing exact-once semantics:

- action idempotency key
- canonical approval consumption
- execution claim
- provider binding
- quote reserve
- quote capture only on `cao_transition_canonical_action_v1(... COMPLETED ...)`

### B6. Core vNext — make WEB authoritative without cloning logic

Patch `coreV1DeliveryDecision` from WhatsApp-only to a route-key map:

```text
WHATSAPP -> adapter_core_route_whatsapp
WEB      -> adapter_core_route_web
```

For WEB require all:

- route flag enabled
- route channels contains WEB
- rollout > 0
- metadata mode is authoritative-approved mode
- metadata.authoritative_delivery=true
- response state is deliverable
- central orchestrator authority for WEB is enabled

When those are true return:

```json
{
  "channel": "WEB",
  "shadow": false,
  "deliver": true,
  "authoritative": true,
  "route_key": "adapter_core_route_web"
}
```

Do not change Conversation, Task, Memory, Persona, Approval or Action ownership.

For canonical actions that become executable, hand the existing canonical `action_id/execution_id/correlation_id` to the authoritative CAO target. The CAO must claim using `cao_claim_canonical_action_v1`; the Core/adapter must not execute a provider independently.

After CAO terminal transition, Core must render/store `ACTION_RESULT` or `ERROR_RESPONSE` from authoritative canonical action + verification state.

Add a service-authenticated Core state/read endpoint or Core-owned RPC for gateway `sync`; the Web Gateway may not synthesize task/action success itself.

### B7. New Edge Function `web-concierge-gateway`

Machine-readable contract:

`docs/shared-write-candidates/web-concierge-gateway-v1.json`

Deployment rules:

- PROD only.
- Custom web session validation through existing `web-session-secure`.
- Service role stays server-side.
- Resolve member using unique `(customer_account_id, person_id)`.
- Browser identity fields have zero authority.
- `turn`, `approval`, `sync`, `readiness` only.
- call Core `/v1/core/turn` with server-resolved identity and `channel=WEB`.
- never return a customer result unless Core response says `delivery_hints.channel=WEB`, `deliver=true`, `shadow=false` and response identity belongs to session person/account.

### B8. Activation order

1. Migration + DB regression, no provider calls.
2. Deploy updated `web-payg`/`web-payg-checkout` with readiness capabilities initially false.
3. Deploy `web-payg-consumer-rights`; keep readiness false until durable confirmation sender is real.
4. Patch Core WEB delivery + Core state read; keep `adapter_core_route_web` rollout 0.
5. Deploy `web-concierge-gateway`; readiness must remain false.
6. Patch/verify CAO consumer-rights execution guard and authoritative WEB execution route.
7. Provider-free contract tests.
8. Owner-only WEB canary: enable `adapter_core_route_web` for owner identity first, no paid action.
9. Verify authoritative WEB answer + Conversation/Task continuity.
10. Verify `appointment.search` provider readiness through the authoritative CAO path without executing a paid customer action.
11. Only after all above, report `READY_FOR_REAL_CUSTOMER_WEB_ACCOUNT_E2E = YES` and ask for separate Owner approval for the real paid test.

## C. Prepared real-customer E2E candidate

Preferred low-cost fixed-price candidate after provider readiness is proven:

- Capability: `appointment.search`
- Customer request: a harmless current search for three suitable appointment/practice options; no booking, no phone call.
- Frozen pricing resolver: `web_research`
- Frozen PAYG amount: **€0.29** (`29` cents)
- External contractual purchase: none
- Expected quote: `QUOTED`, amount 29 EUR cents
- Customer action: explicit PAYG price approval + immediate-performance declarations
- Expected execution: exactly one canonical action claim through CAO
- Expected result: Core `ACTION_RESULT`, verified research result
- Expected PAYG lifecycle: `QUOTED -> APPROVED -> HELD -> CAPTURED`
- Expected NAHWERK charge: exactly **€0.29** from PAYG wallet/accounting, once
- Expected account display: one captured 0.29 EUR PAYG usage/quote entry; no duplicate capture

If authoritative CAO provider-readiness does not prove `appointment.search` executable, do not substitute silently. Stop E2E and select a different already-priced capability only with Owner approval.

## D. Acceptance gates

Before declaring 100%:

- `web-concierge-gateway-v1` readiness exact GREEN
- WEB Core delivery `shadow=false`, `deliver=true`, authoritative=true
- correct server-resolved person/account/member proven
- same conversation persists across at least two WEB turns
- canonical Task and Approval binding proven
- CAO claim/transition path proven for WEB
- Payment detach: provider detach + DB DETACHED + GET reconciliation GREEN
- Consumer rights: version/hash evidence persisted, durable order confirmation SENT
- electronic withdrawal function can persist and send receipt confirmation
- zero STAGING/Shadow customer result
- real Owner E2E: one 0.29 EUR quote, one approval, one action, one capture, one usage entry, verified result

Only then:

`READY_FOR_SHARED_WRITE = NO` (nothing left to write)

`READY_FOR_REAL_CUSTOMER_WEB_ACCOUNT_E2E = GREEN/COMPLETED`

`Web / Kundenkonto = 100%`
