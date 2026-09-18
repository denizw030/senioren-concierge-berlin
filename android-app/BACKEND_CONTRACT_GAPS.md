# NAHWERK Android – Remaining PROD Launch Gaps

This file records only remaining blockers for the approved Android customer launch path. Android remains a thin client and does not redefine Core, CAO, Billing, Wallet, Safety, Family, WhatsApp or Voice.

## Canonical APP transport — GREEN

Fresh PROD verification on 18 September 2026 confirms:

- `nahwerk-app-gateway` is ACTIVE in PROD.
- `adapter_core_route_app.enabled = true`.
- `adapter_core_route_app.rollout_percent = 100`.
- channel = `APP`.
- contract = `core-v1`.
- mode = `authoritative`.
- `authoritative_delivery = true`.
- fail-safe = `fail_closed`.
- `central_orchestrator_authoritative` is enabled at 100% and includes APP.
- CAO metadata proves `authoritative_mutation = true`.

The former `shadow_only / rollout_percent=0` blocker is obsolete and must not be used as launch status.

## Customer contracts available in PROD

Android is bound to active server contracts for:

- registration and verification;
- secure customer login/session and MFA;
- customer profile, plan and usage;
- authoritative APP/core-v1 Concierge transport;
- PAYG, wallet, quotes, costs and usage;
- Stripe readiness and server-owned Checkout;
- reminders;
- Safety;
- Family permissions and managed people;
- MFA enrollment/management.

No replacement authority is created client-side.

## Stripe Live gate

The app-side payment gate is complete. The durable CI workflow `Android PROD Readiness` now verifies the live `web-payg-readiness` response and requires `payment_ready = true` together with live Stripe API/webhook proof. CI never creates a real charge.

## Release boundary

- PROD HTTPS endpoints only.
- No STAGING fallback in a customer release.
- Signing material remains environment-only.
- Main builds an unsigned production-inert candidate.
- Signed customer packaging requires protected Android release secrets and explicit release authorization.
- Store publication is separate from package readiness.

## Remaining launch work

After all main-branch CI gates are GREEN, only these release/customer actions remain:

1. build the signed package using the protected release environment;
2. install the signed customer build;
3. run one explicitly authorized real-customer E2E;
4. publish through the relevant app store only after store credentials/account are available.

`APP_AUTHORITATIVE_TRANSPORT = GREEN`
