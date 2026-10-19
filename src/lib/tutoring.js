import { supabase } from './supabase';

/*
 * Paid private teaching: teachers publish 1-to-1 offers, students book a
 * time and pay through Stripe (see stripe-checkout / stripe-webhook).
 * Tables and rules are in src/sql/032_payments.sql.
 */

const TEACHER = 'teacher:profiles!tutoring_offers_teacher_id_fkey(id,full_name,avatar_url,bio,expertise)';

export const SESSION_LENGTHS = [30, 45, 60, 90, 120];

function check(error, fallback) {
  if (error) throw new Error(error.message || fallback);
}

export async function getOffers() {
  const { data, error } = await supabase
    .from('tutoring_offers')
    .select(`*, ${TEACHER}`)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  check(error, 'Could not load private sessions.');
  return data || [];
}

export async function getOffer(id) {
  const { data, error } = await supabase
    .from('tutoring_offers')
    .select(`*, ${TEACHER}`)
    .eq('id', id)
    .maybeSingle();

  check(error, 'Could not load this offer.');
  return data;
}

export async function getMyOffers(teacherId) {
  const { data, error } = await supabase
    .from('tutoring_offers')
    .select('*')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false });

  check(error, 'Could not load your offers.');
  return data || [];
}

export async function createOffer(teacherId, offer) {
  const { error } = await supabase.from('tutoring_offers').insert({
    teacher_id: teacherId,
    title: offer.title.trim(),
    description: offer.description.trim() || null,
    duration_minutes: offer.durationMinutes,
    price_cents: offer.priceCents,
    availability: offer.availability.trim() || null,
  });

  check(error, 'Could not save the offer.');
}

export async function setOfferActive(offerId, isActive) {
  const { error } = await supabase
    .from('tutoring_offers')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', offerId);

  check(error, 'Could not update the offer.');
}

// Paid and upcoming/recent sessions, as student or as teacher.
export async function getMyBookings(userId) {
  const { data, error } = await supabase
    .from('tutoring_bookings')
    .select(`
      *,
      offer:tutoring_offers(title),
      teacher:profiles!tutoring_bookings_teacher_id_fkey(id,full_name,avatar_url),
      student:profiles!tutoring_bookings_student_id_fkey(id,full_name,avatar_url),
      event:events(id,status,live_audio_rooms(id,status))
    `)
    .or(`student_id.eq.${userId},teacher_id.eq.${userId}`)
    .in('status', ['confirmed', 'completed'])
    .order('starts_at', { ascending: true });

  check(error, 'Could not load your sessions.');

  return (data || []).map((booking) => ({
    ...booking,
    liveRoom: (booking.event?.live_audio_rooms || []).find((room) => room.status === 'live') || null,
  }));
}

export async function completeBooking(bookingId) {
  const { error } = await supabase.rpc('complete_tutoring_booking', { p_booking_id: bookingId });
  check(error, 'Could not complete the session.');
}
