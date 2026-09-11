# NAHWERK Android – Parallel Contract Readiness

Fresh snapshot: 2026-09-11

## Scope / write isolation

This document is Android-client-only preparation. It does not activate, redefine or mutate any shared backend, Core, CAO, Voice, WhatsApp, Website, Auth, Billing, Safety or database contract.

Write lock remains in force for every shared integration point while the corresponding writer is active.

Fresh base at snapshot creation:

- repository: `denizw030/senioren-concierge-berlin`
- base branch: `main`
- base HEAD: `508d290cfca6983f6dc01409e76ece8df1f5e150`
- Android subtree: `7be2c762bce5cfbbbcea5863ca1fdee83363e0ba`
- the Android subtree is unchanged from the last merged Android client-contract-readiness state (#50)

## Classification rule

`READY` means the Android-client responsibility is implemented without inventing backend authority.

`PARTIAL` means a concrete staging transport/client path exists, but production activation or the complete canonical capability is not confirmed.

`MISSING` means the Android client does not yet have a confirmed implementation boundary for that capability.

`BLOCKED_BY_*` means Android must remain fail-closed until the named external contract/write slot is available.

## Capability matrix

| Capability | Status | Android frontend/client | Confirmed transport in current client | Current blocker / next authority |
| --- | --- | --- | --- | --- |
| Login / Session | PARTIAL | Implemented login, reset, refresh, logout and encrypted session storage | staging auth `/login`, `/reset`, `/refresh` | `BLOCKED_BY_AUTH`: production mobile auth/session endpoint and production activation are not confirmed in this snapshot |
| Account Context | PARTIAL | Home context loader and fail-closed load/retry UX implemented | staging gateway `GET /mobile/me` | `BLOCKED_BY_PLATFORM`: production mobile gateway activation not confirmed |
| Concierge Chat (text) | PARTIAL | Text UI, durable pending request, retry and idempotency guards implemented | staging gateway `POST /mobile/chat` | `BLOCKED_BY_PLATFORM`: production mobile gateway activation not confirmed |
| Conversation Continuity | BLOCKED_BY_PLATFORM | Local encrypted UI continuity exists; it is not canonical history | no activated canonical history transport in Android | exact versioned conversation-history contract required |
| Usage / Limits | BLOCKED_BY_BILLING | no authority-bearing Android usage/limits implementation | none confirmed for Android | subscription/usage contract is not production-confirmed for the app |
| Personal Data | MISSING | no complete Android personal-data surface/adapter confirmed | none confirmed for Android | `BLOCKED_BY_AUTH`: authenticated account-data contract and authorization semantics required |
| Safety | BLOCKED_BY_PLATFORM | fail-closed readiness boundary exists | no activated Safety display/action transport in Android | exact Safety read/write authorization and state contract required |
| Family | BLOCKED_BY_PLATFORM | fail-closed readiness boundary exists | no activated Family display/action transport in Android | exact Family membership/authority contract required; Website runtime must not be copied into Android |
| Notifications | MISSING | no production notification registration/delivery contract confirmed | none confirmed | `BLOCKED_BY_PLATFORM`: device-token, notification event and deep-link contract required |
| Voice entry / handoff | BLOCKED_BY_OTHER | no authority-bearing Voice transport activated in Android | none activated | active Voice writer / exact audio-input or handoff contract required |
| WhatsApp continuity | BLOCKED_BY_PLATFORM | Android must not own cross-channel truth | no Android-specific continuity transport confirmed | canonical Conversation/Core cross-channel contract required; no WhatsApp changes from Android |
| Billing / Subscription | BLOCKED_BY_BILLING | no purchase/subscription mutation path activated | none confirmed for Android | production billing entitlement/read contract and payment authority required |
| Error / fail-closed behavior | READY | loading, unavailable/retry paths, session expiry handling and blocked capability gates exist | client-local behavior | no shared write required |
| Reminders | PARTIAL | list/create client model exists | staging gateway `POST /mobile/reminders`, reminders supplied by `/mobile/me` | production mobile gateway activation not confirmed |
| Task / Execution Details | BLOCKED_BY_PLATFORM | fail-closed boundary exists | none activated | exact canonical task/execution read contract required |
| Approval Continuation | BLOCKED_BY_PLATFORM | fail-closed boundary exists | none activated | exact approval context, authorization, idempotency and acknowledgement contract required |
| File / Image Upload | BLOCKED_BY_PLATFORM | fail-closed boundary exists | none activated | exact upload/media contract required |

## Existing concrete Android transport

Current Android code contains concrete staging adapters only for:

- auth: `/login`, `/reset`, `/refresh`
- account context: `GET /mobile/me`
- text concierge: `POST /mobile/chat`
- reminders: `POST /mobile/reminders`

The debug build points to TEST-STAGING mobile Auth/Gateway functions. Release Auth/Gateway URLs are injected only through release environment variables and are blank by default; this snapshot therefore does not assert productive activation.

## Seven fail-closed backend capability gates

These remain deliberately blocked in Android until exact versioned contracts exist:

1. Conversation History
2. Task / Execution Details
3. Approval Continuation
4. Audio Input
5. File / Image Upload
6. Family Display
7. Safety Display

Android must not add a READY/ACTIVE state merely because partial backend evidence exists elsewhere.

## Contract-gap handoff

For each blocked capability, the later shared-contract writer must provide all of the following before Android activation:

- exact endpoint and HTTP method or equivalent transport
- authentication and authorization rules
- request/response schema
- canonical IDs and ownership semantics
- idempotency/retry behavior where mutation is possible
- error model and fail-closed behavior
- explicit success acknowledgement
- TEST/STAGING availability
- PROD availability decision

Until then the Android client stays non-authoritative.

## Write locks

- Platform/Core/CAO: **WRITE-LOCK BLOCKED**
- Website: **WRITE-LOCK BLOCKED**
- Voice: **WRITE-LOCK BLOCKED**
- WhatsApp: **WRITE-LOCK BLOCKED**
- Auth/Billing/Safety backend: **WRITE-LOCK BLOCKED**
- Supabase PROD: **WRITE-LOCK BLOCKED**

## QA

The repository Android QA definition runs:

- `clean`
- `testDebugUnitTest`
- `lintDebug`
- `assembleDebug`
- `connectedDebugAndroidTest` on emulator after the first job succeeds

A fresh re-run was started during this audit against the unchanged Android subtree. Final result must be recorded from GitHub Actions; no GREEN claim is made here while that re-run is incomplete.

## Production / side effects

This preparation performs no production deploy, Supabase mutation, WhatsApp send, Voice call, email send, payment, booking or real-customer action.
