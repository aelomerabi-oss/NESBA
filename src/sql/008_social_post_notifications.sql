-- NESBA 008 — Social post notifications
-- Creates notifications for followers when a public post is published.
-- Safe to run repeatedly.

begin;

create or replace function public.notify_followers_of_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, title, body, data)
  select
    f.follower_id,
    'new_post',
    'New post from ' || coalesce(new.author_name, 'a NESBA creator'),
    left(new.content, 180),
    jsonb_build_object('post_id', new.id)
  from public.follows f
  left join public.notification_preferences np on np.user_id = f.follower_id
  where
    f.follower_id <> new.author_id
    and f.notifications_enabled = true
    and (
      (f.followed_user_id = new.author_id)
      or
      (new.organization_id is not null and f.followed_organization_id = new.organization_id)
    )
    and coalesce(np.push_enabled, true) = true
    and coalesce(np.social_enabled, true) = true;

  return new;
end;
$$;

drop trigger if exists trg_notify_followers_of_post on public.posts;

create trigger trg_notify_followers_of_post
after insert on public.posts
for each row
when (new.visibility = 'public')
execute function public.notify_followers_of_post();

commit;
