-- DESIGN ONLY. DO NOT RUN IN PRODUCTION.
-- NAHWERK provider-switch schema draft.

create type contract_verification_status as enum ('verified','probable','uncertain','missing');
create type comparison_status as enum ('draft','data_required','ready_for_comparison','offers_found','review_required','prepared','awaiting_customer_approval','approved','execution_pending','executed','failed','cancelled','expired');

create table provider_catalog (
  id uuid primary key,
  provider_type text not null check (provider_type in ('electricity','gas','internet','mobile')),
  legal_name text not null,
  brand_name text,
  source_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table provider_offers (
  id uuid primary key,
  provider_id uuid not null references provider_catalog(id),
  external_offer_id text,
  product_type text not null,
  tariff_name text not null,
  normalized_offer jsonb not null,
  source text not null,
  source_retrieved_at timestamptz not null,
  valid_until timestamptz,
  content_hash text not null,
  created_at timestamptz not null default now(),
  unique(provider_id, external_offer_id, content_hash)
);

create table customer_contracts (
  id uuid primary key,
  person_id uuid not null,
  customer_account_id uuid,
  product_type text not null,
  provider_name text,
  tariff_name text,
  structured_terms jsonb not null default '{}'::jsonb,
  status comparison_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table contract_documents (
  id uuid primary key,
  contract_id uuid not null references customer_contracts(id) on delete cascade,
  storage_ref text not null,
  mime_type text,
  sha256 text not null,
  retention_until timestamptz,
  created_at timestamptz not null default now()
);

create table contract_extractions (
  id uuid primary key,
  contract_id uuid not null references customer_contracts(id) on delete cascade,
  document_id uuid references contract_documents(id) on delete set null,
  extractor_version text not null,
  fields jsonb not null,
  overall_status contract_verification_status not null,
  created_at timestamptz not null default now()
);

create table comparison_requests (
  id uuid primary key,
  contract_id uuid not null references customer_contracts(id),
  need_profile jsonb not null,
  status comparison_status not null default 'draft',
  requested_at timestamptz not null default now()
);

create table comparison_results (
  id uuid primary key,
  comparison_request_id uuid not null references comparison_requests(id),
  current_effective_cost jsonb,
  ranked_offers jsonb not null,
  ranking_version text not null,
  assumptions jsonb not null default '[]'::jsonb,
  missing_data jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table switch_preparations (
  id uuid primary key,
  comparison_result_id uuid not null references comparison_results(id),
  selected_offer_id uuid not null references provider_offers(id),
  version integer not null,
  summary jsonb not null,
  preparation_hash text not null,
  status comparison_status not null default 'prepared',
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique(comparison_result_id, version)
);

create table switch_approvals (
  id uuid primary key,
  preparation_id uuid not null references switch_preparations(id),
  person_id uuid not null,
  preparation_hash text not null,
  approval_channel text not null,
  approved_at timestamptz not null,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table switch_executions (
  id uuid primary key,
  preparation_id uuid not null references switch_preparations(id),
  approval_id uuid not null references switch_approvals(id),
  idempotency_key text not null unique,
  provider_interaction_id uuid,
  status comparison_status not null default 'execution_pending',
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table affiliate_relationships (
  id uuid primary key,
  provider_id uuid references provider_catalog(id),
  commercial_relationship text not null,
  affiliate_network text,
  commission_type text,
  commission_amount numeric,
  commission_currency text,
  source text not null,
  confirmed_at timestamptz,
  valid_from timestamptz,
  valid_until timestamptz,
  created_at timestamptz not null default now()
);

create table commission_events (
  id uuid primary key,
  relationship_id uuid references affiliate_relationships(id),
  execution_id uuid references switch_executions(id),
  external_transaction_id text,
  amount numeric,
  currency text,
  status text not null,
  occurred_at timestamptz not null default now()
);

create table provider_interactions (
  id uuid primary key,
  preparation_id uuid references switch_preparations(id),
  provider_id uuid references provider_catalog(id),
  interaction_type text not null,
  request_metadata jsonb not null default '{}'::jsonb,
  response_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table consent_records (
  id uuid primary key,
  person_id uuid not null,
  purpose text not null,
  scope jsonb not null,
  granted_at timestamptz not null,
  expires_at timestamptz,
  revoked_at timestamptz,
  evidence jsonb not null default '{}'::jsonb
);

create table action_audit_log (
  id uuid primary key,
  person_id uuid,
  customer_account_id uuid,
  aggregate_type text not null,
  aggregate_id uuid not null,
  action text not null,
  actor_type text not null,
  actor_id text,
  correlation_id text not null,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now()
);

-- Production migration must add foreign keys to existing NAHWERK identity/account tables
-- only after the authoritative schema and Security block are frozen. Do not create
-- duplicate identity/session/consent sources of truth.
