-- 030: Launch hardening
--
-- 1. email_exists_for_signup let anyone check whether an email has an
--    account. Sign-up screens now rely on Supabase's own duplicate handling
--    (a user with no identities), so nobody needs to call it.
-- 2. Locked lessons were only locked in the app: learners could still read
--    their content and complete them through a direct link.

revoke execute on function public.email_exists_for_signup(text) from public, anon, authenticated;

drop policy if exists "public read lesson_content" on public.lesson_content;

create policy "public read lesson_content"
on public.lesson_content
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.course_modules cm
    join public.courses c on c.id = cm.course_id
    where cm.id = lesson_content.lesson_id
      and (
        c.teacher_id = auth.uid()
        or (
          c.is_published
          and lesson_content.is_published
          and not coalesce(cm.is_locked, false)
          and exists (
            select 1
            from public.enrollments e
            where e.course_id = c.id
              and e.user_id = auth.uid()
          )
        )
      )
  )
);

create or replace function public.mark_lesson_complete(p_module_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  v_course uuid;
  v_locked boolean;
  v_pct int;
  v_cert text;
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;

  select course_id, coalesce(is_locked, false)
  into v_course, v_locked
  from public.course_modules
  where id = p_module_id;

  if v_course is null then
    raise exception 'Lesson not found';
  end if;

  if v_locked then
    raise exception 'This lesson is locked';
  end if;

  if not exists (
    select 1 from public.enrollments
    where user_id = uid and course_id = v_course
  ) then
    raise exception 'You must be enrolled in this course';
  end if;

  insert into public.lesson_progress
    (user_id, module_id, completed, progress_percent, completed_at, updated_at)
  values
    (uid, p_module_id, true, 100, now(), now())
  on conflict (user_id, module_id) do update
    set completed = true,
        progress_percent = 100,
        completed_at = now(),
        updated_at = now();

  select progress_percent into v_pct
  from public.enrollments
  where user_id = uid and course_id = v_course;

  if v_pct = 100 then
    select certificate_id into v_cert
    from public.certificates
    where user_id = uid and course_id = v_course;
  end if;

  return jsonb_build_object(
    'course_id', v_course,
    'progress_percent', coalesce(v_pct, 0),
    'completed', v_pct = 100,
    'course_completed', v_pct = 100,
    'certificate_id', v_cert
  );
end;
$function$;
