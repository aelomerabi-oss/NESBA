import { Linking, Platform } from 'react-native';
import { supabase } from './supabase';

// Public website. Phones send buyers here, because purchases happen on the
// web only (no Apple/Google in-app purchase fees).
export const SITE_URL = 'https://nesba.app';

export const PLATFORM_FEE_PERCENT = 20;

export function formatPrice(cents, currency = 'eur') {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format((cents || 0) / 100);
}

// "19.99" or "19,99" -> 1999; returns null when it is not a valid amount.
export function parsePrice(text) {
  const clean = String(text || '').trim().replace(',', '.');
  if (!clean) return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  return Math.round(parseFloat(clean) * 100);
}

async function invoke(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body });

  if (error || data?.error) {
    let message = data?.error;

    // Non-2xx responses carry the JSON body in error.context.
    if (!message && error?.context?.json) {
      try {
        message = (await error.context.json())?.error;
      } catch {
        message = null;
      }
    }

    throw new Error(message || error?.message || 'Something went wrong.');
  }

  return data;
}

function currentOrigin() {
  return Platform.OS === 'web' ? window.location.origin : SITE_URL;
}

/**
 * Send the learner to Stripe Checkout. On phones, open the same page on the
 * website instead, where the purchase is made.
 */
export async function startCheckout({ webPath, ...purchase }) {
  if (Platform.OS !== 'web') {
    await Linking.openURL(`${SITE_URL}${webPath}`);
    return;
  }

  const { url } = await invoke('stripe-checkout', {
    ...purchase,
    returnOrigin: currentOrigin(),
  });

  window.location.assign(url);
}

export function getPayoutStatus() {
  return invoke('stripe-connect', { action: 'status' });
}

export async function openPayoutOnboarding() {
  const { url } = await invoke('stripe-connect', {
    action: 'onboard',
    returnOrigin: currentOrigin(),
  });

  if (Platform.OS === 'web') window.location.assign(url);
  else await Linking.openURL(url);
}

export async function openPayoutDashboard() {
  const { url } = await invoke('stripe-connect', { action: 'dashboard' });

  if (Platform.OS === 'web') window.open(url, '_blank');
  else await Linking.openURL(url);
}

export async function canReceivePayments(userId) {
  const { data, error } = await supabase.rpc('creator_can_receive_payments', {
    p_user_id: userId,
  });

  if (error) return false;
  return !!data;
}

export async function setCoursePrice(courseId, priceCents) {
  const { error } = await supabase
    .from('courses')
    .update({ price_cents: priceCents, is_premium: priceCents > 0 })
    .eq('id', courseId);

  if (error) throw new Error(error.message);
}

export async function getMySales(userId) {
  const { data, error } = await supabase
    .from('course_purchases')
    .select('id,amount_cents,platform_fee_cents,currency,paid_at,course:courses(title)')
    .eq('seller_id', userId)
    .eq('status', 'paid')
    .order('paid_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return data || [];
}
