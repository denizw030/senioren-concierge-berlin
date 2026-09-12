# NAHWERK Concierge Android

## Status

**CUSTOMER PROD LAUNCH – CLIENT MAXIMIZED / SHARED CONTRACTS BLOCKED**

`READY_FOR_REAL_CUSTOMER_APP_E2E = NO`

Android remains a pure client. It does not own or redefine Core, CAO, PAYG, Billing, Wallet, Safety, Family, WhatsApp, Voice or shared database contracts.

Architecture remains frozen:

`CHANNELS DO NOT OWN BUSINESS LOGIC.`

`ONE PERSON -> ONE CONVERSATION -> ONE TASK STATE -> ONE CORE.`

## Already implemented in the client

- mobile login, password reset, token refresh and logout/session lifecycle
- Android Keystore-backed encrypted session storage
- authenticated mobile gateway transport
- Home/account-context read
- Concierge text chat
- stable persisted chat retry/idempotency IDs
- Reminder surface plus existing reminder transport
- Settings/account surface
- explicit fail-closed launch cards for Registration, Personal Data, PAYG, Payment Methods, Costs & Usage, Safety, Family, Billing and Notifications
- explicit fail-closed Voice/WhatsApp/history/task surfaces
- client-side login validation and understandable network/error states
- release APK/AAB packaging path
- unit, lint and emulator/instrumentation coverage from the merged PR #57 baseline

No blocked capability submits an authority-bearing action or claims backend success.

## PROD release safety

Release Auth/Gateway URLs are injected through environment variables:

- `NAHWERK_RELEASE_AUTH_BASE_URL`
- `NAHWERK_RELEASE_GATEWAY_BASE_URL`

The Gradle configuration rejects a non-empty release URL when it:

- is not HTTPS; or
- visibly targets STAGING (`staging` / `-stg`).

Empty release endpoints remain allowed only for the existing unsigned, production-inert packaging check. An empty endpoint is never considered customer-ready.

Signing remains environment-only; no keystore/password belongs in the repository.

## Mandatory shared-contract blockers

The fresh blocker list is maintained in `BACKEND_CONTRACT_GAPS.md` and the fail-closed client model in `CLIENT_CONTRACT_READINESS.md`.

The customer launch still requires confirmed shared PROD contracts for:

1. Registration
2. Customer profile / personal data
3. PAYG
4. Payment methods
5. Costs / usage / limits
6. Conversation history
7. Task / execution details
8. Approval continuation
9. Audio input
10. File / image upload
11. Family
12. Safety

PAYG remains owned by the dedicated PAYG PROD workstream. Android must consume its final contract and must not invent wallet, pricing, charging or entitlement truth locally.

## Current production gap

A normal customer cannot yet complete the requested end-to-end path entirely in the Android app because the mandatory registration/profile/PAYG/payment/usage/Safety/Family contracts and confirmed real PROD mobile release endpoints are not yet available to the client.

The merged PR #57 remains the verified client-only baseline; this launch branch only advances Android-owned readiness and does not use the shared PROD write slot.
