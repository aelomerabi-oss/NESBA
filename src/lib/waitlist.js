import { supabase } from './supabase';

export const WAITLIST_INTERESTS = [
  { key: 'learn', label: 'Learn', icon: 'school-outline' },
  { key: 'teach', label: 'Teach', icon: 'easel-outline' },
  { key: 'organization', label: 'Organization', icon: 'business-outline' },
];

// Puts the email on the launch waitlist (see 042_waitlist.sql).
export async function joinWaitlist({ email, name, interest, source }) {
  const { error } = await supabase.rpc('join_waitlist', {
    p_email: email,
    p_name: name || null,
    p_interest: interest,
    p_source: source || null,
  });
  if (error) throw error;
}

export async function getWaitlistCount() {
  const { data, error } = await supabase.rpc('waitlist_count');
  if (error) return null;
  return data;
}
