-- Milestone 2: restoration experiment workflow and secure experiment metadata.

create table public.restoration_experiments (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  name text not null,
  current_recording_id uuid not null references public.recordings(id),
  historical_recording_id uuid not null references public.recordings(id),
  authorization_id uuid not null references public.artist_authorizations(id),
  model_id uuid references public.voice_models(id),
  restoration_strength integer not null default 55 check (restoration_strength between 0 and 100),
  status text not null default 'draft' check (status in ('draft','ready','processing','completed','blocked')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.restoration_experiments enable row level security;

create index restoration_experiments_artist_idx on public.restoration_experiments(artist_id);
create index restoration_experiments_created_by_idx on public.restoration_experiments(created_by);

create policy "artist members can read restoration experiments"
on public.restoration_experiments for select
using (public.is_artist_member(artist_id));

create policy "authorized roles can create restoration experiments"
on public.restoration_experiments for insert
with check (
  public.has_artist_role(
    artist_id,
    array['artist_owner','artist_manager','audio_engineer','model_engineer']::public.platform_role[]
  )
  and created_by = auth.uid()
  and public.authorization_is_active(authorization_id, artist_id)
  and exists (
    select 1 from public.recordings r
    where r.id = current_recording_id and r.artist_id = restoration_experiments.artist_id
  )
  and exists (
    select 1 from public.recordings r
    where r.id = historical_recording_id and r.artist_id = restoration_experiments.artist_id
  )
);

create policy "authorized roles can update restoration experiments"
on public.restoration_experiments for update
using (
  public.has_artist_role(
    artist_id,
    array['artist_owner','artist_manager','audio_engineer','model_engineer']::public.platform_role[]
  )
)
with check (
  public.has_artist_role(
    artist_id,
    array['artist_owner','artist_manager','audio_engineer','model_engineer']::public.platform_role[]
  )
  and public.authorization_is_active(authorization_id, artist_id)
);

create trigger audit_restoration_experiments
after insert or update or delete on public.restoration_experiments
for each row execute function public.log_sensitive_change();
