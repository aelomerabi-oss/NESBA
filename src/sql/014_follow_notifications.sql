-- NESBA 012 — User follow notifications
-- Creates a notification when one user follows another user.
-- Safe to run more than once.

begin;

create or replace function public.notify_user_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  follower_name text;
begin

  if new.followed_user_id is null then
    return new;
  end if;

  if new.notifications_enabled = false then
    return new;
  end if;

  select coalesce(
    nullif(trim(full_name), ''),
    'A NESBA member'
  )
  into follower_name
  from public.profiles
  where id = new.follower_id;

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    data
  )
  values (
    new.followed_user_id,
    'follow',
    'New follower',
    follower_name || ' started following you.',
    jsonb_build_object(
      'follower_id', new.follower_id,
      'followed_user_id', new.followed_user_id,
      'follow_id', new.id
    )
  );

  return new;
end;
$$;

drop trigger if exists user_follow_notification
on public.follows;

create trigger user_follow_notification
after insert on public.follows
for each row
execute function public.notify_user_follow();

commit;