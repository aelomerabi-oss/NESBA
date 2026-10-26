import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { getShowcase } from '../../lib/projects';
import PersonAvatar from '../../components/PersonAvatar';
import { openExternalLink } from '../../lib/safe-link';

// Finished projects, for anyone to browse.
export default function ShowcaseScreen() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      setProjects(await getShowcase());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return <View style={[styles.container, styles.center]}><ActivityIndicator color={colors.primary} /></View>;
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}
      data={projects}
      keyExtractor={(p) => p.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      ListHeaderComponent={
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>🏆 Built by NESBA learners</Text>
          <Text style={styles.heroText}>Real projects teams finished with what they learned.</Text>
          {!!error && <Text style={styles.error}>{error}</Text>}
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="trophy-outline" size={40} color={colors.textMuted} />
          <Text style={styles.muted}>No finished projects yet. Be the first team!</Text>
        </View>
      }
      renderItem={({ item }) => {
        const members = item.project_group_members || [];
        return (
          <Pressable style={styles.card} onPress={() => router.push(`/projects/${item.id}`)}>
            <Text style={styles.title}>{item.name}</Text>
            {!!item.course?.title && <Text style={styles.course}>From the course: {item.course.title}</Text>}
            {!!item.showcase_summary && <Text style={styles.summary} numberOfLines={4}>{item.showcase_summary}</Text>}

            <View style={styles.team}>
              {members.slice(0, 6).map((m, i) => (
                <View key={i} style={[styles.avatar, { marginLeft: i ? -10 : 0 }]}>
                  <PersonAvatar person={m.profile} size={30} />
                </View>
              ))}
              <Text style={styles.muted}>  {members.length} {members.length === 1 ? 'member' : 'members'}</Text>
            </View>

            {!!item.showcase_url && (
              <Pressable onPress={() => openExternalLink(item.showcase_url)} style={styles.linkRow}>
                <Ionicons name="open-outline" size={15} color={colors.primary} />
                <Text style={styles.link} numberOfLines={1}>See the result</Text>
              </Pressable>
            )}
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  hero: { backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md, gap: 4 },
  heroTitle: { ...typography.h2, fontSize: 18 },
  heroText: { ...typography.caption, color: colors.textSecondary },
  error: { ...typography.caption, color: colors.danger },
  empty: { alignItems: 'center', padding: spacing.xl, gap: spacing.sm },
  muted: typography.caption,
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md, gap: 8 },
  title: { ...typography.body, fontWeight: '800', fontSize: 17 },
  course: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  summary: { ...typography.body, color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  team: { flexDirection: 'row', alignItems: 'center' },
  avatar: { borderWidth: 2, borderColor: colors.surface, borderRadius: 17 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  link: { color: colors.primary, fontWeight: '700' },
});
