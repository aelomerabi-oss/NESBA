import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { colors, radius, spacing, typography } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { completeAuthFromUrl } from '../lib/social-auth';

/*
 * Opened from the password reset email (redirectTo /reset-password).
 *
 * The link carries either a PKCE ?code=... or implicit-flow tokens in the
 * #fragment. The Supabase client is created with detectSessionInUrl: false,
 * so the recovery session is established here.
 */
export default function ResetPasswordScreen() {
  const linkedUrl = Linking.useURL();
  const [status, setStatus] = useState('checking'); // checking | ready | invalid | saving | done
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  useEffect(() => {
    const url = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.href : linkedUrl;
    if (!url) return;

    (async () => {
      try {
        const session =
          (await completeAuthFromUrl(url)) ||
          (await supabase.auth.getSession()).data.session;

        if (!session) throw new Error('This reset link is missing or has expired.');

        setStatus('ready');
      } catch (e) {
        setStatus('invalid');
        setMessage(e.message || 'This reset link is invalid or has expired.');
      }
    })();
  }, [linkedUrl]);

  const save = async () => {
    setMessage('');
    if (password.length < 8) return setMessage('Use at least 8 characters.');
    if (password !== confirm) return setMessage('The passwords do not match.');

    setStatus('saving');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setStatus('ready');
      setMessage(error.message);
      return;
    }
    setStatus('done');
    setTimeout(() => router.replace('/(tabs)'), 1500);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Choose a new password</Text>

        {status === 'checking' && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />}

        {status === 'invalid' && (
          <>
            <Text style={styles.error}>{message}</Text>
            <Pressable style={styles.button} onPress={() => router.replace('/login')}>
              <Text style={styles.buttonText}>Back to log in</Text>
            </Pressable>
          </>
        )}

        {(status === 'ready' || status === 'saving') && (
          <>
            <TextInput
              style={styles.input}
              placeholder="New password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm new password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={confirm}
              onChangeText={setConfirm}
              autoCapitalize="none"
            />
            {!!message && <Text style={styles.error}>{message}</Text>}
            <Pressable style={styles.button} disabled={status === 'saving'} onPress={save}>
              <Text style={styles.buttonText}>{status === 'saving' ? 'Saving…' : 'Save new password'}</Text>
            </Pressable>
          </>
        )}

        {status === 'done' && <Text style={styles.success}>Your password has been changed. Signing you in…</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: spacing.lg },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  title: { ...typography.h2 },
  input: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, color: colors.text, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 15 },
  button: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: 13, alignItems: 'center', marginTop: spacing.xs },
  buttonText: { color: '#fff', fontWeight: '700' },
  error: { ...typography.caption, color: colors.danger },
  success: { ...typography.body, color: colors.success },
});
