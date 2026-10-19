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

export async function getReviewsForBookings(bookingIds) {
  if (!bookingIds.length) return {};

  const { data, error } = await supabase
    .from('tutoring_reviews')
    .select('booking_id,rating,review')
    .in('booking_id', bookingIds);

  check(error, 'Could not load reviews.');
  return Object.fromEntries((data || []).map((r) => [r.booking_id, r]));
}

// Reviews of a teacher, newest first, plus the average rating.
export async function getTeacherReviews(teacherId) {
  const { data, error } = await supabase
    .from('tutoring_reviews')
    .select('id,rating,review,created_at,student:profiles!tutoring_reviews_student_id_fkey(full_name,avatar_url)')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false })
    .limit(50);

  check(error, 'Could not load reviews.');

  const reviews = data || [];
  const average = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : null;

  return { reviews, average };
}

// Average rating and count per teacher, for the offers list.
export async function getTeacherRatings(teacherIds) {
  if (!teacherIds.length) return {};

  const { data, error } = await supabase
    .from('tutoring_reviews')
    .select('teacher_id,rating')
    .in('teacher_id', teacherIds);

  check(error, 'Could not load ratings.');

  const totals = {};
  (data || []).forEach(({ teacher_id: id, rating }) => {
    totals[id] = totals[id] || { sum: 0, count: 0 };
    totals[id].sum += rating;
    totals[id].count += 1;
  });

  return Object.fromEntries(
    Object.entries(totals).map(([id, t]) => [id, { average: t.sum / t.count, count: t.count }])
  );
}

export async function reviewSession(bookingId, rating, review) {
  const { error } = await supabase.rpc('review_tutoring_session', {
    p_booking_id: bookingId,
    p_rating: rating,
    p_review: review,
  });

  check(error, 'Could not save your review.');
}

export async function completeBooking(bookingId) {
  const { error } = await supabase.rpc('complete_tutoring_booking', { p_booking_id: bookingId });
  check(error, 'Could not complete the session.');
}
