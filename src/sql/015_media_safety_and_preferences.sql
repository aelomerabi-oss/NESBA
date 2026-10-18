-- Consolidated NESBA media, safety, and communication foundation.
-- Run after 001-011.
begin;

create table if not exists public.media_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  media_type text not null check (media_type in ('recording','podcast_episode','audio_lesson')),
  media_url text not null,
  thumbnail_url text,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  is_published boolean not null default false,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists media_items_creator_idx on public.media_items(creator_id,created_at desc);
create index if not exists media_items_published_idx on public.media_items(published_at desc) where is_published;

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  subject_type text not null check (subject_type in ('post','message','profile','event','media')),
  subject_id uuid,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now()
);

alter table public.media_items enable row level security;
alter table public.content_reports enable row level security;
drop policy if exists "Published media is viewable" on public.media_items;
create policy "Published media is viewable" on public.media_items for select using (is_published or auth.uid()=creator_id);
drop policy if exists "Creators manage their media" on public.media_items;
create policy "Creators manage their media" on public.media_items for all using (auth.uid()=creator_id) with check (auth.uid()=creator_id);
drop policy if exists "Members create reports" on public.content_reports;
create policy "Members create reports" on public.content_reports for insert with check (auth.uid()=reporter_id);
drop policy if exists "Members view their reports" on public.content_reports;
create policy "Members view their reports" on public.content_reports for select using (auth.uid()=reporter_id or exists (select 1 from public.profiles where id=auth.uid() and role='admin'));
drop policy if exists "Admins manage reports" on public.content_reports;
create policy "Admins manage reports" on public.content_reports for update using (exists (select 1 from public.profiles where id=auth.uid() and role='admin'));
commit;
