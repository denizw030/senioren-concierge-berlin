# NAHWERK Android – Remaining PROD Launch Gaps

This file records only remaining blockers for the currently approved Android customer launch path. It does not define or mutate shared backend behavior.

## Customer contracts already available in PROD

Android is bound to the active server contracts for:

- registration and verification
- secure product login/session
- customer profile, plan and usage read; approved name edits
- PAYG activation/status, wallet, quotes, explicit quote approval/cancellation, costs and usage
- payment-method read plus server-owned Stripe Checkout setup/sync
- Safety configuration/status
- Family permissions, managed people and invitations
- MFA enrollment/management

No replacement billing, wallet, Safety, Family or Core truth is created locally.

## Exact remaining shared transport blocker

The existing Home/Concierge/Reminders Android transport still requires two release endpoints:

- `NAHWERK_RELEASE_AUTH_BASE_URL` implementing `/login`, `/reset` and `/refresh`
- `NAHWERK_RELEASE_GATEWAY_BASE_URL` implementing `/mobile/me`, `/mobile/chat` and `/mobile/reminders`

Fresh read-only inventory found the historical mobile Auth/Gateway only in the STAGING project (`nahwerk-mobile-auth-staging`, `nahwerk-mobile-gateway-staging`). The active PROD Supabase inventory contains the central PROD Core and the customer-product web contracts, but no confirmed PROD mobile Auth/Gateway equivalent. The connected Vercel inventory likewise exposes no confirmed mobile PROD Auth/Gateway target.

Android must not point a release build at the STAGING functions and must not invent a new shared transport contract. NAHWERK MASTER/shared backend must provide or identify the canonical PROD Auth/Gateway targets before a normal customer release can use Concierge/Home/Reminders end to end.

## Not launch blockers

The current approved customer scope does not require Android-owned UI for subscription changes, notifications, Voice handoff, WhatsApp continuity, canonical conversation history or detailed central task-state surfaces. These remain fail-closed until separate contracts are approved.

E-mail and WhatsApp profile fields remain read-only because the published profile mutation contract does not authorize editing them. They are not part of the approved Android launch requirement.

## Remaining launch proof

1. final Android CI and emulator/instrumentation gates must be GREEN on the exact merge head;
2. the app-only PR must merge to `main` safely;
3. canonical non-STAGING mobile Auth/Gateway PROD targets must be supplied and used for the customer release;
4. the signed customer release must be built with those PROD values;
5. Stripe Live availability must be confirmed by the authoritative PROD PAYG runtime (`web-payg-readiness.payment_ready == true` / customer PAYG provider readiness) before payment-method setup is treated as live-ready;
6. the real-customer PROD E2E must be executed with explicit Owner authorization for any provider/payment side effect.

CI never performs a real charge, WhatsApp send, Family provider send or phone call.

## Gate

Until those launch proofs succeed:

`READY_FOR_REAL_CUSTOMER_APP_E2E = NO`
