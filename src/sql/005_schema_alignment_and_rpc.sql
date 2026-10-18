-- NESBA 005 — schema alignment + secure core RPCs
-- Run after 001, 002, 003_courses_FIXED and 004_nesba_core_FIXED.
begin;

alter table public.profiles
  add column if not exists verification_status text not null default 'unverified'
    check (verification_status in ('unverified','pending','verified','rejected','suspended'));

alter table public.profiles
  add column if not exists requested_role text;

alter table public.courses
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;
alter table public.posts add column if not exists author_name text;
update public.posts p set author_name = coalesce(pr.full_name,'NESBA Member') from public.profiles pr where pr.id=p.author_id and p.author_name is null;
alter table public.courses
  add column if not exists published_at timestamptz;

create index if not exists courses_organization_idx on public.courses(organization_id);
create index if not exists courses_teacher_idx on public.courses(teacher_id);

-- Protect privileged profile fields from direct client tampering.
create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- A logged-in user may edit normal profile fields, but never their own
  -- role, premium flag, verification status, or requested role.
  if auth.uid() = old.id then
    if new.role is distinct from old.role
       or new.is_premium is distinct from old.is_premium
       or new.verification_status is distinct from old.verification_status
       or new.requested_role is distinct from old.requested_role then
      raise exception 'Privileged profile fields can only be changed by NESBA administration';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_privileged_fields on public.profiles;
create trigger protect_profile_privileged_fields
before update on public.profiles
for each row execute function public.protect_profile_privileged_fields();

-- Creator application review. Only an existing admin can approve/reject.
create or replace function public.review_creator_application(
  p_application_id uuid,
  p_approve boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  app public.creator_applications;
  result jsonb;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Admin access required';
  end if;

  select * into app from public.creator_applications
  where id = p_application_id
  for update;

  if not found then raise exception 'Creator application not found'; end if;

  update public.creator_applications
  set status = case when p_approve then 'approved' else 'rejected' end,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = app.id;

  update public.profiles
  set role = case when p_approve then app.requested_role else role end,
      requested_role = null,
      verification_status = case when p_approve then 'verified' else 'rejected' end,
      updated_at = now()
  where id = app.user_id;

  if p_approve and app.requested_role = 'organization' then
    if not exists (
      select 1 from public.organizations where owner_id = app.user_id
    ) then
      insert into public.organizations (
        owner_id, name, slug, description, verification_status, verified_at
      )
      values (
        app.user_id,
        coalesce(nullif(app.organization_name,''), 'NESBA Organization'),
        'nesba-' || substr(app.user_id::text,1,8),
        app.reason,
        'verified',
        now()
      );
    else
      update public.organizations
      set verification_status='verified', verified_at=now(), updated_at=now()
      where owner_id=app.user_id;
    end if;
  end if;

  result := jsonb_build_object('id', app.id, 'status',
    case when p_approve then 'approved' else 'rejected' end);
  return result;
end;
$$;

-- Secure lesson completion. It updates enrollment progress and awards completion artifacts.
create or replace function public.mark_lesson_complete(p_module_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  mod public.course_modules;
  total_count integer;
  done_count integer;
  pct integer;
  cert_id text;
  cert_record public.certificates;
begin
  if uid is null then raise exception 'Authentication required'; end if;

  select * into mod from public.course_modules where id=p_module_id;
  if not found then raise exception 'Lesson not found'; end if;

  if not exists (
    select 1 from public.enrollments
    where user_id=uid and course_id=mod.course_id
  ) then
    raise exception 'You must enroll in this course first';
  end if;

  insert into public.lesson_progress(user_id,module_id,completed,progress_percent,completed_at,updated_at)
  values(uid,p_module_id,true,100,now(),now())
  on conflict(user_id,module_id) do update set
    completed=true, progress_percent=100, completed_at=coalesce(public.lesson_progress.completed_at,now()), updated_at=now();

  select count(*) into total_count from public.course_modules where course_id=mod.course_id;
  select count(*) into done_count
  from public.lesson_progress lp
  join public.course_modules cm on cm.id=lp.module_id
  where lp.user_id=uid and cm.course_id=mod.course_id and lp.completed=true;

  pct := case when total_count=0 then 0 else least(100, floor(done_count*100.0/total_count)::integer) end;

  update public.enrollments set progress_percent=pct where user_id=uid and course_id=mod.course_id;

  if pct=100 and not exists (
    select 1 from public.certificates where user_id=uid and course_id=mod.course_id
  ) then
    cert_id := 'NESBA-CERT-' || to_char(now(),'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
    insert into public.certificates(certificate_id,user_id,course_id)
    values(cert_id,uid,mod.course_id)
    returning * into cert_record;

    insert into public.user_badges(user_id,badge_id)
    select uid,b.id from public.badges b
    where b.name='First Course Completed'
      and not exists(select 1 from public.user_badges ub where ub.user_id=uid and ub.badge_id=b.id);

    insert into public.notifications(user_id,type,title,body,data)
    values(uid,'certificate','Course completed','Congratulations! Your NESBA certificate is ready.',
      jsonb_build_object('certificate_id',cert_id,'course_id',mod.course_id));
  end if;

  return jsonb_build_object(
    'completed', pct=100,
    'progress_percent', pct,
    'certificate_id', case when cert_record.id is null then null else cert_record.certificate_id end
  );
end;
$$;

-- Public certificate verification RPC.
create or replace function public.verify_certificate(p_certificate_id text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'certificate_id', c.certificate_id,
    'issued_at', c.issued_at,
    'student_name', p.full_name,
    'course_title', co.title,
    'teacher_name', co.teacher_name,
    'valid', true
  )
  from public.certificates c
  join public.profiles p on p.id=c.user_id
  join public.courses co on co.id=c.course_id
  where c.certificate_id=p_certificate_id;
$$;

-- Remove direct certificate insertion; certificates are issued by the secure RPC.
drop policy if exists "Users can view their certificates" on public.certificates;
drop policy if exists "Users can insert their certificates" on public.certificates;

-- Ensure profiles remain owner-readable, but admin functions can read as needed.
drop policy if exists "Profiles are readable by owner" on public.profiles;
create policy "Profiles are readable by owner" on public.profiles
for select using (id=auth.uid() or exists (
  select 1 from public.profiles admin where admin.id=auth.uid() and admin.role='admin'
));

commit;
