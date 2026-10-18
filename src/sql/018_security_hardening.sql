-- 018: Security hardening
--
-- 1. Add RLS policies to course_sections and organization_applications
--    (RLS was enabled with no policies, so the app could not read or write them).
-- 2. Stop exposing trigger functions as callable RPC endpoints.
-- 3. Restrict signed-in-only RPCs to the authenticated role.
-- 4. Pin search_path on recompute_course_progress.

-- ---------------------------------------------------------------------------
-- course_sections
-- ---------------------------------------------------------------------------

drop policy if exists course_sections_select_published on public.course_sections;
create policy course_sections_select_published
  on public.course_sections for select
  using (
    exists (
      select 1 from public.courses
      where courses.id = course_sections.course_id
        and (courses.is_published = true or courses.teacher_id = auth.uid())
    )
  );

drop policy if exists course_sections_teacher_manage on public.course_sections;
create policy course_sections_teacher_manage
  on public.course_sections for all
  to authenticated
  using (
    exists (
      select 1 from public.courses
      where courses.id = course_sections.course_id
        and courses.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.courses
      where courses.id = course_sections.course_id
        and courses.teacher_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- organization_applications
-- ---------------------------------------------------------------------------

drop policy if exists organization_applications_insert_own on public.organization_applications;
create policy organization_applications_insert_own
  on public.organization_applications for insert
  to authenticated
  with check (
    auth.uid() = applicant_id
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
    and admin_notes is null
  );

drop policy if exists organization_applications_select_own on public.organization_applications;
create policy organization_applications_select_own
  on public.organization_applications for select
  to authenticated
  using (auth.uid() = applicant_id);

drop policy if exists organization_applications_select_admin on public.organization_applications;
create policy organization_applications_select_admin
  on public.organization_applications for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

drop policy if exists organization_applications_update_admin on public.organization_applications;
create policy organization_applications_update_admin
  on public.organization_applications for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- Trigger functions: never callable through /rest/v1/rpc.
-- Triggers keep firing; EXECUTE is only checked when a trigger is created.
-- ---------------------------------------------------------------------------

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.notify_direct_message_recipient() from public, anon, authenticated;
revoke execute on function public.notify_event_host_registration() from public, anon, authenticated;
revoke execute on function public.notify_followers_of_post() from public, anon, authenticated;
revoke execute on function public.notify_user_follow() from public, anon, authenticated;
revoke execute on function public.protect_profile_privileged_fields() from public, anon, authenticated;
revoke execute on function public.recompute_course_progress() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPCs that require a signed-in user
-- ---------------------------------------------------------------------------

revoke execute on function public.get_admin_platform_metrics() from public, anon;
revoke execute on function public.get_creator_course_analytics(uuid) from public, anon;
revoke execute on function public.mark_lesson_complete(uuid) from public, anon;
revoke execute on function public.review_creator_application(uuid, boolean) from public, anon;
revoke execute on function public.review_creator_request(uuid, boolean) from public, anon;

grant execute on function public.get_admin_platform_metrics() to authenticated;
grant execute on function public.get_creator_course_analytics(uuid) to authenticated;
grant execute on function public.mark_lesson_complete(uuid) to authenticated;
grant execute on function public.review_creator_application(uuid, boolean) to authenticated;
grant execute on function public.review_creator_request(uuid, boolean) to authenticated;

-- email_exists_for_signup (signup screens, before login) and
-- verify_certificate (public certificate check) stay callable by anon.

-- ---------------------------------------------------------------------------
-- search_path
-- ---------------------------------------------------------------------------

alter function public.recompute_course_progress() set search_path = public;
