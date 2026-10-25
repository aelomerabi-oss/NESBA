-- 039: Fixes from the insecure-direct-object-reference (IDOR) review
--
-- 1. Email addresses: profiles are public, and so was the email column, so
--    anyone (even without an account) could list every member's email.
--    Members' own email comes from their login session instead.
-- 2. Live rooms: a participant could move their own row to another room
--    (for example a paid workshop) and get a LiveKit token for it, and a
--    removed participant could delete their row and join again.
-- 3. Organizations: anyone could attach a course, event, post or media item
--    to any organization, so it showed on that organization's page.
-- 4. Courses: anyone could create and publish a course, although teachers
--    are reviewed first.
-- 5. Lesson videos: course_modules.video_url is readable by everyone for a
--    published course. The app keeps lesson videos in lesson_content, which
--    only enrolled learners can read; this column must stay empty.
-- 6. Invites: claim_invite trusted profiles.created_at, which members can
--    edit; it now uses the account's real creation time.

-- 1. Email addresses ---------------------------------------------------------
-- New profile columns must be added to this list to be readable.
revoke select on public.profiles from anon, authenticated;
grant select (
  id, full_name, avatar_url, bio, role, is_premium, created_at, updated_at,
  onboarded, goals, verification_status, requested_role, expertise, experience
) on public.profiles to anon, authenticated;

-- 2. Live rooms --------------------------------------------------------------
create or replace function public.guard_live_participant_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.live_audio_rooms;
begin
  select * into v_room from public.live_audio_rooms where id = new.room_id;

  if tg_op = 'INSERT' then
    if new.role <> 'listener' and auth.uid() is distinct from v_room.host_id then
      raise exception 'Only the host can assign the % role', new.role;
    end if;
    if new.is_removed and auth.uid() is distinct from v_room.host_id then
      raise exception 'Only the host can remove participants';
    end if;
    if auth.uid() is not null
       and auth.uid() is distinct from v_room.host_id
       and not exists (
         select 1 from public.event_registrations
         where event_id = v_room.event_id and user_id = auth.uid()
       ) then
      raise exception 'Register for this event to join';
    end if;
  else
    if new.room_id is distinct from old.room_id or new.user_id is distinct from old.user_id then
      raise exception 'A participant cannot be moved to another room or person';
    end if;
    if new.role is distinct from old.role and auth.uid() is distinct from v_room.host_id then
      raise exception 'Only the host can change participant roles';
    end if;
    if new.is_removed is distinct from old.is_removed and auth.uid() is distinct from v_room.host_id then
      raise exception 'Only the host can remove participants';
    end if;
  end if;

  return new;
end;
$$;

-- Leaving sets left_at; deleting the row would erase a removal.
drop policy if exists "Users can leave live audio rooms" on public.live_audio_participants;
revoke delete on public.live_audio_participants from anon, authenticated;

-- 3. Organizations -----------------------------------------------------------
create or replace function public.guard_organization_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.organization_id is null or auth.uid() is null then
    return new;
  end if;

  if tg_op = 'UPDATE' and new.organization_id is not distinct from old.organization_id then
    return new;
  end if;

  if exists (select 1 from public.organizations o where o.id = new.organization_id and o.owner_id = auth.uid())
     or exists (
       select 1 from public.organization_members m
       where m.organization_id = new.organization_id and m.user_id = auth.uid()
         and m.member_role in ('owner', 'admin', 'editor')
     )
     or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    return new;
  end if;

  raise exception 'You can only publish for an organization you manage';
end;
$$;

drop trigger if exists courses_guard_organization on public.courses;
create trigger courses_guard_organization before insert or update of organization_id on public.courses
  for each row execute function public.guard_organization_link();

drop trigger if exists events_guard_organization on public.events;
create trigger events_guard_organization before insert or update of organization_id on public.events
  for each row execute function public.guard_organization_link();

drop trigger if exists posts_guard_organization on public.posts;
create trigger posts_guard_organization before insert or update of organization_id on public.posts
  for each row execute function public.guard_organization_link();

drop trigger if exists media_items_guard_organization on public.media_items;
create trigger media_items_guard_organization before insert or update of organization_id on public.media_items
  for each row execute function public.guard_organization_link();

-- 4. Only approved creators create courses -----------------------------------
drop policy if exists "Only approved creators can create courses" on public.courses;
create policy "Only approved creators can create courses"
  on public.courses as restrictive for insert to public
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('teacher', 'mentor', 'organization', 'admin')
    )
  );

-- 5. Lesson videos stay in lesson_content --------------------------------------
alter table public.course_modules drop constraint if exists course_modules_video_in_lesson_content;
alter table public.course_modules
  add constraint course_modules_video_in_lesson_content check (video_url is null);

-- 6. Invites use the real account age ------------------------------------------
create or replace function public.claim_invite(p_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inviter uuid;
  v_name text;
  v_joined integer;
  v_badge record;
begin
  if auth.uid() is null then
    raise exception 'Log in first.';
  end if;

  select user_id into v_inviter from public.invite_codes where code = lower(trim(p_code));

  if v_inviter is null then
    return 'not_found';
  end if;

  if v_inviter = auth.uid() then
    return 'own_code';
  end if;

  if exists (select 1 from public.referrals where invitee_id = auth.uid()) then
    return 'already_invited';
  end if;

  if not exists (
    select 1 from auth.users
    where id = auth.uid() and created_at > now() - interval '7 days'
  ) then
    return 'not_new';
  end if;

  insert into public.referrals (invitee_id, inviter_id) values (auth.uid(), v_inviter)
  on conflict (invitee_id) do nothing;

  if not found then
    return 'already_invited';
  end if;

  select coalesce(nullif(trim(full_name), ''), 'A friend') into v_name
  from public.profiles where id = auth.uid();

  insert into public.notifications (user_id, type, title, body, data)
  values (v_inviter, 'invite_joined', 'Your friend joined NESBA',
          v_name || ' joined NESBA from your invite.',
          jsonb_build_object('friend_id', auth.uid()));

  select count(*) into v_joined from public.referrals where inviter_id = v_inviter;

  for v_badge in
    select b.id, b.name from public.badges b
    where b.is_active
      and b.criteria ->> 'type' = 'friends_invited'
      and coalesce((b.criteria ->> 'count')::integer, 1) <= v_joined
      and not exists (select 1 from public.user_badges ub where ub.user_id = v_inviter and ub.badge_id = b.id)
  loop
    insert into public.user_badges (user_id, badge_id) values (v_inviter, v_badge.id)
    on conflict (user_id, badge_id) do nothing;

    if found then
      insert into public.notifications (user_id, type, title, body, data)
      values (v_inviter, 'badge_earned', 'Badge earned',
              'You earned the "' || v_badge.name || '" badge.',
              jsonb_build_object('badge_id', v_badge.id));
    end if;
  end loop;

  return 'ok';
end;
$$;
