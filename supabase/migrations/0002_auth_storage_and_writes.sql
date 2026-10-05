-- Milestone 1 completion: secure writes, authorization gates, audit hooks, private storage.

create or replace function public.has_artist_role(target_artist uuid, allowed_roles public.platform_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.artist_memberships m
    where m.artist_id = target_artist
      and m.user_id = auth.uid()
      and m.role = any(allowed_roles)
  );
$$;

create or replace function public.create_organization(org_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if length(trim(org_name)) < 2 then raise exception 'organization name required'; end if;

  insert into public.organizations(name) values (trim(org_name)) returning id into new_org;
  insert into public.organization_memberships(organization_id, user_id, role)
  values (new_org, auth.uid(), 'platform_owner');

  insert into public.audit_events(organization_id, actor_user_id, event_type, resource_type, resource_id, result)
  values (new_org, auth.uid(), 'organization.created', 'organization', new_org::text, 'success');

  return new_org;
end;
$$;

create or replace function public.enroll_artist(target_org uuid, artist_stage_name text, artist_legal_name text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_artist uuid;
  caller_role public.platform_role;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;

  select role into caller_role
  from public.organization_memberships
  where organization_id = target_org and user_id = auth.uid();

  if caller_role is distinct from 'platform_owner' then
    raise exception 'insufficient permission';
  end if;

  if length(trim(artist_stage_name)) < 2 then raise exception 'artist stage name required'; end if;

  insert into public.artists(organization_id, stage_name, legal_name, created_by)
  values (target_org, trim(artist_stage_name), nullif(trim(artist_legal_name), ''), auth.uid())
  returning id into new_artist;

  insert into public.artist_memberships(artist_id, user_id, role)
  values (new_artist, auth.uid(), 'artist_owner');

  insert into public.artist_authorizations(artist_id, status)
  values (new_artist, 'draft');

  insert into public.audit_events(organization_id, artist_id, actor_user_id, event_type, resource_type, resource_id, result)
  values (target_org, new_artist, auth.uid(), 'artist.enrolled', 'artist', new_artist::text, 'success');

  return new_artist;
end;
$$;

create policy "platform owners can manage org memberships"
on public.organization_memberships for all
using (
  exists (
    select 1 from public.organization_memberships self
    where self.organization_id = organization_memberships.organization_id
      and self.user_id = auth.uid()
      and self.role = 'platform_owner'
  )
)
with check (
  exists (
    select 1 from public.organization_memberships self
    where self.organization_id = organization_memberships.organization_id
      and self.user_id = auth.uid()
      and self.role = 'platform_owner'
  )
);

create policy "artist owners and managers can manage memberships"
on public.artist_memberships for all
using (public.has_artist_role(artist_id, array['artist_owner','artist_manager']::public.platform_role[]))
with check (public.has_artist_role(artist_id, array['artist_owner','artist_manager']::public.platform_role[]));

create policy "artist owners can update artist"
on public.artists for update
using (public.has_artist_role(id, array['artist_owner']::public.platform_role[]))
with check (public.has_artist_role(id, array['artist_owner']::public.platform_role[]));

create policy "owners can manage authorizations"
on public.artist_authorizations for all
using (public.has_artist_role(artist_id, array['artist_owner']::public.platform_role[]))
with check (public.has_artist_role(artist_id, array['artist_owner']::public.platform_role[]));

create policy "authorized audio roles can create recording metadata"
on public.recordings for insert
with check (
  public.has_artist_role(artist_id, array['artist_owner','artist_manager','audio_engineer']::public.platform_role[])
  and created_by = auth.uid()
);

create policy "authorized audio roles can update recording metadata"
on public.recordings for update
using (public.has_artist_role(artist_id, array['artist_owner','artist_manager','audio_engineer']::public.platform_role[]))
with check (public.has_artist_role(artist_id, array['artist_owner','artist_manager','audio_engineer']::public.platform_role[]));

create policy "model roles can manage model metadata"
on public.voice_models for all
using (public.has_artist_role(artist_id, array['artist_owner','model_engineer']::public.platform_role[]))
with check (public.has_artist_role(artist_id, array['artist_owner','model_engineer']::public.platform_role[]));

create policy "authorized members can create processing jobs"
on public.processing_jobs for insert
with check (
  public.has_artist_role(artist_id, array['artist_owner','artist_manager','audio_engineer','model_engineer']::public.platform_role[])
  and requested_by = auth.uid()
);

create policy "job requester can update own processing job"
on public.processing_jobs for update
using (requested_by = auth.uid() and public.is_artist_member(artist_id))
with check (requested_by = auth.uid() and public.is_artist_member(artist_id));

-- Private buckets. No object should ever be public.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('artist-audio', 'artist-audio', false, 524288000, array['audio/wav','audio/mpeg','audio/flac','audio/mp4','audio/aac','audio/ogg']),
  ('artist-models', 'artist-models', false, 2147483648, null),
  ('authorization-docs', 'authorization-docs', false, 52428800, array['application/pdf','image/png','image/jpeg'])
on conflict (id) do update set public = excluded.public;

-- Object path convention: <artist_uuid>/<asset_uuid>/<filename>
create policy "artist members can read authorized audio objects"
on storage.objects for select
using (
  bucket_id = 'artist-audio'
  and public.is_artist_member((storage.foldername(name))[1]::uuid)
);

create policy "audio roles can upload artist audio"
on storage.objects for insert
with check (
  bucket_id = 'artist-audio'
  and public.has_artist_role(
    (storage.foldername(name))[1]::uuid,
    array['artist_owner','artist_manager','audio_engineer']::public.platform_role[]
  )
);

create policy "audio roles can replace artist audio"
on storage.objects for update
using (
  bucket_id = 'artist-audio'
  and public.has_artist_role(
    (storage.foldername(name))[1]::uuid,
    array['artist_owner','artist_manager','audio_engineer']::public.platform_role[]
  )
)
with check (
  bucket_id = 'artist-audio'
  and public.has_artist_role(
    (storage.foldername(name))[1]::uuid,
    array['artist_owner','artist_manager','audio_engineer']::public.platform_role[]
  )
);

create policy "model metadata users can read model objects"
on storage.objects for select
using (
  bucket_id = 'artist-models'
  and public.has_artist_role(
    (storage.foldername(name))[1]::uuid,
    array['artist_owner','model_engineer']::public.platform_role[]
  )
);

create policy "model engineers can upload model objects"
on storage.objects for insert
with check (
  bucket_id = 'artist-models'
  and public.has_artist_role(
    (storage.foldername(name))[1]::uuid,
    array['artist_owner','model_engineer']::public.platform_role[]
  )
);

create policy "artist owners can read authorization docs"
on storage.objects for select
using (
  bucket_id = 'authorization-docs'
  and public.has_artist_role((storage.foldername(name))[1]::uuid, array['artist_owner']::public.platform_role[])
);

create policy "artist owners can upload authorization docs"
on storage.objects for insert
with check (
  bucket_id = 'authorization-docs'
  and public.has_artist_role((storage.foldername(name))[1]::uuid, array['artist_owner']::public.platform_role[])
);

create or replace function public.authorization_is_active(target_authorization uuid, target_artist uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.artist_authorizations a
    where a.id = target_authorization
      and a.artist_id = target_artist
      and a.status = 'approved'
      and (a.effective_at is null or a.effective_at <= now())
      and (a.expires_at is null or a.expires_at > now())
  );
$$;
