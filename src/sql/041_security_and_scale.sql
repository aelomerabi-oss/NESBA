-- 041: Security review and readiness for many members at once
--
-- 1. Rate limits: a member can only post, comment, message, follow, report,
--    and so on a limited number of times per minute or hour. A script with a
--    stolen or throwaway account cannot flood the platform.
-- 2. Unsafe links: links members type may not use javascript:, data:,
--    vbscript: or file: (they could run code when someone taps them).
-- 3. Trigger and helper functions are not callable through the API.
-- 4. Speed: row-level security policies ask for the signed-in user once per
--    query instead of once per row, and every foreign key has an index.

-- 1. Rate limits ---------------------------------------------------------------
create table if not exists public.rate_limit_hits (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  action text not null,
  hit_at timestamptz not null default now()
);
create index if not exists rate_limit_hits_lookup on public.rate_limit_hits (user_id, action, hit_at desc);
alter table public.rate_limit_hits enable row level security;
revoke all on public.rate_limit_hits from anon, authenticated;

-- Counts one use of p_action by the signed-in member and refuses when they
-- already used it p_max times in the last p_seconds.
create or replace function public.check_rate_limit(p_action text, p_max integer, p_seconds integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uses integer;
begin
  if auth.uid() is null then
    return;
  end if;

  perform pg_advisory_xact_lock(hashtext(auth.uid()::text || p_action));

  select count(*) into v_uses from public.rate_limit_hits
  where user_id = auth.uid() and action = p_action
    and hit_at > now() - make_interval(secs => p_seconds);

  if v_uses >= p_max then
    raise exception 'You are doing that too often. Please wait a moment and try again.'
      using errcode = 'P0429';
  end if;

  insert into public.rate_limit_hits (user_id, action) values (auth.uid(), p_action);
end;
$$;

-- Trigger form: rate_limit_insert(action, max, seconds)
create or replace function public.rate_limit_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.check_rate_limit(tg_argv[0], tg_argv[1]::integer, tg_argv[2]::integer);
  return new;
end;
$$;

do $$
declare
  v_limit record;
begin
  for v_limit in
    select * from (values
      ('posts',                     20,    600),
      ('post_comments',             30,    300),
      ('post_likes',                90,     60),
      ('direct_messages',           60,     60),
      ('message_attachments',       30,     60),
      ('stories',                   20,    600),
      ('follows',                   60,     60),
      ('content_reports',           10,   3600),
      ('feedback',                   5,   3600),
      ('live_room_messages',        30,     60),
      ('course_reviews',            10,   3600),
      ('project_group_posts',       30,    300),
      ('project_groups',            10,   3600),
      ('event_registrations',       30,   3600),
      ('creator_applications',       5,  86400),
      ('organization_applications',  5,  86400)
    ) as l(tbl, max_uses, seconds)
  loop
    execute format('drop trigger if exists %I on public.%I', v_limit.tbl || '_rate_limit', v_limit.tbl);
    execute format(
      'create trigger %I before insert on public.%I for each row execute function public.rate_limit_insert(%L, %L, %L)',
      v_limit.tbl || '_rate_limit', v_limit.tbl, v_limit.tbl, v_limit.max_uses, v_limit.seconds
    );
  end loop;
end;
$$;

-- Trying coupon codes one after another.
create or replace function public.preview_coupon(p_code text, p_course_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.check_rate_limit('preview_coupon', 20, 600);
  return (select percent_off from public.find_coupon(p_code, p_course_id));
end;
$$;

-- Old hits are only needed for the longest window (one day).
select cron.unschedule('rate-limit-cleanup') where exists (select 1 from cron.job where jobname = 'rate-limit-cleanup');
select cron.schedule('rate-limit-cleanup', '17 * * * *',
  $$delete from public.rate_limit_hits where hit_at < now() - interval '1 day'$$);

-- 2. Unsafe links ----------------------------------------------------------------
do $$
declare
  v_col record;
begin
  for v_col in
    select table_name, column_name from information_schema.columns
    where table_schema = 'public' and data_type = 'text'
      and (column_name like '%url%' or column_name like '%website%' or column_name like '%link%')
  loop
    execute format('alter table public.%I drop constraint if exists %I', v_col.table_name, v_col.table_name || '_' || v_col.column_name || '_safe');
    execute format(
      'alter table public.%I add constraint %I check (%I !~* %L)',
      v_col.table_name, v_col.table_name || '_' || v_col.column_name || '_safe', v_col.column_name,
      '^[[:space:]]*(javascript|data|vbscript|file):'
    );
  end loop;
end;
$$;

-- 3. Functions the API should not expose -------------------------------------------
do $$
declare
  v_fn record;
begin
  for v_fn in
    select p.oid::regprocedure as sig from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and (p.prorettype = 'trigger'::regtype
           or p.proname in ('check_rate_limit', 'follow_up_recent', 'follow_up_nudge_ok', 'follow_up_send', 'follow_up_when'))
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', v_fn.sig);
  end loop;
end;
$$;

do $$
declare
  v_fn record;
begin
  for v_fn in select oid::regprocedure as sig from pg_proc where pronamespace = 'public'::regnamespace and proname = 'follow_up_when' loop
    execute format('alter function %s set search_path = public', v_fn.sig);
  end loop;
end;
$$;

-- 4a. Policies: auth.uid() once per query ---------------------------------------
-- Postgres re-runs a bare auth.uid() for every row it checks; wrapped in a
-- select it runs once. Same answer, much less work on big tables.
do $$
declare
  v_pol record;
  v_using text;
  v_check text;
  v_sql text;
begin
  for v_pol in
    select schemaname, tablename, policyname, qual, with_check from pg_policies
    where schemaname = 'public'
      and (qual ~ 'auth\.(uid|role|jwt)\(\)' or with_check ~ 'auth\.(uid|role|jwt)\(\)')
  loop
    v_using := v_pol.qual;
    v_check := v_pol.with_check;

    -- Leave already-wrapped calls alone, wrap the rest.
    v_using := regexp_replace(v_using, '\( SELECT auth\.(uid|role|jwt)\(\) AS (uid|role|jwt)\)', '@@\1@@', 'g');
    v_using := regexp_replace(v_using, 'auth\.(uid|role|jwt)\(\)', '(select auth.\1())', 'g');
    v_using := regexp_replace(v_using, '@@(uid|role|jwt)@@', '(select auth.\1())', 'g');
    v_check := regexp_replace(v_check, '\( SELECT auth\.(uid|role|jwt)\(\) AS (uid|role|jwt)\)', '@@\1@@', 'g');
    v_check := regexp_replace(v_check, 'auth\.(uid|role|jwt)\(\)', '(select auth.\1())', 'g');
    v_check := regexp_replace(v_check, '@@(uid|role|jwt)@@', '(select auth.\1())', 'g');

    v_sql := format('alter policy %I on %I.%I', v_pol.policyname, v_pol.schemaname, v_pol.tablename);
    if v_using is not null then v_sql := v_sql || format(' using (%s)', v_using); end if;
    if v_check is not null then v_sql := v_sql || format(' with check (%s)', v_check); end if;
    execute v_sql;
  end loop;
end;
$$;

-- 4b. An index for every foreign key -----------------------------------------
do $$
declare
  v_fk record;
begin
  for v_fk in
    select c.conrelid::regclass as tbl, cl.relname as tbl_name, a.attname as col
    from pg_constraint c
    join pg_class cl on cl.oid = c.conrelid
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'f' and cl.relnamespace = 'public'::regnamespace
      and array_length(c.conkey, 1) = 1
      and not exists (
        select 1 from pg_index i
        where i.indrelid = c.conrelid and i.indkey[0] = c.conkey[1]
      )
  loop
    execute format('create index if not exists %I on %s (%I)', left(v_fk.tbl_name || '_' || v_fk.col || '_idx', 63), v_fk.tbl, v_fk.col);
  end loop;
end;
$$;

-- A second, narrower copy of "Users can view active stories".
drop policy if exists "Stories are publicly readable" on public.stories;
