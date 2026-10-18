-- Run in Supabase SQL Editor

create table if not exists public.feedback (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete set null,
  category text check (category in ('bug', 'idea', 'praise', 'other')) default 'other',
  message text not null,
  created_at timestamp with time zone default now()
);

alter table public.feedback enable row level security;

create policy "Users can submit feedback" on public.feedback
  for insert with check (auth.uid() = user_id or user_id is null);

create policy "Users can view their own feedback" on public.feedback
  for select using (auth.uid() = user_id);
