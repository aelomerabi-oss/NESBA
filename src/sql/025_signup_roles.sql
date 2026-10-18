-- 025: Sign-up roles
--
-- Teacher and organization sign-up sent account_type in the auth metadata,
-- but handle_new_user ignored it, so every account became a plain student
-- with nothing for an admin to review. Roles are only granted by an admin
-- (review_creator_request), so sign-up now records the request:
--   profiles.requested_role + verification_status 'pending', and a pending
--   creator_applications row that appears in the Admin screen.
--
-- request_creator_role lets an existing user (e.g. from onboarding) file the
-- same request. Users cannot write requested_role themselves
-- (protect_profile_privileged_fields), which broke onboarding.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_type text := lower(coalesce(v_meta->>'account_type', v_meta->>'role', 'student'));
  v_creator boolean := v_type in ('teacher', 'organization');
begin
  insert into public.profiles (id, email, full_name, role, requested_role, verification_status)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(trim(v_meta->>'full_name'), ''),
      nullif(trim(v_meta->>'organization_name'), ''),
      'NESBA Member'
    ),
    'student',
    case when v_creator then v_type end,
    case when v_creator then 'pending' else 'unverified' end
  )
  on conflict (id) do nothing;

  if v_creator then
    insert into public.creator_applications (user_id, requested_role, organization_name, reason)
    values (
      new.id,
      v_type,
      nullif(trim(v_meta->>'organization_name'), ''),
      'Requested at sign-up'
    );
  end if;

  return new;
end;
$$;

create or replace function public.request_creator_role(
  p_role text,
  p_organization_name text default null,
  p_expertise text default null,
  p_experience text default null,
  p_reason text default null
)
returns public.creator_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_role text := lower(trim(p_role));
  v_app public.creator_applications;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if v_role not in ('teacher', 'mentor', 'organization') then
    raise exception 'Role must be teacher, mentor or organization';
  end if;

  if exists (select 1 from public.profiles where id = uid and role = v_role) then
    raise exception 'You already have the % role', v_role;
  end if;

  select * into v_app
  from public.creator_applications
  where user_id = uid and requested_role = v_role and status = 'pending'
  order by created_at desc
  limit 1;

  if v_app.id is null then
    insert into public.creator_applications
      (user_id, requested_role, organization_name, expertise, experience, reason)
    values
      (uid, v_role, nullif(trim(p_organization_name), ''), nullif(trim(p_expertise), ''),
       nullif(trim(p_experience), ''), nullif(trim(p_reason), ''))
    returning * into v_app;
  end if;

  -- Trusted change to privileged profile fields.
  perform set_config('nesba.admin_operation', 'true', true);

  update public.profiles
  set requested_role = v_role,
      verification_status = 'pending',
      updated_at = now()
  where id = uid;

  return v_app;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.request_creator_role(text, text, text, text, text) from public, anon;
grant execute on function public.request_creator_role(text, text, text, text, text) to authenticated;
