# NAHWERK Identity Resolution / Dedup Core

Isolated, provider/channel-neutral core. It does not mutate Supabase, n8n, Production, Prime, people, accounts, memberships, subscriptions, usage, memories or reminders.

## Priority
1. server-known person_id
2. verified/server-asserted normalized phone
3. verified email
4. membership
5. account context
6. trusted provider/channel id
7. name only as profile data

Names, salutation, Du/Sie and profile completeness never create a new identity when a deterministic identity already exists. Existing identities are enriched. Existing-person collisions become NEEDS_REVIEW; the core never auto-merges.

## Normalization
Phone uses E.164-compatible normalization with German 0/+49 handling. Email is trim/lowercase without provider alias assumptions. Names use NFC + whitespace normalization and remain profile attributes.

## Persistence guarantees required later
Production integration should use transaction/unique-constraint compatible persistence. Recommended non-production draft contracts (not executed):

```sql
-- DRAFT ONLY; DO NOT RUN IN PRODUCTION
-- Canonical phone identity should be stored normalized and protected against races.
-- Shared/collision cases must be representable and routed to review rather than auto-merged.
create or replace function resolve_person_identity_secure(...) returns ...;
create or replace function ensure_person_for_phone_secure(...) returns ...;
create or replace function ensure_account_membership_secure(...) returns ...;
create or replace function enrich_person_profile_secure(...) returns ...;
```

Concrete signatures must be derived during the integration block from the then-current schema/security contracts. Existing phone-change verification remains the source of truth.

## Idempotency / concurrency
Use provider event/request id as an idempotency key. For first contact, combine transaction semantics with a canonical trusted channel identity key. A duplicate webhook, website submit or network retry must return the prior resolution rather than create another person/account/membership.

## Audit events
Allowed minimal event types: identity_resolved, person_created_prepared, profile_enrichment, account_creation_prepared, membership_creation_prepared, duplicate_detected, conflict, review_required. Do not log passwords, tokens or complete message bodies.

## Tests
Run with Node.js 20+:

`node --test identity-core/identity-resolution.test.mjs`
