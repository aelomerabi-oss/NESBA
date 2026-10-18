-- 028: Live room moderation and chat
--
-- 1. Hosts can remove a participant (is_removed). Removed users cannot
--    rejoin (join_live_room) or get a LiveKit token.
-- 2. moderate_live_participant(room, user, action): host-only 'mute',
--    'remove' and 'restore'. The livekit-moderate edge function calls it and
--    then enforces the change on the LiveKit server.
-- 3. live_room_messages: chat for people in the room. Hosts and authors can
--    delete messages.
-- 4. Realtime for chat and participants.

alter table public.live_audio_participants
  add column if not exists is_removed boolean not null default false,
  add column if not exists removed_at timestamptz;

-- Participants cannot un-remove themselves; only the host changes is_removed.
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
    if new.is_removed and auth.uid() is distinct from v_host then
      raise exception 'Only the host can remove participants';
    end if;
  else
    if new.role is distinct from old.role and auth.uid() is distinct from v_host then
      raise exception 'Only the host can change participant roles';
    end if;
    if new.is_removed is distinct from old.is_removed and auth.uid() is distinct from v_host then
      raise exception 'Only the host can remove participants';
    end if;
  end if;

  return new;
end;
$$;

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

  if exists (
    select 1 from public.live_audio_participants
    where room_id = p_room_id and user_id = uid and is_removed
  ) then
    raise exception 'The host removed you from this session';
  end if;

  insert into public.live_audio_participants (room_id, user_id, role, hand_raised, is_muted, joined_at, left_at)
  values (p_room_id, uid, case when uid = v_room.host_id then 'host' else 'listener' end, false, true, now(), null)
  on conflict (room_id, user_id) do update
    set left_at = null, joined_at = now()
  returning * into v_part;

  return v_part;
end;
$$;

create or replace function public.moderate_live_participant(p_room_id uuid, p_user_id uuid, p_action text)
returns public.live_audio_participants
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.live_audio_rooms;
  v_part public.live_audio_participants;
begin
  select * into v_room from public.live_audio_rooms where id = p_room_id;
  if v_room.id is null then raise exception 'Live room not found'; end if;
  if v_room.host_id is distinct from auth.uid() then raise exception 'Only the host can moderate'; end if;
  if p_user_id = v_room.host_id then raise exception 'The host cannot be moderated'; end if;

  if p_action = 'mute' then
    update public.live_audio_participants
    set is_muted = true
    where room_id = p_room_id and user_id = p_user_id
    returning * into v_part;
  elsif p_action = 'remove' then
    update public.live_audio_participants
    set is_removed = true, removed_at = now(), left_at = now(),
        role = 'listener', hand_raised = false, is_muted = true
    where room_id = p_room_id and user_id = p_user_id
    returning * into v_part;
  elsif p_action = 'restore' then
    update public.live_audio_participants
    set is_removed = false, removed_at = null
    where room_id = p_room_id and user_id = p_user_id
    returning * into v_part;
  else
    raise exception 'Unknown moderation action %', p_action;
  end if;

  if v_part.id is null then raise exception 'Participant not found'; end if;

  return v_part;
end;
$$;

revoke execute on function public.moderate_live_participant(uuid, uuid, text) from public, anon;
grant execute on function public.moderate_live_participant(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Chat
-- ---------------------------------------------------------------------------

create table if not exists public.live_room_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.live_audio_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists live_room_messages_room_created_idx
  on public.live_room_messages (room_id, created_at);

alter table public.live_room_messages enable row level security;

-- In the room (joined at some point, not removed) or the host.
create or replace function public.can_access_live_room(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.live_audio_rooms r
    where r.id = p_room_id and r.host_id = auth.uid()
  ) or exists (
    select 1 from public.live_audio_participants p
    where p.room_id = p_room_id and p.user_id = auth.uid() and not p.is_removed
  );
$$;

revoke execute on function public.can_access_live_room(uuid) from public, anon;
grant execute on function public.can_access_live_room(uuid) to authenticated;

create policy live_room_messages_select
  on public.live_room_messages for select
  to authenticated
  using (public.can_access_live_room(room_id));

create policy live_room_messages_insert
  on public.live_room_messages for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.can_access_live_room(room_id)
    and exists (
      select 1 from public.live_audio_rooms r
      where r.id = room_id and r.status = 'live'
    )
  );

create policy live_room_messages_delete
  on public.live_room_messages for delete
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.live_audio_rooms r
      where r.id = room_id and r.host_id = auth.uid()
    )
  );

alter publication supabase_realtime add table public.live_room_messages;
alter publication supabase_realtime add table public.live_audio_participants;
alter publication supabase_realtime add table public.live_audio_rooms;
