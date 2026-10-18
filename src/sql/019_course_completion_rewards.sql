-- 019: Course completion rewards
--
-- 1. Fix recompute_course_progress: it read new.course_id, but lesson_progress
--    has no course_id column, so every insert/update on lesson_progress failed
--    and no lesson could be marked complete.
-- 2. award_course_completion: one place that issues the certificate and every
--    course_completion badge the learner now qualifies for (criteria.count =
--    number of completed courses), with a notification for each.
-- 3. mark_lesson_complete relies on the trigger and returns the result shape
--    the lesson screen reads (progress_percent, course_completed, certificate_id).
-- 4. Learners can no longer write enrollments.progress_percent directly;
--    progress only changes by completing lessons.
-- 5. Backfill progress and rewards for existing enrollments.

create or replace function public.award_course_completion(p_user_id uuid, p_course_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cert text;
  v_title text;
  v_completed int;
  v_badge record;
begin
  select certificate_id into v_cert
  from public.certificates
  where user_id = p_user_id and course_id = p_course_id;

  if v_cert is null then
    select title into v_title from public.courses where id = p_course_id;
    v_cert := 'NESBA-CERT-' || to_char(now(), 'YYYY') || '-'
      || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

    insert into public.certificates (certificate_id, user_id, course_id, verification_token, metadata)
    values (v_cert, p_user_id, p_course_id, gen_random_uuid(),
            jsonb_build_object('course_title', v_title))
    on conflict (user_id, course_id) do nothing;

    if found then
      insert into public.notifications (user_id, type, title, body, data)
      values (p_user_id, 'certificate_issued', 'Certificate earned',
              'Congratulations! You completed ' || coalesce(v_title, 'a NESBA course') || '.',
              jsonb_build_object('course_id', p_course_id, 'certificate_id', v_cert));
    else
      select certificate_id into v_cert
      from public.certificates
      where user_id = p_user_id and course_id = p_course_id;
    end if;
  end if;

  select count(*) into v_completed from public.certificates where user_id = p_user_id;

  for v_badge in
    select b.id, b.name
    from public.badges b
    where b.is_active
      and b.criteria->>'type' = 'course_completion'
      and coalesce((b.criteria->>'count')::int, 1) <= v_completed
      and not exists (
        select 1 from public.user_badges ub
        where ub.user_id = p_user_id and ub.badge_id = b.id
      )
  loop
    insert into public.user_badges (user_id, badge_id)
    values (p_user_id, v_badge.id)
    on conflict (user_id, badge_id) do nothing;

    if found then
      insert into public.notifications (user_id, type, title, body, data)
      values (p_user_id, 'badge_earned', 'Badge earned',
              'You earned the "' || v_badge.name || '" badge.',
              jsonb_build_object('badge_id', v_badge.id));
    end if;
  end loop;

  return v_cert;
end;
$$;

create or replace function public.recompute_course_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course uuid;
  v_total int;
  v_done int;
  v_pct int;
begin
  select course_id into v_course from public.course_modules where id = new.module_id;
  if v_course is null then
    return new;
  end if;

  select count(*) into v_total from public.course_modules where course_id = v_course;

  select count(*) into v_done
  from public.lesson_progress lp
  join public.course_modules cm on cm.id = lp.module_id
  where lp.user_id = new.user_id and cm.course_id = v_course and lp.completed;

  v_pct := case when v_total = 0 then 0
                else least(100, floor(v_done * 100.0 / v_total))::int end;

  update public.enrollments
  set progress_percent = v_pct
  where user_id = new.user_id and course_id = v_course;

  if v_pct = 100 and found then
    perform public.award_course_completion(new.user_id, v_course);
  end if;

  return new;
end;
$$;

create or replace function public.mark_lesson_complete(p_module_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_course uuid;
  v_pct int;
  v_cert text;
begin
  if uid is null then raise exception 'Authentication required'; end if;

  select course_id into v_course from public.course_modules where id = p_module_id;
  if v_course is null then raise exception 'Lesson not found'; end if;

  if not exists (select 1 from public.enrollments where user_id = uid and course_id = v_course) then
    raise exception 'You must be enrolled in this course';
  end if;

  -- recompute_course_progress (trigger) updates the enrollment and awards rewards.
  insert into public.lesson_progress (user_id, module_id, completed, progress_percent, completed_at, updated_at)
  values (uid, p_module_id, true, 100, now(), now())
  on conflict (user_id, module_id) do update
    set completed = true, progress_percent = 100, completed_at = now(), updated_at = now();

  select progress_percent into v_pct from public.enrollments where user_id = uid and course_id = v_course;

  if v_pct = 100 then
    select certificate_id into v_cert from public.certificates where user_id = uid and course_id = v_course;
  end if;

  return jsonb_build_object(
    'course_id', v_course,
    'progress_percent', coalesce(v_pct, 0),
    'completed', v_pct = 100,
    'course_completed', v_pct = 100,
    'certificate_id', v_cert
  );
end;
$$;

revoke execute on function public.award_course_completion(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.recompute_course_progress() from public, anon, authenticated;
revoke execute on function public.mark_lesson_complete(uuid) from public, anon;
grant execute on function public.mark_lesson_complete(uuid) to authenticated;

-- Progress is derived from lesson_progress only.
revoke update on public.enrollments from anon, authenticated;

-- Backfill
update public.enrollments e
set progress_percent = s.pct
from (
  select e2.id,
         case when count(cm.id) = 0 then 0
              else least(100, floor(count(lp.id) * 100.0 / count(cm.id)))::int end as pct
  from public.enrollments e2
  join public.course_modules cm on cm.course_id = e2.course_id
  left join public.lesson_progress lp
    on lp.module_id = cm.id and lp.user_id = e2.user_id and lp.completed
  group by e2.id
) s
where s.id = e.id and e.progress_percent is distinct from s.pct;

select public.award_course_completion(user_id, course_id)
from public.enrollments
where progress_percent = 100;
