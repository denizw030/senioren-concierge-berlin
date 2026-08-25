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

## Build / QA
The repository currently does not contain a Gradle Wrapper (`gradlew` plus `gradle/wrapper/*`). Until a wrapper is added, local builds require a compatible Gradle installation.

The isolated GitHub Actions workflow `.github/workflows/android-qa.yml` uses Java 17 and Gradle 8.9 and executes:

```text
gradle --no-daemon clean testDebugUnitTest lintDebug assembleDebug
```

Do not describe the project as build-verified unless that command actually completes successfully in an Android-capable environment. Instrumented/emulator tests are not part of this QA workflow yet.
