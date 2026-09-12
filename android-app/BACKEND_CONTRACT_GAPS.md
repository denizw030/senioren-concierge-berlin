# NAHWERK Android – PROD Backend Blockers

Fresh audit basis: current merged Android client on `main` plus current client transport implementation. This document records only contracts Android still needs; it does not define or activate shared backend behavior.

## Already connected in the Android client

The existing client has concrete transport for:

- authentication: login, password reset, token refresh
- authenticated home/account-context read
- Concierge text chat
- reminder read/create transport already present in the API client
- stable chat retry/idempotency identifiers

These existing paths are not evidence that the remaining product contracts exist.

## Exact customer-launch blockers

### 1. Registration — BLOCKED
Required from shared PROD backend:
- canonical mobile-safe registration transport
- required customer fields and validation rules
- duplicate-account / email-verification behavior
- success acknowledgement and authenticated-session handoff

Android must not reuse browser-specific registration behavior without this confirmation.

### 2. Customer profile / personal data — BLOCKED
Required:
- authoritative customer-profile read contract
- allowed editable fields
- update authorization and validation
- canonical success/error response
- concurrency/version behavior where relevant

### 3. PAYG — BLOCKED / OWNED BY PAYG PROD WORKSTREAM
Required final shared contract:
- current PAYG eligibility/status
- activation state and activation acknowledgement
- price/cost estimate before a paid execution
- explicit customer approval representation
- execution correlation/idempotency
- exactly-once charge acknowledgement / receipt linkage
- fail/retry semantics without duplicate charging

Android will consume this contract only. It must not create its own wallet, price or billing truth.

### 4. Payment methods — BLOCKED
Required:
- safe customer-scoped payment-method read contract
- provider-safe add/change/remove flow
- no payment secret exposed to Android
- confirmed result after provider/backend completion

### 5. Costs / usage / limits — BLOCKED
Required:
- canonical current-period usage
- remaining limits / allowance semantics
- posted costs and pending/settled distinction where applicable
- authoritative timestamp / period boundary

No local counters may be shown as billing truth.

### 6. Conversation History — BLOCKED
Required:
- canonical conversation/thread identifiers
- server history pagination/order
- reconciliation with local presentation cache
- retry/error behavior

### 7. Task / Execution Details — BLOCKED
Required:
- canonical task/execution identifiers
- authoritative state vocabulary
- read/retry behavior
- verified-result representation

### 8. Approval Continuation — BLOCKED
Required:
- canonical approval identifier and task binding
- exact approved/rejected/expired states
- idempotent continuation behavior
- acknowledgement that continuation belongs to the same central task

### 9. Audio Input — BLOCKED
Required:
- mobile audio upload/stream transport
- accepted formats/limits
- canonical message/task linkage
- retry/idempotency and result acknowledgement

Microphone permission stays absent until this contract is activated.

### 10. File / Image Upload — BLOCKED
Required:
- upload transport and size/type limits
- authenticated ownership/linkage
- ingestion acknowledgement
- retry/deduplication behavior

### 11. Family — BLOCKED
Required:
- authoritative family membership / role / managed-person read contract
- invitation and permission actions allowed to the signed-in customer
- shared usage/pool semantics where applicable
- authorization failures and acknowledgement

Android must not infer Family authority locally.

### 12. Safety — BLOCKED
Required:
- authoritative Safety configuration/status read contract
- allowed customer mutations
- escalation/contact semantics owned by the shared Safety runtime
- acknowledgement/error/retry behavior

Android must never infer that a customer is safe, checked-in or resolved from local state.

## Release configuration blocker

A real customer release additionally needs confirmed non-STAGING values for:

- `NAHWERK_RELEASE_AUTH_BASE_URL`
- `NAHWERK_RELEASE_GATEWAY_BASE_URL`

The Android Gradle configuration rejects non-empty release URLs that are non-HTTPS or visibly STAGING. Empty values remain valid only for unsigned production-inert packaging and are **not** customer-ready.

## Current launch verdict

`READY_FOR_REAL_CUSTOMER_APP_E2E = NO`

Reason: login/chat client groundwork exists, but the mandatory registration/profile/PAYG/payment/usage/Safety/Family contracts and confirmed real PROD release endpoints are not yet available to the Android client.
