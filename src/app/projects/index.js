import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { getMyProjectIds, getProjects } from '../../lib/projects';

export default function ProjectsScreen() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [projects, setProjects] = useState([]);
  const [mine, setMine] = useState(new Set());
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const [rows, ids] = await Promise.all([getProjects(), getMyProjectIds(userId)]);
      setProjects(rows);
      setMine(ids);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  // Reload when coming back from a project or the create screen.
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      if (filter === 'mine' && !mine.has(p.id)) return false;
      if (filter === 'open' && (!p.is_open || p.memberCount >= p.max_members)) return false;
      if (!q) return true;
      return [p.name, p.description, p.course?.title, ...(p.skills || [])]
        .filter(Boolean)
        .some((text) => text.toLowerCase().includes(q));
    });
  }, [projects, mine, filter, query]);

  const create = () => (userId ? router.push('/projects/create') : router.push('/login'));

  const header = (
    <View>
      <View style={styles.hero}>
        <Ionicons name="construct-outline" size={26} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>Learn by building</Text>
          <Text style={styles.heroText}>
            Team up with other learners and build a real project from what you learned.
          </Text>
        </View>
      </View>

      <Pressable style={styles.createButton} onPress={create}>
        <Ionicons name="add" size={18} color="#fff" />
        <Text style={styles.createText}>Start a project</Text>
      </Pressable>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={17} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search projects, skills or courses"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
        />
      </View>

      <View style={styles.filters}>
        {[['all', 'All'], ['open', 'Looking for members'], ['mine', 'My projects']].map(([key, label]) => (
          <Pressable key={key} onPress={() => setFilter(key)} style={[styles.chip, filter === key && styles.chipSelected]}>
            <Text style={[styles.chipText, filter === key && styles.chipTextSelected]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}
      data={visible}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={header}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={40} color={colors.textMuted} />
          <Text style={styles.emptyText}>
            {filter === 'mine' ? 'You have not joined a project yet.' : 'No projects yet. Start the first one!'}
          </Text>
        </View>
      }
      renderItem={({ item }) => {
        const full = item.memberCount >= item.max_members;
        return (
          <Pressable style={styles.card} onPress={() => router.push(`/projects/${item.id}`)}>
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.name}</Text>
              {mine.has(item.id) ? (
                <Text style={[styles.badge, styles.badgeMine]}>Joined</Text>
              ) : !item.is_open || full ? (
                <Text style={[styles.badge, styles.badgeClosed]}>{full ? 'Full' : 'Closed'}</Text>
              ) : (
                <Text style={[styles.badge, styles.badgeOpen]}>Open</Text>
              )}
            </View>

            {!!item.description && <Text style={styles.cardText} numberOfLines={3}>{item.description}</Text>}

            {!!item.course?.title && (
              <View style={styles.metaRow}>
                <Ionicons name="school-outline" size={14} color={colors.textMuted} />
                <Text style={styles.meta} numberOfLines={1}>{item.course.title}</Text>
              </View>
            )}

            {item.skills?.length > 0 && (
              <View style={styles.skills}>
                {item.skills.slice(0, 5).map((skill) => (
                  <Text key={skill} style={styles.skill}>{skill}</Text>
                ))}
              </View>
            )}

            <View style={styles.metaRow}>
              <Ionicons name="people-outline" size={14} color={colors.textMuted} />
              <Text style={styles.meta}>
                {item.memberCount}/{item.max_members} members · led by {item.owner?.full_name || 'a NESBA member'}
              </Text>
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  hero: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  heroTitle: { ...typography.h2, fontSize: 18 },
  heroText: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  createButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 12, marginBottom: spacing.md },
  createText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.sm },
  searchInput: { flex: 1, color: colors.text, paddingVertical: 10, fontSize: 15 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginVertical: spacing.md },
  chip: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.caption, fontWeight: '700' },
  chipTextSelected: { color: '#fff' },
  error: { ...typography.caption, color: colors.danger, marginBottom: spacing.sm },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md, gap: 8 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  cardTitle: { ...typography.body, fontWeight: '800', fontSize: 16, flex: 1 },
  cardText: { ...typography.body, color: colors.textSecondary, fontSize: 14 },
  badge: { fontSize: 11, fontWeight: '800', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden' },
  badgeOpen: { backgroundColor: '#12B76A22', color: colors.success },
  badgeClosed: { backgroundColor: colors.surfaceAlt, color: colors.textMuted },
  badgeMine: { backgroundColor: colors.primarySoft, color: colors.primary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { ...typography.caption, flex: 1 },
  skills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  skill: { fontSize: 12, color: colors.primary, backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden' },
  empty: { alignItems: 'center', padding: spacing.xl, gap: spacing.sm },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
});
