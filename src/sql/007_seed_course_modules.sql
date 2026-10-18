-- NESBA 007 — Seed real course modules for the existing demo courses
-- Safe to run more than once.

begin;

-- UX Research Basics
insert into public.course_modules (course_id,title,duration_minutes,sort_order,is_locked,video_url)
select id,'Introduction to UX Research',18,1,false,null
from public.courses
where title='UX Research Basics'
and not exists (
  select 1 from public.course_modules cm
  where cm.course_id=public.courses.id and cm.sort_order=1
);

insert into public.course_modules (course_id,title,duration_minutes,sort_order,is_locked,video_url)
select id,'Understanding Your Users',20,2,false,null
from public.courses
where title='UX Research Basics'
and not exists (
  select 1 from public.course_modules cm
  where cm.course_id=public.courses.id and cm.sort_order=2
);

insert into public.course_modules (course_id,title,duration_minutes,sort_order,is_locked,video_url)
select id,'Writing Effective Interview Questions',22,3,false,null
from public.courses
where title='UX Research Basics'
and not exists (
  select 1 from public.course_modules cm
  where cm.course_id=public.courses.id and cm.sort_order=3
);

insert into public.course_modules (course_id,title,duration_minutes,sort_order,is_locked,video_url)
select id,'Running User Interviews',24,4,false,null
from public.courses
where title='UX Research Basics'
and not exists (
  select 1 from public.course_modules cm
  where cm.course_id=public.courses.id and cm.sort_order=4
);

insert into public.course_modules (course_id,title,duration_minutes,sort_order,is_locked,video_url)
select id,'Usability Testing Fundamentals',20,5,false,null
from public.courses
where title='UX Research Basics'
and not exists (
  select 1 from public.course_modules cm
  where cm.course_id=public.courses.id and cm.sort_order=5
);

insert into public.course_modules (course_id,title,duration_minutes,sort_order,is_locked,video_url)
select id,'Planning a Usability Test',18,6,false,null
from public.courses
where title='UX Research Basics'
and not exists (
  select 1 from public.course_modules cm
  where cm.course_id=public.courses.id and cm.sort_order=6
);

insert into public.course_modules (course_id,title,duration_minutes,sort_order,is_locked,video_url)
select id,'Analyzing Research Findings',22,7,false,null
from public.courses
where title='UX Research Basics'
and not exists (
  select 1 from public.course_modules cm
  where cm.course_id=public.courses.id and cm.sort_order=7
);

insert into public.course_modules (course_id,title,duration_minutes,sort_order,is_locked,video_url)
select id,'Turning Insights into Decisions',20,8,false,null
from public.courses
where title='UX Research Basics'
and not exists (
  select 1 from public.course_modules cm
  where cm.course_id=public.courses.id and cm.sort_order=8
);

insert into public.course_modules (course_id,title,duration_minutes,sort_order,is_locked,video_url)
select id,'Presenting Research to Stakeholders',18,9,false,null
from public.courses
where title='UX Research Basics'
and not exists (
  select 1 from public.course_modules cm
  where cm.course_id=public.courses.id and cm.sort_order=9
);

insert into public.course_modules (course_id,title,duration_minutes,sort_order,is_locked,video_url)
select id,'UX Research Project Review',18,10,false,null
from public.courses
where title='UX Research Basics'
and not exists (
  select 1 from public.course_modules cm
  where cm.course_id=public.courses.id and cm.sort_order=10
);

-- Bring the seeded course lesson count in line with the actual modules.
update public.courses c
set lesson_count = (
  select count(*) from public.course_modules cm where cm.course_id=c.id
),
updated_at = now()
where c.title in (
  'UX Research Basics',
  'Intro to Business Analytics',
  'Advanced Financial Modeling',
  'Public Speaking Foundations',
  'Data Structures & Algorithms'
);

commit;
