-- supabase/migrations/2024-legalworkspace-portal.sql
-- LegalWorkspace portal schema additions (legal_registry, audit_log, worklogs, invoices)

create extension if not exists pgcrypto;

-- =========================================
-- Helpers
-- =========================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.audit_log_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_log is append-only';
end;
$$;

-- =========================================
-- A) legal_registry
-- =========================================
create table if not exists public.legal_registry (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('CLIENT','MITRA')),
  email text not null,
  account_type text not null check (account_type in ('PT','PERSONAL')),
  doc_type text not null check (doc_type in ('IPL','SPL','ADDENDUM','QUOTATION')),
  doc_number text not null,
  template text null,
  meta jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint legal_registry_role_email_doc_uq unique (role, email, doc_type, doc_number)
);

create index if not exists legal_registry_gate_idx
  on public.legal_registry (role, email, account_type, doc_type, doc_number, is_active);

drop trigger if exists legal_registry_set_updated_at on public.legal_registry;
create trigger legal_registry_set_updated_at
  before update on public.legal_registry
  for each row
  execute function public.set_updated_at();

alter table public.legal_registry enable row level security;

-- =========================================
-- B) audit_log (append-only)
-- =========================================
create table if not exists public.audit_log (
  id bigserial primary key,
  event text not null,
  actor_role text not null default 'SYSTEM',
  actor_email text null,
  target_doc text null,
  payload_hash text null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_created_at_idx
  on public.audit_log (created_at desc);

create index if not exists audit_log_event_idx
  on public.audit_log (event);

create index if not exists audit_log_actor_email_idx
  on public.audit_log (actor_email);

create index if not exists audit_log_target_doc_idx
  on public.audit_log (target_doc);

alter table public.audit_log enable row level security;

drop trigger if exists audit_log_append_only on public.audit_log;
create trigger audit_log_append_only
  before update or delete on public.audit_log
  for each row
  execute function public.audit_log_append_only();

-- =========================================
-- C) worklogs (placeholder)
-- =========================================
create table if not exists public.worklogs (
  id uuid primary key default gen_random_uuid(),
  role text not null default 'MITRA',
  mitra_email text not null,
  doc_type text not null default 'SPL',
  doc_number text not null,
  date date not null,
  hours numeric(5,2) not null default 0,
  notes text null,
  status text not null default 'DRAFT'
    check (status in ('DRAFT','SUBMITTED','LOCKED_BY_SYSTEM','APPROVED','REJECTED','FINAL')),
  evidence jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint worklogs_unique_mitra_doc_date unique (mitra_email, doc_number, date)
);

create index if not exists worklogs_mitra_doc_date_idx
  on public.worklogs (mitra_email, doc_number, date desc);

alter table public.worklogs enable row level security;

drop trigger if exists worklogs_set_updated_at on public.worklogs;
create trigger worklogs_set_updated_at
  before update on public.worklogs
  for each row
  execute function public.set_updated_at();

-- =========================================
-- D) invoices (placeholder)
-- =========================================
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  client_email text not null,
  doc_type text not null default 'IPL',
  doc_number text not null,
  period_start date null,
  period_end date null,
  amount numeric(14,2) not null default 0,
  currency text not null default 'IDR',
  status text not null default 'DRAFT'
    check (status in ('DRAFT','ISSUED','PAID','CANCELLED')),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invoices_client_doc_created_idx
  on public.invoices (client_email, doc_number, created_at desc);

alter table public.invoices enable row level security;

drop trigger if exists invoices_set_updated_at on public.invoices;
create trigger invoices_set_updated_at
  before update on public.invoices
  for each row
  execute function public.set_updated_at();

-- =========================================
-- E) RLS policies: default deny (no policies for anon/authenticated)
-- =========================================

-- =========================================
-- F) Optional view for admin overview
-- =========================================
create or replace view public.vw_admin_overview as
select
  (select count(*) from public.legal_registry) as legal_registry_total,
  (select count(*) from public.legal_registry where is_active = true) as legal_registry_active,
  (select count(*) from public.worklogs) as worklogs_total,
  (select count(*) from public.invoices) as invoices_total;
