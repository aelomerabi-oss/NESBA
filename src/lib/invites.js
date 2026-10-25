import { Platform } from 'react-native';
import { supabase } from './supabase';
import { SITE_URL } from './payments';

/*
 * Invite a friend: every member has a personal link (/invite/<code>). A
 * visitor who opens it and then signs up is counted for the inviter, who
 * gets a notification and badges at 1, 5 and 25 friends.
 * Tables and rules are in src/sql/037_invites.sql.
 */

const KEY = 'nesba.inviteCode';
let pending = null;

// Badge milestones, the same as in 037_invites.sql.
export const INVITE_MILESTONES = [
  { count: 1, name: 'Friend Maker' },
  { count: 5, name: 'Community Builder' },
  { count: 25, name: 'NESBA Ambassador' },
];

function storage() {
  try {
    return Platform.OS === 'web' && typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function inviteLink(code) {
  return `${SITE_URL}/invite/${code}`;
}

// Your code (made on first use) and how many friends joined with it.
export async function getMyInvite() {
  const { data, error } = await supabase.rpc('get_my_invite');
  if (error) throw new Error(error.message || 'Could not load your invite link.');
  return { code: data.code, joined: Number(data.joined) || 0 };
}

// Name and photo of whoever shared this link, or null for an unknown code.
export async function getInviter(code) {
  const { data, error } = await supabase.rpc('get_inviter', { p_code: code });
  if (error) throw new Error(error.message || 'Could not load this invite.');
  return data?.[0] || null;
}

// Keep the code until the visitor has an account. On the web it survives the
// email confirmation step.
export function rememberInvite(code) {
  if (typeof code !== 'string' || !/^[a-z0-9]{4,32}$/i.test(code)) return;
  pending = code.toLowerCase();
  try {
    storage()?.setItem(KEY, pending);
  } catch {
    // Private mode: the in-memory copy still works in this tab.
  }
}

function forgetInvite() {
  pending = null;
  try {
    storage()?.removeItem(KEY);
  } catch {
    // ignore
  }
}

/*
 * Once someone is signed in, count them for the friend who invited them.
 * The database only accepts accounts made in the last few days, so an
 * existing member opening a link changes nothing.
 */
export async function claimPendingInvite() {
  let code = pending;
  try {
    code = code || storage()?.getItem(KEY);
  } catch {
    // ignore
  }
  if (!code) return null;

  const { data, error } = await supabase.rpc('claim_invite', { p_code: code });
  if (error) return null; // Try again next time the app opens.

  forgetInvite();
  return data;
}
