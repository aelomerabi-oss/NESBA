import { supabase } from './supabase';

/*
 * Reminders are the automatic follow-ups from src/sql/038_follow_ups.sql:
 * "keep going", "welcome", "new on NESBA" and unfinished purchases.
 * Workshop and session reminders are not affected.
 */
export async function getRemindersEnabled(userId) {
  const { data } = await supabase
    .from('notification_preferences')
    .select('reminders_enabled')
    .eq('user_id', userId)
    .maybeSingle();

  return data?.reminders_enabled !== false;
}

export async function setRemindersEnabled(userId, enabled) {
  const { error } = await supabase
    .from('notification_preferences')
    .upsert({ user_id: userId, reminders_enabled: enabled, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

  if (error) throw new Error(error.message || 'Could not save your setting.');
}
