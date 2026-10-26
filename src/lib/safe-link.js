import { Alert, Linking } from 'react-native';

/*
 * Links typed by members (post links, project showcases, meeting links,
 * assignment links) are opened only when they are ordinary web, email or
 * phone links. A link such as "javascript:..." could otherwise run code in
 * the page of whoever taps it. The database refuses those too
 * (041_security_and_scale.sql); this also covers older rows.
 */

const ALLOWED = /^(https?:|mailto:|tel:)/i;
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

// The link to open, or null when it is not safe. "example.com" becomes https://example.com.
export function safeLink(url) {
  const link = String(url || '').trim();
  if (!link) return null;
  if (ALLOWED.test(link)) return link;
  if (!HAS_SCHEME.test(link) && /^[^\s/]+\.[^\s]+$/.test(link)) return `https://${link}`;
  return null;
}

export async function openExternalLink(url) {
  const link = safeLink(url);
  if (!link) {
    Alert.alert('Link not opened', 'This link does not look like a normal web address.');
    return;
  }
  try {
    await Linking.openURL(link);
  } catch {
    Alert.alert('Could not open link', link);
  }
}
