-- NESBA 004 — Core social, creator, achievement and notification schema
-- Safe to run after 003_courses.sql.
-- This migration is intentionally idempotent: it can be run more than once.

begin;

-- ============================================================
-- 1. ORGANIZATIONS
-- ============================================================

create table if not exists public.organizations (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references public.profiles(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  logo_url text,
  cover_url text,
  website_url text,
  organization_type text,
  location text,
  verification_status text not null default 'pending'
    check (verification_status in ('pending','verified','rejected','suspended')),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null default 'member'
    check (member_role in ('owner','admin','editor','member')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

-- ============================================================
-- 2. CREATOR APPLICATIONS
-- ============================================================

create table if not exists public.creator_applications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  requested_role text not null
    check (requested_role in ('teacher','mentor','organization')),
  organization_name text,
  organization_type text,
  expertise text,
  experience text,
  reason text,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','suspended')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  reviewer_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 3. FOLLOWS
-- ============================================================

create table if not exists public.follows (
  id uuid default gen_random_uuid() primary key,
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followed_user_id uuid references public.profiles(id) on delete cascade,
  followed_organization_id uuid references public.organizations(id) on delete cascade,
  notifications_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  constraint follows_exactly_one_target check (
    (followed_user_id is not null and followed_organization_id is null)
    or
    (followed_user_id is null and followed_organization_id is not null)
  )
);

create unique index if not exists follows_user_unique
  on public.follows(follower_id, followed_user_id)
  where followed_user_id is not null;

create unique index if not exists follows_org_unique
  on public.follows(follower_id, followed_organization_id)
  where followed_organization_id is not null;

-- ============================================================
-- 4. SOCIAL POSTS
-- ============================================================

create table if not exists public.posts (
  id uuid default gen_random_uuid() primary key,
  author_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  content text not null,
  image_url text,
  video_url text,
  link_url text,
  visibility text not null default 'public'
    check (visibility in ('public','followers','private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.post_likes (
  id uuid default gen_random_uuid() primary key,
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(post_id, user_id)
);

create table if not exists public.post_comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 5. COURSE REVIEWS
-- ============================================================

create table if not exists public.course_reviews (
  id uuid default gen_random_uuid() primary key,
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  review text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(course_id, user_id)
);

-- ============================================================
-- 6. COURSE PROGRESS / LESSON COMPLETION
-- ============================================================

create table if not exists public.lesson_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  module_id uuid not null references public.course_modules(id) on delete cascade,
  completed boolean not null default false,
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  last_position_seconds integer not null default 0 check (last_position_seconds >= 0),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(user_id, module_id)
);

-- ============================================================
-- 7. CERTIFICATES
-- ============================================================

create table if not exists public.certificates (
  id uuid default gen_random_uuid() primary key,
  certificate_id text not null unique,
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  issued_at timestamptz not null default now(),
  verification_token uuid not null default gen_random_uuid() unique,
  metadata jsonb not null default '{}'::jsonb,
  unique(user_id, course_id)
);

-- ============================================================
-- 8. BADGES
-- ============================================================

create table if not exists public.badges (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  description text,
  icon_url text,
  criteria jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.user_badges (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  awarded_by uuid references public.profiles(id) on delete set null,
  unique(user_id, badge_id)
);

-- ============================================================
-- 9. NOTIFICATIONS
-- ============================================================

create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  push_enabled boolean not null default true,
  email_enabled boolean not null default true,
  social_enabled boolean not null default true,
  course_enabled boolean not null default true,
  event_enabled boolean not null default true,
  message_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 10. INDEXES
-- ============================================================

create index if not exists organizations_owner_idx on public.organizations(owner_id);
create index if not exists organizations_status_idx on public.organizations(verification_status);
create index if not exists organization_members_user_idx on public.organization_members(user_id);
create index if not exists creator_applications_user_idx on public.creator_applications(user_id);
create index if not exists creator_applications_status_idx on public.creator_applications(status);
create index if not exists follows_follower_idx on public.follows(follower_id);
create index if not exists follows_followed_user_idx on public.follows(followed_user_id);
create index if not exists follows_followed_org_idx on public.follows(followed_organization_id);
create index if not exists posts_author_idx on public.posts(author_id);
create index if not exists posts_created_idx on public.posts(created_at desc);
create index if not exists post_likes_post_idx on public.post_likes(post_id);
create index if not exists post_comments_post_idx on public.post_comments(post_id);
create index if not exists course_reviews_course_idx on public.course_reviews(course_id);
create index if not exists lesson_progress_user_idx on public.lesson_progress(user_id);
create index if not exists lesson_progress_module_idx on public.lesson_progress(module_id);
create index if not exists certificates_user_idx on public.certificates(user_id);
create index if not exists certificates_course_idx on public.certificates(course_id);
create index if not exists user_badges_user_idx on public.user_badges(user_id);
create index if not exists notifications_user_created_idx
  on public.notifications(user_id, created_at desc);

-- ============================================================
-- 11. ENABLE RLS
-- ============================================================

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.creator_applications enable row level security;
alter table public.follows enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.course_reviews enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.certificates enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;

-- ============================================================
-- 12. DROP/RECREATE POLICIES
-- ============================================================

drop policy if exists "Organizations are publicly viewable" on public.organizations;
drop policy if exists "Users can create organizations" on public.organizations;
drop policy if exists "Owners can update organizations" on public.organizations;

create policy "Organizations are publicly viewable"
on public.organizations for select
using (verification_status in ('pending','verified') or owner_id = auth.uid());

create policy "Users can create organizations"
on public.organizations for insert
with check (auth.uid() = owner_id);

create policy "Owners can update organizations"
on public.organizations for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "Members are viewable by organization members" on public.organization_members;
drop policy if exists "Users can join organizations" on public.organization_members;
drop policy if exists "Members can leave organizations" on public.organization_members;

create policy "Members are viewable by organization members"
on public.organization_members for select
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.organization_members m
    where m.organization_id = organization_members.organization_id
      and m.user_id = auth.uid()
  )
);

create policy "Users can join organizations"
on public.organization_members for insert
with check (auth.uid() = user_id);

create policy "Members can leave organizations"
on public.organization_members for delete
using (auth.uid() = user_id);

drop policy if exists "Users can view their creator applications" on public.creator_applications;
drop policy if exists "Users can submit creator applications" on public.creator_applications;

create policy "Users can view their creator applications"
on public.creator_applications for select
using (auth.uid() = user_id);

create policy "Users can submit creator applications"
on public.creator_applications for insert
with check (auth.uid() = user_id);

drop policy if exists "Follows are publicly readable" on public.follows;
drop policy if exists "Users can follow" on public.follows;
drop policy if exists "Users can unfollow" on public.follows;
drop policy if exists "Users can change follow notifications" on public.follows;

create policy "Follows are publicly readable"
on public.follows for select
using (true);

create policy "Users can follow"
on public.follows for insert
with check (auth.uid() = follower_id);

create policy "Users can unfollow"
on public.follows for delete
using (auth.uid() = follower_id);

create policy "Users can change follow notifications"
on public.follows for update
using (auth.uid() = follower_id)
with check (auth.uid() = follower_id);

drop policy if exists "Public posts are viewable" on public.posts;
drop policy if exists "Users can create their own posts" on public.posts;
drop policy if exists "Users can update their own posts" on public.posts;
drop policy if exists "Users can delete their own posts" on public.posts;

create policy "Public posts are viewable"
on public.posts for select
using (
  visibility = 'public'
  or author_id = auth.uid()
  or exists (
    select 1 from public.follows f
    where f.follower_id = auth.uid()
      and f.followed_user_id = posts.author_id
      and f.notifications_enabled is not null
  )
);

create policy "Users can create their own posts"
on public.posts for insert
with check (auth.uid() = author_id);

create policy "Users can update their own posts"
on public.posts for update
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

create policy "Users can delete their own posts"
on public.posts for delete
using (auth.uid() = author_id);

drop policy if exists "Post likes are viewable" on public.post_likes;
drop policy if exists "Users can like posts" on public.post_likes;
drop policy if exists "Users can unlike posts" on public.post_likes;

create policy "Post likes are viewable"
on public.post_likes for select
using (true);

create policy "Users can like posts"
on public.post_likes for insert
with check (auth.uid() = user_id);

create policy "Users can unlike posts"
on public.post_likes for delete
using (auth.uid() = user_id);

drop policy if exists "Comments are viewable" on public.post_comments;
drop policy if exists "Users can comment" on public.post_comments;
drop policy if exists "Users can update comments" on public.post_comments;
drop policy if exists "Users can delete comments" on public.post_comments;

create policy "Comments are viewable"
on public.post_comments for select
using (true);

create policy "Users can comment"
on public.post_comments for insert
with check (auth.uid() = author_id);

create policy "Users can update comments"
on public.post_comments for update
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

create policy "Users can delete comments"
on public.post_comments for delete
using (auth.uid() = author_id);

drop policy if exists "Course reviews are viewable" on public.course_reviews;
drop policy if exists "Completed students can review courses" on public.course_reviews;
drop policy if exists "Users can update their reviews" on public.course_reviews;
drop policy if exists "Users can delete their reviews" on public.course_reviews;

create policy "Course reviews are viewable"
on public.course_reviews for select
using (true);

create policy "Completed students can review courses"
on public.course_reviews for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.enrollments e
    where e.user_id = auth.uid()
      and e.course_id = course_reviews.course_id
      and e.progress_percent >= 100
  )
);

create policy "Users can update their reviews"
on public.course_reviews for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their reviews"
on public.course_reviews for delete
using (auth.uid() = user_id);

drop policy if exists "Users can view their lesson progress" on public.lesson_progress;
drop policy if exists "Users can create lesson progress" on public.lesson_progress;
drop policy if exists "Users can update lesson progress" on public.lesson_progress;

create policy "Users can view their lesson progress"
on public.lesson_progress for select
using (auth.uid() = user_id);

create policy "Users can create lesson progress"
on public.lesson_progress for insert
with check (auth.uid() = user_id);

create policy "Users can update lesson progress"
on public.lesson_progress for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Certificates are publicly verifiable" on public.certificates;
drop policy if exists "Users can view their certificates" on public.certificates;

create policy "Certificates are publicly verifiable"
on public.certificates for select
using (true);

create policy "Users can view their certificates"
on public.certificates for insert
with check (auth.uid() = user_id);

drop policy if exists "Badges are publicly viewable" on public.badges;
create policy "Badges are publicly viewable"
on public.badges for select
using (is_active = true);

drop policy if exists "User badges are publicly viewable" on public.user_badges;
create policy "User badges are publicly viewable"
on public.user_badges for select
using (true);

drop policy if exists "Users can view their notifications" on public.notifications;
drop policy if exists "Users can update their notifications" on public.notifications;

create policy "Users can view their notifications"
on public.notifications for select
using (auth.uid() = user_id);

create policy "Users can update their notifications"
on public.notifications for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can view notification preferences" on public.notification_preferences;
drop policy if exists "Users can create notification preferences" on public.notification_preferences;
drop policy if exists "Users can update notification preferences" on public.notification_preferences;

create policy "Users can view notification preferences"
on public.notification_preferences for select
using (auth.uid() = user_id);

create policy "Users can create notification preferences"
on public.notification_preferences for insert
with check (auth.uid() = user_id);

create policy "Users can update notification preferences"
on public.notification_preferences for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- ============================================================
-- 13. SAFE STARTER BADGES
-- ============================================================

insert into public.badges (name, description, criteria)
values
  ('First Course Completed', 'Awarded for completing your first NESBA course.', '{"type":"course_completion","count":1}'),
  ('Learning Explorer', 'Awarded for completing five NESBA courses.', '{"type":"course_completion","count":5}'),
  ('Community Contributor', 'Awarded for contributing positively to the NESBA community.', '{"type":"manual"}')
on conflict (name) do nothing;

commit;
