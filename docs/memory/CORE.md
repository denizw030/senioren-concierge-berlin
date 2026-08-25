# NAHWERK Memory 2.0 Core

Arbeitsblock: `NW-MEMORY-CORE-02`

This isolated reference core is deliberately side-effect free. It neither connects to Supabase nor n8n and uses no customer data. It models an evolution of the existing `customer_memories` table keyed by `person_id`; reminders remain separate.

## Invariants

- `person_id` is the channel-neutral owner.
- One deterministic `(person_id, category, key)` truth is active at a time.
- Corrections supersede; history remains minimal and state-based.
- Lower-authority inference cannot overwrite stronger explicit/verified memory.
- `relationship != authorization`.
- Family access is accepted only through an external `AuthorizationContext`; the core never invents permissions.
- Temporary context requires expiry.
- Forgotten, revoked, expired, and superseded records are excluded from retrieval.
- Restricted memory is never included opportunistically.
- WhatsApp, Website, Android and Phone are source metadata only; they do not fork identity.
- Nilo and Mira consume the same records for the same `person_id`.
- Reminder is intentionally not a memory category.

## Source authority

1. `verified_profile`
2. `explicit_user_statement`
3. `document_extraction`
4. `family_provided`
5. `system_generated`
6. `inferred_from_context`

Confidence is separately bounded by source type; inference cannot claim verified-level confidence.

## Sensitivity

`NORMAL`, `PRIVATE`, `SENSITIVE`, `RESTRICTED`.

The core requires authorization to permit both category and sensitivity for third-party access. `RESTRICTED` is excluded from intent-driven opportunistic retrieval even for the subject; it must be explicitly requested. Storage policy for medical/financial/highly sensitive content remains a higher-layer decision and should default to data minimization.

## Integration boundary

Later persistence should evolve `public.customer_memories`, not introduce a second memory table. Existing `people`, `customer_accounts`, `customer_members`, `family_permissions`, identity and security logic remain authoritative. The SQL file is a draft only and must not be applied until the security block and schema review are complete.
