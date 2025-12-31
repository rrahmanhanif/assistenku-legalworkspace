-- supabase/migrations/2024-legalworkspace.sql
-- LegalWorkspace (Assistenku) - Base schema
-- Catatan: service_role Supabase bypass RLS, jadi RLS aman dipakai walau akses dilakukan via /api (server-side).

-- Recommended extensions
create extension if not exists pgcrypto;

-- =========================================
-- 1) REGISTRY (dokumen + role + email allowlist)
-- =========================================
create table if not exists public.registry (
  id bigserial primary key,
  role text not null check (role in ('ADMIN', 'CLIENT', 'MITRA')),
  doc_type text not null, -- contoh: IPL, ADDENDUM, SPL, QUOTATION, ADMIN
  doc_number text not null,
  scope text not null, -- contoh: PROJECT-ALPHA / IPL-CLIENT-XYZ / dsb
  email text not null,
  name text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Unique constraint mengikuti dev-seed Anda: ON CONFLICT (role, doc_number)
create unique index if not exists registry_role_doc_number_uq
  on public.registry (role, doc_number);

create index if not exists registry_doc_number_idx
  on public.registry (doc_number);

create index if not exists registry_email_idx
  on public.registry (email);

alter table public.registry enable row level security;

-- Tidak ada policy -> anon/authenticated tidak bisa akses saat RLS ON.
-- service_role tetap bisa baca/tulis (bypass RLS).

-- =========================================
-- 2) AUDIT LOGS (append-only)
-- =========================================
create table if not exists public.audit_logs (
  id bigserial primary key,
  actor_role text null,
  actor_email text null,
  action text not null,
  doc_number text null,
  doc_type text null,
  scope text null,
  metadata text null,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_at_idx
  on public.audit_logs (created_at desc);

create index if not exists audit_logs_doc_number_idx
  on public.audit_logs (doc_number);

create index if not exists audit_logs_actor_email_idx
  on public.audit_logs (actor_email);

alter table public.audit_logs enable row level security;

-- =========================================
-- 3) HOLIDAYS CACHE (Google Calendar sync cache)
-- =========================================
create table if not exists public.holidays_cache (
  id bigserial primary key,
  date date not null,
  summary text null,
  source_id text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists holidays_cache_source_id_uq
  on public.holidays_cache (source_id);

create index if not exists holidays_cache_date_idx
  on public.holidays_cache (date);

alter table public.holidays_cache enable row level security;

-- =========================================
-- 4) OVERTIME POLICY (kebijakan lembur per scope)
-- =========================================
create table if not exists public.overtime_policy (
  id bigserial primary key,
  scope text not null,
  weekend_allowed boolean not null default false,
  holiday_allowed boolean not null default false,
  max_hours_per_day integer null,
  updated_at timestamptz not null default now()
);

create index if not exists overtime_policy_scope_idx
  on public.overtime_policy (scope);

alter table public.overtime_policy enable row level security;

-- Catatan desain:
-- Anda bisa menjadikan policy per scope itu 1 baris saja dengan UNIQUE(scope),
-- tapi kode API Anda sekarang pakai sbInsert (bukan upsert). Jadi saya tidak paksa unique.

-- =========================================
-- 5) OVERTIME REQUESTS (pengajuan lembur)
-- =========================================
create table if not exists public.overtime_requests (
  id bigserial primary key,
  doc_number text not null,
  requested_by text not null,
  date date not null,
  hours numeric(5,2) not null check (hours > 0),
  reason text null,
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  decided_by text null,
  decided_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists overtime_requests_doc_number_idx
  on public.overtime_requests (doc_number);

create index if not exists overtime_requests_requested_by_idx
  on public.overtime_requests (requested_by);

create index if not exists overtime_requests_status_idx
  on public.overtime_requests (status);

alter table public.overtime_requests enable row level security;

-- =========================================
-- 6) (OPSIONAL) DOC INSTANCES (lifecycle dokumen) - skeleton
-- =========================================
create table if not exists public.doc_instances (
  id bigserial primary key,
  doc_type text not null,
  doc_number text not null,
  scope text not null,
  status text not null default 'DRAFT',
  version integer not null default 1,
  hash text null,
  payload text null, -- simpan JSON string kalau perlu (agar konsisten dengan pola metadata)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists doc_instances_doc_number_idx
  on public.doc_instances (doc_number);

create index if not exists doc_instances_scope_idx
  on public.doc_instances (scope);

alter table public.doc_instances enable row level security;

-- =========================================
-- End
-- =========================================
