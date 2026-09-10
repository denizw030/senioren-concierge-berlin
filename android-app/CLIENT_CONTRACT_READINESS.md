# NAHWERK Android – Client Contract Readiness

## Scope

This is client-side preparation only. It does not activate or redefine any backend/Core/WhatsApp/Voice contract.

Architecture remains frozen:

`CHANNELS DO NOT OWN BUSINESS LOGIC.`

`ONE PERSON -> ONE CONVERSATION -> ONE TASK STATE -> ONE CORE.`

Android remains a pure client.

## Current backend-contract mapping

- Relevant gaps classified: **7 / 7**
- READY: **0 / 7**
- PARTIAL: **5 / 7**
- MISSING: **2 / 7**
- Backend contracts activated by this work: **0 / 7**

`PARTIAL` and `MISSING` describe backend-contract evidence maturity only. Neither state grants Android authority and neither permits a client transport/schema implementation without the exact confirmed contract.

The canonical detailed gap record remains `BACKEND_CONTRACT_GAPS.md`.

## Prepared client boundary

`BackendContractReadiness.kt` registers exactly these seven blocked capability boundaries:

1. Conversation History
2. Task / Execution Details
3. Approval Continuation
4. Audio Input
5. File / Image Upload
6. Family Display
7. Safety Display

No endpoint, method, URL, payload field, backend identifier or success vocabulary is defined here.

No new DTO is created for an unconfirmed backend schema.

## Fail-closed UI states

The client may represent only these non-authoritative readiness states for the seven blocked capabilities:

- `LOADING`
- `UNAVAILABLE`
- `RETRYABLE`
- `UNKNOWN`

For every one of those states while the contract is blocked:

- backend authority is unavailable to the client;
- success must not be inferred;
- authority-bearing actions must not be submitted;
- local state must not become canonical task, approval, family or safety truth.

There is deliberately no `READY` or `ACTIVE` activation enum value in this readiness layer.

## Explicitly not implemented

This work does **not** add:

- invented URLs or HTTP methods;
- invented request/response payload fields;
- invented canonical IDs;
- local approval interpretation or continuation logic;
- local Safety decision logic;
- local Family authority;
- audio/media upload backend wiring;
- file/image upload backend wiring;
- canonical conversation/task state in Android;
- Core, CAO, WhatsApp or Voice changes;
- productive activation or real calls.

## Activation gate

A capability can move beyond this blocked client boundary only after its backend contract is separately confirmed and versioned with exact authentication/authorization, transport/schema, canonical identifiers, idempotency/retry behavior, error behavior and success acknowledgement.

Until then Android remains fail-closed.
