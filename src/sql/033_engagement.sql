-- 033: Engagement features and security fixes
--
--  1. Security: trigger functions and has_paid_for_course() were callable
--     through the API (Supabase security advisor). Triggers keep working.
--  2. Push notifications: push_tokens + a pg_net trigger that asks the
--     send-push edge function to deliver every new notification.
--  3. Lesson quizzes (answers hidden from learners, graded by submit_quiz)
--     and lesson assignments (submitted and reviewed through functions).
--  4. Live session recordings (rows written by the livekit-record function).
--  5. Project showcase: projects can be completed with a summary and link.
--  6. Reviews for private teaching sessions.
--  7. Discount codes for courses.
--  8. Learning streaks and automatic badges.

-- ---------------------------------------------------------------------------
-- 1. Security fixes
-- ---------------------------------------------------------------------------

revoke execute on function public.add_project_owner() from public, anon, authenticated;
revoke execute on function public.guard_project_join() from public, anon, authenticated;
revoke execute on function public.guard_course_price() from public, anon, authenticated;
revoke execute on function public.guard_paid_enrollment() from public, anon, authenticated;
revoke execute on function public.guard_tutoring_offer() from public, anon, authenticated;
revoke execute on function public.guard_private_registration() from public, anon, authenticated;

-- Only the enrollment guard (which runs as definer) needs this; users could
-- otherwise ask whether anyone had bought any course.
revoke execute on function public.has_paid_for_course(uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Push notifications
-- ---------------------------------------------------------------------------

create extension if not exists pg_net with schema extensions;

create table if not exists public.push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now()
);

create index if not exists push_tokens_user_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

drop policy if exists "Users read their push tokens" on public.push_tokens;
create policy "Users read their push tokens"
  on public.push_tokens for select to authenticated using (user_id = auth.uid());

-- A device token moves to whoever signs in on that device.
create or replace function public.register_push_token(p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  insert into public.push_tokens (token, user_id, platform, updated_at)
  values (p_token, auth.uid(), p_platform, now())
  on conflict (token) do update
    set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
end;
$$;

create or replace function public.unregister_push_token(p_token text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.push_tokens where token = p_token and user_id = auth.uid();
$$;

revoke execute on function public.register_push_token(text, text) from public, anon;
revoke execute on function public.unregister_push_token(text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;
grant execute on function public.unregister_push_token(text) to authenticated;

alter table public.notifications add column if not exists pushed_at timestamptz;

-- send-push looks the notification up itself and only sends it once, so the
-- request carries nothing but the id.
create or replace function public.queue_push_notification()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if exists (select 1 from public.push_tokens where user_id = new.user_id) then
    perform net.http_post(
      url := 'https://xrgyqsfnaquypahiyqzb.supabase.co/functions/v1/send-push',
      body := jsonb_build_object('notification_id', new.id),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  end if;
  return new;
end;
$$;

revoke execute on function public.queue_push_notification() from public, anon, authenticated;

drop trigger if exists notifications_queue_push on public.notifications;
create trigger notifications_queue_push
  after insert on public.notifications
  for each row execute function public.queue_push_notification();

-- ---------------------------------------------------------------------------
-- Helpers for lesson features
-- ---------------------------------------------------------------------------

create or replace function public.is_lesson_teacher(p_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.course_modules m
    join public.courses c on c.id = m.course_id
    where m.id = p_lesson_id and c.teacher_id = auth.uid()
  );
$$;

create or replace function public.is_lesson_learner(p_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.course_modules m
    join public.enrollments e on e.course_id = m.course_id
    where m.id = p_lesson_id and e.user_id = auth.uid()
  );
$$;

revoke execute on function public.is_lesson_teacher(uuid) from public, anon;
revoke execute on function public.is_lesson_learner(uuid) from public, anon;
grant execute on function public.is_lesson_teacher(uuid) to authenticated;
grant execute on function public.is_lesson_learner(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3a. Quizzes
-- ---------------------------------------------------------------------------

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.course_modules(id) on delete cascade,
  question text not null check (char_length(trim(question)) between 3 and 500),
  options text[] not null check (array_length(options, 1) between 2 and 6),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Kept apart so learners can read questions without seeing the answers.
create table if not exists public.quiz_answer_keys (
  question_id uuid primary key references public.quiz_questions(id) on delete cascade,
  correct_index integer not null check (correct_index >= 0)
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.course_modules(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  score integer not null,
  total integer not null,
  answers jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists quiz_questions_lesson_idx on public.quiz_questions (lesson_id, sort_order);
create index if not exists quiz_attempts_user_idx on public.quiz_attempts (user_id, lesson_id, created_at desc);

alter table public.quiz_questions enable row level security;
alter table public.quiz_answer_keys enable row level security;
alter table public.quiz_attempts enable row level security;

drop policy if exists "Teachers and learners read quiz questions" on public.quiz_questions;
create policy "Teachers and learners read quiz questions"
  on public.quiz_questions for select to authenticated
  using (public.is_lesson_teacher(lesson_id) or public.is_lesson_learner(lesson_id));

drop policy if exists "Teachers delete quiz questions" on public.quiz_questions;
create policy "Teachers delete quiz questions"
  on public.quiz_questions for delete to authenticated
  using (public.is_lesson_teacher(lesson_id));

drop policy if exists "Teachers read answer keys" on public.quiz_answer_keys;
create policy "Teachers read answer keys"
  on public.quiz_answer_keys for select to authenticated
  using (exists (
    select 1 from public.quiz_questions q
    where q.id = quiz_answer_keys.question_id and public.is_lesson_teacher(q.lesson_id)
  ));

drop policy if exists "Learners and teachers read attempts" on public.quiz_attempts;
create policy "Learners and teachers read attempts"
  on public.quiz_attempts for select to authenticated
  using (user_id = auth.uid() or public.is_lesson_teacher(lesson_id));

create or replace function public.add_quiz_question(
  p_lesson_id uuid, p_question text, p_options text[], p_correct_index integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_lesson_teacher(p_lesson_id) then
    raise exception 'Only the course teacher can edit this quiz';
  end if;

  if p_correct_index < 0 or p_correct_index >= coalesce(array_length(p_options, 1), 0) then
    raise exception 'Choose which answer is correct';
  end if;

  insert into public.quiz_questions (lesson_id, question, options, sort_order)
  values (
    p_lesson_id, trim(p_question), p_options,
    (select coalesce(max(sort_order), 0) + 1 from public.quiz_questions where lesson_id = p_lesson_id)
  )
  returning id into v_id;

  insert into public.quiz_answer_keys (question_id, correct_index) values (v_id, p_correct_index);

  return v_id;
end;
$$;

-- Grade a quiz. p_answers maps question id -> chosen option index.
create or replace function public.submit_quiz(p_lesson_id uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_score integer := 0;
  v_total integer := 0;
  v_results jsonb := '[]'::jsonb;
  v_row record;
  v_chosen integer;
begin
  if not public.is_lesson_learner(p_lesson_id) and not public.is_lesson_teacher(p_lesson_id) then
    raise exception 'Enroll in this course to take the quiz';
  end if;

  for v_row in
    select q.id, k.correct_index
    from public.quiz_questions q
    join public.quiz_answer_keys k on k.question_id = q.id
    where q.lesson_id = p_lesson_id
    order by q.sort_order
  loop
    v_total := v_total + 1;
    v_chosen := nullif(p_answers ->> v_row.id::text, '')::integer;
    if v_chosen = v_row.correct_index then
      v_score := v_score + 1;
    end if;
    v_results := v_results || jsonb_build_object(
      'question_id', v_row.id, 'chosen', v_chosen, 'correct_index', v_row.correct_index
    );
  end loop;

  if v_total = 0 then
    raise exception 'This lesson has no quiz';
  end if;

  insert into public.quiz_attempts (lesson_id, user_id, score, total, answers)
  values (p_lesson_id, auth.uid(), v_score, v_total, coalesce(p_answers, '{}'::jsonb));

  return jsonb_build_object('score', v_score, 'total', v_total, 'results', v_results);
end;
$$;

revoke execute on function public.add_quiz_question(uuid, text, text[], integer) from public, anon;
revoke execute on function public.submit_quiz(uuid, jsonb) from public, anon;
grant execute on function public.add_quiz_question(uuid, text, text[], integer) to authenticated;
grant execute on function public.submit_quiz(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 3b. Assignments
-- ---------------------------------------------------------------------------

create table if not exists public.lesson_assignments (
  lesson_id uuid primary key references public.course_modules(id) on delete cascade,
  instructions text not null check (char_length(trim(instructions)) between 5 and 5000),
  updated_at timestamptz not null default now()
);

create table if not exists public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lesson_assignments(lesson_id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text check (char_length(content) <= 10000),
  link_url text,
  status text not null default 'submitted' check (status in ('submitted', 'reviewed')),
  feedback text check (char_length(feedback) <= 5000),
  grade text check (char_length(grade) <= 40),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (lesson_id, user_id)
);

alter table public.lesson_assignments enable row level security;
alter table public.assignment_submissions enable row level security;

drop policy if exists "Teachers and learners read assignments" on public.lesson_assignments;
create policy "Teachers and learners read assignments"
  on public.lesson_assignments for select to authenticated
  using (public.is_lesson_teacher(lesson_id) or public.is_lesson_learner(lesson_id));

drop policy if exists "Teachers write assignments" on public.lesson_assignments;
create policy "Teachers write assignments"
  on public.lesson_assignments for all to authenticated
  using (public.is_lesson_teacher(lesson_id))
  with check (public.is_lesson_teacher(lesson_id));

drop policy if exists "Students and teachers read submissions" on public.assignment_submissions;
create policy "Students and teachers read submissions"
  on public.assignment_submissions for select to authenticated
  using (user_id = auth.uid() or public.is_lesson_teacher(lesson_id));

-- Submitting again replaces the work and sends it back for review.
create or replace function public.submit_assignment(p_lesson_id uuid, p_content text, p_link_url text)
returns public.assignment_submissions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub public.assignment_submissions;
  v_teacher uuid;
begin
  if not public.is_lesson_learner(p_lesson_id) then
    raise exception 'Enroll in this course to submit work';
  end if;

  if coalesce(trim(p_content), '') = '' and coalesce(trim(p_link_url), '') = '' then
    raise exception 'Write your answer or add a link';
  end if;

  insert into public.assignment_submissions (lesson_id, user_id, content, link_url)
  values (p_lesson_id, auth.uid(), nullif(trim(p_content), ''), nullif(trim(p_link_url), ''))
  on conflict (lesson_id, user_id) do update
    set content = excluded.content, link_url = excluded.link_url, status = 'submitted',
        feedback = null, grade = null, submitted_at = now(), reviewed_at = null
  returning * into v_sub;

  select c.teacher_id into v_teacher
  from public.course_modules m join public.courses c on c.id = m.course_id
  where m.id = p_lesson_id;

  insert into public.notifications (user_id, type, title, body, data)
  values (v_teacher, 'assignment_submitted', 'New assignment to review',
          'A learner submitted work for one of your lessons.',
          jsonb_build_object('lesson_id', p_lesson_id, 'submission_id', v_sub.id));

  return v_sub;
end;
$$;

create or replace function public.review_assignment(p_submission_id uuid, p_feedback text, p_grade text)
returns public.assignment_submissions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub public.assignment_submissions;
begin
  select * into v_sub from public.assignment_submissions where id = p_submission_id;

  if v_sub.id is null or not public.is_lesson_teacher(v_sub.lesson_id) then
    raise exception 'Only the course teacher can review this work';
  end if;

  update public.assignment_submissions
  set status = 'reviewed', feedback = nullif(trim(p_feedback), ''), grade = nullif(trim(p_grade), ''),
      reviewed_at = now()
  where id = p_submission_id
  returning * into v_sub;

  insert into public.notifications (user_id, type, title, body, data)
  values (v_sub.user_id, 'assignment_reviewed', 'Your assignment was reviewed',
          coalesce('Grade: ' || v_sub.grade || '. ', '') || 'Open the lesson to read the feedback.',
          jsonb_build_object('lesson_id', v_sub.lesson_id));

  return v_sub;
end;
$$;

revoke execute on function public.submit_assignment(uuid, text, text) from public, anon;
revoke execute on function public.review_assignment(uuid, text, text) from public, anon;
grant execute on function public.submit_assignment(uuid, text, text) to authenticated;
grant execute on function public.review_assignment(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Live session recordings
-- ---------------------------------------------------------------------------

create table if not exists public.live_recordings (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.live_audio_rooms(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  egress_id text not null unique,
  file_path text not null,
  status text not null default 'recording' check (status in ('recording', 'ready', 'failed')),
  started_by uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index if not exists live_recordings_event_idx on public.live_recordings (event_id, started_at desc);

alter table public.live_recordings enable row level security;

-- Hosts, attendees of the event, and anyone signed in for public events.
drop policy if exists "Recordings follow event access" on public.live_recordings;
create policy "Recordings follow event access"
  on public.live_recordings for select to authenticated
  using (
    started_by = auth.uid()
    or exists (
      select 1 from public.events e
      where e.id = live_recordings.event_id
        and (
          e.host_id = auth.uid()
          or not e.is_private
          or exists (
            select 1 from public.event_registrations r
            where r.event_id = e.id and r.user_id = auth.uid()
          )
        )
    )
  );

insert into storage.buckets (id, name, public)
values ('recordings', 'recordings', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 5. Project showcase
-- ---------------------------------------------------------------------------

alter table public.project_groups
  add column if not exists status text not null default 'active' check (status in ('active', 'completed')),
  add column if not exists showcase_summary text check (char_length(showcase_summary) <= 3000),
  add column if not exists showcase_url text,
  add column if not exists completed_at timestamptz;

-- ---------------------------------------------------------------------------
-- 6. Private session reviews
-- ---------------------------------------------------------------------------

create table if not exists public.tutoring_reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.tutoring_bookings(id) on delete cascade,
  offer_id uuid not null references public.tutoring_offers(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  review text check (char_length(review) <= 2000),
  created_at timestamptz not null default now()
);

create index if not exists tutoring_reviews_teacher_idx on public.tutoring_reviews (teacher_id, created_at desc);

alter table public.tutoring_reviews enable row level security;

drop policy if exists "Session reviews are public" on public.tutoring_reviews;
create policy "Session reviews are public"
  on public.tutoring_reviews for select to anon, authenticated using (true);

create or replace function public.review_tutoring_session(p_booking_id uuid, p_rating integer, p_review text)
returns public.tutoring_reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.tutoring_bookings;
  v_review public.tutoring_reviews;
begin
  select * into v_booking from public.tutoring_bookings where id = p_booking_id;

  if v_booking.id is null or v_booking.student_id is distinct from auth.uid() then
    raise exception 'Only the student of this session can review it';
  end if;

  if not (
    v_booking.status = 'completed'
    or (v_booking.status = 'confirmed'
        and v_booking.starts_at + make_interval(mins => v_booking.duration_minutes) < now())
  ) then
    raise exception 'You can review the session after it has taken place';
  end if;

  insert into public.tutoring_reviews (booking_id, offer_id, teacher_id, student_id, rating, review)
  values (v_booking.id, v_booking.offer_id, v_booking.teacher_id, v_booking.student_id,
          p_rating, nullif(trim(p_review), ''))
  on conflict (booking_id) do update set rating = excluded.rating, review = excluded.review
  returning * into v_review;

  insert into public.notifications (user_id, type, title, body, data)
  values (v_booking.teacher_id, 'tutoring_review', 'New review',
          'A student rated your private session ' || p_rating || '/5.',
          jsonb_build_object('booking_id', v_booking.id));

  return v_review;
end;
$$;

revoke execute on function public.review_tutoring_session(uuid, integer, text) from public, anon;
grant execute on function public.review_tutoring_session(uuid, integer, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Discount codes
-- ---------------------------------------------------------------------------

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  code text not null check (code ~ '^[A-Z0-9_-]{3,30}$'),
  course_id uuid references public.courses(id) on delete cascade,
  percent_off integer not null check (percent_off between 1 and 100),
  max_redemptions integer check (max_redemptions > 0),
  redeemed_count integer not null default 0,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists coupons_code_idx on public.coupons (code);

alter table public.coupons enable row level security;

-- Creators see and manage their own codes; nobody can list other codes.
drop policy if exists "Creators read their coupons" on public.coupons;
create policy "Creators read their coupons"
  on public.coupons for select to authenticated using (creator_id = auth.uid());

drop policy if exists "Creators create coupons" on public.coupons;
create policy "Creators create coupons"
  on public.coupons for insert to authenticated
  with check (
    creator_id = auth.uid()
    and (course_id is null or exists (
      select 1 from public.courses c where c.id = coupons.course_id and c.teacher_id = auth.uid()
    ))
  );

drop policy if exists "Creators update coupons" on public.coupons;
create policy "Creators update coupons"
  on public.coupons for update to authenticated
  using (creator_id = auth.uid()) with check (creator_id = auth.uid());

drop policy if exists "Creators delete coupons" on public.coupons;
create policy "Creators delete coupons"
  on public.coupons for delete to authenticated using (creator_id = auth.uid());

-- The valid coupon for a code and course, or nothing. Used by checkout.
create or replace function public.find_coupon(p_code text, p_course_id uuid)
returns public.coupons
language sql
stable
security definer
set search_path = public
as $$
  select k.*
  from public.coupons k
  join public.courses c on c.id = p_course_id
  where k.code = upper(trim(p_code))
    and k.is_active
    and k.creator_id = c.teacher_id
    and (k.course_id is null or k.course_id = p_course_id)
    and (k.expires_at is null or k.expires_at > now())
    and (k.max_redemptions is null or k.redeemed_count < k.max_redemptions)
  limit 1;
$$;

revoke execute on function public.find_coupon(text, uuid) from public, anon, authenticated;

-- What learners may know about a code: whether it works and how much it saves.
create or replace function public.preview_coupon(p_code text, p_course_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select percent_off from public.find_coupon(p_code, p_course_id);
$$;

revoke execute on function public.preview_coupon(text, uuid) from public, anon;
grant execute on function public.preview_coupon(text, uuid) to authenticated;

alter table public.course_purchases
  add column if not exists coupon_id uuid references public.coupons(id) on delete set null,
  add column if not exists discount_cents integer not null default 0;

-- 100% codes create a free purchase.
alter table public.course_purchases drop constraint if exists course_purchases_amount_cents_check;
alter table public.course_purchases add constraint course_purchases_amount_cents_check check (amount_cents >= 0);

create or replace function public.redeem_coupon(p_coupon_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.coupons set redeemed_count = redeemed_count + 1 where id = p_coupon_id;
$$;

revoke execute on function public.redeem_coupon(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 8. Learning streaks and badges
-- ---------------------------------------------------------------------------

-- Days (UTC) on which a learner finished a lesson, took a quiz or handed in work.
create or replace function public.get_learning_streak(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with days as (
    select distinct d::date as day from (
      select completed_at as d from public.lesson_progress where user_id = p_user_id and completed and completed_at is not null
      union all
      select created_at from public.quiz_attempts where user_id = p_user_id
      union all
      select submitted_at from public.assignment_submissions where user_id = p_user_id
    ) activity
  ),
  runs as (
    select day, day - (row_number() over (order by day))::integer as run_id from days
  ),
  grouped as (
    select run_id, min(day) as first_day, max(day) as last_day, count(*)::integer as length
    from runs group by run_id
  )
  select jsonb_build_object(
    'current', coalesce((
      select length from grouped
      where last_day >= (now() at time zone 'utc')::date - 1
      order by last_day desc limit 1
    ), 0),
    'longest', coalesce((select max(length) from grouped), 0),
    'active_today', exists (select 1 from days where day = (now() at time zone 'utc')::date),
    'active_days', (select count(*) from days)
  );
$$;

revoke execute on function public.get_learning_streak(uuid) from public, anon;
grant execute on function public.get_learning_streak(uuid) to authenticated;

insert into public.badges (name, description, criteria, is_active)
select v.name, v.description, v.criteria::jsonb, true
from (values
  ('First Lesson', 'Finished your first lesson.', '{"type": "lessons_completed", "count": 1}'),
  ('3-Day Streak', 'Learned 3 days in a row.', '{"type": "streak", "count": 3}'),
  ('7-Day Streak', 'Learned 7 days in a row.', '{"type": "streak", "count": 7}'),
  ('30-Day Streak', 'Learned 30 days in a row.', '{"type": "streak", "count": 30}'),
  ('Quiz Ace', 'Got every answer right in a quiz.', '{"type": "quiz_perfect", "count": 1}'),
  ('Team Player', 'Finished a practical project with a team.', '{"type": "project_completed", "count": 1}')
) as v(name, description, criteria)
where not exists (select 1 from public.badges b where b.name = v.name);

create or replace function public.award_activity_badges(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_streak integer;
  v_lessons integer;
  v_perfect integer;
  v_projects integer;
  v_badge record;
  v_value integer;
begin
  v_streak := coalesce((public.get_learning_streak(p_user_id) ->> 'longest')::integer, 0);

  select count(*) into v_lessons from public.lesson_progress where user_id = p_user_id and completed;

  select count(*) into v_perfect from public.quiz_attempts
  where user_id = p_user_id and score = total and total > 0;

  select count(*) into v_projects
  from public.project_group_members m
  join public.project_groups g on g.id = m.group_id
  where m.user_id = p_user_id and g.status = 'completed';

  for v_badge in
    select b.* from public.badges b
    where b.is_active
      and b.criteria ->> 'type' in ('streak', 'lessons_completed', 'quiz_perfect', 'project_completed')
      and not exists (select 1 from public.user_badges ub where ub.user_id = p_user_id and ub.badge_id = b.id)
  loop
    v_value := case v_badge.criteria ->> 'type'
      when 'streak' then v_streak
      when 'lessons_completed' then v_lessons
      when 'quiz_perfect' then v_perfect
      when 'project_completed' then v_projects
    end;

    if v_value >= coalesce((v_badge.criteria ->> 'count')::integer, 1) then
      insert into public.user_badges (user_id, badge_id) values (p_user_id, v_badge.id)
      on conflict (user_id, badge_id) do nothing;

      if found then
        insert into public.notifications (user_id, type, title, body, data)
        values (p_user_id, 'badge_earned', 'Badge earned',
                'You earned the "' || v_badge.name || '" badge.',
                jsonb_build_object('badge_id', v_badge.id));
      end if;
    end if;
  end loop;
end;
$$;

revoke execute on function public.award_activity_badges(uuid) from public, anon, authenticated;

create or replace function public.award_badges_for_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'project_groups' then
    if new.status = 'completed' and old.status is distinct from 'completed' then
      perform public.award_activity_badges(m.user_id)
      from public.project_group_members m where m.group_id = new.id;
    end if;
  else
    perform public.award_activity_badges(new.user_id);
  end if;
  return new;
end;
$$;

revoke execute on function public.award_badges_for_row() from public, anon, authenticated;

drop trigger if exists lesson_progress_award_badges on public.lesson_progress;
create trigger lesson_progress_award_badges
  after insert or update of completed on public.lesson_progress
  for each row when (new.completed) execute function public.award_badges_for_row();

drop trigger if exists quiz_attempts_award_badges on public.quiz_attempts;
create trigger quiz_attempts_award_badges
  after insert on public.quiz_attempts
  for each row execute function public.award_badges_for_row();

drop trigger if exists assignment_submissions_award_badges on public.assignment_submissions;
create trigger assignment_submissions_award_badges
  after insert or update of submitted_at on public.assignment_submissions
  for each row execute function public.award_badges_for_row();

drop trigger if exists project_groups_award_badges on public.project_groups;
create trigger project_groups_award_badges
  after update of status on public.project_groups
  for each row execute function public.award_badges_for_row();
