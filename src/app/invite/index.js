import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router, useFocusEffect } from 'expo-router';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { getMyInvite, inviteLink, INVITE_MILESTONES } from '../../lib/invites';
import { shareLink } from '../../lib/share-link';

const MESSAGE =
  'I learn on NESBA: practical business courses, live workshops and 1-to-1 mentoring from people who have built a business. Join me, it is free:';

/*
 * A member's own invite link, ready to share, with the friends who joined
 * and the badges that come with them.
 */
export default function InviteFriendsScreen() {
  const { session } = useAuth();

  const [invite, setInvite] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      getMyInvite().then(setInvite).catch((e) => setError(e.message));
    }, [session])
  );

  if (!session) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="gift-outline" size={48} color={colors.primary} />
        <Text style={styles.title}>Invite friends</Text>
        <Text style={styles.subtitle}>Log in to get your personal invite link.</Text>
        <Pressable style={styles.button} onPress={() => router.push('/login')}>
          <Text style={styles.buttonText}>Log in</Text>
        </Pressable>
      </View>
    );
  }

  if (!invite) {
    return (
      <View style={[styles.container, styles.center]}>
        {error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator color={colors.primary} />}
      </View>
    );
  }

  const url = inviteLink(invite.code);
  const text = `${MESSAGE} ${url}`;
  const next = INVITE_MILESTONES.find((m) => invite.joined < m.count);

  const copy = async () => {
    await Clipboard.setStringAsync(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const open = (link) => Linking.openURL(link).catch(() => Alert.alert('Could not open', 'Copy the link instead.'));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Ionicons name="gift-outline" size={44} color={colors.primary} />
        <Text style={styles.title} accessibilityRole="header">Invite friends to NESBA</Text>
        <Text style={styles.subtitle}>
          Share your link. When a friend joins with it, you both grow the community and you earn badges.
        </Text>
      </View>

      <View style={styles.linkBox}>
        <Text style={styles.linkText} selectable numberOfLines={1}>{url}</Text>
        <Pressable style={styles.copy} onPress={copy} accessibilityLabel="Copy invite link">
          <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color={colors.primary} />
          <Text style={styles.copyText}>{copied ? 'Copied' : 'Copy'}</Text>
        </Pressable>
      </View>

      <Pressable style={styles.button} onPress={() => shareLink({ title: 'Join me on NESBA', message: MESSAGE, url })}>
        <Ionicons name="share-social-outline" size={18} color="#fff" />
        <Text style={styles.buttonText}>Share my invite link</Text>
      </Pressable>

      <View style={styles.row}>
        <Pressable style={styles.channel} onPress={() => open(`https://wa.me/?text=${encodeURIComponent(text)}`)}>
          <Ionicons name="logo-whatsapp" size={18} color={colors.text} />
          <Text style={styles.channelText}>WhatsApp</Text>
        </Pressable>
        <Pressable style={styles.channel} onPress={() => open(`https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`)}>
          <Ionicons name="logo-linkedin" size={18} color={colors.text} />
          <Text style={styles.channelText}>LinkedIn</Text>
        </Pressable>
        <Pressable style={styles.channel} onPress={() => open(`mailto:?subject=${encodeURIComponent('Join me on NESBA')}&body=${encodeURIComponent(text)}`)}>
          <Ionicons name="mail-outline" size={18} color={colors.text} />
          <Text style={styles.channelText}>Email</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.count}>{invite.joined}</Text>
        <Text style={styles.countLabel}>{invite.joined === 1 ? 'friend joined with your link' : 'friends joined with your link'}</Text>
        {next && (
          <Text style={styles.next}>
            {next.count - invite.joined} more to earn the “{next.name}” badge
          </Text>
        )}
      </View>

      <Text style={styles.section}>Badges</Text>
      {INVITE_MILESTONES.map((m) => {
        const earned = invite.joined >= m.count;
        return (
          <View key={m.name} style={styles.badge}>
            <Ionicons name={earned ? 'ribbon' : 'ribbon-outline'} size={22} color={earned ? colors.primary : colors.textMuted} />
            <View style={{ flex: 1 }}>
              <Text style={styles.badgeName}>{m.name}</Text>
              <Text style={styles.badgeText}>{m.count === 1 ? '1 friend joins' : `${m.count} friends join`}</Text>
            </View>
            <Text style={[styles.badgeState, earned && styles.earned]}>
              {earned ? 'Earned' : `${Math.min(invite.joined, m.count)}/${m.count}`}
            </Text>
          </View>
        );
      })}

      <Text style={styles.section}>How it works</Text>
      <Text style={styles.step}>1. Share your link in a chat, post or your bio.</Text>
      <Text style={styles.step}>2. Your friend opens it and creates a free account.</Text>
      <Text style={styles.step}>3. You get a notification, and badges at 1, 5 and 25 friends.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { justifyContent: 'center', alignItems: 'center', padding: spacing.lg, gap: spacing.sm },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2, width: '100%', maxWidth: 560, alignSelf: 'center' },
  hero: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  title: { ...typography.h1, fontSize: 24, textAlign: 'center' },
  subtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  linkBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingLeft: spacing.md },
  linkText: { ...typography.body, flex: 1, fontSize: 15 },
  copy: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, paddingVertical: 14 },
  copyText: { color: colors.primary, fontWeight: '800' },
  button: { flexDirection: 'row', gap: 8, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 15, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  channel: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 12, backgroundColor: colors.surface },
  channelText: { ...typography.body, fontWeight: '700', fontSize: 14 },
  card: { alignItems: 'center', marginTop: spacing.lg, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primarySoft },
  count: { ...typography.h1, fontSize: 40, color: colors.primary },
  countLabel: { ...typography.body, fontWeight: '700' },
  next: { ...typography.caption, marginTop: 4 },
  section: { ...typography.body, fontWeight: '800', fontSize: 17, marginTop: spacing.lg, marginBottom: spacing.sm },
  badge: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  badgeName: { ...typography.body, fontWeight: '700' },
  badgeText: { ...typography.caption },
  badgeState: { ...typography.caption, fontWeight: '800' },
  earned: { color: colors.primary },
  step: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
  error: { ...typography.caption, color: colors.danger, textAlign: 'center' },
});
