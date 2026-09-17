# NAHWERK Nutzung / Abo — Central Authority Audit (2026-09-17)

Scope: customer portal Nutzung/Abo only. No E-Mail, WhatsApp adapter, Voice, Safety, Concierge, Persona or Memory changes. This branch is isolated and must not be promoted while the central contract blockers below remain.

## Verified central reads

- The customer portal reads authenticated account/plan/usage data through `web-profile`.
- Browser-only usage counters are not used.
- PAYG has a separate authenticated central read (`web-payg`) and must be shown only when the central account state says PAYG is enabled.
- Portal theme authority is `nw_portal_theme_v1`; light/dark persists in `localStorage`, and light mode explicitly covers the footer.

## PROD blockers — central contract, not a website-only fix

1. **Usage period mismatch**
   - `web_profile_snapshot_secure` currently calculates App/WhatsApp usage by calendar month instead of using the subscription period it already loads.
   - `billing_consume_channel_dialog_entitlement_v1` also enforces App/WhatsApp with a calendar-month counter.
   - Therefore the portal must not locally manufacture the requested activation-based 30-day reset. The central runtime must decide and expose one canonical usage period first.

2. **Paid channel-limit mismatch**
   - The portal profile currently exposes `plans.app_dialogue_limit` / `plans.whatsapp_dialogue_limit`.
   - The central runtime consumer uses `plan_feature_entitlements.included_quantity` for `app_dialog` / `whatsapp_dialog`.
   - These values are not identical for multiple paid plans. A portal-only choice would create a second authority.

3. **Subscription metadata not exposed to the portal**
   - The current `web-profile` response does not expose subscription status, activation/start date, cancellation/end date, billing/renewal date or a canonical next usage reset.
   - These fields are required before the top Abo block can be rendered without invented values.

4. **Full feature usage summary not exposed**
   - Central entitlements exist for additional product features, but `web-profile` currently returns only App and WhatsApp usage/limits.
   - E-Mail, Voice/phone, real Concierge executions and other defined features cannot be safely rendered as used/included/remaining until a central read model exposes both entitlement and matching usage source.

5. **FAMILY summary not exposed as one canonical portal read**
   - Existing account/family authorization is available, but a complete shared-pool usage summary is not part of the current `web-profile` snapshot.

## Required central read contract before PROD promotion

The existing authenticated Account/Entitlement authority should expose, without local duplication:

- `subscription`: plan code/name, status, price, activated/started timestamp, usage-period start/end, next usage reset, billing/renewal timestamp if applicable, cancellation/end timestamp if applicable.
- `usage_items[]`: feature code, display label, used, included (`null` only for unlimited), remaining, unit, period start/end/reset, overage policy (`block_or_upgrade`, `payg`, etc.), and source.
- `payg`: enabled/configured, current-period additional cost, relevant rate/price data only when centrally enabled.
- `family`: shared-pool marker and only the centrally authorized member/pool information.

The web portal must render this read model; it must not calculate an independent period, maintain a local tariff matrix, or infer a PAYG/upgrade rule.

## Promotion gate

Do not mark FINAL GREEN or deploy the expanded Nutzung/Abo UI until:

- one central usage-period authority is selected and enforced,
- channel-limit duplication is reconciled,
- the authenticated read model exposes the required subscription/usage fields,
- FREE + paid + canceled + unlimited + FAMILY fixtures pass,
- real PROD readback matches the central data,
- light/dark/reload/navigation/mobile checks pass.
