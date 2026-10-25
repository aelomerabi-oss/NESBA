-- 037: Invite a friend
--
-- Every member gets a personal invite link (/invite/<code>). When someone
-- signs up through it, we record who invited them, tell the inviter and award
-- badges at 1, 5 and 25 friends. Only brand-new accounts can be counted, so
-- existing members cannot be "invited" to farm badges.
--
-- Codes and referrals are written only by the functions below.

create table if not exists public.invite_codes (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.referrals (
  invitee_id uuid primary key references public.profiles(id) on delete cascade,
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (invitee_id <> inviter_id)
);

create index if not exists referrals_inviter_idx on public.referrals (inviter_id);

alter table public.invite_codes enable row level security;
alter table public.referrals enable row level security;

drop policy if exists "Users can read their own invite code" on public.invite_codes;
create policy "Users can read their own invite code"
  on public.invite_codes for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can read their own referrals" on public.referrals;
create policy "Users can read their own referrals"
  on public.referrals for select to authenticated
  using (inviter_id = auth.uid() or invitee_id = auth.uid());

revoke insert, update, delete on public.invite_codes from anon, authenticated;
revoke insert, update, delete on public.referrals from anon, authenticated;

-- Badges for inviting friends.
insert into public.badges (name, description, criteria)
values
  ('Friend Maker', 'A friend joined NESBA from your invite.', '{"type": "friends_invited", "count": 1}'),
  ('Community Builder', '5 friends joined NESBA from your invite.', '{"type": "friends_invited", "count": 5}'),
  ('NESBA Ambassador', '25 friends joined NESBA from your invite.', '{"type": "friends_invited", "count": 25}')
on conflict (name) do nothing;

-- Your invite code (created on first use) and how many friends joined.
create or replace function public.get_my_invite()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  if auth.uid() is null then
    raise exception 'Log in to invite friends.';
  end if;

  select code into v_code from public.invite_codes where user_id = auth.uid();

  while v_code is null loop
    begin
      insert into public.invite_codes (user_id, code)
      values (auth.uid(), substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
      returning code into v_code;
    exception when unique_violation then
      -- Another tab created it, or the random code was taken: look again.
      select code into v_code from public.invite_codes where user_id = auth.uid();
    end;
  end loop;

  return jsonb_build_object(
    'code', v_code,
    'joined', (select count(*) from public.referrals where inviter_id = auth.uid())
  );
end;
$$;

-- Name and photo of the person who sent an invite link, for its landing page.
create or replace function public.get_inviter(p_code text)
returns table (full_name text, avatar_url text)
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(nullif(trim(p.full_name), ''), 'A NESBA member'), p.avatar_url
  from public.invite_codes c
  join public.profiles p on p.id = c.user_id
  where c.code = lower(trim(p_code));
$$;

-- Called once after a new member signs up through an invite link.
-- Returns 'ok', 'not_found', 'own_code', 'already_invited' or 'not_new'.
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
    select 1 from public.profiles
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

revoke execute on function public.get_my_invite() from public, anon;
revoke execute on function public.claim_invite(text) from public, anon;
revoke execute on function public.get_inviter(text) from public;
grant execute on function public.get_my_invite() to authenticated;
grant execute on function public.claim_invite(text) to authenticated;
grant execute on function public.get_inviter(text) to anon, authenticated;
