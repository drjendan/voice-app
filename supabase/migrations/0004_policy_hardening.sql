-- Avoid recursive RLS evaluation when organization owners manage memberships.

create or replace function public.has_org_role(target_org uuid, allowed_roles public.platform_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships m
    where m.organization_id = target_org
      and m.user_id = auth.uid()
      and m.role = any(allowed_roles)
  );
$$;

drop policy if exists "platform owners can manage org memberships" on public.organization_memberships;

create policy "platform owners can manage org memberships"
on public.organization_memberships for all
using (public.has_org_role(organization_id, array['platform_owner']::public.platform_role[]))
with check (public.has_org_role(organization_id, array['platform_owner']::public.platform_role[]));

-- Prevent normal clients from deleting crown-jewel storage objects.
-- Deletion is intentionally withheld from authenticated storage policies.
-- A future controlled retention workflow must perform deletion server-side
-- after authorization, retention, legal hold, and audit checks.
