import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { getInviter, rememberInvite } from '../../lib/invites';
import { usePageMeta } from '../../lib/page-meta';
import PersonAvatar from '../../components/PersonAvatar';

const REASONS = [
  { icon: 'school-outline', text: 'Practical business courses, many of them free' },
  { icon: 'radio-outline', text: 'Live workshops and masterclasses with entrepreneurs' },
  { icon: 'ribbon-outline', text: 'Certificates you can add to LinkedIn' },
  { icon: 'people-outline', text: 'A community of starters and zzp’ers' },
];

/*
 * Landing page for a member's invite link. The code is remembered right away,
 * so the friend is counted however they go on to create their account.
 */
export default function InviteLandingScreen() {
  const { code } = useLocalSearchParams();
  const { session, loading: authLoading } = useAuth();

  const [inviter, setInviter] = useState(null);
  const [loading, setLoading] = useState(true);

  const firstName = inviter?.full_name?.split(' ')[0];
  usePageMeta(
    firstName ? `${firstName} invited you to NESBA` : 'Join NESBA',
    'Learn from people who have built a business: courses, live workshops and 1-to-1 mentoring. Free to join.'
  );

  useEffect(() => {
    getInviter(code)
      .then(setInviter)
      .catch(() => setInviter(null))
      .finally(() => setLoading(false));
  }, [code]);

  useEffect(() => {
    if (!authLoading && !session && inviter) rememberInvite(code);
  }, [authLoading, session, inviter, code]);

  if (loading || authLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {inviter ? (
        <View style={styles.hero}>
          <PersonAvatar person={inviter} size={72} />
          <Text style={styles.title} accessibilityRole="header">
            {inviter.full_name} invited you to NESBA
          </Text>
        </View>
      ) : (
        <View style={styles.hero}>
          <Ionicons name="people-circle-outline" size={72} color={colors.primary} />
          <Text style={styles.title} accessibilityRole="header">Join NESBA</Text>
          <Text style={styles.subtitle}>This invite link is not valid anymore, but you are still welcome.</Text>
        </View>
      )}

      <Text style={styles.subtitle}>Learn to build your business from people who have done it.</Text>

      <View style={styles.reasons}>
        {REASONS.map((r) => (
          <View key={r.text} style={styles.reason}>
            <Ionicons name={r.icon} size={20} color={colors.primary} />
            <Text style={styles.reasonText}>{r.text}</Text>
          </View>
        ))}
      </View>

      {session ? (
        <>
          <Text style={styles.member}>You already have a NESBA account.</Text>
          <Pressable style={styles.button} onPress={() => router.replace('/')}>
            <Text style={styles.buttonText}>Go to Home</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Pressable style={styles.button} onPress={() => router.push('/signup')}>
            <Text style={styles.buttonText}>Join NESBA free</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={() => router.push('/login')}>
            <Text style={styles.secondaryText}>I already have an account</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/')}>
            <Text style={styles.link}>Look around first</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2, width: '100%', maxWidth: 560, alignSelf: 'center' },
  hero: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg },
  title: { ...typography.h1, fontSize: 26, textAlign: 'center' },
  subtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
  reasons: { marginTop: spacing.lg, gap: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
  reason: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reasonText: { ...typography.body, fontSize: 15, flex: 1 },
  member: { ...typography.body, textAlign: 'center', marginTop: spacing.lg },
  button: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center', marginTop: spacing.lg },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  secondary: { borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md, paddingVertical: 13, alignItems: 'center', marginTop: spacing.sm },
  secondaryText: { color: colors.primary, fontWeight: '800', fontSize: 15 },
  link: { ...typography.caption, textAlign: 'center', marginTop: spacing.md, textDecorationLine: 'underline' },
});
