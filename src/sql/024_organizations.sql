-- 024: Organizations
--
-- 1. organization_members SELECT policy queried organization_members itself,
--    so every read failed with "infinite recursion detected in policy".
--    Membership checks now go through is_organization_member(), which runs
--    as definer and does not re-enter the policy.
-- 2. Anyone could add themselves to any organization with any member_role
--    (including owner/admin). Self-join is now 'member' only; the
--    organization owner may add themselves with any role.
-- 3. Owners could create or update their organization with
--    verification_status = 'verified'. Only admins may change
--    verification_status / verified_at; new organizations start 'pending'.
-- 4. The owner is added as an 'owner' member when an organization is created.

create or replace function public.is_organization_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = p_organization_id and user_id = auth.uid()
  );
$$;

revoke execute on function public.is_organization_member(uuid) from public, anon;
grant execute on function public.is_organization_member(uuid) to authenticated;

alter policy "Members are viewable by organization members"
  on public.organization_members
  using (auth.uid() = user_id or public.is_organization_member(organization_id));

alter policy "Users can join organizations"
  on public.organization_members
  with check (
    auth.uid() = user_id
    and (
      member_role = 'member'
      or exists (
        select 1 from public.organizations o
        where o.id = organization_members.organization_id
          and o.owner_id = auth.uid()
      )
    )
  );

create or replace function public.guard_organization_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
begin
  select coalesce(role = 'admin', false) into v_is_admin
  from public.profiles where id = auth.uid();

  -- auth.uid() is null for service-role / SQL editor changes; allow those.
  if auth.uid() is null or coalesce(v_is_admin, false) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.verification_status := 'pending';
    new.verified_at := null;
  elsif new.verification_status is distinct from old.verification_status
     or new.verified_at is distinct from old.verified_at then
    raise exception 'Only NESBA admins can change organization verification';
  end if;

  return new;
end;
$$;

create trigger guard_organization_verification
  before insert or update on public.organizations
  for each row execute function public.guard_organization_verification();

create or replace function public.add_organization_owner_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_id is not null then
    insert into public.organization_members (organization_id, user_id, member_role)
    values (new.id, new.owner_id, 'owner')
    on conflict (organization_id, user_id) do update set member_role = 'owner';
  end if;
  return new;
end;
$$;

create trigger add_organization_owner_member
  after insert on public.organizations
  for each row execute function public.add_organization_owner_member();

revoke execute on function public.guard_organization_verification() from public, anon, authenticated;
revoke execute on function public.add_organization_owner_member() from public, anon, authenticated;
