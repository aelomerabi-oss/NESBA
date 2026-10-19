import { supabase } from './supabase';
import { SITE_URL } from './payments';

/*
 * Workshops and masterclasses: live events with an optional ticket price.
 * Anyone can host a single paid workshop; learners buy a ticket through
 * stripe-checkout and stripe-webhook registers them.
 * Tables and rules are in src/sql/035_paid_events.sql.
 */

const EVENT_DETAIL =
  '*, organizations(name), host:profiles!events_host_id_fkey(id,full_name,avatar_url,bio,expertise), live_audio_rooms(id,status)';

// Lowest ticket price, so Stripe's own minimum is never a problem.
export const MIN_TICKET_CENTS = 100;

function check(error, fallback) {
  if (error) throw new Error(error.message || fallback);
}

// The public link a host shares on Instagram, LinkedIn or WhatsApp.
export function eventLink(eventId) {
  return `${SITE_URL}/event/${eventId}`;
}

export async function getEvent(id) {
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_DETAIL)
    .eq('id', id)
    .maybeSingle();

  check(error, 'Could not load this workshop.');
  if (!data) return null;

  return {
    ...data,
    liveRoom: (data.live_audio_rooms || []).find((room) => room.status === 'live') || null,
  };
}

export async function getSeatsTaken(eventId) {
  const { data, error } = await supabase.rpc('get_event_seats_taken', { p_event_id: eventId });
  if (error) return null;
  return data;
}

export async function isRegistered(eventId, userId) {
  if (!userId) return false;

  const { data } = await supabase
    .from('event_registrations')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle();

  return !!data;
}

// Free events only; paid seats come from the webhook.
export async function registerFree(eventId, userId) {
  const { error } = await supabase
    .from('event_registrations')
    .insert({ event_id: eventId, user_id: userId });

  if (error && error.code !== '23505') throw new Error(error.message);
}

export async function getMyTicketSales(userId) {
  const { data, error } = await supabase
    .from('event_ticket_purchases')
    .select('id,amount_cents,platform_fee_cents,currency,paid_at,event:events(title)')
    .eq('seller_id', userId)
    .eq('status', 'paid')
    .order('paid_at', { ascending: false })
    .limit(50);

  check(error, 'Could not load ticket sales.');
  return data || [];
}
