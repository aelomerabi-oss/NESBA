-- 035: Paid workshops and masterclasses
--
-- Any teacher or zzp'er can put a ticket price on a live event (a single
-- workshop or masterclass). Learners buy a ticket through stripe-checkout;
-- stripe-webhook registers them once the payment succeeds. NESBA keeps the
-- same 20% platform fee as on courses.
--
-- Also closes a gap that matters once tickets cost money: a user could insert
-- their own live_audio_participants row and skip join_live_room's
-- registration check.

-- ---------------------------------------------------------------------------
-- Ticket prices
-- ---------------------------------------------------------------------------

alter table public.events
  add column if not exists price_cents integer not null default 0 check (price_cents >= 0 and price_cents <= 100000000),
  add column if not exists currency text not null default 'eur' check (currency in ('eur'));

-- Paid tickets are sold publicly, so a paid event cannot be private, and only
-- hosts who can be paid may set a price.
create or replace function public.guard_event_price()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.price_cents > 0 and new.is_private then
    raise exception 'A private session cannot sell tickets';
  end if;

  if new.price_cents > 0
     and (tg_op = 'INSERT' or new.price_cents is distinct from old.price_cents)
     and auth.uid() is not null
     and not public.creator_can_receive_payments(new.host_id) then
    raise exception 'Connect a Stripe account in Creator Studio > Payouts before selling tickets';
  end if;

  return new;
end;
$$;

drop trigger if exists events_guard_price on public.events;
create trigger events_guard_price
  before insert or update of price_cents, is_private on public.events
  for each row execute function public.guard_event_price();

-- ---------------------------------------------------------------------------
-- Ticket purchases
-- ---------------------------------------------------------------------------

create table if not exists public.event_ticket_purchases (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
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

create index if not exists event_ticket_purchases_buyer_idx on public.event_ticket_purchases (buyer_id, event_id);
create index if not exists event_ticket_purchases_seller_idx on public.event_ticket_purchases (seller_id, created_at desc);
create index if not exists event_ticket_purchases_event_idx on public.event_ticket_purchases (event_id, status);

alter table public.event_ticket_purchases enable row level security;

drop policy if exists "Buyers and sellers read tickets" on public.event_ticket_purchases;
create policy "Buyers and sellers read tickets"
  on public.event_ticket_purchases for select to authenticated
  using (buyer_id = auth.uid() or seller_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Registration rules
-- ---------------------------------------------------------------------------

-- Nobody registers themselves for a private session or a paid event; the
-- webhook registers paying learners (it runs without auth.uid()).
create or replace function public.guard_private_registration()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events;
begin
  if auth.uid() is null then
    return new;
  end if;

  select * into v_event from public.events where id = new.event_id;

  if v_event.host_id is distinct from auth.uid() then
    if v_event.is_private then
      raise exception 'This is a private session';
    end if;

    if v_event.price_cents > 0 then
      raise exception 'Buy a ticket to join this workshop';
    end if;

    if v_event.capacity is not null and (
      select count(*) from public.event_registrations where event_id = new.event_id
    ) >= v_event.capacity then
      raise exception 'This event is full';
    end if;
  end if;

  return new;
end;
$$;

-- Paid tickets are not cancelled by deleting the registration; refunds go
-- through the host (Stripe refund -> webhook).
drop policy if exists "Users cancel their own event registrations" on public.event_registrations;
create policy "Users cancel their own event registrations"
  on public.event_registrations for delete to authenticated
  using (
    auth.uid() = user_id
    and not exists (
      select 1 from public.events e
      where e.id = event_registrations.event_id and e.price_cents > 0
    )
  );

-- Seats taken, for "12 of 20 seats left" on the public workshop page.
create or replace function public.get_event_seats_taken(p_event_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer from public.event_registrations where event_id = p_event_id;
$$;

grant execute on function public.get_event_seats_taken(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Live rooms: only the host and registered attendees get in
-- ---------------------------------------------------------------------------

create or replace function public.guard_live_participant_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.live_audio_rooms;
begin
  select * into v_room from public.live_audio_rooms where id = new.room_id;

  if tg_op = 'INSERT' then
    if new.role <> 'listener' and auth.uid() is distinct from v_room.host_id then
      raise exception 'Only the host can assign the % role', new.role;
    end if;
    if new.is_removed and auth.uid() is distinct from v_room.host_id then
      raise exception 'Only the host can remove participants';
    end if;
    if auth.uid() is not null
       and auth.uid() is distinct from v_room.host_id
       and not exists (
         select 1 from public.event_registrations
         where event_id = v_room.event_id and user_id = auth.uid()
       ) then
      raise exception 'Register for this event to join';
    end if;
  else
    if new.role is distinct from old.role and auth.uid() is distinct from v_room.host_id then
      raise exception 'Only the host can change participant roles';
    end if;
    if new.is_removed is distinct from old.is_removed and auth.uid() is distinct from v_room.host_id then
      raise exception 'Only the host can remove participants';
    end if;
  end if;

  return new;
end;
$$;

-- One-off expert sessions get their own type.
alter table public.events drop constraint if exists events_event_type_check;
alter table public.events add constraint events_event_type_check
  check (event_type = any (array['live_class', 'workshop', 'masterclass', 'webinar', 'event']));

-- Trigger functions are not callable through the API.
revoke execute on function public.guard_event_price() from public, anon, authenticated;
