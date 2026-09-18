# NAHWERK Android – Client Contract Readiness

## Scope

Android is a thin client.

`CHANNELS DO NOT OWN BUSINESS LOGIC.`

`ONE PERSON -> ONE CONVERSATION -> ONE TASK STATE -> ONE CORE.`

## PROD authority — verified

Fresh PROD verification on 18 September 2026 confirms the customer APP route is authoritative:

- `nahwerk-app-gateway` ACTIVE;
- `adapter_core_route_app` enabled;
- rollout 100%;
- APP channel;
- `core-v1`;
- mode `authoritative`;
- authoritative delivery enabled;
- fail closed;
- central orchestrator authoritative for APP with authoritative mutation.

The former shadow-only restriction no longer applies.

## PROD-bound customer surfaces

Verified server-owned surfaces include:

- Registration: `web-registration-secure`
- Login/session: `web-login-secure` / `web-session-secure`
- Profile/plan/usage: `web-profile`
- Concierge/Home/Reminders: `nahwerk-app-gateway` -> canonical Core/CAO
- PAYG/wallet/quotes/costs: `web-payg`
- Stripe Live readiness: `web-payg-readiness`
- Payment-method setup/sync: `web-payg-checkout`
- Safety: `web-managed-safety-context`
- Family: `web-family-permissions` / `nahwerk-family-access`
- MFA: `web-mfa-manage`

## Security and authority model

- Unknown/partial/timeout states fail closed.
- No service credentials are shipped to the app.
- No client-owned billing or action authority exists.
- Provider side effects remain server-authorized through Core/Approvals/CAO.
- Stripe secrets and full card data never enter Android.

## Release verification

Main-branch CI now owns four proofs:

1. compile + unit tests + lint;
2. emulator/instrumentation regressions;
3. PROD runtime readiness, including authoritative APP route and Stripe `payment_ready`;
4. unsigned PROD-only release APK/AAB candidate.

A signed package remains a separate protected-release action.

## Real-customer E2E

A real customer E2E is permitted only with a signed customer build and the normal canonical approvals for provider/payment side effects. It must not reuse STAGING, bypass CAO or fabricate approvals.

`APP_AUTHORITATIVE_TRANSPORT = GREEN`
