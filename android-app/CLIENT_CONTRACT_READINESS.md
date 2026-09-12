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
- Payment-method setup/sync: `web-payg-checkout`
- Safety: `web-managed-safety-context`
- Family permissions: `web-family-permissions`
- Family managed people/invitations: `nahwerk-family-access`
- MFA enrollment/management: `web-mfa-manage`

The existing mobile gateway continues to own the already verified Home/Concierge/Reminders transport.

## Client authority model

`PROD_BOUND` means Android may submit only the actions explicitly defined by the verified server contract. The server remains authoritative.

`PROD_READ_ONLY` means Android may present confirmed server values but does not mutate them.

The following optional/non-launch capabilities remain fail-closed until their own canonical contracts are activated:

- Billing/subscription changes
- Notifications/device registration
- Voice handoff
- WhatsApp continuity UI
- Canonical conversation history
- Canonical task-state detail UI

These are not required for the current Android customer launch path.

## PROD release boundary

Customer product functions use the canonical HTTPS PROD Functions base URL and reject visible STAGING targets.

Concierge Auth/Gateway release endpoints remain environment-injected through:

- `NAHWERK_RELEASE_AUTH_BASE_URL`
- `NAHWERK_RELEASE_GATEWAY_BASE_URL`

The Gradle release guard rejects non-HTTPS and visible STAGING values. Empty values are permitted only for the unsigned production-inert packaging job and never represent a customer-ready release.

Signing remains environment-only; credentials do not belong in source control.

## Payment boundary

Android never receives Stripe secret keys or full card data. `web-payg-checkout` creates the server-bound Checkout Session; Android accepts only an HTTPS `checkout.stripe.com` URL and synchronizes the resulting Checkout Session through the server contract.

No real payment or provider side effect is part of CI.

## Remaining launch proof

The app-side contract work is complete for the currently approved customer path. Final launch proof still requires the final CI/emulator/release gates, merge to `main`, confirmed production release environment values, and an explicitly authorized real-customer PROD E2E.
