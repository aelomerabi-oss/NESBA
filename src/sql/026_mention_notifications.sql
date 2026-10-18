-- 026: Mention notifications
--
-- notifications has no INSERT policy, so the client-side createNotification
-- used for @mentions always failed and nobody was notified. Rather than let
-- any user write notifications for others, the author of a post can notify
-- the users mentioned in it through this function (recent posts only,
-- at most 20 recipients, never the author).

create or replace function public.notify_post_mentions(p_post_id uuid, p_user_ids uuid[])
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_post public.posts;
  v_author text;
  v_count int;
begin
  if uid is null then raise exception 'Authentication required'; end if;

  select * into v_post from public.posts where id = p_post_id;
  if v_post.id is null or v_post.author_id is distinct from uid then
    raise exception 'Only the author can notify mentions for this post';
  end if;
  if v_post.created_at < now() - interval '15 minutes' then
    raise exception 'Mentions can only be sent right after posting';
  end if;

  select full_name into v_author from public.profiles where id = uid;

  insert into public.notifications (user_id, type, title, body, data)
  select distinct p.id, 'mention', 'You were mentioned',
         coalesce(v_author, 'Someone') || ' mentioned you in a post.',
         jsonb_build_object('post_id', p_post_id, 'actor_id', uid)
  from unnest((coalesce(p_user_ids, '{}'))[1:20]) as m(user_id)
  join public.profiles p on p.id = m.user_id
  where p.id <> uid
    and not exists (
      select 1 from public.notifications n
      where n.user_id = p.id and n.type = 'mention' and n.data->>'post_id' = p_post_id::text
    );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.notify_post_mentions(uuid, uuid[]) from public, anon;
grant execute on function public.notify_post_mentions(uuid, uuid[]) to authenticated;
