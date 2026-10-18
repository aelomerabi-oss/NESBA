import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { Link } from 'expo-router';
import { colors, spacing, typography, radius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { getMyEnrollments, getMyCertificates, getMyBadges } from '../../lib/nesba';

export default function LearningScreen() {
  const { session } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!session?.user) {
      setLoading(false);
      return;
    }
    try {
      const [e, c, b] = await Promise.all([
        getMyEnrollments(session.user.id),
        getMyCertificates(session.user.id),
        getMyBadges(session.user.id),
      ]);
      setEnrollments(e);
      setCertificates(c);
      setBadges(b);
    } catch (e) {
      console.log(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const inProgress = useMemo(
    () => enrollments.filter((e) => Number(e.progress_percent || 0) < 100),
    [enrollments]
  );
  const completed = useMemo(
    () => enrollments.filter((e) => Number(e.progress_percent || 0) >= 100),
    [enrollments]
  );

  if (!session) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.title}>Your Learning</Text>
        <Text style={styles.muted}>Log in to track courses, certificates and badges.</Text>
      </View>
    );
  }

  if (loading) {
    return <View style={[styles.container, styles.center]}><ActivityIndicator color={colors.primary} /></View>;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(); }}
          tintColor={colors.primary}
        />
      }
    >
      <Text style={styles.title}>Your Learning</Text>
      <Text style={styles.muted}>Continue where you left off and build your NESBA portfolio.</Text>

      <View style={styles.statsRow}>
        <View style={styles.stat}><Text style={styles.statNumber}>{enrollments.length}</Text><Text style={styles.statLabel}>Enrolled</Text></View>
        <View style={styles.stat}><Text style={styles.statNumber}>{completed.length}</Text><Text style={styles.statLabel}>Completed</Text></View>
        <View style={styles.stat}><Text style={styles.statNumber}>{certificates.length}</Text><Text style={styles.statLabel}>Certificates</Text></View>
        <View style={styles.stat}><Text style={styles.statNumber}>{badges.length}</Text><Text style={styles.statLabel}>Badges</Text></View>
      </View>

      <Text style={styles.section}>Continue Learning</Text>
      {inProgress.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Nothing in progress</Text>
          <Text style={styles.muted}>Enroll in a course to start your learning journey.</Text>
          <Link href="/courses" asChild>
            <Pressable style={styles.primary}><Text style={styles.primaryText}>Explore Courses</Text></Pressable>
          </Link>
        </View>
      )}

      {inProgress.map((item) => {
        const progress = Math.max(0, Math.min(100, Number(item.progress_percent || 0)));
        return (
          <Link key={item.id} href={`/course/${item.course_id}`} asChild>
            <Pressable style={styles.card}>
              <View style={styles.courseTop}>
                <View style={styles.courseIcon}><Text>📚</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.courseTitle}>{item.courses?.title || 'Course'}</Text>
                  <Text style={styles.mutedSmall}>{item.courses?.teacher_name || 'NESBA Creator'}</Text>
                </View>
                <Text style={styles.progress}>{progress}%</Text>
              </View>
              <View style={styles.track}><View style={[styles.fill, { width: `${progress}%` }]} /></View>
              <Text style={styles.mutedSmall}>{progress === 0 ? 'Not started' : 'Continue learning'}</Text>
            </Pressable>
          </Link>
        );
      })}

      <Text style={styles.section}>Completed Courses ({completed.length})</Text>
      {completed.length === 0 && <Text style={styles.muted}>Completed courses will appear here.</Text>}
      {completed.map((item) => (
        <Link key={item.id} href={`/course/${item.course_id}`} asChild>
          <Pressable style={styles.card}>
            <View style={styles.courseTop}>
              <View style={styles.courseIcon}><Text>✓</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.courseTitle}>{item.courses?.title || 'Course'}</Text>
                <Text style={styles.mutedSmall}>{item.courses?.teacher_name || 'NESBA Creator'}</Text>
              </View>
              <Text style={styles.completedText}>100%</Text>
            </View>
          </Pressable>
        </Link>
      ))}

      <Text style={styles.section}>Certificates ({certificates.length})</Text>
      {certificates.length === 0 && <Text style={styles.muted}>Complete an eligible course to earn your first certificate.</Text>}
      {certificates.map((c) => (
        <Link key={c.certificate_id} href={`/certificate/${c.certificate_id}`} asChild>
          <Pressable style={styles.achievement}>
            <Text style={styles.achievementTitle}>🏆 {c.courses?.title || 'Course Certificate'}</Text>
            <Text style={styles.mutedSmall}>Issued {new Date(c.issued_at).toLocaleDateString()}</Text>
            <Text style={styles.certificateId}>{c.certificate_id}</Text>
          </Pressable>
        </Link>
      ))}

      <Text style={styles.section}>Badges ({badges.length})</Text>
      {badges.length === 0 && <Text style={styles.muted}>Your achievements will appear here.</Text>}
      <View style={styles.badgeWrap}>
        {badges.map((b) => (
          <View key={b.badges?.id || b.awarded_at} style={styles.badge}>
            <Text style={styles.badgeName}>🏅 {b.badges?.name}</Text>
            {!!b.badges?.description && <Text style={styles.badgeDescription}>{b.badges.description}</Text>}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  center: { justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  title: { ...typography.h1, fontSize: 24 },
  muted: { ...typography.body, color: colors.textMuted, lineHeight: 21, marginTop: 4 },
  mutedSmall: { ...typography.caption, color: colors.textMuted, marginTop: 3 },
  section: { ...typography.h2, marginTop: spacing.lg, marginBottom: spacing.sm },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  stat: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center' },
  statNumber: { color: colors.primaryLight, fontSize: 20, fontWeight: '800' },
  statLabel: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  courseTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  courseIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  courseTitle: { ...typography.body, fontWeight: '700' },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: 'hidden', marginTop: spacing.md },
  fill: { height: '100%', backgroundColor: colors.primary },
  progress: { color: colors.primaryLight, fontSize: 13, fontWeight: '800' },
  completedText: { color: colors.success, fontWeight: '800', fontSize: 13 },
  primary: { backgroundColor: colors.primary, padding: spacing.md, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.md },
  primaryText: { color: '#fff', fontWeight: '700' },
  empty: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
  emptyTitle: { ...typography.body, fontWeight: '700' },
  achievement: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  achievementTitle: { ...typography.body, fontWeight: '700' },
  certificateId: { color: colors.primaryLight, fontSize: 12, marginTop: 6, fontWeight: '700' },
  badgeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badge: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, minWidth: '47%' },
  badgeName: { color: colors.text, fontWeight: '700', fontSize: 13 },
  badgeDescription: { color: colors.textMuted, fontSize: 11, marginTop: 4, lineHeight: 16 },
});
