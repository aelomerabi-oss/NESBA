import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { colors, isDarkTheme, radius, spacing, typography } from '../../constants/theme';
import { saveThemeNameAndReload } from '../../lib/theme-preference';
import { useAuth } from '../../context/AuthContext';

function DarkModeRow() {
  return (
    <View style={[styles.row, styles.lastRow]}>
      <Ionicons name="moon-outline" size={20} color={colors.textMuted} />
      <Text style={styles.rowLabel}>Dark mode</Text>
      <Switch
        value={isDarkTheme}
        onValueChange={(on) => saveThemeNameAndReload(on ? 'dark' : 'light')}
        trackColor={{ true: colors.primary, false: colors.border }}
        thumbColor="#fff"
      />
    </View>
  );
}

export default function ProfileScreen() {
  const { user, session, signOut, refreshProfile } = useAuth();

  // Pick up changes made on the Edit Profile screen, such as a new photo.
  useFocusEffect(
    // refreshProfile is a new function on every render, so depending on it
    // would refresh in a loop; the user id is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useCallback(() => {
      if (session) refreshProfile();
    }, [session?.user?.id])
  );

  const rows = [
    { icon: 'school-outline', label: 'Your Learning', route: '/learn' },
    { icon: 'create-outline', label: 'Creator Studio', route: '/creator' },
    { icon: 'person-outline', label: 'Edit Profile', route: '/edit-profile' },
    { icon: 'eye-outline', label: 'View Public Profile', route: user?.id ? `/user/${user.id}` : null },
    { icon: 'ribbon-outline', label: 'Certificates & Badges', route: '/learn' },
    { icon: 'notifications-outline', label: 'Notifications', route: '/notifications' },
    { icon: 'chatbubbles-outline', label: 'Messages', route: '/messages' },
    { icon: 'headset-outline', label: 'Media & Podcasts', route: '/media' },
    { icon: 'business-outline', label: 'Organizations', route: '/organizations' },
    { icon: 'chatbox-ellipses-outline', label: 'Help & Feedback', route: '/feedback' },
    { icon: 'shield-checkmark-outline', label: 'Privacy Policy', route: '/privacy' },
    { icon: 'document-text-outline', label: 'Terms of Use', route: '/terms' },
  ];

  if (!session) {
    return (
      <View style={[styles.container, styles.guestContainer]}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={32} color="#fff" />
        </View>
        <Text style={styles.name}>You're browsing as a guest</Text>
        <Text style={styles.email}>
          Log in to save progress, earn certificates, and build your NESBA profile
        </Text>
        <Pressable style={styles.loginBtn} onPress={() => router.push('/login')}>
          <Text style={styles.loginBtnText}>Log In / Sign Up</Text>
        </Pressable>

        <View style={[styles.section, styles.guestSettings]}>
          <DarkModeRow />
        </View>
      </View>
    );
  }

  const allRows =
    user.role === 'admin'
      ? [...rows, { icon: 'analytics-outline', label: 'Admin Dashboard', route: '/admin' }]
      : rows;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: spacing.xl }}
    >
      <View style={styles.header}>
        {user.avatarUrl ? (
          <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>

      <View style={styles.section}>
        {allRows.map((row) => (
          <Pressable
            key={row.label}
            style={styles.row}
            onPress={() => row.route && router.push(row.route)}
          >
            <Ionicons
              name={row.icon}
              size={20}
              color={colors.textMuted}
            />

            <Text style={styles.rowLabel}>{row.label}</Text>

            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textMuted}
            />
          </Pressable>
        ))}
      </View>

      <View style={[styles.section, styles.settingsSection]}>
        <DarkModeRow />
      </View>

      <Pressable style={styles.logoutBtn} onPress={signOut}>
        <Text style={styles.logoutText}>Log Out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
  },

  guestContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  header: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },

  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },

  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },

  name: {
    ...typography.h2,
    textAlign: 'center',
  },

  email: {
    ...typography.caption,
    marginTop: 2,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },

  loginBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },

  loginBtnText: {
    color: '#fff',
    fontWeight: '700',
  },

  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.premium,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
  },

  premiumBannerTitle: {
    fontWeight: '700',
    color: '#181C2E',
    fontSize: 15,
  },

  premiumBannerSub: {
    color: '#181C2E',
    fontSize: 12,
    marginTop: 2,
  },

  manageBanner: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },

  manageBannerText: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },

  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  lastRow: {
    borderBottomWidth: 0,
  },

  settingsSection: {
    marginTop: spacing.md,
  },

  guestSettings: {
    marginTop: spacing.xl,
    alignSelf: 'stretch',
  },

  rowLabel: {
    ...typography.body,
    flex: 1,
  },

  logoutBtn: {
    marginTop: spacing.lg,
    alignItems: 'center',
    padding: spacing.sm,
  },

  logoutText: {
    color: colors.danger,
    fontWeight: '600',
  },
});