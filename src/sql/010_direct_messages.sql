-- NESBA Phase 8: direct member messages. Run once after migrations 001-009.
begin;

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 4000),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);
create index if not exists direct_messages_sender_recipient_idx on public.direct_messages(sender_id, recipient_id, created_at desc);
create index if not exists direct_messages_recipient_sender_idx on public.direct_messages(recipient_id, sender_id, created_at desc);

alter table public.direct_messages enable row level security;
drop policy if exists "Members read their own messages" on public.direct_messages;
create policy "Members read their own messages" on public.direct_messages for select using (auth.uid() = sender_id or auth.uid() = recipient_id);
drop policy if exists "Members send messages" on public.direct_messages;
create policy "Members send messages" on public.direct_messages for insert with check (auth.uid() = sender_id);
drop policy if exists "Recipients mark messages read" on public.direct_messages;
create policy "Recipients mark messages read" on public.direct_messages for update using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);

commit;
