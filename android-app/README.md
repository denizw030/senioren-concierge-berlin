# NAHWERK Concierge Android

## Status

**CLIENT-ONLY PRE-PROD READY**

This directory contains the isolated Android client candidate. It does not activate, redefine or own backend/Core/CAO/WhatsApp/Voice business logic.

Architecture remains frozen:

`CHANNELS DO NOT OWN BUSINESS LOGIC.`

`ONE PERSON -> ONE CONVERSATION -> ONE TASK STATE -> ONE CORE.`

Android remains a pure client. Missing shared contracts stay fail-closed and no backend success, authority or canonical state is inferred locally.

## Technology

Kotlin + Jetpack Compose is used for the Android client. The domain/data boundaries remain platform-light so future clients can consume the same shared backend contracts without creating a second customer world.

## Current client-only implementation

- authenticated mobile login/reset/logout/session lifecycle
- Android Keystore-backed encrypted session storage
- authenticated mobile gateway client
- stable chat retry/idempotency with persisted `source_message_id` and `correlation_id`
- encrypted local pending-chat and UI snapshot storage
- Home, Concierge chat, Reminder and Settings surfaces
- structural login validation and normalized email handoff
- explicit fail-closed account/product surfaces for Usage & Limits, Personal Data, Safety, Family, Notifications and Billing
- explicit fail-closed channel/continuity surfaces for Voice, WhatsApp continuity, canonical Conversation History and Task State
- safe account-switch/logout boundary that clears local pending/session state
- unit tests, Compose instrumentation tests, lint and emulator regression coverage
- release APK/AAB packaging path with production-inert and STAGING-leak guards

Backend-dependent capability cards are informational only while their shared contracts are unavailable. They do not submit authority-bearing actions and do not claim success.

## Security / permissions

- no service-role key or backend secret in client code
- release transport requires HTTPS
- cleartext traffic is disabled in the main manifest
- debug cleartext is restricted to localhost/127.0.0.1 for deterministic local tests
- Android backup is disabled
- Android device-transfer/data extraction is explicitly excluded
- session and pending-chat data use Android Keystore-backed encrypted preferences
- only `android.permission.INTERNET` is requested in the current main manifest
- camera and microphone permissions are intentionally absent until their confirmed shared contracts are activated
- no production signing material is committed to the repository
- no production action execution, store upload or route cutover is performed by the client candidate

## Shared-contract activation boundary

The detailed blocked-contract record is `BACKEND_CONTRACT_GAPS.md`; the client readiness rules are in `CLIENT_CONTRACT_READINESS.md`.

Until each relevant shared contract is separately confirmed and versioned, Android must not invent:

- endpoints or HTTP methods
- request/response payload fields
- canonical person/conversation/task/approval/family/safety identifiers
- success vocabulary or completion state
- local approval, Safety or Family authority
- audio/media/file upload semantics
- canonical conversation history or task state

## Remaining activation work

These items are intentionally **not** client-only implementation gaps and must remain blocked until the shared runtime contracts are available:

1. canonical Conversation History read contract
2. canonical Task / Execution state contract
3. same-task Approval Continuation contract
4. Voice/audio ingestion and handoff contract
5. file/image upload and Core-ingestion contract
6. authoritative Family read/authorization contract
7. authoritative Safety display/continuation contract
8. production Usage/Billing/Personal Data/Notification contracts used by the prepared account surfaces
9. production Auth/Gateway endpoint values for a real release build
10. production signing and store-release authorization

## Stable chat retry / idempotency

Each new chat send creates one client-side `source_message_id` and one `correlation_id` before any network call. The pending message and both IDs are synchronously persisted in Android Keystore-backed encrypted preferences before the HTTP request starts.

The same pending request is reused for:

- an HTTP retry after access-token refresh
- an explicit user retry after a transport/server failure
- a retry after app restart while the send is still unconfirmed

The request sends the same ID in:

- JSON body: `source_message_id`
- HTTP header: `Idempotency-Key`
- HTTP header: `X-Client-Request-Id`

The pending record is cleared only after a successful gateway response. A new chat send is blocked while an unresolved pending request exists.

## Build / QA

The Gradle Wrapper is included. The isolated GitHub Actions workflow `.github/workflows/android-qa.yml` uses Java 17 and executes:

```text
./gradlew --no-daemon clean testDebugUnitTest lintDebug assembleDebug
```

The emulator job separately executes `connectedDebugAndroidTest`.

The current PR candidate also has a distribution workflow that executes:

```text
./gradlew --no-daemon clean testDebugUnitTest lintRelease assembleRelease bundleRelease
```

A successful compile/test/lint build is not treated as backend/production activation evidence.

## Historical COST-SAFE retry acceptance

Accepted on branch `staging/nw-android-stable-source-message-id-01` under COST-SAFE-STAGING v1.

Deterministic / emulator proof:

- GitHub Actions run 33770063294 / job `emulator-retry-fixture`
- real Android emulator
- first HTTP attempt terminated by local MockWebServer
- PendingChatStore survived store/API reinstantiation
- retry reused the identical `source_message_id`
- retry reused the identical `correlation_id`
- retry reused the identical `Idempotency-Key`
- retry reused the identical `X-Client-Request-Id`
- pending record cleared only after successful retry
- 1 instrumentation test, GREEN

Minimal final live proof:

- branch head used for live proof: `223ae83ef43c28b7e1762fb1fd4e553a0e502810`
- GitHub Actions run 33771085109 / job `live-gateway-e2e`
- installed Android test APK on emulator
- exactly one harmless live request to the real STAGING mobile gateway
- client assertion required `idempotency_verified=true`
- client assertion required `shadowDuplicate=false`
- Core receipt `1f12196a-4f3e-4574-b16e-babe6d31ddf1`
- Core response state `ANSWER`
- Core response `Vier.`
- Core shadow: provider_invoked=false
- Core shadow: business_side_effects=false
- Core shadow: action_created=false
- delivery=false
- ephemeral auth user and mobile binding cleaned up

The real installed-client duplicate retry was intentionally not repeated against the live gateway. The full retry proof is composed from:

1. installed Android emulator retry against a deterministic local transport fixture,
2. previously GREEN real server duplicate/idempotency acceptance,
3. one installed Android emulator ingress call to the real STAGING gateway with client-generated idempotency verified.

The automatic live-gateway CI job was removed after acceptance to prevent accidental future paid/provider calls. Future branch CI is provider-free unless a new explicit final live acceptance is intentionally added.

## Distribution candidate

The production-inert distribution path is intentionally separated from customer release.

Current release build contract:

- release AUTH/GATEWAY endpoints are injected only through build-time environment variables
- missing release endpoints default to empty strings
- release signing is injected only through Android signing environment variables
- missing signing material produces an unsigned candidate
- no keystore, signing certificate, service-account credential or store secret is committed to the repository

GitHub Actions:

- `.github/workflows/android-distribution-package.yml`
- pull requests touching `android-app/**` build an unsigned distribution candidate
- candidate build executes unit tests, release lint, release APK and release AAB
- candidate guard rejects committed signing material
- candidate guard rejects the STAGING Supabase project reference inside the release APK
- candidate APK must be unsigned
- candidate AAB must contain no signing metadata
- output contains unsigned APK, unsigned AAB, `metadata.json` and `SHA256SUMS`
- artifacts are uploaded only to GitHub Actions
- no Play Store upload
- no GitHub Release
- no customer distribution
- no app route cutover

A signed package can only be created through an explicit manual workflow dispatch with:

- `signed_package=true`
- `core_gates_ack=CORE-GATES-GREEN`
- protected `android-production-release` environment
- configured release endpoints
- complete signing secrets

Even the signed-package job only uploads a private workflow artifact. It does not publish to a store or to customers.
