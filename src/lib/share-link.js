import { Alert, Platform, Share } from 'react-native';

/*
 * Share a link: the phone's share sheet, the browser's share sheet when it
 * has one, otherwise copy it to the clipboard.
 */
export async function shareLink({ title, message, url }) {
  const text = message ? `${message}\n${url}` : url;

  if (Platform.OS !== 'web') {
    await Share.share({ title, message: text, url });
    return;
  }

  if (navigator.share) {
    try {
      await navigator.share({ title, text: message, url });
      return;
    } catch (error) {
      if (error?.name === 'AbortError') return;
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    Alert.alert('Link copied', 'Paste it in your post, story, bio or chat.');
  } catch {
    Alert.alert('Your link', url);
  }
}
