import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { colors, radius, spacing, typography } from '../constants/theme';
import { setPageMeta } from '../lib/page-meta';

// Shown for any address that is not a NESBA page.
export default function NotFoundScreen() {
  useEffect(() => {
    setPageMeta({ title: 'Page not found' });
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Page not found' }} />
      <View style={styles.icon}>
        <Ionicons name="compass-outline" size={44} color={colors.primary} />
      </View>
      <Text style={styles.title} accessibilityRole="header">This page does not exist</Text>
      <Text style={styles.text}>The link may be old or mistyped. These might help:</Text>

      <Pressable style={styles.primary} onPress={() => router.replace('/')} accessibilityRole="link">
        <Text style={styles.primaryText}>Go to the home page</Text>
      </Pressable>
      <View style={styles.links}>
        <Pressable onPress={() => router.replace('/courses')} accessibilityRole="link"><Text style={styles.link}>Courses</Text></Pressable>
        <Pressable onPress={() => router.replace('/live')} accessibilityRole="link"><Text style={styles.link}>Live & workshops</Text></Pressable>
        <Pressable onPress={() => router.replace('/faq')} accessibilityRole="link"><Text style={styles.link}>FAQ</Text></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.background, gap: spacing.sm },
  icon: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  title: { ...typography.h1, fontSize: 24, textAlign: 'center' },
  text: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  primary: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: spacing.xl, marginTop: spacing.md },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  links: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm, flexWrap: 'wrap', justifyContent: 'center' },
  link: { color: colors.primary, fontWeight: '800' },
});
