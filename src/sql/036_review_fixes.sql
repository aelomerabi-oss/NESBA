-- 036: Fixes from the October 2026 security review
--
-- 1. Private message attachments could be listed and opened by any signed-in
--    user. Files are stored as <sender id>/<message id>/<file>; now only the
--    sender and the recipient of that message can read them, and uploads must
--    go into the sender's own folder for a message they sent.
-- 2. Users could write lesson_progress rows directly and so mark every lesson
--    of a course complete (and earn its certificate) without opening them.
--    The app only reads these rows; completions go through
--    mark_lesson_complete(), which checks enrollment and locked lessons.

-- 1. Message attachments ------------------------------------------------------

drop policy if exists "Users can read message media" on storage.objects;
create policy "Users can read message media"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'message-media'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.direct_messages m
        where m.id::text = (storage.foldername(name))[2]
          and (m.sender_id = auth.uid() or m.recipient_id = auth.uid())
      )
    )
  );

drop policy if exists "Users can upload message media" on storage.objects;
create policy "Users can upload message media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'message-media'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.direct_messages m
      where m.id::text = (storage.foldername(name))[2]
        and m.sender_id = auth.uid()
    )
  );

-- 2. Lesson progress is written only by mark_lesson_complete() -----------------

drop policy if exists "Users can create lesson progress" on public.lesson_progress;
drop policy if exists "Users can mark their own lessons complete" on public.lesson_progress;
drop policy if exists "Users can update lesson progress" on public.lesson_progress;
drop policy if exists "Users can update their own lesson progress" on public.lesson_progress;
drop policy if exists "Users can view their own lesson progress" on public.lesson_progress;
revoke insert, update, delete on public.lesson_progress from anon, authenticated;
