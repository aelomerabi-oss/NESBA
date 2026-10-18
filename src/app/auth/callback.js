import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { colors, spacing, typography } from '../../constants/theme';
import { completeAuthFromUrl } from '../../lib/social-auth';

/*
 * Redirect target for Google / Apple sign-in.
 *
 * Normally the sign-in popup (web) or auth session (phone) is closed by
 * lib/social-auth before this screen is shown. If the browser navigated
 * here directly instead, finish the sign-in from the URL.
 */
export default function AuthCallbackScreen() {
  const linkedUrl = Linking.useURL();
  const [message, setMessage] = useState('Signing you in…');

  useEffect(() => {
    // Inside a popup, maybeCompleteAuthSession hands the URL to the opener.
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.opener) {
      return;
    }

    const url =
      Platform.OS === 'web' && typeof window !== 'undefined'
        ? window.location.href
        : linkedUrl;

    if (!url) {
      return;
    }

    completeAuthFromUrl(url)
      .then((session) => {
        router.replace(session ? '/(tabs)' : '/login');
      })
      .catch((error) => setMessage(error.message || 'Sign in failed.'));
  }, [linkedUrl]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, gap: spacing.sm, padding: spacing.lg },
  text: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
});
