import { Platform } from 'react-native';

/*
 * Where to send someone after they log in or sign up, for example back to
 * the workshop page they opened from a teacher's link. On the web it is kept
 * in localStorage, so it survives the email confirmation step.
 */

const KEY = 'nesba.returnTo';
let pending = null;

function storage() {
  try {
    return Platform.OS === 'web' && typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

// Only paths inside the app, never another site.
function isSafe(path) {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') && !path.includes('\\');
}

export function setReturnTo(path) {
  if (!isSafe(path)) return;
  pending = path;
  try {
    storage()?.setItem(KEY, path);
  } catch {
    // Private mode: the in-memory copy still works in this tab.
  }
}

// The saved path (once), or null.
export function takeReturnTo() {
  let path = pending;
  try {
    path = path || storage()?.getItem(KEY);
    storage()?.removeItem(KEY);
  } catch {
    // ignore
  }
  pending = null;
  return isSafe(path) ? path : null;
}
