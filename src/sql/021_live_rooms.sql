-- 021: Live audio rooms
--
-- Rooms belong to an event. Only the event host can start or end a room and
-- change participant roles. Everyone else joins as a listener; the host can
-- promote a listener to speaker. The livekit-token edge function reads the
-- participant role to decide whether the user may publish audio.
--
-- Before this migration, the participants INSERT/UPDATE policies only checked
-- user_id, so any user could add themselves as 'host' or 'speaker'. The
-- guard trigger below closes that: role changes require the room host.

-- ---------------------------------------------------------------------------
-- Role guard
-- ---------------------------------------------------------------------------

create or replace function public.guard_live_participant_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_host uuid;
begin
  select host_id into v_host from public.live_audio_rooms where id = new.room_id;

  if tg_op = 'INSERT' then
    if new.role <> 'listener' and auth.uid() is distinct from v_host then
      raise exception 'Only the host can assign the % role', new.role;
    end if;
  elsif new.role is distinct from old.role and auth.uid() is distinct from v_host then
    raise exception 'Only the host can change participant roles';
  end if;

  return new;
end;
$$;

create trigger guard_live_participant_role
  before insert or update on public.live_audio_participants
  for each row execute function public.guard_live_participant_role();

-- ---------------------------------------------------------------------------
-- start_live_room: host opens (or reopens) the room for an event
-- ---------------------------------------------------------------------------

create or replace function public.start_live_room(p_event_id uuid)
returns public.live_audio_rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_event public.events;
  v_room public.live_audio_rooms;
begin
  if uid is null then raise exception 'Authentication required'; end if;

  select * into v_event from public.events where id = p_event_id;
  if v_event.id is null then raise exception 'Event not found'; end if;
  if v_event.host_id is distinct from uid then raise exception 'Only the event host can go live'; end if;
  if v_event.status in ('ended', 'cancelled') then raise exception 'This event has %', v_event.status; end if;

  select * into v_room
  from public.live_audio_rooms
  where event_id = p_event_id and status <> 'ended'
  order by created_at desc
  limit 1;

  if v_room.id is null then
    insert into public.live_audio_rooms (event_id, host_id, room_name, status, started_at)
    values (p_event_id, uid, 'nesba-' || replace(gen_random_uuid()::text, '-', ''), 'live', now())
    returning * into v_room;
  else
    update public.live_audio_rooms
    set status = 'live', started_at = coalesce(started_at, now())
    where id = v_room.id
    returning * into v_room;
  end if;

  update public.events set status = 'live', updated_at = now() where id = p_event_id;

  insert into public.live_audio_participants (room_id, user_id, role, is_muted, joined_at, left_at)
  values (v_room.id, uid, 'host', false, now(), null)
  on conflict (room_id, user_id) do update
    set role = 'host', left_at = null, joined_at = now();

  -- Tell registered attendees the session has started.
  insert into public.notifications (user_id, type, title, body, data)
  select r.user_id, 'event_live', 'Live now',
         coalesce(v_event.title, 'A session you registered for') || ' has started.',
         jsonb_build_object('event_id', p_event_id, 'room_id', v_room.id)
  from public.event_registrations r
  where r.event_id = p_event_id and r.user_id <> uid;

  return v_room;
end;
$$;

-- ---------------------------------------------------------------------------
-- join_live_room: attendee joins a live room as listener (host keeps host)
-- ---------------------------------------------------------------------------

create or replace function public.join_live_room(p_room_id uuid)
returns public.live_audio_participants
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_room public.live_audio_rooms;
  v_part public.live_audio_participants;
begin
  if uid is null then raise exception 'Authentication required'; end if;

  select * into v_room from public.live_audio_rooms where id = p_room_id;
  if v_room.id is null then raise exception 'Live room not found'; end if;
  if v_room.status <> 'live' then raise exception 'This live session is not running'; end if;

  if uid <> v_room.host_id and not exists (
    select 1 from public.event_registrations
    where event_id = v_room.event_id and user_id = uid
  ) then
    raise exception 'Register for this event to join';
  end if;

  insert into public.live_audio_participants (room_id, user_id, role, hand_raised, is_muted, joined_at, left_at)
  values (p_room_id, uid, case when uid = v_room.host_id then 'host' else 'listener' end, false, true, now(), null)
  on conflict (room_id, user_id) do update
    set left_at = null, joined_at = now()
  returning * into v_part;

  return v_part;
end;
$$;

-- ---------------------------------------------------------------------------
-- set_live_participant_role: host promotes/demotes speakers
-- ---------------------------------------------------------------------------

create or replace function public.set_live_participant_role(p_room_id uuid, p_user_id uuid, p_role text)
returns public.live_audio_participants
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.live_audio_rooms;
  v_part public.live_audio_participants;
begin
  if p_role not in ('listener', 'speaker') then raise exception 'Role must be listener or speaker'; end if;

  select * into v_room from public.live_audio_rooms where id = p_room_id;
  if v_room.id is null then raise exception 'Live room not found'; end if;
  if v_room.host_id is distinct from auth.uid() then raise exception 'Only the host can change roles'; end if;
  if p_user_id = v_room.host_id then raise exception 'The host role cannot be changed'; end if;

  update public.live_audio_participants
  set role = p_role, hand_raised = false
  where room_id = p_room_id and user_id = p_user_id
  returning * into v_part;

  if v_part.id is null then raise exception 'Participant not found'; end if;

  return v_part;
end;
$$;

-- ---------------------------------------------------------------------------
-- end_live_room: host closes the room and the event
-- ---------------------------------------------------------------------------

create or replace function public.end_live_room(p_room_id uuid)
returns public.live_audio_rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.live_audio_rooms;
begin
  select * into v_room from public.live_audio_rooms where id = p_room_id;
  if v_room.id is null then raise exception 'Live room not found'; end if;
  if v_room.host_id is distinct from auth.uid() then raise exception 'Only the host can end the session'; end if;

  update public.live_audio_rooms
  set status = 'ended', ended_at = now()
  where id = p_room_id
  returning * into v_room;

  update public.live_audio_participants
  set left_at = coalesce(left_at, now()), hand_raised = false
  where room_id = p_room_id;

  update public.events set status = 'ended', updated_at = now() where id = v_room.event_id;

  return v_room;
end;
$$;

revoke execute on function public.guard_live_participant_role() from public, anon, authenticated;

revoke execute on function public.start_live_room(uuid) from public, anon;
revoke execute on function public.join_live_room(uuid) from public, anon;
revoke execute on function public.set_live_participant_role(uuid, uuid, text) from public, anon;
revoke execute on function public.end_live_room(uuid) from public, anon;

grant execute on function public.start_live_room(uuid) to authenticated;
grant execute on function public.join_live_room(uuid) to authenticated;
grant execute on function public.set_live_participant_role(uuid, uuid, text) to authenticated;
grant execute on function public.end_live_room(uuid) to authenticated;
