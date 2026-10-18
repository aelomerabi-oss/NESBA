-- Corrected version — run this INSTEAD of the earlier 010 file.
-- Does not create or modify badges/user_badges (Codex already owns that schema).
-- Does not recreate certificates (already exists) — only inserts into it, using its real columns.

-- 1. Track per-lesson completion (new, safe to create)
create table if not exists public.lesson_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  module_id uuid references public.course_modules(id) on delete cascade not null,
  course_id uuid references public.courses(id) on delete cascade not null,
  completed boolean default true,
  completed_at timestamp with time zone default now(),
  unique (user_id, module_id)
);

alter table public.lesson_progress enable row level security;

drop policy if exists "Users can view their own lesson progress" on public.lesson_progress;
create policy "Users can view their own lesson progress" on public.lesson_progress
  for select using (auth.uid() = user_id);

drop policy if exists "Users can mark their own lessons complete" on public.lesson_progress;
create policy "Users can mark their own lessons complete" on public.lesson_progress
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own lesson progress" on public.lesson_progress;
create policy "Users can update their own lesson progress" on public.lesson_progress
  for update using (auth.uid() = user_id);

-- 2. Recompute progress + auto-issue certificate into Codex's existing certificates table
create or replace function public.recompute_course_progress()
returns trigger as $$
declare
  total_modules int;
  completed_modules int;
  new_percent int;
  cert_id_text text;
  existing_cert_count int;
begin
  select count(*) into total_modules from public.course_modules where course_id = new.course_id;
  select count(*) into completed_modules from public.lesson_progress
    where user_id = new.user_id and course_id = new.course_id and completed = true;

  if total_modules > 0 then
    new_percent := round((completed_modules::numeric / total_modules::numeric) * 100);
  else
    new_percent := 0;
  end if;

  update public.enrollments
    set progress_percent = new_percent
    where user_id = new.user_id and course_id = new.course_id;

  if new_percent >= 100 then
    select count(*) into existing_cert_count
      from public.certificates where user_id = new.user_id and course_id = new.course_id;

    if existing_cert_count = 0 then
      cert_id_text := 'NESBA-CERT-' || extract(year from now()) || '-' || lpad(floor(random() * 1000000)::text, 6, '0');
      insert into public.certificates (certificate_id, user_id, course_id, verification_token, metadata)
      values (cert_id_text, new.user_id, new.course_id, gen_random_uuid(), '{}'::jsonb);
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_lesson_progress_change on public.lesson_progress;
create trigger on_lesson_progress_change
  after insert or update on public.lesson_progress
  for each row execute procedure public.recompute_course_progress();
