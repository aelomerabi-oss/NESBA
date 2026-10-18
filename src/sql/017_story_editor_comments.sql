-- NESBA rich stories + rich comments/replies.
-- Adds story editor metadata, comment replies/attachments,
-- and guarantees post/story storage buckets and policies exist.

begin;

alter table public.stories add column if not exists caption text;
alter table public.stories add column if not exists filter_name text default 'normal';
alter table public.stories add column if not exists overlay_text text;
alter table public.stories add column if not exists location_text text;
alter table public.stories add column if not exists audio_url text;
alter table public.stories add column if not exists audio_name text;

alter table public.post_comments add column if not exists parent_id uuid references public.post_comments(id) on delete cascade;
alter table public.post_comments add column if not exists media_url text;
alter table public.post_comments add column if not exists media_type text;

create index if not exists post_comments_parent_idx
on public.post_comments(parent_id);

insert into storage.buckets (id, name, public)
values ('posts', 'posts', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('stories', 'stories', true)
on conflict (id) do update set public = true;

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

drop policy if exists "Users can upload story media" on storage.objects;
create policy "Users can upload story media"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'stories'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can view story media" on storage.objects;
create policy "Users can view story media"
on storage.objects for select
using (bucket_id = 'stories');

drop policy if exists "Users can update story media" on storage.objects;
create policy "Users can update story media"
on storage.objects for update to authenticated
using (
  bucket_id = 'stories'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'stories'
  and (storage.foldername(name))[1] = auth.uid()::text
);

commit;
