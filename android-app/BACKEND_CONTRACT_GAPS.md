# NAHWERK Android – Remaining PROD Launch Gaps

This file records only remaining blockers for the currently approved Android customer launch path. It does not define or mutate shared backend behavior.

## Customer contracts already available in PROD

Android is bound to the active server contracts for:

- registration and verification
- secure product login/session
- customer profile, plan and usage read; approved name edits
- PAYG activation/status, wallet, quotes, costs and usage
- payment-method read plus server-owned Stripe Checkout setup/sync
- Safety configuration/status
- Family permissions, managed people and invitations
- MFA enrollment/management
- existing Home/Concierge/Reminders mobile transport

No replacement billing, wallet, Safety, Family or Core truth is created locally.

## Not launch blockers

The current approved customer scope does not require Android-owned UI for subscription changes, notifications, Voice handoff, WhatsApp continuity, canonical conversation history or detailed central task-state surfaces. These remain fail-closed until separate contracts are approved.

E-mail and WhatsApp profile fields remain read-only because the published profile mutation contract does not authorize editing them. They are not part of the approved Android customer launch requirement.

## Remaining launch proof

The following are not backend-contract gaps; they are final release/E2E proof:

1. final Android CI and emulator/instrumentation gates must be GREEN on the exact merge head;
2. the app-only PR must merge to `main` safely;
3. a customer release must use confirmed non-STAGING `NAHWERK_RELEASE_AUTH_BASE_URL` and `NAHWERK_RELEASE_GATEWAY_BASE_URL` plus controlled signing;
4. Stripe Live availability must be confirmed by the authoritative PROD PAYG runtime (`payment_provider.setup_available == true`) before a customer can start payment-method setup;
5. the real-customer PROD E2E must be executed with explicit Owner authorization for any provider/payment side effect.

CI never performs a real charge, WhatsApp send, Family provider send or phone call.

## Gate

Until the real-customer PROD E2E succeeds:

`READY_FOR_REAL_CUSTOMER_APP_E2E = NO`
