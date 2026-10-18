-- 020: Course discovery
--
-- get_course_discovery_stats returns per-course aggregates for published
-- courses, ordered by a trending score. Enrollments are private (RLS: own rows
-- only), so the function runs as definer and returns counts only, never
-- who enrolled.
--
-- trending_score = 3 x enrollments in the last 30 days
--                + 1 x all-time enrollments
--                + average rating x number of reviews / 2

create or replace function public.get_course_discovery_stats(
  p_limit int default 50,
  p_category_id uuid default null
)
returns table (
  course_id uuid,
  enrollments_total int,
  enrollments_recent int,
  avg_rating numeric,
  review_count int,
  trending_score numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with enroll as (
    select e.course_id,
           count(*)::int as total,
           count(*) filter (where e.enrolled_at >= now() - interval '30 days')::int as recent
    from public.enrollments e
    group by e.course_id
  ),
  reviews as (
    select r.course_id,
           round(avg(r.rating)::numeric, 1) as avg_rating,
           count(*)::int as review_count
    from public.course_reviews r
    group by r.course_id
  )
  select c.id,
         coalesce(en.total, 0),
         coalesce(en.recent, 0),
         rv.avg_rating,
         coalesce(rv.review_count, 0),
         (3 * coalesce(en.recent, 0)
          + coalesce(en.total, 0)
          + coalesce(rv.avg_rating, 0) * coalesce(rv.review_count, 0) / 2.0)::numeric
  from public.courses c
  left join enroll en on en.course_id = c.id
  left join reviews rv on rv.course_id = c.id
  where c.is_published = true
    and (p_category_id is null or c.category_id = p_category_id)
  order by 6 desc, coalesce(c.published_at, c.created_at) desc
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
$$;

revoke execute on function public.get_course_discovery_stats(int, uuid) from public;
grant execute on function public.get_course_discovery_stats(int, uuid) to anon, authenticated;
