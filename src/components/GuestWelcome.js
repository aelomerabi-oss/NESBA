import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, radius, spacing } from '../constants/theme';

const POINTS = [
  { icon: 'book-outline', text: 'Practical courses' },
  { icon: 'radio-outline', text: 'Live classes' },
  { icon: 'person-outline', text: '1-to-1 mentoring' },
];

// Shown on Home to visitors who are not signed in.
export default function GuestWelcome() {
  return (
    <View style={styles.card}>
      <Text style={styles.title} accessibilityRole="header">Learn to build your business</Text>
      <Text style={styles.text}>
        Courses, live classes and workshops from entrepreneurs who have done it. Free to join.
      </Text>

      <View style={styles.points}>
        {POINTS.map((point) => (
          <View key={point.text} style={styles.point}>
            <Ionicons name={point.icon} size={14} color="#fff" />
            <Text style={styles.pointText}>{point.text}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.primary} onPress={() => router.push('/signup')} accessibilityRole="button">
          <Text style={styles.primaryText}>Join NESBA free</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={() => router.push('/login')} accessibilityRole="button">
          <Text style={styles.secondaryText}>Log in</Text>
        </Pressable>
      </View>

      <View style={styles.links}>
        <Pressable onPress={() => router.push('/faq')} accessibilityRole="link">
          <Text style={styles.link}>How does NESBA work?</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/waitlist')} accessibilityRole="link">
          <Text style={styles.link}>Get launch news by email</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: spacing.md, marginTop: spacing.md, padding: spacing.md, borderRadius: radius.lg || 18, backgroundColor: colors.primary, gap: spacing.sm },
  title: { color: '#fff', fontSize: 22, fontWeight: '900' },
  text: { color: '#ece9ff', fontSize: 14, lineHeight: 20 },
  points: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  point: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  pointText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: 4 },
  primary: { flex: 1, backgroundColor: '#fff', borderRadius: radius.md, paddingVertical: 12, alignItems: 'center' },
  primaryText: { color: colors.primary, fontWeight: '900', fontSize: 15 },
  secondary: { paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.7)', justifyContent: 'center' },
  secondaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  links: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: spacing.md, rowGap: 4 },
  link: { color: '#fff', fontSize: 13, fontWeight: '700', textDecorationLine: 'underline', textAlign: 'center', marginTop: 2 },
});
