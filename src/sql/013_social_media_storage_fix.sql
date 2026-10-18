-- NESBA social media storage + stories compatibility migration
-- Safe to run on an existing NESBA project.

begin;

-- Stories used by the Home story bar and story viewer.
create table if not exists public.stories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  media_url text not null,
  media_type text not null default 'image',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists stories_user_created_idx
on public.stories(user_id, created_at desc);

create index if not exists stories_active_idx
on public.stories(expires_at desc);

create table if not exists public.story_views (
  id uuid default gen_random_uuid() primary key,
  story_id uuid not null references public.stories(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  unique(story_id, viewer_id)
);

alter table public.stories enable row level security;
alter table public.story_views enable row level security;

drop policy if exists "Stories are publicly readable" on public.stories;
create policy "Stories are publicly readable"
on public.stories for select
using (expires_at > now());

drop policy if exists "Users can create their own stories" on public.stories;
create policy "Users can create their own stories"
on public.stories for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own stories" on public.stories;
create policy "Users can update their own stories"
on public.stories for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own stories" on public.stories;
create policy "Users can delete their own stories"
on public.stories for delete
using (auth.uid() = user_id);

drop policy if exists "Users can view story views" on public.story_views;
create policy "Users can view story views"
on public.story_views for select
using (
  auth.uid() = viewer_id
  or exists (
    select 1 from public.stories s
    where s.id = story_views.story_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "Users can create story views" on public.story_views;
create policy "Users can create story views"
on public.story_views for insert
with check (auth.uid() = viewer_id);

-- Public post media bucket.
insert into storage.buckets (id, name, public)
values ('posts', 'posts', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Public can view post media" on storage.objects;
create policy "Public can view post media"
on storage.objects for select
using (bucket_id = 'posts');

drop policy if exists "Users can upload post media" on storage.objects;
create policy "Users can upload post media"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'posts'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update own post media" on storage.objects;
create policy "Users can update own post media"
on storage.objects for update to authenticated
using (
  bucket_id = 'posts'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'posts'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete own post media" on storage.objects;
create policy "Users can delete own post media"
on storage.objects for delete to authenticated
using (
  bucket_id = 'posts'
  and (storage.foldername(name))[1] = auth.uid()::text
);

commit;
