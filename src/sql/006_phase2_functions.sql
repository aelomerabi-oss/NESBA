-- NESBA Phase 2 safety/completion migration.
-- Run after 005_schema_alignment_and_rpc.sql.
-- Idempotent: safe to run more than once.

begin;

alter table public.profiles add column if not exists requested_role text;
alter table public.profiles add column if not exists verification_status text not null default 'unverified';
alter table public.profiles add column if not exists expertise text;
alter table public.profiles add column if not exists experience text;

alter table public.courses add column if not exists organization_id uuid references public.organizations(id) on delete set null;
alter table public.courses add column if not exists published_at timestamptz;
alter table public.posts add column if not exists author_name text;

create index if not exists courses_organization_idx on public.courses(organization_id);

-- Admin-only creator application review.
create or replace function public.review_creator_request(p_request_id uuid, p_approve boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_ok boolean;
  req public.creator_applications%rowtype;
  org public.organizations%rowtype;
  base_slug text;
begin
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin') into admin_ok;
  if not admin_ok then raise exception 'Admin access required'; end if;

  select * into req from public.creator_applications where id = p_request_id for update;
  if not found then raise exception 'Creator application not found'; end if;

  if p_approve then
    update public.creator_applications
      set status='approved', reviewed_by=auth.uid(), reviewed_at=now(), updated_at=now()
      where id=req.id;

    update public.profiles
      set role=req.requested_role, requested_role=null, verification_status='verified', updated_at=now()
      where id=req.user_id;

    if req.requested_role='organization' and coalesce(trim(req.organization_name),'') <> '' then
      base_slug := regexp_replace(lower(trim(req.organization_name)), '[^a-z0-9]+', '-', 'g');
      base_slug := trim(both '-' from base_slug);
      base_slug := left(coalesce(nullif(base_slug,''),'organization'), 60) || '-' || left(replace(req.user_id::text,'-',''),6);

      insert into public.organizations(owner_id,name,slug,description,organization_type,verification_status,verified_at)
      values(req.user_id, trim(req.organization_name), base_slug, req.reason, coalesce(req.organization_type,'Educational Organization'),'verified',now())
      on conflict (slug) do nothing;

      select * into org from public.organizations where owner_id=req.user_id order by created_at desc limit 1;
      if org.id is not null then
        insert into public.organization_members(organization_id,user_id,member_role)
        values(org.id,req.user_id,'owner')
        on conflict (organization_id,user_id) do nothing;
      end if;
    end if;

    insert into public.notifications(user_id,type,title,body,data)
    values(req.user_id,'creator_approved','Creator application approved','Your NESBA creator application has been approved.',jsonb_build_object('role',req.requested_role));
  else
    update public.creator_applications
      set status='rejected', reviewed_by=auth.uid(), reviewed_at=now(), updated_at=now()
      where id=req.id;
    insert into public.notifications(user_id,type,title,body,data)
    values(req.user_id,'creator_rejected','Creator application update','Your NESBA creator application was not approved at this time.',jsonb_build_object('role',req.requested_role));
  end if;

  return jsonb_build_object('success',true,'status',case when p_approve then 'approved' else 'rejected' end);
end;
$$;

grant execute on function public.review_creator_request(uuid,boolean) to authenticated;

-- Secure lesson completion. Updates progress and issues the first certificate/badge on 100% completion.
create or replace function public.mark_lesson_complete(p_module_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  course uuid;
  total_count integer;
  completed_count integer;
  pct integer;
  cert_id text;
  cert_token uuid;
  first_badge uuid;
begin
  if uid is null then raise exception 'Authentication required'; end if;

  select cm.course_id into course from public.course_modules cm where cm.id=p_module_id;
  if course is null then raise exception 'Lesson not found'; end if;

  if not exists(select 1 from public.enrollments e where e.user_id=uid and e.course_id=course) then
    raise exception 'You must be enrolled in this course';
  end if;

  insert into public.lesson_progress(user_id,module_id,completed,progress_percent,completed_at,updated_at)
  values(uid,p_module_id,true,100,now(),now())
  on conflict (user_id,module_id) do update set completed=true, progress_percent=100, completed_at=now(), updated_at=now();

  select count(*) into total_count from public.course_modules where course_id=course;
  select count(*) into completed_count
    from public.lesson_progress lp
    join public.course_modules cm on cm.id=lp.module_id
    where lp.user_id=uid and cm.course_id=course and lp.completed=true;

  pct := case when total_count=0 then 0 else least(100, floor((completed_count::numeric / total_count::numeric)*100))::integer end;

  update public.enrollments set progress_percent=pct where user_id=uid and course_id=course;

  if pct=100 then
    if not exists(select 1 from public.certificates where user_id=uid and course_id=course) then
      cert_id := 'NESBA-CERT-' || to_char(now(),'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
      cert_token := gen_random_uuid();
      insert into public.certificates(certificate_id,user_id,course_id,verification_token)
      values(cert_id,uid,course,cert_token);
      insert into public.notifications(user_id,type,title,body,data)
      values(uid,'certificate_issued','Certificate earned','Congratulations! You completed a NESBA course.',jsonb_build_object('course_id',course,'certificate_id',cert_id));
    end if;

    select id into first_badge from public.badges where name='First Course Completed' limit 1;
    if first_badge is not null then
      insert into public.user_badges(user_id,badge_id) values(uid,first_badge) on conflict (user_id,badge_id) do nothing;
    end if;
  end if;

  return jsonb_build_object('course_id',course,'progress_percent',pct,'completed',pct=100,'certificate_id',cert_id);
end;
$$;

grant execute on function public.mark_lesson_complete(uuid) to authenticated;

-- Public certificate verification without exposing a user's private profile fields.
create or replace function public.verify_certificate(p_certificate_id text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'valid', c.id is not null,
    'certificate_id', c.certificate_id,
    'issued_at', c.issued_at,
    'course_title', co.title,
    'student_name', p.full_name,
    'teacher_name', co.teacher_name
  )
  from public.certificates c
  left join public.courses co on co.id=c.course_id
  left join public.profiles p on p.id=c.user_id
  where c.certificate_id=p_certificate_id
  limit 1;
$$;

grant execute on function public.verify_certificate(text) to anon, authenticated;

commit;
