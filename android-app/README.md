# NAHWERK Concierge Android

## Status
Initial Android-first foundation. This directory is intentionally isolated from the existing website and production backend.

## Technology decision
Kotlin + Jetpack Compose was selected for the first Android release: strongest Android platform integration for accessibility, camera/audio permissions, secure storage and future foreground/realtime capabilities. The domain/data contracts are kept platform-light so a later iOS client can reuse the same backend contracts without creating a second customer world.

## Architecture
UI -> domain/client contracts -> data/API -> secure storage. Backend remains source of truth for identity, sessions, Memory, Reminder, Family and Actions.

## Implemented UI
- Home with a single primary concierge entry and limited shortcuts
- Concierge text/audio/photo-document entry points
- Reminder screen
- Settings with Nilo/Mira preparation
- Navigation and accessible minimum touch sizes

Backend-dependent controls are disabled and explicitly labelled until confirmed endpoints exist. No fake success states.

## Security
- no service-role key or secret in client code
- cleartext traffic disabled
- Android backup disabled for the app
- no production DB migration
- no change to n8n or Supabase security
- no production action execution

## Known backend contracts found on the website
The website currently calls n8n endpoints for password login and password-reset request and stores a returned web session token in localStorage. The Android client must not blindly copy browser storage. Before connection, the mobile session contract and token lifecycle must be confirmed; tokens should then be stored using Android Keystore-backed storage.

## Next implementation steps
1. Confirm mobile-safe auth/session API contract and staging base URL.
2. Add Keystore-backed SessionStore and authenticated HTTP client.
3. Connect login/reset/logout/session check without changing backend contracts.
4. Confirm Concierge/Reminder endpoints, then connect UI.
5. Add runtime permission flows for microphone/camera; location only when explicitly needed.
6. Add unit, Compose UI and accessibility tests.
7. Add development/staging/production environment injection without committing secrets.

## Stable chat retry / idempotency

Each new chat send creates one client-side `source_message_id` and one `correlation_id` before any network call. The pending message and both IDs are synchronously persisted in an Android Keystore-backed encrypted preferences store before the HTTP request starts.

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

The workflow uploads the resulting debug APK as `nahwerk-real-concierge-staging-apk`.

Do not describe device/emulator behavior as proven by this build alone. Instrumented/emulator retry E2E remains a separate proof step.


## COST-SAFE retry acceptance

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
