-- DESIGN ONLY. DO NOT APPLY TO PRODUCTION.
-- Evolves the existing public.customer_memories table; does not create a second memory source of truth.

alter table public.customer_memories
  add column if not exists memory_key text,
  add column if not exists value_json jsonb,
  add column if not exists confidence numeric(4,3),
  add column if not exists source text,
  add column if not exists sensitivity text,
  add column if not exists status text,
  add column if not exists version integer,
  add column if not exists verified_at timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists superseded_by uuid,
  add column if not exists correction_of uuid,
  add column if not exists source_channel text,
  add column if not exists metadata jsonb;

alter table public.customer_memories
  add constraint customer_memories_confidence_range check (confidence between 0 and 1),
  add constraint customer_memories_version_positive check (version >= 1),
  add constraint customer_memories_status_check check (status in ('active','superseded','forgotten','revoked','expired')),
  add constraint customer_memories_sensitivity_check check (sensitivity in ('NORMAL','PRIVATE','SENSITIVE','RESTRICTED'));

create index if not exists customer_memories_person_status_idx
  on public.customer_memories(person_id, status);
create index if not exists customer_memories_person_category_status_idx
  on public.customer_memories(person_id, category, status);
create index if not exists customer_memories_person_key_status_idx
  on public.customer_memories(person_id, memory_key, status);
create index if not exists customer_memories_expiry_idx
  on public.customer_memories(person_id, expires_at)
  where expires_at is not null;

create unique index if not exists customer_memories_one_active_key_idx
  on public.customer_memories(person_id, category, memory_key)
  where status = 'active' and memory_key is not null;

-- Proposed RPC/API contracts for later implementation behind existing identity/family authorization:
-- memory_retrieve(person_id, intent, context, requested_categories, authorization_context)
-- memory_upsert(person_id, category, memory_key, value_json, confidence, source, sensitivity, expires_at)
-- memory_correct(memory_id, new_value_json, source, confidence)
-- memory_forget(memory_id)
-- memory_forget_category(person_id, category)
-- memory_list_for_user(person_id, authorization_context)
--
-- RLS requirement: relationship records MUST NOT grant access. Existing family_permissions remains the authorization source of truth.
