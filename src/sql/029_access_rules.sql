-- 029: Access rules
--
-- 1. Organizations are only created by admin approval.
--    - creator_applications gains description / website / location /
--      contact_email so one application type covers organizations.
--    - apply_for_organization(): what the organization screens call.
--    - review_creator_request() copies those details onto the organization.
--    - Clients can no longer insert organizations directly (admins only).
--    - The newest pending organization_applications row per applicant is
--      moved into creator_applications (the Admin screen only reviews
--      creator_applications).
-- 2. Lesson content is readable by the course teacher, or by enrolled
--    learners once the course and the content are published. Lessons of
--    unpublished courses are visible only to their teacher.
-- 3. Expired stories are hidden from everyone but their author.

-- ---------------------------------------------------------------------------
-- 1. Organizations through admin approval
-- ---------------------------------------------------------------------------

alter table public.creator_applications
  add column if not exists description text,
  add column if not exists website text,
  add column if not exists location text,
  add column if not exists contact_email text;

create or replace function public.apply_for_organization(
  p_name text,
  p_type text default null,
  p_description text default null,
  p_website text default null,
  p_location text default null,
  p_contact_email text default null,
  p_reason text default null
)
returns public.creator_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_app public.creator_applications;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if nullif(trim(p_name), '') is null then raise exception 'Organization name is required'; end if;

  select * into v_app
  from public.creator_applications
  where user_id = uid and requested_role = 'organization' and status = 'pending'
  order by created_at desc
  limit 1;

  if v_app.id is not null then
    update public.creator_applications
    set organization_name = trim(p_name),
        organization_type = nullif(trim(p_type), ''),
        description = nullif(trim(p_description), ''),
        website = nullif(trim(p_website), ''),
        location = nullif(trim(p_location), ''),
        contact_email = nullif(trim(p_contact_email), ''),
        reason = coalesce(nullif(trim(p_reason), ''), reason),
        updated_at = now()
    where id = v_app.id
    returning * into v_app;
  else
    insert into public.creator_applications
      (user_id, requested_role, organization_name, organization_type, description,
       website, location, contact_email, reason)
    values
      (uid, 'organization', trim(p_name), nullif(trim(p_type), ''), nullif(trim(p_description), ''),
       nullif(trim(p_website), ''), nullif(trim(p_location), ''), nullif(trim(p_contact_email), ''),
       nullif(trim(p_reason), ''))
    returning * into v_app;
  end if;

  -- Trusted change to privileged profile fields (unless already an organization).
  perform set_config('nesba.admin_operation', 'true', true);

  update public.profiles
  set requested_role = 'organization',
      verification_status = 'pending',
      updated_at = now()
  where id = uid and role <> 'organization';

  return v_app;
end;
$$;

revoke execute on function public.apply_for_organization(text, text, text, text, text, text, text) from public, anon;
grant execute on function public.apply_for_organization(text, text, text, text, text, text, text) to authenticated;

create or replace function public.review_creator_request(p_request_id uuid, p_approve boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_ok boolean;
  req public.creator_applications%rowtype;
  org public.organizations%rowtype;
  base_slug text;
begin
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ) into admin_ok;

  if not admin_ok then
    raise exception 'Admin access required';
  end if;

  select * into req from public.creator_applications where id = p_request_id for update;

  if not found then
    raise exception 'Creator application not found';
  end if;

  if p_approve then
    update public.creator_applications
    set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
    where id = req.id;

    perform set_config('nesba.admin_operation', 'true', true);

    update public.profiles
    set role = req.requested_role,
        requested_role = null,
        verification_status = 'verified',
        updated_at = now()
    where id = req.user_id;

    if req.requested_role = 'organization' and coalesce(trim(req.organization_name), '') <> '' then
      base_slug := trim(both '-' from regexp_replace(lower(trim(req.organization_name)), '[^a-z0-9]+', '-', 'g'));
      base_slug := left(coalesce(nullif(base_slug, ''), 'organization'), 60)
                   || '-' || left(replace(req.user_id::text, '-', ''), 6);

      insert into public.organizations
        (owner_id, name, slug, description, organization_type, website_url, location,
         verification_status, verified_at)
      values
        (req.user_id, trim(req.organization_name), base_slug, coalesce(req.description, req.reason),
         coalesce(req.organization_type, 'Educational Organization'), req.website, req.location,
         'verified', now())
      on conflict (slug) do nothing;

      select * into org from public.organizations
      where owner_id = req.user_id
      order by created_at desc
      limit 1;

      if org.id is not null then
        insert into public.organization_members (organization_id, user_id, member_role)
        values (org.id, req.user_id, 'owner')
        on conflict (organization_id, user_id) do nothing;
      end if;
    end if;

    insert into public.notifications (user_id, type, title, body, data)
    values (req.user_id, 'creator_approved', 'Creator application approved',
            'Your NESBA creator application has been approved.',
            jsonb_build_object('role', req.requested_role));
  else
    update public.creator_applications
    set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
    where id = req.id;

    perform set_config('nesba.admin_operation', 'true', true);

    update public.profiles
    set requested_role = null, verification_status = 'unverified', updated_at = now()
    where id = req.user_id and requested_role = req.requested_role;

    insert into public.notifications (user_id, type, title, body, data)
    values (req.user_id, 'creator_rejected', 'Creator application update',
            'Your NESBA creator application was not approved at this time.',
            jsonb_build_object('role', req.requested_role));
  end if;

  return jsonb_build_object('success', true, 'status', case when p_approve then 'approved' else 'rejected' end);
end;
$$;

alter policy "Users can create organizations"
  on public.organizations
  with check (
    auth.uid() = owner_id
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Move the newest pending organization application per applicant.
insert into public.creator_applications
  (user_id, requested_role, organization_name, organization_type, description, website,
   location, contact_email, reason, created_at)
select distinct on (o.applicant_id)
  o.applicant_id, 'organization', o.organization_name, o.organization_type, o.description,
  o.website, o.location, o.contact_email, o.reason, o.created_at
from public.organization_applications o
where o.status = 'pending'
  and not exists (
    select 1 from public.creator_applications c
    where c.user_id = o.applicant_id and c.requested_role = 'organization' and c.status = 'pending'
  )
order by o.applicant_id, o.created_at desc;

update public.organization_applications
set admin_notes = coalesce(admin_notes || ' ', '') || '[Moved to creator_applications for review]',
    updated_at = now()
where status = 'pending';

-- ---------------------------------------------------------------------------
-- 2. Lesson content and lessons
-- ---------------------------------------------------------------------------

alter policy "public read lesson_content"
  on public.lesson_content
  using (
    exists (
      select 1
      from public.course_modules cm
      join public.courses c on c.id = cm.course_id
      where cm.id = lesson_content.lesson_id
        and (
          c.teacher_id = auth.uid()
          or (
            c.is_published
            and lesson_content.is_published
            and exists (
              select 1 from public.enrollments e
              where e.course_id = c.id and e.user_id = auth.uid()
            )
          )
        )
    )
  );

alter policy "Modules are viewable by everyone"
  on public.course_modules
  using (
    exists (
      select 1 from public.courses c
      where c.id = course_modules.course_id
        and (c.is_published or c.teacher_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Expired stories
-- ---------------------------------------------------------------------------

alter policy "Users can view active stories"
  on public.stories
  using (expires_at > now() or user_id = auth.uid());
