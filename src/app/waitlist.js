import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, radius, shadow, spacing, typography } from '../constants/theme';
import { usePageMeta } from '../lib/page-meta';
import { WAITLIST_INTERESTS, getWaitlistCount, joinWaitlist } from '../lib/waitlist';
import { shareLink } from '../lib/share-link';
import { SITE_URL } from '../lib/payments';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { FadeInUp, PressableScale } from '../components/motion';

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/*
 * Launch waitlist: leave your email to hear when the NESBA app is in the
 * App Store and Google Play, and get the newsletter (beehiiv).
 * ?ref=instagram (or any word) is saved as where the sign-up came from.
 */
export default function WaitlistScreen() {
  const { ref } = useLocalSearchParams();
  usePageMeta(
    'Get early access to NESBA',
    'Join the waitlist and be the first to know when the NESBA app launches. Courses, live workshops and 1-to-1 mentoring for entrepreneurs.'
  );

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [interest, setInterest] = useState('learn');
  const [count, setCount] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    getWaitlistCount().then(setCount);
  }, [done]);

  const submit = async () => {
    const clean = email.trim().toLowerCase();
    if (!EMAIL.test(clean)) {
      setError('Enter a valid email address.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await joinWaitlist({ email: clean, name: name.trim(), interest, source: typeof ref === 'string' ? ref : null });
      setDone(true);
    } catch (e) {
      setError(e?.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <FadeInUp style={styles.hero}>
        <View style={styles.badge}>
          <Ionicons name="rocket-outline" size={14} color={colors.primary} />
          <Text style={styles.badgeText}>Launching soon</Text>
        </View>
        <Text style={styles.title} accessibilityRole="header">Be first in line for NESBA</Text>
        <Text style={styles.subtitle}>
          Courses, live workshops and 1-to-1 mentoring from entrepreneurs who have built a business. Leave your
          email and we will tell you the moment the app is live.
        </Text>
        {count > 0 && (
          <Text style={styles.count}>
            {count === 1 ? '1 person is' : `${count.toLocaleString()} people are`} already on the list
          </Text>
        )}
      </FadeInUp>

      {done ? (
        <FadeInUp style={styles.card}>
          <Animated.View entering={ZoomIn.springify().damping(12)} style={styles.center}>
            <Ionicons name="checkmark-circle" size={56} color={colors.success} />
          </Animated.View>
          <Text style={styles.doneTitle}>You are on the list</Text>
          <Text style={styles.doneText}>
            We will email you when NESBA launches. Know someone who is starting a business? Send them the link.
          </Text>
          <PressableScale
            style={styles.button}
            onPress={() => shareLink({ url: `${SITE_URL}/waitlist?ref=friend`, title: 'NESBA is launching soon', message: 'I joined the NESBA waitlist. Courses and mentoring for entrepreneurs:' })}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>Share with a friend</Text>
          </PressableScale>
          <Pressable onPress={() => router.push('/')} accessibilityRole="link">
            <Text style={styles.link}>Look around the platform</Text>
          </Pressable>
        </FadeInUp>
      ) : (
        <FadeInUp delay={120} style={styles.card}>
          <Text style={styles.label}>I want to</Text>
          <View style={styles.choices} role="radiogroup" aria-label="I want to">
            {WAITLIST_INTERESTS.map((option) => {
              const active = interest === option.key;
              return (
                <Pressable
                  key={option.key}
                  style={[styles.choice, active && styles.choiceActive]}
                  onPress={() => setInterest(option.key)}
                  role="radio"
                  aria-checked={active}
                >
                  <Ionicons name={option.icon} size={16} color={active ? '#fff' : colors.primary} />
                  <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>First name (optional)</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your first name"
            placeholderTextColor={colors.textSecondary}
            autoComplete="given-name"
            maxLength={120}
            accessibilityLabel="First name"
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setError('');
            }}
            placeholder="you@example.com"
            placeholderTextColor={colors.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            maxLength={254}
            onSubmitEditing={submit}
            accessibilityLabel="Email"
          />

          {!!error && <Text style={styles.error}>{error}</Text>}

          <PressableScale style={[styles.button, saving && styles.disabled]} onPress={submit} disabled={saving} accessibilityRole="button">
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Join the waitlist</Text>}
          </PressableScale>

          <Text style={styles.note}>
            We send launch news and the NESBA newsletter. One click to unsubscribe. See our{' '}
            <Text style={styles.inlineLink} onPress={() => router.push('/privacy')}>privacy policy</Text>.
          </Text>
        </FadeInUp>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2, width: '100%', maxWidth: 560, alignSelf: 'center' },
  center: { alignSelf: 'center' },
  hero: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  badgeText: { color: colors.primary, fontWeight: '800', fontSize: 12 },
  title: { ...typography.h1, fontSize: 32, letterSpacing: -0.8, textAlign: 'center' },
  subtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  count: { ...typography.caption, fontWeight: '700', color: colors.primary },
  card: { marginTop: spacing.lg, gap: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, ...shadow.raised },
  label: { ...typography.caption, fontWeight: '800', marginTop: spacing.xs },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  choiceActive: { backgroundColor: colors.primary },
  choiceText: { color: colors.primary, fontWeight: '800', fontSize: 14 },
  choiceTextActive: { color: '#fff' },
  input: { ...typography.body, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 11, color: colors.text, backgroundColor: colors.background },
  error: { color: colors.error || '#d33', fontWeight: '700' },
  button: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center', marginTop: spacing.sm, ...shadow.glow },
  disabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  note: { ...typography.caption, textAlign: 'center' },
  inlineLink: { textDecorationLine: 'underline', fontWeight: '700' },
  doneTitle: { ...typography.h2, textAlign: 'center' },
  doneText: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  link: { ...typography.caption, textAlign: 'center', marginTop: spacing.sm, textDecorationLine: 'underline' },
});
