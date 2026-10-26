-- 042: Launch waitlist
--
-- People leave their email on /waitlist to hear when NESBA launches. Each
-- sign-up is sent on to the beehiiv newsletter by the waitlist-sync edge
-- function, once BEEHIIV_API_KEY and BEEHIIV_PUBLICATION_ID are set in the
-- Supabase dashboard (Edge Functions > Secrets). Until then sign-ups wait
-- here; the hourly job sends any that were not sent yet.
--
-- Visitors cannot read the list. Admins can, and can export it from the
-- Supabase table editor.

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254),
  full_name text check (length(full_name) <= 120),
  interest text not null default 'learn' check (interest in ('learn', 'teach', 'organization')),
  source text check (length(source) <= 60),
  created_at timestamptz not null default now(),
  beehiiv_synced_at timestamptz,
  beehiiv_error text
);

alter table public.waitlist enable row level security;
revoke all on public.waitlist from anon, authenticated;
grant select on public.waitlist to authenticated;

drop policy if exists "Admins read the waitlist" on public.waitlist;
create policy "Admins read the waitlist"
  on public.waitlist for select to authenticated
  using (exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));

-- Join the waitlist. Answers 'ok' also when the email is already on it, so
-- the form does not reveal who signed up. Five sign-ups per network per hour.
create or replace function public.join_waitlist(
  p_email text,
  p_name text default null,
  p_interest text default 'learn',
  p_source text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_ip text := split_part(coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''), ',', 1);
  v_key uuid := md5('waitlist:' || v_ip)::uuid;
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 254 then
    raise exception 'Enter a valid email address.';
  end if;

  if (select count(*) from public.rate_limit_hits
      where user_id = v_key and action = 'waitlist' and hit_at > now() - interval '1 hour') >= 5 then
    raise exception 'Too many sign-ups from this network. Please try again later.' using errcode = 'P0429';
  end if;
  insert into public.rate_limit_hits (user_id, action) values (v_key, 'waitlist');

  insert into public.waitlist (email, full_name, interest, source)
  values (
    v_email,
    nullif(left(trim(p_name), 120), ''),
    case when p_interest in ('learn', 'teach', 'organization') then p_interest else 'learn' end,
    nullif(left(trim(p_source), 60), '')
  )
  on conflict (email) do nothing;

  return 'ok';
end;
$$;

grant execute on function public.join_waitlist(text, text, text, text) to anon, authenticated;

-- How many people are waiting (shown on the page).
create or replace function public.waitlist_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer from public.waitlist;
$$;

grant execute on function public.waitlist_count() to anon, authenticated;

-- Send each new sign-up to beehiiv.
create or replace function public.queue_waitlist_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://xrgyqsfnaquypahiyqzb.supabase.co/functions/v1/waitlist-sync',
    body := jsonb_build_object('waitlist_id', new.id),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  return new;
end;
$$;

revoke execute on function public.queue_waitlist_sync() from public, anon, authenticated;

drop trigger if exists waitlist_queue_sync on public.waitlist;
create trigger waitlist_queue_sync after insert on public.waitlist
  for each row execute function public.queue_waitlist_sync();

-- Retry anything not sent yet (for example before the beehiiv key was added).
select cron.unschedule('waitlist-sync') where exists (select 1 from cron.job where jobname = 'waitlist-sync');
select cron.schedule('waitlist-sync', '40 * * * *', $$
  select net.http_post(
    url := 'https://xrgyqsfnaquypahiyqzb.supabase.co/functions/v1/waitlist-sync',
    body := '{}'::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb
  )
  where exists (select 1 from public.waitlist where beehiiv_synced_at is null)
$$);
