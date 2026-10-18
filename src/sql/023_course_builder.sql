-- 023: Course builder support
--
-- 1. lesson_content only had a public SELECT policy, so teachers could not
--    add content to their lessons. Teachers may now manage content of
--    lessons in courses they teach.
-- 2. Keep courses.lesson_count and courses.duration_minutes in step with the
--    course's lessons (course_modules) when lessons are added, changed or
--    removed. Existing courses are not recalculated until their lessons
--    change.

create policy lesson_content_teacher_manage
  on public.lesson_content for all
  to authenticated
  using (
    exists (
      select 1
      from public.course_modules cm
      join public.courses c on c.id = cm.course_id
      where cm.id = lesson_content.lesson_id
        and c.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.course_modules cm
      join public.courses c on c.id = cm.course_id
      where cm.id = lesson_content.lesson_id
        and c.teacher_id = auth.uid()
    )
  );

create or replace function public.sync_course_lesson_totals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course uuid;
begin
  foreach v_course in array array_remove(array[
    case when tg_op <> 'DELETE' then new.course_id end,
    case when tg_op <> 'INSERT' then old.course_id end
  ], null)
  loop
    update public.courses c
    set lesson_count = s.lessons,
        duration_minutes = s.minutes,
        updated_at = now()
    from (
      select count(*)::int as lessons,
             coalesce(sum(duration_minutes), 0)::int as minutes
      from public.course_modules
      where course_id = v_course
    ) s
    where c.id = v_course;
  end loop;

  return null;
end;
$$;

create trigger sync_course_lesson_totals
  after insert or update of course_id, duration_minutes or delete
  on public.course_modules
  for each row execute function public.sync_course_lesson_totals();

revoke execute on function public.sync_course_lesson_totals() from public, anon, authenticated;
