import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, radius, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

const CREATOR_ROLES = ['teacher', 'mentor', 'organization', 'admin'];

// Window widths where the side menu replaces the bottom tabs, and where it
// shows labels as well as icons.
export const SIDE_MENU_MIN_WIDTH = 768;
export const FULL_SIDE_MENU_MIN_WIDTH = 1100;

// Width the side menu takes from the page (0 on phones).
export function sideMenuWidth(windowWidth) {
  if (windowWidth >= FULL_SIDE_MENU_MIN_WIDTH) return 248;
  if (windowWidth >= SIDE_MENU_MIN_WIDTH) return 76;
  return 0;
}

const SHORTCUTS = [
  { icon: 'person-circle-outline', label: '1-to-1 sessions', route: '/tutoring' },
  { icon: 'construct-outline', label: 'Projects', route: '/projects' },
  { icon: 'play-circle-outline', label: 'Recordings', route: '/recordings', member: true },
  { icon: 'chatbubbles-outline', label: 'Messages', route: '/messages', member: true },
  { icon: 'notifications-outline', label: 'Notifications', route: '/notifications', member: true },
  { icon: 'create-outline', label: 'Creator Studio', route: '/creator', creator: true },
  { icon: 'gift-outline', label: 'Invite friends', route: '/invite', member: true },
  { icon: 'help-circle-outline', label: 'FAQ', route: '/faq' },
];

/*
 * Side menu that replaces the bottom tab bar on tablets and computers.
 * Used as the custom tabBar of the (tabs) layout; `compact` shows icons only.
 */
export default function SideNav({ state, descriptors, navigation, compact }) {
  const { session, user } = useAuth();
  const isCreator = CREATOR_ROLES.includes(user?.role);

  const shortcuts = SHORTCUTS.filter((s) => (!s.member || session) && (!s.creator || isCreator));

  return (
    <View style={[styles.container, compact && styles.compact]} accessibilityRole="navigation">
      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.brand} onPress={() => navigation.navigate('index')} accessibilityRole="link" accessibilityLabel="NESBA home">
          <Image source={require('../assets/images/nesba-logo.png')} style={styles.logo} accessibilityLabel="NESBA logo" />
          {!compact && <Text style={styles.brandText}>NESBA</Text>}
        </Pressable>

        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const label = options.title ?? route.name;
          const color = focused ? colors.primary : colors.textSecondary;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={[styles.item, focused && styles.itemActive, compact && styles.itemCompact]}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
            >
              {options.tabBarIcon?.({ focused, color, size: 22 })}
              {!compact && <Text style={[styles.itemText, { color }, focused && styles.itemTextActive]}>{label}</Text>}
            </Pressable>
          );
        })}

        <View style={styles.divider} />

        {shortcuts.map((s) => (
          <Pressable
            key={s.route}
            onPress={() => router.push(s.route)}
            style={[styles.item, compact && styles.itemCompact]}
            accessibilityRole="link"
            accessibilityLabel={s.label}
          >
            <Ionicons name={s.icon} size={20} color={colors.textSecondary} />
            {!compact && <Text style={[styles.itemText, styles.shortcutText]}>{s.label}</Text>}
          </Pressable>
        ))}

        {!session && !compact && (
          <View style={styles.join}>
            <Text style={styles.joinTitle}>New to NESBA?</Text>
            <Text style={styles.joinText}>Learn from entrepreneurs who have done it. Free to join.</Text>
            <Pressable style={styles.joinButton} onPress={() => router.push('/signup')} accessibilityRole="button">
              <Text style={styles.joinButtonText}>Join free</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/login')} accessibilityRole="button">
              <Text style={styles.login}>Log in</Text>
            </Pressable>
          </View>
        )}

        {!session && compact && (
          <Pressable style={[styles.item, styles.itemCompact]} onPress={() => router.push('/signup')} accessibilityRole="button" accessibilityLabel="Join free">
            <Ionicons name="person-add-outline" size={20} color={colors.primary} />
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: 248, height: '100%', backgroundColor: colors.surface, borderRightWidth: 1, borderRightColor: colors.border },
  compact: { width: 76 },
  inner: { padding: spacing.sm, paddingTop: spacing.md, gap: 2 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm, paddingBottom: spacing.md, justifyContent: 'flex-start' },
  logo: { width: 40, height: 40, borderRadius: 20 },
  brandText: { fontSize: 22, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4, paddingVertical: 11, paddingHorizontal: spacing.sm + 4, borderRadius: radius.md },
  itemCompact: { justifyContent: 'center', paddingHorizontal: 0 },
  itemActive: { backgroundColor: colors.primarySoft },
  itemText: { fontSize: 15, fontWeight: '600' },
  itemTextActive: { fontWeight: '800' },
  shortcutText: { color: colors.textSecondary, fontSize: 14 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm, marginHorizontal: spacing.sm },
  join: { marginTop: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primarySoft, gap: spacing.xs },
  joinTitle: { fontWeight: '800', fontSize: 15, color: colors.text },
  joinText: { fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  joinButton: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 10, alignItems: 'center', marginTop: spacing.xs },
  joinButtonText: { color: '#fff', fontWeight: '800' },
  login: { color: colors.primary, fontWeight: '800', textAlign: 'center', paddingTop: 6 },
});
