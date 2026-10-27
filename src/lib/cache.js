import { supabase } from './supabase';

/*
 * A small short-lived memory cache for data that many screens ask for and
 * that changes rarely (course catalog, categories, trending stats). It
 * saves database requests when people move between tabs, and two screens
 * asking at the same moment share one request.
 *
 * Only use it for data that looks the same to everyone; never for a
 * person's own messages, purchases or progress.
 */

const entries = new Map();

export async function cached(key, ttlMs, loader, { fresh = false } = {}) {
  const now = Date.now();
  const hit = entries.get(key);

  if (!fresh && hit && (hit.pending || now - hit.at < ttlMs)) {
    return hit.pending || hit.value;
  }

  const pending = loader();
  entries.set(key, { pending, at: now });

  try {
    const value = await pending;
    entries.set(key, { value, at: Date.now() });
    return value;
  } catch (error) {
    // Do not keep failures; the next call tries again.
    entries.delete(key);
    throw error;
  }
}

export function clearCache(prefix = '') {
  for (const key of entries.keys()) {
    if (key.startsWith(prefix)) entries.delete(key);
  }
}

// What a person may see can change when they sign in or out.
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
    clearCache();
  }
});
