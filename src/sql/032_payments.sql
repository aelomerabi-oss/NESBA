-- 032: Paid premium courses and paid private teaching (Stripe Connect)
--
-- Money never touches these tables directly from the app. The flow is:
--   1. A teacher/organisation connects a Stripe Express account
--      (edge function stripe-connect -> creator_payout_accounts).
--   2. A learner starts checkout (edge function stripe-checkout), which
--      records a pending course_purchases / tutoring_bookings row.
--   3. Stripe calls stripe-webhook when the payment succeeds; it marks the
--      row paid/confirmed and enrolls the learner or schedules the session.
-- NESBA keeps a 20% platform fee (application_fee_amount); the rest goes to
-- the creator's Stripe account.
--
-- Only the edge functions (service role) write payout accounts, purchases
-- and booking payment fields; users can only read their own rows.

-- ---------------------------------------------------------------------------
-- Prices on courses
-- ---------------------------------------------------------------------------

alter table public.courses
  add column if not exists price_cents integer not null default 0 check (price_cents >= 0 and price_cents <= 100000000),
  add column if not exists currency text not null default 'eur' check (currency in ('eur'));

-- A paid course is a premium course.
update public.courses set is_premium = true where price_cents > 0 and not is_premium;

-- ---------------------------------------------------------------------------
-- Creator payout accounts
-- ---------------------------------------------------------------------------

create table if not exists public.creator_payout_accounts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  stripe_account_id text not null unique,
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  details_submitted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.creator_payout_accounts enable row level security;

drop policy if exists "Creators read their payout account" on public.creator_payout_accounts;
create policy "Creators read their payout account"
  on public.creator_payout_accounts for select to authenticated
  using (user_id = auth.uid());

-- Whether a creator can be paid, without exposing their Stripe account id.
create or replace function public.creator_can_receive_payments(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select charges_enabled from public.creator_payout_accounts where user_id = p_user_id),
    false
  );
$$;

grant execute on function public.creator_can_receive_payments(uuid) to anon, authenticated;

-- Only creators who can receive money may put a price on a course.
create or replace function public.guard_course_price()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.price_cents > 0
     and (tg_op = 'INSERT' or new.price_cents is distinct from old.price_cents)
     and auth.uid() is not null
     and not public.creator_can_receive_payments(new.teacher_id) then
    raise exception 'Connect a Stripe account in Creator Studio > Payouts before setting a price';
  end if;

  if new.price_cents > 0 then
    new.is_premium := true;
  end if;

  return new;
end;
$$;

drop trigger if exists courses_guard_price on public.courses;
create trigger courses_guard_price
  before insert or update of price_cents on public.courses
  for each row execute function public.guard_course_price();

-- ---------------------------------------------------------------------------
-- Course purchases
-- ---------------------------------------------------------------------------

create table if not exists public.course_purchases (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete restrict,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete restrict,
  amount_cents integer not null check (amount_cents > 0),
  platform_fee_cents integer not null check (platform_fee_cents >= 0),
  currency text not null default 'eur',
  status text not null default 'pending' check (status in ('pending', 'paid', 'refunded', 'expired')),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists course_purchases_buyer_idx on public.course_purchases (buyer_id, course_id);
create index if not exists course_purchases_seller_idx on public.course_purchases (seller_id, created_at desc);

alter table public.course_purchases enable row level security;

drop policy if exists "Buyers and sellers read purchases" on public.course_purchases;
create policy "Buyers and sellers read purchases"
  on public.course_purchases for select to authenticated
  using (buyer_id = auth.uid() or seller_id = auth.uid());

create or replace function public.has_paid_for_course(p_user_id uuid, p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.course_purchases
    where buyer_id = p_user_id and course_id = p_course_id and status = 'paid'
  );
$$;

revoke execute on function public.has_paid_for_course(uuid, uuid) from public, anon;
grant execute on function public.has_paid_for_course(uuid, uuid) to authenticated;

-- Learners cannot enroll themselves in a paid course; the webhook enrolls
-- them after payment (it runs without auth.uid()).
create or replace function public.guard_paid_enrollment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course public.courses;
begin
  if auth.uid() is null then
    return new;
  end if;

  select * into v_course from public.courses where id = new.course_id;

  if v_course.price_cents > 0
     and v_course.teacher_id is distinct from new.user_id
     and not public.has_paid_for_course(new.user_id, new.course_id) then
    raise exception 'Buy this course to enroll';
  end if;

  return new;
end;
$$;

drop trigger if exists enrollments_guard_paid on public.enrollments;
create trigger enrollments_guard_paid
  before insert on public.enrollments
  for each row execute function public.guard_paid_enrollment();

-- ---------------------------------------------------------------------------
-- Private teaching
-- ---------------------------------------------------------------------------

create table if not exists public.tutoring_offers (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 3 and 120),
  description text check (char_length(description) <= 3000),
  duration_minutes integer not null check (duration_minutes in (30, 45, 60, 90, 120)),
  price_cents integer not null check (price_cents >= 100 and price_cents <= 100000000),
  currency text not null default 'eur' check (currency in ('eur')),
  availability text check (char_length(availability) <= 500),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tutoring_offers_teacher_idx on public.tutoring_offers (teacher_id);

alter table public.tutoring_offers enable row level security;

drop policy if exists "Active offers are viewable" on public.tutoring_offers;
create policy "Active offers are viewable"
  on public.tutoring_offers for select to anon, authenticated
  using (is_active or teacher_id = auth.uid());

drop policy if exists "Teachers create offers" on public.tutoring_offers;
create policy "Teachers create offers"
  on public.tutoring_offers for insert to authenticated
  with check (
    teacher_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('teacher', 'mentor', 'organization', 'admin')
    )
  );

drop policy if exists "Teachers update offers" on public.tutoring_offers;
create policy "Teachers update offers"
  on public.tutoring_offers for update to authenticated
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

drop policy if exists "Teachers delete offers" on public.tutoring_offers;
create policy "Teachers delete offers"
  on public.tutoring_offers for delete to authenticated
  using (teacher_id = auth.uid());

-- Offers only go live once the teacher can be paid.
create or replace function public.guard_tutoring_offer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_active and not public.creator_can_receive_payments(new.teacher_id) then
    raise exception 'Connect a Stripe account in Creator Studio > Payouts before offering paid sessions';
  end if;
  return new;
end;
$$;

drop trigger if exists tutoring_offers_guard on public.tutoring_offers;
create trigger tutoring_offers_guard
  before insert or update on public.tutoring_offers
  for each row execute function public.guard_tutoring_offer();

create table if not exists public.tutoring_bookings (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.tutoring_offers(id) on delete restrict,
  teacher_id uuid not null references public.profiles(id) on delete restrict,
  student_id uuid not null references public.profiles(id) on delete cascade,
  starts_at timestamptz not null,
  duration_minutes integer not null,
  note text check (char_length(note) <= 1000),
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'confirmed', 'completed', 'cancelled', 'expired')),
  amount_cents integer not null check (amount_cents > 0),
  platform_fee_cents integer not null check (platform_fee_cents >= 0),
  currency text not null default 'eur',
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  event_id uuid references public.events(id) on delete set null,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists tutoring_bookings_teacher_idx on public.tutoring_bookings (teacher_id, starts_at);
create index if not exists tutoring_bookings_student_idx on public.tutoring_bookings (student_id, starts_at);

alter table public.tutoring_bookings enable row level security;

drop policy if exists "Teacher and student read bookings" on public.tutoring_bookings;
create policy "Teacher and student read bookings"
  on public.tutoring_bookings for select to authenticated
  using (teacher_id = auth.uid() or student_id = auth.uid());

-- The teacher may mark a confirmed session completed. This is the only change
-- users can make to a booking, so it is a function rather than a policy.
create or replace function public.complete_tutoring_booking(p_booking_id uuid)
returns public.tutoring_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.tutoring_bookings;
begin
  update public.tutoring_bookings
  set status = 'completed'
  where id = p_booking_id and teacher_id = auth.uid() and status = 'confirmed'
  returning * into v_booking;

  if v_booking.id is null then
    raise exception 'Only the teacher can complete a confirmed session';
  end if;

  return v_booking;
end;
$$;

revoke execute on function public.complete_tutoring_booking(uuid) from public, anon;
grant execute on function public.complete_tutoring_booking(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Private events for paid sessions
-- ---------------------------------------------------------------------------

alter table public.events
  add column if not exists is_private boolean not null default false;

-- Private sessions are only visible to the host and registered attendees.
alter policy "Published events are viewable"
  on public.events
  using (
    auth.uid() = host_id
    or (
      status = any (array['scheduled', 'live'])
      and (
        not is_private
        or exists (
          select 1 from public.event_registrations r
          where r.event_id = events.id and r.user_id = auth.uid()
        )
      )
    )
  );

-- Nobody can register themselves for someone else's private session; the
-- webhook registers the paying student.
create or replace function public.guard_private_registration()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and exists (
    select 1 from public.events
    where id = new.event_id and is_private and host_id is distinct from auth.uid()
  ) then
    raise exception 'This is a private session';
  end if;
  return new;
end;
$$;

drop trigger if exists event_registrations_guard_private on public.event_registrations;
create trigger event_registrations_guard_private
  before insert on public.event_registrations
  for each row execute function public.guard_private_registration();
