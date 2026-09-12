# NAHWERK Concierge Android

## Status

**CUSTOMER PROD LAUNCH – FINAL RELEASE / E2E PROOF**

`READY_FOR_REAL_CUSTOMER_APP_E2E = NO`

Android remains a pure client. It does not own or redefine Core, CAO, PAYG, Billing, Wallet, Safety, Family, WhatsApp, Voice or shared database contracts.

Architecture remains frozen:

`CHANNELS DO NOT OWN BUSINESS LOGIC.`

`ONE PERSON -> ONE CONVERSATION -> ONE TASK STATE -> ONE CORE.`

## Customer path implemented

- FREE PROD registration plus verification
- mobile login, password reset and encrypted session lifecycle
- real PROD account/profile/plan/usage
- PAYG activation/status, wallet, quotes, costs and usage
- existing payment methods
- payment-method setup through server-owned Stripe Checkout; no card data or Stripe secret in Android
- Home/account context
- Concierge text chat with stable retry/idempotency identifiers
- reminders
- Safety load/save
- Family permissions, managed people, invitations and revoke paths
- MFA/TOTP enrollment for protected account writes
- understandable loading/error/retry states

No mock success is used as product truth.

## PROD endpoint safety

Customer product functions use:

`https://djicahhmnnamtjuqedqd.supabase.co/functions/v1`

Release Concierge Auth/Gateway URLs are injected through:

- `NAHWERK_RELEASE_AUTH_BASE_URL`
- `NAHWERK_RELEASE_GATEWAY_BASE_URL`

Release configuration rejects non-HTTPS or visible STAGING (`staging` / `-stg`) values. Empty release Auth/Gateway URLs are allowed only for the unsigned production-inert packaging gate and are not customer-ready.

Signing remains environment-only.

## Stripe boundary

Android calls the active PROD `web-payg-checkout` contract. The server creates the Stripe Checkout Session. Android accepts only HTTPS Checkout URLs hosted at `checkout.stripe.com`, intercepts the trusted NAHWERK success/cancel return, and asks the server to synchronize the confirmed session.

CI does not start a real payment.

## Read-only profile fields

E-mail and WhatsApp are displayed from PROD but remain read-only because the currently published profile mutation contract does not authorize editing them. They are outside the approved Android launch requirement.

## Remaining path to launch gate

The only remaining launch work is proof and release finalization:

- exact final CI + emulator/instrumentation GREEN
- safe merge to `main`
- confirmed production release Auth/Gateway configuration and signing path
- Stripe Live availability confirmed by the authoritative PROD PAYG state
- explicitly authorized real-customer PROD E2E

Optional future surfaces such as subscription management, device notifications, Voice handoff, WhatsApp continuity, canonical conversation history and detailed task-state UI remain fail-closed and do not block the current customer path.
