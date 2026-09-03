# NAHWERK Android Distribution Readiness

Status: production-inert preparation only.

## Goal

The Android adapter must be distribution-ready without enabling customer rollout while the global Core cutover gates are still OFF.

This path prepares reproducible APK/AAB packaging only. It does not:
- enable APP Core routing
- upload to Google Play
- create a GitHub Release
- distribute an APK to customers
- commit signing material
- change Core/Approval/Action semantics

## Current package

- applicationId: `com.nahwerk.concierge`
- versionCode: `3`
- versionName: `0.2.1-staging`

The current version name is intentionally not a customer production release label.

## Production-inert candidate

Workflow:
- `.github/workflows/android-distribution-package.yml`

On pull requests that touch Android/distribution files, the workflow builds an unsigned release candidate with:
- release Auth URL empty
- release Gateway URL empty
- no signing credentials
- no customer distribution
- no route cutover

Artifacts:
- `nahwerk-concierge-release-unsigned.apk`
- `nahwerk-concierge-release-unsigned.aab`
- `metadata.json`
- `SHA256SUMS`

The candidate is for reproducibility and release packaging verification only.

## Future signed package without adapter code changes

Gradle accepts release configuration from environment variables:

Endpoints:
- `NAHWERK_RELEASE_AUTH_BASE_URL`
- `NAHWERK_RELEASE_GATEWAY_BASE_URL`

Signing:
- `NAHWERK_ANDROID_KEYSTORE_PATH`
- `NAHWERK_ANDROID_STORE_PASSWORD`
- `NAHWERK_ANDROID_KEY_ALIAS`
- `NAHWERK_ANDROID_KEY_PASSWORD`

GitHub workflow environment `android-production-release` is expected to provide:

Variables:
- `NAHWERK_RELEASE_AUTH_BASE_URL`
- `NAHWERK_RELEASE_GATEWAY_BASE_URL`

Secrets:
- `NAHWERK_ANDROID_KEYSTORE_B64`
- `NAHWERK_ANDROID_STORE_PASSWORD`
- `NAHWERK_ANDROID_KEY_ALIAS`
- `NAHWERK_ANDROID_KEY_PASSWORD`

No signing key or password belongs in the repository.

## Signed-package safety gate

The manual workflow can build a signed package only when:
1. the operator selects `signed_package=true`
2. `core_gates_ack` is exactly `CORE-GATES-GREEN`
3. the GitHub environment `android-production-release` permits the job
4. all release endpoint variables are present
5. all signing secrets are present

The signed-package job still only uploads a private GitHub Actions artifact. It contains no Google Play upload or customer distribution step.

## Global gates currently required before customer rollout

The adapter workstream must not enable customer APP routing while any required global gate remains OFF, including:
- `core_persona_authoritative`
- `core_approval_authoritative`
- `central_orchestrator_authoritative`

The adapter route must also remain:
- `adapter_core_route_app=false`
- `rollout_percent=0`

until an explicit later cutover decision.

## Store/distribution boundary

Google Play enrollment, store listing, signing-key ownership, production package naming/versioning, staged rollout percentage and legal/store metadata are distribution operations, not adapter conversation semantics.

Preparing the signed package path does not equal publishing it.

## COST-SAFE

PR candidate checks use no OpenAI, Realtime, TTS, Twilio, Web Search or product provider calls.

A real model/gateway E2E is not repeated because the accepted Android adapter already has GREEN installed-client and server idempotency evidence and this change only affects release packaging.
