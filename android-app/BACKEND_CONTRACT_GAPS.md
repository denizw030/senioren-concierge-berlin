# NAHWERK Android – Remaining PROD Launch Gaps

This file records only remaining blockers for the currently approved Android customer launch path. It does not define or mutate shared backend behavior.

## Customer contracts already available in PROD

Android is bound to the active server contracts for:

- registration and verification
- secure PROD customer login/session, including MFA
- customer profile, plan and usage read; approved name edits
- PAYG activation/status, wallet, quotes, explicit quote approval/cancellation, costs and usage
- Stripe Live readiness through `web-payg-readiness`
- payment-method read plus server-owned Stripe Checkout setup/sync
- Safety configuration/status
- Family permissions, managed people and invitations
- MFA enrollment/management

The customer launcher now uses the PROD customer session directly. Account/PAYG/Safety/Family no longer depend on historical mobile STAGING auth.

No replacement billing, wallet, Safety, Family or Core truth is created locally.

## Exact remaining shared transport blocker

Fresh read-only PROD verification shows the canonical Core already knows channel `APP`:

`adapter_core_route_app`

Current PROD state:

- `enabled = false`
- `rollout_percent = 0`
- `metadata.mode = shadow_only`
- `metadata.contract = core-v1`

No published customer-facing APP gateway is currently authoritative for normal customer traffic.

Therefore the Android customer launcher must not:

- call the Core directly with service credentials;
- reuse the WEB gateway/session identity as APP;
- use the Vercel CAO OIDC gateway, which is service-to-service only;
- fall back to historical STAGING mobile auth/gateway functions;
- invent person/account/task/action authority client-side.

NAHWERK MASTER/shared backend must publish and activate the canonical customer APP gateway/identity contract before Home/Concierge/Reminders can be live for normal customers.

## Stripe Live gate

Android can now independently read `web-payg-readiness` and treats payment setup as available only when the response proves all required live/provider/webhook conditions and `payment_ready = true`.

If the readiness call fails, is partial, reports test mode, reports missing webhook configuration or returns `payment_ready != true`, Checkout remains disabled. No success state is inferred from `setup_available` alone.

The app-side gate is complete. The current fresh runtime value of `payment_ready` still has to be observed from the authoritative PROD readiness endpoint before customer E2E.

## Release boundary

- canonical product base URL is fixed to PROD HTTPS;
- debug has no hard-coded STAGING Auth/Gateway fallback;
- release Auth/Gateway values are optional only while live transport is unpublished and must be configured together when used;
- visible STAGING release values are rejected;
- signing material remains environment-only;
- PR CI produces an unsigned production-inert candidate by design;
- the signed customer package requires the protected production release environment and explicit release dispatch.

## Prepared customer E2E

When the Shared APP route is authoritative and the signed customer build exists, execute exactly one bounded Owner-as-normal-customer E2E:

1. install/open app;
2. register/login and complete MFA if required;
3. verify real account/profile/plan/usage;
4. enable/open PAYG and confirm price/readiness information;
5. confirm/add payment method only after explicit Owner authorization;
6. submit one Concierge task;
7. inspect the exact quote/price;
8. approve that exact quote explicitly;
9. trigger no payment/provider side effect until separately authorized;
10. verify Safety;
11. verify Family;
12. verify Home/Reminders authoritative state;
13. after authorized execution, verify exactly one completed action and its exact cost/usage record.

## Gates

`APP_ISOLATED_PROD_READINESS = YES`

only after the final Android-only head has GREEN build, unit tests, lint, emulator/instrumentation and unsigned release-candidate verification.

`READY_FOR_REAL_CUSTOMER_APP_E2E = NO`

until all of the following are true:

1. authoritative customer APP/core-v1 gateway published and enabled in PROD;
2. signed customer release built with its exact PROD configuration;
3. fresh `web-payg-readiness.payment_ready == true` confirmed;
4. release installed and ready for the explicitly authorized real-customer E2E.

CI never performs a real charge, Concierge provider action, WhatsApp send, Family provider send or phone call.
