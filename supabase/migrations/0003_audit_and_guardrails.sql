-- Milestone 1: immutable audit events for sensitive domain changes.

create or replace function public.log_sensitive_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  aid uuid;
  oid uuid;
  rid text;
  evt text;
begin
  aid := coalesce(new.artist_id, old.artist_id);
  select organization_id into oid from public.artists where id = aid;
  rid := coalesce(new.id, old.id)::text;
  evt := tg_table_name || '.' || lower(tg_op);

  insert into public.audit_events(
    organization_id, artist_id, actor_user_id, event_type,
    resource_type, resource_id, result, metadata
  ) values (
    oid, aid, auth.uid(), evt,
    tg_table_name, rid, 'success',
    jsonb_build_object('operation', tg_op)
  );

  return coalesce(new, old);
end;
$$;

create trigger audit_authorizations
after insert or update or delete on public.artist_authorizations
for each row execute function public.log_sensitive_change();

create trigger audit_recordings
after insert or update or delete on public.recordings
for each row execute function public.log_sensitive_change();

create trigger audit_models
after insert or update or delete on public.voice_models
for each row execute function public.log_sensitive_change();

create trigger audit_processing_jobs
after insert or update or delete on public.processing_jobs
for each row execute function public.log_sensitive_change();

-- Audit records are append-only to normal authenticated users.
revoke update, delete on public.audit_events from authenticated;
