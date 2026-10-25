-- 038: Automatic follow-ups
--
-- An hourly job (pg_cron) sends notifications that bring people back. They
-- show in the app's Notifications and, once phones are registered, as push.
--
-- Every hour:
--   * Workshops: 24 hours and 1 hour before, to attendees and the host.
--   * 1-to-1 sessions: 24 hours and 1 hour before, to student and teacher.
-- Once a day at 10:00 Amsterdam time ("nudges", in this order of priority):
--   1. Unfinished purchase: a course or ticket checkout that was not paid.
--   2. Continue learning: a started course with no progress for 7 days.
--   3. Welcome: a new member who has not opened a course after a day.
--   4. Come back: no visit for 14 days, and there is something new to see.
--
-- Limits: at most one nudge a day and three a week per person, each nudge
-- repeats only after a cooldown, and nobody gets nudges after turning off
-- Reminders. Workshop and session reminders are not limited.

alter table public.notification_preferences
  add column if not exists reminders_enabled boolean not null default true;

create table if not exists public.follow_up_log (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  ref_id uuid,
  is_nudge boolean not null default true,
  sent_at timestamptz not null default now()
);

create index if not exists follow_up_log_lookup_idx
  on public.follow_up_log (user_id, kind, ref_id, sent_at desc);

-- Only the job reads and writes this table.
alter table public.follow_up_log enable row level security;
revoke all on public.follow_up_log from anon, authenticated;

-- Was this follow-up already sent within the cooldown?
create or replace function public.follow_up_recent(p_user uuid, p_kind text, p_ref uuid, p_within interval)
returns boolean
language sql
volatile
set search_path = public
as $$
  select exists (
    select 1 from public.follow_up_log
    where user_id = p_user and kind = p_kind and ref_id is not distinct from p_ref
      and sent_at > now() - p_within
  );
$$;

-- May this person get a nudge now?
create or replace function public.follow_up_nudge_ok(p_user uuid)
returns boolean
language sql
volatile
set search_path = public
as $$
  select coalesce((select reminders_enabled from public.notification_preferences where user_id = p_user), true)
    and not exists (
      select 1 from public.follow_up_log
      where user_id = p_user and is_nudge and sent_at > now() - interval '20 hours'
    )
    and (
      select count(*) from public.follow_up_log
      where user_id = p_user and is_nudge and sent_at > now() - interval '7 days'
    ) < 3;
$$;

create or replace function public.follow_up_send(
  p_user uuid, p_kind text, p_ref uuid, p_is_nudge boolean,
  p_type text, p_title text, p_body text, p_data jsonb
)
returns void
language sql
volatile
set search_path = public
as $$
  insert into public.notifications (user_id, type, title, body, data)
  values (p_user, p_type, p_title, p_body, p_data || jsonb_build_object('kind', p_kind));

  insert into public.follow_up_log (user_id, kind, ref_id, is_nudge)
  values (p_user, p_kind, p_ref, p_is_nudge);
$$;

-- "Sat 25 Oct at 14:00" in Dutch time.
create or replace function public.follow_up_when(p_at timestamptz)
returns text
language sql
stable
as $$
  select to_char(p_at at time zone 'Europe/Amsterdam', 'Dy DD Mon "at" HH24:MI');
$$;

/*
 * Runs every hour. p_nudges forces the daily nudges on (true) or off (false);
 * left empty they run in the 10:00 Amsterdam hour. Returns how many
 * notifications were sent.
 */
create or replace function public.run_follow_ups(p_nudges boolean default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_sent integer := 0;
begin
  -- Workshops ---------------------------------------------------------------
  for r in
    select e.id, e.title, e.starts_at, people.user_id, w.kind
    from public.events e
    cross join (values ('event_24h', interval '24 hours'), ('event_1h', interval '1 hour')) as w(kind, lead_time)
    cross join lateral (
      select reg.user_id from public.event_registrations reg where reg.event_id = e.id
      union
      select e.host_id where e.host_id is not null
    ) people
    where e.status = 'scheduled'
      and e.starts_at > now()
      and e.starts_at <= now() + w.lead_time
      -- The 24-hour reminder only while the 1-hour one is not due yet.
      and (w.kind = 'event_1h' or e.starts_at > now() + interval '1 hour')
  loop
    continue when public.follow_up_recent(r.user_id, r.kind, r.id, interval '3 days');

    perform public.follow_up_send(
      r.user_id, r.kind, r.id, false, 'event_reminder',
      case r.kind when 'event_1h' then 'Starting soon' else 'Tomorrow on NESBA' end,
      case r.kind
        when 'event_1h' then '"' || r.title || '" starts at ' || to_char(r.starts_at at time zone 'Europe/Amsterdam', 'HH24:MI') || '. Open it to join.'
        else '"' || r.title || '" is on ' || public.follow_up_when(r.starts_at) || '.'
      end,
      jsonb_build_object('event_id', r.id, 'route', '/event/' || r.id)
    );
    v_sent := v_sent + 1;
  end loop;

  -- 1-to-1 sessions -----------------------------------------------------------
  for r in
    select b.id, b.starts_at, people.user_id, people.other_id, w.kind
    from public.tutoring_bookings b
    cross join (values ('session_24h', interval '24 hours'), ('session_1h', interval '1 hour')) as w(kind, lead_time)
    cross join lateral (
      values (b.student_id, b.teacher_id), (b.teacher_id, b.student_id)
    ) as people(user_id, other_id)
    where b.status = 'confirmed'
      and b.starts_at > now()
      and b.starts_at <= now() + w.lead_time
      and (w.kind = 'session_1h' or b.starts_at > now() + interval '1 hour')
  loop
    continue when public.follow_up_recent(r.user_id, r.kind, r.id, interval '3 days');

    perform public.follow_up_send(
      r.user_id, r.kind, r.id, false, 'event_reminder',
      case r.kind when 'session_1h' then 'Your session starts soon' else 'Session tomorrow' end,
      'Your 1-to-1 session with '
        || coalesce((select nullif(trim(full_name), '') from public.profiles where id = r.other_id), 'your mentor')
        || case r.kind
             when 'session_1h' then ' starts at ' || to_char(r.starts_at at time zone 'Europe/Amsterdam', 'HH24:MI') || '.'
             else ' is on ' || public.follow_up_when(r.starts_at) || '.'
           end,
      jsonb_build_object('booking_id', r.id, 'route', '/bookings')
    );
    v_sent := v_sent + 1;
  end loop;

  if not coalesce(p_nudges, extract(hour from now() at time zone 'Europe/Amsterdam') = 10) then
    return v_sent;
  end if;

  -- 1. Unfinished purchases ---------------------------------------------------
  for r in
    select distinct on (p.buyer_id, p.course_id) p.buyer_id as user_id, c.id, c.title
    from public.course_purchases p
    join public.courses c on c.id = p.course_id and c.is_published
    where p.status in ('pending', 'expired')
      and p.created_at between now() - interval '3 days' and now() - interval '1 hour'
      and not exists (select 1 from public.course_purchases paid
                      where paid.buyer_id = p.buyer_id and paid.course_id = p.course_id and paid.status = 'paid')
      and not exists (select 1 from public.enrollments en where en.user_id = p.buyer_id and en.course_id = p.course_id)
  loop
    continue when public.follow_up_recent(r.user_id, 'checkout_course', r.id, interval '30 days')
               or not public.follow_up_nudge_ok(r.user_id);

    perform public.follow_up_send(
      r.user_id, 'checkout_course', r.id, true, 'reminder',
      'Still interested?',
      'Your purchase of "' || r.title || '" was not finished. The course is still waiting for you.',
      jsonb_build_object('course_id', r.id, 'route', '/course/' || r.id)
    );
    v_sent := v_sent + 1;
  end loop;

  for r in
    select distinct on (t.buyer_id, t.event_id) t.buyer_id as user_id, e.id, e.title, e.starts_at
    from public.event_ticket_purchases t
    join public.events e on e.id = t.event_id
    where t.status in ('pending', 'expired')
      and t.created_at between now() - interval '3 days' and now() - interval '1 hour'
      and e.status = 'scheduled' and e.starts_at > now() + interval '2 hours'
      and not exists (select 1 from public.event_registrations reg where reg.event_id = e.id and reg.user_id = t.buyer_id)
  loop
    continue when public.follow_up_recent(r.user_id, 'checkout_ticket', r.id, interval '30 days')
               or not public.follow_up_nudge_ok(r.user_id);

    perform public.follow_up_send(
      r.user_id, 'checkout_ticket', r.id, true, 'reminder',
      'Your ticket is not booked yet',
      'You started buying a ticket for "' || r.title || '" on ' || public.follow_up_when(r.starts_at) || '. Seats may run out.',
      jsonb_build_object('event_id', r.id, 'route', '/event/' || r.id)
    );
    v_sent := v_sent + 1;
  end loop;

  -- 2. Continue learning ------------------------------------------------------
  for r in
    select en.user_id, c.id, c.title, en.progress_percent, activity.last_at
    from public.enrollments en
    join public.courses c on c.id = en.course_id and c.is_published
    cross join lateral (
      select coalesce(max(lp.updated_at), en.enrolled_at) as last_at
      from public.lesson_progress lp
      join public.course_modules m on m.id = lp.module_id
      where lp.user_id = en.user_id and m.course_id = en.course_id
    ) activity
    where coalesce(en.progress_percent, 0) < 100
      and activity.last_at between now() - interval '60 days' and now() - interval '7 days'
    order by activity.last_at desc
  loop
    continue when public.follow_up_recent(r.user_id, 'continue_course', r.id, interval '14 days')
               or not public.follow_up_nudge_ok(r.user_id);

    perform public.follow_up_send(
      r.user_id, 'continue_course', r.id, true, 'reminder',
      'Keep going',
      case when coalesce(r.progress_percent, 0) = 0
        then 'You enrolled in "' || r.title || '". Start the first lesson today, it only takes a few minutes.'
        else 'You are ' || r.progress_percent || '% through "' || r.title || '". A few minutes today keeps you going.'
      end,
      jsonb_build_object('course_id', r.id, 'route', '/course/' || r.id)
    );
    v_sent := v_sent + 1;
  end loop;

  -- 3. Welcome ------------------------------------------------------------------
  for r in
    select p.id as user_id
    from public.profiles p
    where p.created_at between now() - interval '3 days' and now() - interval '20 hours'
      and not exists (select 1 from public.enrollments en where en.user_id = p.id)
  loop
    continue when public.follow_up_recent(r.user_id, 'welcome', null, interval '100 years')
               or not public.follow_up_nudge_ok(r.user_id);

    perform public.follow_up_send(
      r.user_id, 'welcome', null, true, 'reminder',
      'Welcome to NESBA',
      'Start with a free course. Most lessons take less than 20 minutes.',
      jsonb_build_object('route', '/courses')
    );
    v_sent := v_sent + 1;
  end loop;

  -- 4. Come back ----------------------------------------------------------------
  for r in
    select seen.user_id, seen.last_seen,
      (select count(*) from public.courses c where c.is_published and coalesce(c.published_at, c.created_at) > seen.last_seen) as new_courses,
      (select count(*) from public.events e where e.status = 'scheduled' and not e.is_private
         and e.starts_at between now() and now() + interval '14 days') as upcoming
    from (
      select u.id as user_id,
        greatest(u.last_sign_in_at, (select max(s.updated_at) from auth.sessions s where s.user_id = u.id)) as last_seen
      from auth.users u
      join public.profiles p on p.id = u.id
    ) seen
    where seen.last_seen between now() - interval '90 days' and now() - interval '14 days'
  loop
    continue when r.new_courses + r.upcoming = 0
               or public.follow_up_recent(r.user_id, 'come_back', null, interval '14 days')
               or not public.follow_up_nudge_ok(r.user_id);

    perform public.follow_up_send(
      r.user_id, 'come_back', null, true, 'reminder',
      'New on NESBA',
      concat_ws(' and ',
        case when r.new_courses > 0 then r.new_courses || ' new course' || case when r.new_courses > 1 then 's' else '' end end,
        case when r.upcoming > 0 then r.upcoming || ' upcoming workshop' || case when r.upcoming > 1 then 's' else '' end end
      ) || ' since your last visit. Come and have a look.',
      jsonb_build_object('route', '/')
    );
    v_sent := v_sent + 1;
  end loop;

  return v_sent;
end;
$$;

revoke execute on function public.follow_up_recent(uuid, text, uuid, interval) from public, anon, authenticated;
revoke execute on function public.follow_up_nudge_ok(uuid) from public, anon, authenticated;
revoke execute on function public.follow_up_send(uuid, text, uuid, boolean, text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.follow_up_when(timestamptz) from public, anon, authenticated;
revoke execute on function public.run_follow_ups(boolean) from public, anon, authenticated;

-- Every hour at five past.
select cron.unschedule('follow-ups') where exists (select 1 from cron.job where jobname = 'follow-ups');
select cron.schedule('follow-ups', '5 * * * *', 'select public.run_follow_ups()');
