import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { colors, radius, spacing, typography } from '../../../constants/theme';
import { getProject, getProjectMembers } from '../../../lib/projects';
import { SITE_URL } from '../../../lib/payments';

/*
 * Certificate for one member of a completed project. Anyone with the link
 * can open it: projects and their members are public, so it verifies itself.
 */
export default function ProjectCertificateScreen() {
  const { id, member } = useLocalSearchParams();
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getProject(id), getProjectMembers(id)])
      .then(([row, team]) => {
        setProject(row);
        setMembers(team);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <View style={[styles.container, styles.center]}><ActivityIndicator color={colors.primary} /></View>;
  }

  const holder = members.find((m) => m.user_id === member);

  if (!project || project.status !== 'completed' || !holder) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="alert-circle-outline" size={40} color={colors.textMuted} />
        <Text style={styles.muted}>This certificate is not valid: the project is not finished or the person was not on the team.</Text>
      </View>
    );
  }

  const url = `${Platform.OS === 'web' ? window.location.origin : SITE_URL}/projects/certificate/${id}?member=${member}`;
  const teammates = members.filter((m) => m.user_id !== member).map((m) => m.profile?.full_name).filter(Boolean);
  const completed = new Date(project.completed_at || project.updated_at);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
      <View style={styles.certificate}>
        <Image source={require('../../../assets/images/nesba-logo.png')} style={styles.logo} />
        <Text style={styles.kicker}>NESBA · National Entrepreneurship & Small Business Academy</Text>
        <Text style={styles.heading}>Certificate of Project Completion</Text>
        <Text style={styles.small}>This certifies that</Text>
        <Text style={styles.name}>{holder.profile?.full_name || 'NESBA learner'}</Text>
        <Text style={styles.small}>
          {holder.member_role === 'owner' ? 'led' : 'contributed to'} the practical project
        </Text>
        <Text style={styles.project}>“{project.name}”</Text>
        {!!project.course?.title && <Text style={styles.small}>applying the course {project.course.title}</Text>}
        {teammates.length > 0 && (
          <Text style={styles.small}>together with {teammates.join(', ')}</Text>
        )}
        <Text style={styles.date}>
          Completed on {completed.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
        </Text>
        <Text style={styles.verify}>Verify at {url}</Text>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.button} onPress={() => Share.share({ message: `My NESBA project certificate: ${url}`, url }).catch(() => {})}>
          <Ionicons name="share-outline" size={17} color="#fff" />
          <Text style={styles.buttonText}>Share</Text>
        </Pressable>
        {Platform.OS === 'web' && (
          <Pressable style={styles.outline} onPress={() => window.print()}>
            <Ionicons name="print-outline" size={17} color={colors.primary} />
            <Text style={styles.outlineText}>Print / save as PDF</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { justifyContent: 'center', alignItems: 'center', padding: spacing.lg, gap: spacing.sm },
  muted: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  certificate: {
    backgroundColor: '#FFFDF7',
    borderWidth: 3,
    borderColor: '#C9A227',
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    gap: 8,
  },
  logo: { width: 72, height: 72, borderRadius: 36 },
  kicker: { fontSize: 11, color: '#6B5B2A', letterSpacing: 1, textAlign: 'center', textTransform: 'uppercase' },
  heading: { fontSize: 24, fontWeight: '900', color: '#1F2937', textAlign: 'center', marginVertical: 6 },
  small: { fontSize: 14, color: '#4B5563', textAlign: 'center' },
  name: { fontSize: 28, fontWeight: '800', color: '#111827', textAlign: 'center', fontStyle: 'italic' },
  project: { fontSize: 19, fontWeight: '800', color: '#6C5CE7', textAlign: 'center' },
  date: { fontSize: 13, color: '#374151', marginTop: spacing.sm },
  verify: { fontSize: 10, color: '#9CA3AF', textAlign: 'center' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, justifyContent: 'center' },
  button: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 11, paddingHorizontal: 18 },
  buttonText: { color: '#fff', fontWeight: '800' },
  outline: { flexDirection: 'row', gap: 6, alignItems: 'center', borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 16 },
  outlineText: { color: colors.primary, fontWeight: '800' },
});
