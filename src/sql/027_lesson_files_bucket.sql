-- 027: lesson-files storage bucket
--
-- lib/lesson-file-upload.js uploads course lesson files (and creator media
-- recordings) to a "lesson-files" bucket that did not exist, so every
-- lesson/media file upload failed. Files are served by public URL, so the
-- bucket is public; uploads are limited to a folder named after the user.

insert into storage.buckets (id, name, public)
values ('lesson-files', 'lesson-files', true)
on conflict (id) do update set public = true;

create policy "Anyone can view lesson files"
  on storage.objects for select
  using (bucket_id = 'lesson-files');

create policy "Users can upload own lesson files"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'lesson-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update own lesson files"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'lesson-files' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'lesson-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete own lesson files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'lesson-files' and (storage.foldername(name))[1] = auth.uid()::text);
