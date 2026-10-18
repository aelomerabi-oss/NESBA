-- NESBA Phase 7: Creator analytics and live classes/events.
-- Run this once in the Supabase SQL Editor after migrations 001-008.
begin;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  meeting_url text,
  event_type text not null default 'live_class' check (event_type in ('live_class','workshop','webinar','event')),
  status text not null default 'scheduled' check (status in ('draft','scheduled','live','ended','cancelled')),
  capacity integer check (capacity is null or capacity > 0),
  host_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

create table if not exists public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  registered_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create index if not exists events_starts_at_idx on public.events(starts_at);
create index if not exists events_host_id_idx on public.events(host_id);
create index if not exists event_registrations_event_id_idx on public.event_registrations(event_id);

alter table public.events enable row level security;
alter table public.event_registrations enable row level security;

drop policy if exists "Published events are viewable" on public.events;
create policy "Published events are viewable" on public.events for select
using (status in ('scheduled','live') or auth.uid() = host_id);

drop policy if exists "Creators manage their own events" on public.events;
create policy "Creators manage their own events" on public.events for all
using (auth.uid() = host_id) with check (auth.uid() = host_id);

drop policy if exists "Users view their own event registrations" on public.event_registrations;
create policy "Users view their own event registrations" on public.event_registrations for select
using (auth.uid() = user_id);

drop policy if exists "Users register for events" on public.event_registrations;
create policy "Users register for events" on public.event_registrations for insert
with check (auth.uid() = user_id);

drop policy if exists "Users cancel their own event registrations" on public.event_registrations;
create policy "Users cancel their own event registrations" on public.event_registrations for delete
using (auth.uid() = user_id);

create or replace function public.get_creator_course_analytics(p_course_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  result jsonb;
begin
  if not exists (select 1 from public.courses where id = p_course_id and teacher_id = auth.uid()) then
    raise exception 'Not authorized to view course analytics';
  end if;
  select jsonb_build_object(
    'enrollments', count(*),
    'completions', count(*) filter (where progress_percent >= 100),
    'average_progress', coalesce(round(avg(progress_percent)), 0)
  ) into result from public.enrollments where course_id = p_course_id;
  return result;
end;
$$;

commit;
