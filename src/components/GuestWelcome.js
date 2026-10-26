import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { colors, gradients, radius, shadow, spacing } from '../constants/theme';
import { FadeInUp, PressableScale } from './motion';

const POINTS = [
  { icon: 'book-outline', text: 'Practical courses' },
  { icon: 'radio-outline', text: 'Live classes' },
  { icon: 'person-outline', text: '1-to-1 mentoring' },
];

// Shown on Home to visitors who are not signed in.
export default function GuestWelcome() {
  return (
    <FadeInUp style={styles.wrap}>
      <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        {/* Soft light shapes for depth; decorative only. */}
        <View style={[styles.glow, styles.glowTop]} pointerEvents="none" />
        <View style={[styles.glow, styles.glowBottom]} pointerEvents="none" />

        <Text style={styles.title} accessibilityRole="header">Learn to build your business</Text>
        <Text style={styles.text}>
          Courses, live classes and workshops from entrepreneurs who have done it. Free to join.
        </Text>

        <View style={styles.points}>
          {POINTS.map((point, index) => (
            <FadeInUp key={point.text} index={index} delay={150} style={styles.point}>
              <Ionicons name={point.icon} size={14} color="#fff" />
              <Text style={styles.pointText}>{point.text}</Text>
            </FadeInUp>
          ))}
        </View>

        <View style={styles.actions}>
          <PressableScale containerStyle={styles.primaryWrap} style={styles.primary} onPress={() => router.push('/signup')} accessibilityRole="button">
            <Text style={styles.primaryText}>Join NESBA free</Text>
          </PressableScale>
          <PressableScale style={styles.secondary} onPress={() => router.push('/login')} accessibilityRole="button">
            <Text style={styles.secondaryText}>Log in</Text>
          </PressableScale>
        </View>

        <View style={styles.links}>
          <Pressable onPress={() => router.push('/faq')} accessibilityRole="link">
            <Text style={styles.link}>How does NESBA work?</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/waitlist')} accessibilityRole="link">
            <Text style={styles.link}>Get launch news by email</Text>
          </Pressable>
        </View>
      </LinearGradient>
    </FadeInUp>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: spacing.md, marginTop: spacing.md, borderRadius: radius.lg, ...shadow.glow },
  card: { padding: spacing.lg, borderRadius: radius.lg, gap: spacing.sm, overflow: 'hidden' },
  glow: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.10)' },
  glowTop: { width: 220, height: 220, top: -110, right: -60 },
  glowBottom: { width: 160, height: 160, bottom: -90, left: -40, backgroundColor: 'rgba(255,255,255,0.07)' },
  title: { color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: -0.6 },
  text: { color: '#F3F1FF', fontSize: 15, lineHeight: 22 },
  points: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  point: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.22)', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  pointText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: 4 },
  primaryWrap: { flex: 1 },
  primary: { backgroundColor: '#fff', borderRadius: radius.md, paddingVertical: 13, alignItems: 'center', ...shadow.card },
  primaryText: { color: colors.primary, fontWeight: '900', fontSize: 15 },
  secondary: { paddingHorizontal: spacing.md, paddingVertical: 13, borderRadius: radius.md, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.75)', justifyContent: 'center' },
  secondaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  links: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: spacing.md, rowGap: 4, marginTop: 2 },
  link: { color: '#fff', fontSize: 13, fontWeight: '700', textDecorationLine: 'underline', textAlign: 'center' },
});
