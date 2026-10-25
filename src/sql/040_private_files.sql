-- 040: Private lesson files and post media
--
-- The lesson-files and posts buckets were public, so anyone with a link
-- could open a paid lesson file or a photo from a followers-only post, and
-- the buckets could be listed. Both are now private; the app asks for a
-- signed link (src/lib/storage-url.js), which Storage only gives when the
-- rules below allow it. Each rule looks the file up in the table that uses
-- it, so that table's own row-level security decides:
--
--   lesson-files  <user>/<course>/<lesson>/<file>  lesson_content: the teacher
--                                                  and enrolled learners
--                 <user>/media/<file>              media_items: published, or
--                                                  the creator
--   posts         <user>/media/<file>              posts: whoever may see the post
--                 <user>/comments/<file>           comment photos: everyone,
--                                                  like the comments themselves
--
-- The uploader can always read their own folder.

update storage.buckets set public = false where id in ('lesson-files', 'posts');

drop policy if exists "Anyone can view lesson files" on storage.objects;
drop policy if exists "Lesson files for the teacher and enrolled learners" on storage.objects;
create policy "Lesson files for the teacher and enrolled learners"
  on storage.objects for select to public
  using (
    bucket_id = 'lesson-files'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (select 1 from public.lesson_content lc where lc.storage_path = objects.name)
      or exists (select 1 from public.media_items m where m.media_url like '%/lesson-files/' || objects.name)
    )
  );

drop policy if exists "Public can view post media" on storage.objects;
drop policy if exists "Post media follows the post's visibility" on storage.objects;
create policy "Post media follows the post's visibility"
  on storage.objects for select to public
  using (
    bucket_id = 'posts'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (storage.foldername(name))[2] = 'comments'
      or exists (
        select 1 from public.posts p
        where p.image_url like '%/posts/' || objects.name
           or p.video_url like '%/posts/' || objects.name
      )
    )
  );
