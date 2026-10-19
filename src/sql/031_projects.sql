-- 031: Practical projects
--
-- Students form a project group around what they learned (optionally tied to
-- a course), discuss it and track the work on a shared task board.
--
-- project_groups          the project itself; anyone can browse open ones
-- project_group_members   who is in it ('owner' or 'member')
-- project_group_posts     the discussion feed, members only
-- project_tasks           the task board (todo / doing / done), members only
--
-- Membership checks go through is_project_member(), which runs as definer so
-- the member policies do not query themselves (see 024 for that bug).

create table if not exists public.project_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 3 and 80),
  description text check (char_length(description) <= 2000),
  course_id uuid references public.courses(id) on delete set null,
  skills text[] not null default '{}',
  max_members integer not null default 8 check (max_members between 2 and 50),
  is_open boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.project_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null default 'member' check (member_role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create table if not exists public.project_group_posts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.project_groups(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 4000),
  link_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.project_groups(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 200),
  status text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  assignee_id uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_group_members_user_idx on public.project_group_members (user_id);
create index if not exists project_group_posts_group_idx on public.project_group_posts (group_id, created_at desc);
create index if not exists project_tasks_group_idx on public.project_tasks (group_id, created_at);

create or replace function public.is_project_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.project_group_members
    where group_id = p_group_id and user_id = auth.uid()
  );
$$;

revoke execute on function public.is_project_member(uuid) from public, anon;
grant execute on function public.is_project_member(uuid) to authenticated;

-- The creator becomes the owner member.
create or replace function public.add_project_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.project_group_members (group_id, user_id, member_role)
  values (new.id, new.owner_id, 'owner')
  on conflict (group_id, user_id) do update set member_role = 'owner';
  return new;
end;
$$;

drop trigger if exists project_groups_add_owner on public.project_groups;
create trigger project_groups_add_owner
  after insert on public.project_groups
  for each row execute function public.add_project_owner();

-- Joining is refused when the project is closed or full.
create or replace function public.guard_project_join()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group public.project_groups;
  v_count integer;
begin
  if new.member_role = 'owner' then
    return new;
  end if;

  select * into v_group from public.project_groups where id = new.group_id;

  if not v_group.is_open then
    raise exception 'This project is not accepting new members';
  end if;

  select count(*) into v_count from public.project_group_members where group_id = new.group_id;

  if v_count >= v_group.max_members then
    raise exception 'This project is full';
  end if;

  return new;
end;
$$;

drop trigger if exists project_group_members_guard on public.project_group_members;
create trigger project_group_members_guard
  before insert on public.project_group_members
  for each row execute function public.guard_project_join();

alter table public.project_groups enable row level security;
alter table public.project_group_members enable row level security;
alter table public.project_group_posts enable row level security;
alter table public.project_tasks enable row level security;

-- Groups: anyone can browse; signed-in users create their own; owners manage.
drop policy if exists "Projects are viewable by everyone" on public.project_groups;
create policy "Projects are viewable by everyone"
  on public.project_groups for select to anon, authenticated using (true);

drop policy if exists "Users create their own projects" on public.project_groups;
create policy "Users create their own projects"
  on public.project_groups for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists "Owners update their projects" on public.project_groups;
create policy "Owners update their projects"
  on public.project_groups for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "Owners delete their projects" on public.project_groups;
create policy "Owners delete their projects"
  on public.project_groups for delete to authenticated using (owner_id = auth.uid());

-- Members: visible to everyone (team list); users join or leave themselves;
-- the owner can remove members.
drop policy if exists "Project members are viewable" on public.project_group_members;
create policy "Project members are viewable"
  on public.project_group_members for select to anon, authenticated using (true);

drop policy if exists "Users join projects as members" on public.project_group_members;
create policy "Users join projects as members"
  on public.project_group_members for insert to authenticated
  with check (user_id = auth.uid() and member_role = 'member');

drop policy if exists "Members leave or owners remove" on public.project_group_members;
create policy "Members leave or owners remove"
  on public.project_group_members for delete to authenticated
  using (
    (user_id = auth.uid() and member_role <> 'owner')
    or exists (
      select 1 from public.project_groups g
      where g.id = project_group_members.group_id and g.owner_id = auth.uid()
    )
  );

-- Discussion: members read and write; authors and the owner delete.
drop policy if exists "Members read project posts" on public.project_group_posts;
create policy "Members read project posts"
  on public.project_group_posts for select to authenticated
  using (public.is_project_member(group_id));

drop policy if exists "Members write project posts" on public.project_group_posts;
create policy "Members write project posts"
  on public.project_group_posts for insert to authenticated
  with check (author_id = auth.uid() and public.is_project_member(group_id));

drop policy if exists "Authors or owners delete project posts" on public.project_group_posts;
create policy "Authors or owners delete project posts"
  on public.project_group_posts for delete to authenticated
  using (
    author_id = auth.uid()
    or exists (
      select 1 from public.project_groups g
      where g.id = project_group_posts.group_id and g.owner_id = auth.uid()
    )
  );

-- Tasks: members read, add and move tasks; creators and the owner delete.
drop policy if exists "Members read project tasks" on public.project_tasks;
create policy "Members read project tasks"
  on public.project_tasks for select to authenticated
  using (public.is_project_member(group_id));

drop policy if exists "Members add project tasks" on public.project_tasks;
create policy "Members add project tasks"
  on public.project_tasks for insert to authenticated
  with check (created_by = auth.uid() and public.is_project_member(group_id));

drop policy if exists "Members update project tasks" on public.project_tasks;
create policy "Members update project tasks"
  on public.project_tasks for update to authenticated
  using (public.is_project_member(group_id))
  with check (public.is_project_member(group_id));

drop policy if exists "Creators or owners delete project tasks" on public.project_tasks;
create policy "Creators or owners delete project tasks"
  on public.project_tasks for delete to authenticated
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.project_groups g
      where g.id = project_tasks.group_id and g.owner_id = auth.uid()
    )
  );
