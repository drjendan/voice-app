-- Vocal Legacy Engine - Milestone 1 secure foundation
-- Do not upload production artist assets until this migration and storage policies are verified.

create extension if not exists pgcrypto;

create type public.platform_role as enum ('platform_owner','artist_owner','artist_manager','audio_engineer','model_engineer','viewer');
create type public.authorization_status as enum ('draft','approved','expired','revoked');
create type public.asset_classification as enum ('internal','confidential','restricted');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.organization_memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.platform_role not null,
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.artists (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  stage_name text not null,
  legal_name text,
  status text not null default 'onboarding',
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id)
);

create table public.artist_memberships (
  artist_id uuid not null references public.artists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.platform_role not null,
  created_at timestamptz not null default now(),
  primary key (artist_id, user_id)
);

create table public.artist_authorizations (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  status public.authorization_status not null default 'draft',
  permitted_uses text[] not null default '{}',
  restrictions text,
  effective_at timestamptz,
  expires_at timestamptz,
  approved_by uuid references auth.users(id),
  document_storage_path text,
  created_at timestamptz not null default now()
);

create table public.recordings (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  title text not null,
  recording_year integer,
  era text,
  recording_type text check (recording_type in ('studio','live','current','historical')),
  classification public.asset_classification not null default 'restricted',
  training_eligible boolean not null default false,
  storage_path text not null,
  checksum_sha256 text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.voice_models (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  name text not null,
  version text not null,
  status text not null default 'inactive',
  storage_path text not null,
  authorization_id uuid not null references public.artist_authorizations(id),
  created_at timestamptz not null default now(),
  unique (artist_id, name, version)
);

create table public.processing_jobs (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  requested_by uuid not null references auth.users(id),
  model_id uuid references public.voice_models(id),
  input_recording_id uuid references public.recordings(id),
  status text not null default 'queued',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations(id),
  artist_id uuid references public.artists(id),
  actor_user_id uuid references auth.users(id),
  event_type text not null,
  resource_type text,
  resource_id text,
  result text not null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.artists enable row level security;
alter table public.artist_memberships enable row level security;
alter table public.artist_authorizations enable row level security;
alter table public.recordings enable row level security;
alter table public.voice_models enable row level security;
alter table public.processing_jobs enable row level security;
alter table public.audit_events enable row level security;

create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_memberships m
    where m.organization_id = target_org and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_artist_member(target_artist uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.artist_memberships m
    where m.artist_id = target_artist and m.user_id = auth.uid()
  );
$$;

create policy "members can read their organizations"
on public.organizations for select
using (public.is_org_member(id));

create policy "members can read their organization memberships"
on public.organization_memberships for select
using (public.is_org_member(organization_id));

create policy "artist members can read artist profiles"
on public.artists for select
using (public.is_artist_member(id));

create policy "artist members can read artist memberships"
on public.artist_memberships for select
using (public.is_artist_member(artist_id));

create policy "artist members can read authorizations"
on public.artist_authorizations for select
using (public.is_artist_member(artist_id));

create policy "artist members can read recordings"
on public.recordings for select
using (public.is_artist_member(artist_id));

create policy "artist members can read voice model metadata"
on public.voice_models for select
using (public.is_artist_member(artist_id));

create policy "artist members can read their processing jobs"
on public.processing_jobs for select
using (public.is_artist_member(artist_id));

create policy "artist members can read artist audit events"
on public.audit_events for select
using (artist_id is not null and public.is_artist_member(artist_id));

-- Intentionally no browser INSERT/UPDATE/DELETE policies yet.
-- Sensitive writes will be added only after server-side authorization checks,
-- explicit role matrices, audit hooks, and storage policies are implemented.
