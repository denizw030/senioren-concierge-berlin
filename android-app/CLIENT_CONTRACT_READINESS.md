# NAHWERK Android – Client Contract Readiness

## Scope

Client-side launch preparation only. Android does not activate or redefine backend/Core/CAO/Billing/WhatsApp/Voice contracts.

Architecture remains frozen:

`CHANNELS DO NOT OWN BUSINESS LOGIC.`

`ONE PERSON -> ONE CONVERSATION -> ONE TASK STATE -> ONE CORE.`

## Fresh customer-launch inventory

Confirmed mobile client transports already implemented:

- login
- password reset
- token refresh / logout boundary
- authenticated account/home context read
- Concierge text chat with stable idempotency/retry IDs
- reminder read path

Customer-launch contracts still blocked because no exact confirmed mobile PROD transport/schema is present in the Android contract:

1. Registration
2. Customer profile / personal-data read-write
3. PAYG status / activation / paid execution lifecycle
4. Payment methods
5. Costs / usage / limits
6. Conversation History
7. Task / Execution Details
8. Approval Continuation
9. Audio Input
10. File / Image Upload
11. Family Display / authorization
12. Safety Display / continuation

Backend contracts activated by this Android work: **0**.

## Fail-closed rule

For every blocked contract the client may represent only non-authoritative states such as `LOADING`, `UNAVAILABLE`, `RETRYABLE` or `UNKNOWN`.

While blocked:

- backend authority is unavailable to Android;
- success must not be inferred;
- authority-bearing actions must not be submitted;
- local state must not become canonical account, PAYG, billing, task, approval, family or safety truth;
- no mock/staging value may be presented as PROD product truth.

## PROD release boundary

Release endpoint values remain environment-injected. Android now rejects any non-empty release Auth/Gateway URL that is non-HTTPS or visibly STAGING (`staging` / `-stg`). Empty release endpoints remain allowed only for production-inert unsigned packaging checks; they do not constitute a customer-ready release.

A real customer release therefore still requires confirmed non-STAGING PROD Auth/Gateway values plus the separately controlled signing/distribution gate.

## Activation gate

A blocked capability can become active only after the shared backend/product owner supplies a versioned contract with exact authentication/authorization, transport/schema, canonical identifiers, idempotency/retry behavior, error behavior and success acknowledgement.

PAYG additionally requires the final PAYG product contract from its dedicated PROD workstream; Android must consume that contract and must not create a parallel billing/wallet model.
