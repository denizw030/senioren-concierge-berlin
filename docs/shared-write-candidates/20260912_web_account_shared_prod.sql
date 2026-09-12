-- CANDIDATE ONLY. DO NOT APPLY WHILE ANOTHER SHARED WRITER HOLDS THE PROD SLOT.
-- Target: Supabase PROD djicahhmnnamtjuqedqd
-- Contracts: payg-payment-method-detach-v1 + payg-consumer-rights-v1
begin;

create table if not exists public.payg_payment_method_detach_operations_v1 (
  id uuid primary key default gen_random_uuid(),
  customer_account_id uuid not null references public.customer_accounts(id) on delete cascade,
  customer_member_id uuid not null references public.customer_members(id) on delete restrict,
  payment_method_id uuid not null references public.customer_payment_methods_v1(id) on delete restrict,
  idempotency_key text not null unique check (btrim(idempotency_key) <> ''),
  provider text not null check (provider in ('stripe')),
  provider_payment_method_id text not null,
  state text not null default 'PREPARED' check (state in ('PREPARED','PROVIDER_DETACHED','COMPLETED','FAILED')),
  provider_detached_at timestamptz,
  completed_at timestamptz,
  failure_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists payg_payment_method_detach_open_uq
  on public.payg_payment_method_detach_operations_v1(payment_method_id)
  where state in ('PREPARED','PROVIDER_DETACHED');

create table if not exists public.payg_consumer_rights_evidence_v1 (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete restrict,
  customer_account_id uuid not null references public.customer_accounts(id) on delete cascade,
  customer_member_id uuid not null references public.customer_members(id) on delete restrict,
  quote_id uuid not null unique references public.payg_action_quotes_v1(id) on delete restrict,
  action_id uuid not null references public.concierge_actions_v1(action_id) on delete restrict,
  approval_id uuid not null references public.concierge_approvals_v1(approval_id) on delete restrict,
  contract_version text not null check (contract_version='payg-consumer-rights-v1'),
  legal_text_version text not null check (btrim(legal_text_version)<>''),
  legal_text_sha256 text not null check (legal_text_sha256 ~ '^[0-9a-f]{64}$'),
  immediate_performance_requested boolean not null check (immediate_performance_requested=true),
  withdrawal_expiry_acknowledged boolean not null check (withdrawal_expiry_acknowledged=true),
  client_accepted_at timestamptz not null,
  server_received_at timestamptz not null default now(),
  source_channel text not null check (source_channel='WEB'),
  evidence_hash text not null check (evidence_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);

create table if not exists public.payg_order_confirmations_v1 (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null unique references public.payg_action_quotes_v1(id) on delete restrict,
  action_id uuid not null references public.concierge_actions_v1(action_id) on delete restrict,
  customer_account_id uuid not null references public.customer_accounts(id) on delete cascade,
  customer_member_id uuid not null references public.customer_members(id) on delete restrict,
  amount_cents integer not null check (amount_cents>0),
  currency text not null default 'EUR' check (currency='EUR'),
  description text not null check (btrim(description)<>''),
  legal_text_version text not null,
  confirmation_destination text not null check (btrim(confirmation_destination)<>''),
  delivery_state text not null default 'PENDING' check (delivery_state in ('PENDING','SENT','FAILED')),
  provider_message_id text,
  approved_at timestamptz not null,
  sent_at timestamptz,
  failure_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payg_withdrawal_requests_v1 (
  id uuid primary key default gen_random_uuid(),
  consumer_name text not null check (btrim(consumer_name)<>''),
  contract_reference text not null check (btrim(contract_reference)<>''),
  confirmation_email text not null check (btrim(confirmation_email)<>''),
  statement text not null default 'WITHDRAW' check (statement='WITHDRAW'),
  matched_quote_id uuid references public.payg_action_quotes_v1(id) on delete set null,
  matched_customer_account_id uuid references public.customer_accounts(id) on delete set null,
  received_at timestamptz not null default now(),
  confirmation_delivery_state text not null default 'PENDING' check (confirmation_delivery_state in ('PENDING','SENT','FAILED')),
  confirmation_provider_message_id text,
  confirmation_sent_at timestamptz,
  request_fingerprint text not null unique check (request_fingerprint ~ '^[0-9a-f]{64}$'),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.payg_prepare_payment_method_detach_v1(
  p_actor_person_id uuid,
  p_customer_account_id uuid,
  p_payment_method_id uuid,
  p_idempotency_key text
) returns jsonb
language plpgsql security definer
set search_path=public,pg_catalog
as $$
declare
  v_member public.customer_members%rowtype;
  v_pm public.customer_payment_methods_v1%rowtype;
  v_op public.payg_payment_method_detach_operations_v1%rowtype;
begin
  if p_idempotency_key is null or btrim(p_idempotency_key)='' then raise exception 'IDEMPOTENCY_KEY_REQUIRED'; end if;
  select * into v_member from public.customer_members
   where customer_account_id=p_customer_account_id and person_id=p_actor_person_id limit 1;
  if not found or not (coalesce(v_member.is_payer,false) or coalesce(v_member.can_manage_plan,false)) then raise exception 'PAYG_NOT_AUTHORIZED'; end if;

  select * into v_pm from public.customer_payment_methods_v1
   where id=p_payment_method_id and customer_account_id=p_customer_account_id for update;
  if not found then raise exception 'PAYMENT_METHOD_NOT_FOUND'; end if;
  if v_pm.status='DETACHED' then
    return jsonb_build_object('ok',true,'duplicate',true,'state','COMPLETED','payment_method_id',v_pm.id,'provider',v_pm.provider,'provider_payment_method_id',v_pm.provider_payment_method_id);
  end if;
  if v_pm.status<>'ACTIVE' then raise exception 'PAYMENT_METHOD_NOT_ACTIVE'; end if;

  if exists(select 1 from public.payg_topup_intents_v1 t where t.payment_method_id=v_pm.id and t.status in ('CREATED','PROVIDER_PENDING')) then
    raise exception 'PAYMENT_METHOD_HAS_PENDING_PAYMENT';
  end if;

  select * into v_op from public.payg_payment_method_detach_operations_v1 where idempotency_key=p_idempotency_key;
  if found then
    if v_op.payment_method_id<>v_pm.id or v_op.customer_account_id<>p_customer_account_id then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
    return jsonb_build_object('ok',true,'duplicate',true,'operation_id',v_op.id,'state',v_op.state,'payment_method_id',v_pm.id,'provider',v_pm.provider,'provider_payment_method_id',v_pm.provider_payment_method_id);
  end if;

  insert into public.payg_payment_method_detach_operations_v1(
    customer_account_id,customer_member_id,payment_method_id,idempotency_key,provider,provider_payment_method_id
  ) values(p_customer_account_id,v_member.id,v_pm.id,p_idempotency_key,v_pm.provider,v_pm.provider_payment_method_id)
  returning * into v_op;

  return jsonb_build_object('ok',true,'duplicate',false,'operation_id',v_op.id,'state',v_op.state,'payment_method_id',v_pm.id,'provider',v_pm.provider,'provider_customer_id',v_pm.provider_customer_id,'provider_payment_method_id',v_pm.provider_payment_method_id);
end $$;

create or replace function public.payg_mark_payment_method_provider_detached_v1(p_operation_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_catalog as $$
declare v_op public.payg_payment_method_detach_operations_v1%rowtype;
begin
  update public.payg_payment_method_detach_operations_v1 set state='PROVIDER_DETACHED',provider_detached_at=coalesce(provider_detached_at,now()),updated_at=now()
   where id=p_operation_id and state in ('PREPARED','PROVIDER_DETACHED') returning * into v_op;
  if not found then select * into v_op from public.payg_payment_method_detach_operations_v1 where id=p_operation_id; end if;
  if not found then raise exception 'DETACH_OPERATION_NOT_FOUND'; end if;
  return jsonb_build_object('ok',true,'operation_id',v_op.id,'state',v_op.state);
end $$;

create or replace function public.payg_finalize_payment_method_detach_v1(p_operation_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_catalog as $$
declare
  v_op public.payg_payment_method_detach_operations_v1%rowtype;
  v_pm public.customer_payment_methods_v1%rowtype;
  v_fallback uuid;
begin
  select * into v_op from public.payg_payment_method_detach_operations_v1 where id=p_operation_id for update;
  if not found then raise exception 'DETACH_OPERATION_NOT_FOUND'; end if;
  if v_op.state='COMPLETED' then return jsonb_build_object('ok',true,'duplicate',true,'payment_method_id',v_op.payment_method_id,'state','COMPLETED'); end if;
  if v_op.state<>'PROVIDER_DETACHED' then raise exception 'PROVIDER_DETACH_NOT_CONFIRMED'; end if;

  update public.customer_payment_methods_v1
     set status='DETACHED',is_default=false,updated_at=now(),metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('detached_at',now(),'detach_operation_id',v_op.id)
   where id=v_op.payment_method_id and customer_account_id=v_op.customer_account_id
   returning * into v_pm;
  if not found then raise exception 'PAYMENT_METHOD_NOT_FOUND'; end if;

  if not exists(select 1 from public.customer_payment_methods_v1 where customer_account_id=v_op.customer_account_id and status='ACTIVE' and is_default=true) then
    select id into v_fallback from public.customer_payment_methods_v1
     where customer_account_id=v_op.customer_account_id and status='ACTIVE'
     order by created_at,id limit 1;
    if v_fallback is not null then update public.customer_payment_methods_v1 set is_default=true,updated_at=now() where id=v_fallback; end if;
  end if;

  update public.payg_payment_method_detach_operations_v1 set state='COMPLETED',completed_at=now(),updated_at=now(),failure_code=null where id=v_op.id;
  return jsonb_build_object('ok',true,'duplicate',false,'payment_method_id',v_op.payment_method_id,'state','COMPLETED');
end $$;

create or replace function public.payg_approve_action_quote_with_consumer_rights_v1(
  p_actor_person_id uuid,
  p_quote_id uuid,
  p_contract_version text,
  p_legal_text_version text,
  p_legal_text_sha256 text,
  p_immediate_performance_requested boolean,
  p_withdrawal_expiry_acknowledged boolean,
  p_client_accepted_at timestamptz,
  p_confirmation_destination text
) returns jsonb
language plpgsql security definer set search_path=public,pg_catalog as $$
declare
  v_quote public.payg_action_quotes_v1%rowtype;
  v_action public.concierge_actions_v1%rowtype;
  v_approval public.concierge_approvals_v1%rowtype;
  v_member public.customer_members%rowtype;
  v_existing public.payg_consumer_rights_evidence_v1%rowtype;
  v_hash text;
  v_result jsonb;
begin
  if p_contract_version<>'payg-consumer-rights-v1' then raise exception 'CONSUMER_RIGHTS_CONTRACT_MISMATCH'; end if;
  if p_legal_text_version is null or btrim(p_legal_text_version)='' or p_legal_text_sha256 !~ '^[0-9a-f]{64}$' then raise exception 'LEGAL_TEXT_BINDING_REQUIRED'; end if;
  if p_immediate_performance_requested is not true or p_withdrawal_expiry_acknowledged is not true then raise exception 'IMMEDIATE_PERFORMANCE_CONSENT_REQUIRED'; end if;
  if p_client_accepted_at is null or p_confirmation_destination is null or btrim(p_confirmation_destination)='' then raise exception 'CONSUMER_RIGHTS_EVIDENCE_INCOMPLETE'; end if;

  select * into v_quote from public.payg_action_quotes_v1 where id=p_quote_id for update;
  if not found then raise exception 'PAYG_QUOTE_NOT_FOUND'; end if;
  select * into v_action from public.concierge_actions_v1 where action_id=v_quote.action_id;
  if not found or v_action.source_channel<>'WEB' then raise exception 'WEB_ACTION_REQUIRED'; end if;
  select * into v_approval from public.concierge_approvals_v1 where approval_id=v_action.approval_id;
  if not found or v_approval.action_id<>v_action.action_id or v_approval.person_id<>p_actor_person_id then raise exception 'APPROVAL_BINDING_MISMATCH'; end if;
  select * into v_member from public.customer_members where customer_account_id=v_quote.customer_account_id and person_id=p_actor_person_id limit 1;
  if not found then raise exception 'PAYG_NOT_AUTHORIZED'; end if;

  v_hash:=encode(digest(concat_ws('|','payg-consumer-rights-v1',p_actor_person_id,v_quote.customer_account_id,v_member.id,v_quote.id,v_action.action_id,v_approval.approval_id,p_legal_text_version,p_legal_text_sha256,p_client_accepted_at::text),'sha256'),'hex');
  select * into v_existing from public.payg_consumer_rights_evidence_v1 where quote_id=v_quote.id;
  if found then
    if v_existing.evidence_hash<>v_hash then raise exception 'CONSUMER_RIGHTS_EVIDENCE_CONFLICT'; end if;
  else
    insert into public.payg_consumer_rights_evidence_v1(person_id,customer_account_id,customer_member_id,quote_id,action_id,approval_id,contract_version,legal_text_version,legal_text_sha256,immediate_performance_requested,withdrawal_expiry_acknowledged,client_accepted_at,source_channel,evidence_hash)
    values(p_actor_person_id,v_quote.customer_account_id,v_member.id,v_quote.id,v_action.action_id,v_approval.approval_id,p_contract_version,p_legal_text_version,p_legal_text_sha256,true,true,p_client_accepted_at,'WEB',v_hash);
  end if;

  v_result:=public.payg_approve_action_quote_v1(p_actor_person_id,p_quote_id);
  insert into public.payg_order_confirmations_v1(quote_id,action_id,customer_account_id,customer_member_id,amount_cents,currency,description,legal_text_version,confirmation_destination,delivery_state,approved_at)
  values(v_quote.id,v_action.action_id,v_quote.customer_account_id,v_member.id,v_quote.amount_cents,v_quote.currency,v_quote.description,p_legal_text_version,p_confirmation_destination,'PENDING',coalesce(v_quote.approved_at,now()))
  on conflict (quote_id) do nothing;

  return coalesce(v_result,'{}'::jsonb)||jsonb_build_object('consumer_rights_evidence_hash',v_hash,'order_confirmation_state','PENDING');
end $$;

create or replace function public.payg_mark_order_confirmation_sent_v1(
  p_quote_id uuid,p_provider_message_id text
) returns jsonb language plpgsql security definer set search_path=public,pg_catalog as $$
declare v_row public.payg_order_confirmations_v1%rowtype;
begin
  update public.payg_order_confirmations_v1 set delivery_state='SENT',provider_message_id=p_provider_message_id,sent_at=coalesce(sent_at,now()),failure_code=null,updated_at=now()
   where quote_id=p_quote_id and delivery_state in ('PENDING','FAILED','SENT') returning * into v_row;
  if not found then raise exception 'ORDER_CONFIRMATION_NOT_FOUND'; end if;
  return jsonb_build_object('ok',true,'quote_id',v_row.quote_id,'delivery_state',v_row.delivery_state,'sent_at',v_row.sent_at);
end $$;

create or replace function public.payg_consumer_rights_execution_ready_v1(p_action_id uuid)
returns boolean language sql stable security definer set search_path=public,pg_catalog as $$
  select exists(
    select 1
      from public.payg_action_quotes_v1 q
      join public.payg_consumer_rights_evidence_v1 e on e.quote_id=q.id
      join public.payg_order_confirmations_v1 c on c.quote_id=q.id
     where q.action_id=p_action_id and q.status in ('APPROVED','HELD','CAPTURED')
       and e.contract_version='payg-consumer-rights-v1'
       and c.delivery_state='SENT'
  );
$$;

revoke all on public.payg_payment_method_detach_operations_v1 from anon,authenticated;
revoke all on public.payg_consumer_rights_evidence_v1 from anon,authenticated;
revoke all on public.payg_order_confirmations_v1 from anon,authenticated;
revoke all on public.payg_withdrawal_requests_v1 from anon,authenticated;
revoke execute on function public.payg_prepare_payment_method_detach_v1(uuid,uuid,uuid,text) from public,anon,authenticated;
revoke execute on function public.payg_mark_payment_method_provider_detached_v1(uuid) from public,anon,authenticated;
revoke execute on function public.payg_finalize_payment_method_detach_v1(uuid) from public,anon,authenticated;
revoke execute on function public.payg_approve_action_quote_with_consumer_rights_v1(uuid,uuid,text,text,text,boolean,boolean,timestamptz,text) from public,anon,authenticated;
revoke execute on function public.payg_mark_order_confirmation_sent_v1(uuid,text) from public,anon,authenticated;
revoke execute on function public.payg_consumer_rights_execution_ready_v1(uuid) from public,anon,authenticated;
grant execute on function public.payg_prepare_payment_method_detach_v1(uuid,uuid,uuid,text) to service_role;
grant execute on function public.payg_mark_payment_method_provider_detached_v1(uuid) to service_role;
grant execute on function public.payg_finalize_payment_method_detach_v1(uuid) to service_role;
grant execute on function public.payg_approve_action_quote_with_consumer_rights_v1(uuid,uuid,text,text,text,boolean,boolean,timestamptz,text) to service_role;
grant execute on function public.payg_mark_order_confirmation_sent_v1(uuid,text) to service_role;
grant execute on function public.payg_consumer_rights_execution_ready_v1(uuid) to service_role;

commit;

-- REQUIRED SHARED PATCH AFTER THIS MIGRATION (same write window):
-- 1) web-payg: for WEB approve_quote require consumer_rights_evidence and call
--    payg_approve_action_quote_with_consumer_rights_v1. Expose consumer_rights capability only when withdrawal endpoint + durable confirmation sender are healthy.
-- 2) web-payg-checkout: implement detach_payment_method using prepare -> Stripe detach -> mark_provider_detached -> finalize. Expose payment_method_capabilities only when healthy.
-- 3) cao_claim_canonical_action_v1: before reserving a WEB fixed-price quote require payg_consumer_rights_execution_ready_v1(action_id)=true; otherwise fail closed with CONSUMER_RIGHTS_CONFIRMATION_PENDING.
-- 4) Never mark customer success from provider detach/order confirmation until final authoritative DB state is reconciled.
