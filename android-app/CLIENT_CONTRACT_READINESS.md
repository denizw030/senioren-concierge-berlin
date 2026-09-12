# NAHWERK Android – Client Contract Readiness

## Scope

Android is a thin client. It does not own or redefine Core, CAO, Billing, Wallet, Safety, Family, WhatsApp, Voice or shared database contracts.

Architecture remains frozen:

`CHANNELS DO NOT OWN BUSINESS LOGIC.`

`ONE PERSON -> ONE CONVERSATION -> ONE TASK STATE -> ONE CORE.`

## Verified PROD-bound customer surfaces

Fresh read-only verification against the active PROD runtime confirms Android bindings for:

- Registration: `web-registration-secure`
- Product login/session: `web-login-secure` / `web-session-secure`
- Customer profile/tariff/usage: `web-profile`
- PAYG/wallet/costs/quotes/payment-method reads: `web-payg`
- Stripe Live readiness: `web-payg-readiness`
- Payment-method setup/sync: `web-payg-checkout`
- Safety: `web-managed-safety-context`
- Family permissions: `web-family-permissions`
- Family managed people/invitations: `nahwerk-family-access`
- MFA enrollment/management: `web-mfa-manage`

The customer launcher authenticates through the canonical PROD product session. It does not require the historical mobile STAGING auth path to reach account/PAYG/Safety/Family.

## Home / Concierge / Reminders boundary

Fresh PROD read-only verification shows `adapter_core_route_app` exists for channel `APP` and contract `core-v1`, but is currently:

- `enabled = false`
- `rollout_percent = 0`
- `mode = shadow_only`

No published customer-facing APP gateway contract is currently authoritative in PROD. Android therefore keeps Home/Concierge/Reminders visibly fail-closed and does not route customer traffic through STAGING, WEB identity, Vercel CAO OIDC or any invented client authority.

## Client authority model

`PROD_BOUND` means Android may submit only the actions explicitly defined by the verified server contract. The server remains authoritative.

`PROD_READ_ONLY` means Android may present confirmed server values but does not mutate them.

Unknown, partial, timeout and unverified states never become success locally.

## PROD release boundary

Customer product functions use the canonical HTTPS PROD Functions base URL:

`https://djicahhmnnamtjuqedqd.supabase.co/functions/v1`

No debug or release build contains a hard-coded STAGING mobile Auth/Gateway fallback.

Optional future live-transport release endpoints remain environment-injected through:

- `NAHWERK_RELEASE_AUTH_BASE_URL`
- `NAHWERK_RELEASE_GATEWAY_BASE_URL`

They must be configured together, use HTTPS and reject visible STAGING values. Empty values mean the unpublished live transport stays disabled; they never represent a customer-ready Concierge/Home/Reminders path.

Signing remains environment-only; credentials do not belong in source control.

## Payment boundary

Android never receives Stripe secret keys or full card data. Before enabling payment-method Checkout, the app performs a read-only `web-payg-readiness` check and requires all of the following to be true:

- production runtime
- provider = Stripe
- key mode = live
- Stripe API reachable and reporting live mode
- live confirmed
- webhook secret configured
- expected webhook endpoint configured and enabled
- required webhook events complete
- server `payment_ready = true`

Any missing or unknown field blocks Checkout. `web-payg-checkout` remains the only server-owned setup/sync path; Android accepts only HTTPS `checkout.stripe.com` Checkout URLs.

No real payment or provider side effect is part of CI.

## Prepared real-customer PROD E2E

After Shared APP transport activation and a signed customer release, the Owner-as-customer E2E is prepared in this order:

1. install/open signed PROD app;
2. register or login with a real NAHWERK account, including MFA when required;
3. confirm real profile/account/plan/usage;
4. open PAYG and verify prices, limits, wallet and payment readiness;
5. verify or add a payment method only after explicit Owner authorization;
6. open Concierge and submit one bounded task;
7. display the authoritative price/quote;
8. explicitly approve that exact quote;
9. execute only after separate Owner authorization for any payment/provider side effect;
10. verify Safety state and Family state;
11. verify Home/Reminders from authoritative APP/core-v1 state;
12. verify the completed action and exact resulting cost/usage entry.

No charge, provider execution, Family send, WhatsApp send or phone call is triggered automatically by this checklist.

## Readiness gates

`APP_ISOLATED_PROD_READINESS = YES` is valid only when the final app-only head has GREEN build, unit tests, lint, emulator/instrumentation and unsigned release-candidate gates.

`READY_FOR_REAL_CUSTOMER_APP_E2E = YES` additionally requires the authoritative APP/core-v1 transport, a signed PROD customer release and fresh Stripe `payment_ready = true`.
