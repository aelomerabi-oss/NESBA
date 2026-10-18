-- Run this in Supabase SQL Editor after 001_profiles.sql and 002_onboarding.sql

-- 1. Categories (Section 16)
create table if not exists public.categories (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  created_at timestamp with time zone default now()
);

-- 2. Courses (Section 14)
create table if not exists public.courses (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  thumbnail_url text,
  teacher_id uuid references public.profiles(id) on delete set null,
  teacher_name text,
  category_id uuid references public.categories(id) on delete set null,
  difficulty text check (difficulty in ('beginner', 'intermediate', 'advanced')) default 'beginner',
  is_premium boolean default false,
  is_published boolean default true,
  lesson_count int default 0,
  duration_minutes int default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 3. Course modules / lessons
create table if not exists public.course_modules (
  id uuid default gen_random_uuid() primary key,
  course_id uuid references public.courses(id) on delete cascade not null,
  title text not null,
  duration_minutes int default 0,
  sort_order int default 0,
  is_locked boolean default false,
  video_url text,
  created_at timestamp with time zone default now()
);

-- 4. Enrollments
create table if not exists public.enrollments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  course_id uuid references public.courses(id) on delete cascade not null,
  progress_percent int default 0,
  enrolled_at timestamp with time zone default now(),
  unique (user_id, course_id)
);

-- Row Level Security
-- Make this migration safely re-runnable if some policies already exist.
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.categories;
DROP POLICY IF EXISTS "Published courses are viewable by everyone" ON public.courses;
DROP POLICY IF EXISTS "Teachers can manage their own courses" ON public.courses;
DROP POLICY IF EXISTS "Modules are viewable by everyone" ON public.course_modules;
DROP POLICY IF EXISTS "Teachers can manage modules of their own courses" ON public.course_modules;
DROP POLICY IF EXISTS "Users can view their own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Users can enroll themselves" ON public.enrollments;
DROP POLICY IF EXISTS "Users can update their own enrollment progress" ON public.enrollments;
alter table public.categories enable row level security;
alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.enrollments enable row level security;

create policy "Categories are viewable by everyone" on public.categories for select using (true);

create policy "Published courses are viewable by everyone" on public.courses
  for select using (is_published = true);

create policy "Teachers can manage their own courses" on public.courses
  for all using (auth.uid() = teacher_id);

create policy "Modules are viewable by everyone" on public.course_modules for select using (true);

create policy "Teachers can manage modules of their own courses" on public.course_modules
  for all using (
    exists (select 1 from public.courses where courses.id = course_modules.course_id and courses.teacher_id = auth.uid())
  );

create policy "Users can view their own enrollments" on public.enrollments
  for select using (auth.uid() = user_id);

create policy "Users can enroll themselves" on public.enrollments
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own enrollment progress" on public.enrollments
  for update using (auth.uid() = user_id);

-- Seed data: categories
insert into public.categories (name) values
  ('Business'), ('Finance'), ('Soft Skills'), ('Computer Science'), ('Design'), ('Entrepreneurship')
on conflict (name) do nothing;

-- Seed data: courses
insert into public.courses (title, description, thumbnail_url, teacher_name, category_id, difficulty, is_premium, lesson_count, duration_minutes)
select
  'Intro to Business Analytics',
  'Learn the fundamentals of business analytics, from reading dashboards to making data-driven decisions in real organizations.',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400',
  'Dr. Amina Khalid',
  (select id from public.categories where name = 'Business'),
  'beginner', false, 12, 270
where not exists (select 1 from public.courses where title = 'Intro to Business Analytics');

insert into public.courses (title, description, thumbnail_url, teacher_name, category_id, difficulty, is_premium, lesson_count, duration_minutes)
select
  'Advanced Financial Modeling',
  'A deep dive into building financial models used by analysts and investors, including forecasting, valuation, and scenario planning.',
  'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400',
  'James Otieno',
  (select id from public.categories where name = 'Finance'),
  'advanced', true, 20, 490
where not exists (select 1 from public.courses where title = 'Advanced Financial Modeling');

insert into public.courses (title, description, thumbnail_url, teacher_name, category_id, difficulty, is_premium, lesson_count, duration_minutes)
select
  'Public Speaking Foundations',
  'Build confidence and clarity as a speaker, from structuring a talk to handling nerves in front of a live audience.',
  'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=400',
  'Sara Lindqvist',
  (select id from public.categories where name = 'Soft Skills'),
  'beginner', false, 8, 165
where not exists (select 1 from public.courses where title = 'Public Speaking Foundations');

insert into public.courses (title, description, thumbnail_url, teacher_name, category_id, difficulty, is_premium, lesson_count, duration_minutes)
select
  'Data Structures & Algorithms',
  'Master the core building blocks of computer science through hands-on problem solving.',
  'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=400',
  'Wei Zhang',
  (select id from public.categories where name = 'Computer Science'),
  'advanced', true, 30, 900
where not exists (select 1 from public.courses where title = 'Data Structures & Algorithms');

insert into public.courses (title, description, thumbnail_url, teacher_name, category_id, difficulty, is_premium, lesson_count, duration_minutes)
select
  'UX Research Basics',
  'Learn how to talk to users, run usability tests, and turn insights into better product decisions.',
  'https://images.unsplash.com/photo-1509966756634-9c23dd6e6815?w=400',
  'Priya Nair',
  (select id from public.categories where name = 'Design'),
  'beginner', false, 10, 200
where not exists (select 1 from public.courses where title = 'UX Research Basics');

-- Seed modules
insert into public.course_modules (course_id, title, duration_minutes, sort_order, is_locked)
select id, 'What is Business Analytics?', 18, 1, false from public.courses where title = 'Intro to Business Analytics'
and not exists (select 1 from public.course_modules where title = 'What is Business Analytics?');

insert into public.course_modules (course_id, title, duration_minutes, sort_order, is_locked)
select id, 'Reading Your First Dashboard', 22, 2, false from public.courses where title = 'Intro to Business Analytics'
and not exists (select 1 from public.course_modules where title = 'Reading Your First Dashboard');

insert into public.course_modules (course_id, title, duration_minutes, sort_order, is_locked)
select id, 'Descriptive vs Predictive Analytics', 25, 3, false from public.courses where title = 'Intro to Business Analytics'
and not exists (select 1 from public.course_modules where title = 'Descriptive vs Predictive Analytics');

insert into public.course_modules (course_id, title, duration_minutes, sort_order, is_locked)
select id, 'Model Structure Fundamentals', 30, 1, false from public.courses where title = 'Advanced Financial Modeling'
and not exists (select 1 from public.course_modules where title = 'Model Structure Fundamentals');

insert into public.course_modules (course_id, title, duration_minutes, sort_order, is_locked)
select id, 'Building a 3-Statement Model', 45, 2, true from public.courses where title = 'Advanced Financial Modeling'
and not exists (select 1 from public.course_modules where title = 'Building a 3-Statement Model');

insert into public.course_modules (course_id, title, duration_minutes, sort_order, is_locked)
select id, 'DCF Valuation in Practice', 40, 3, true from public.courses where title = 'Advanced Financial Modeling'
and not exists (select 1 from public.course_modules where title = 'DCF Valuation in Practice');
