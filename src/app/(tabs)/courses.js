import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, ScrollView, Pressable, StyleSheet, ActivityIndicator, RefreshControl, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../constants/theme';
import { getCourses, getCategories, getCourseStats } from '../../lib/courses';
import CourseCard from '../../components/CourseCard';
import { sideMenuWidth } from '../../components/SideNav';

// CourseCard is 170 wide; as many columns as fit, at least two.
const CARD_SPACE = 170 + spacing.md;

const TRENDING_COUNT = 5;

// Icon and colour for each category card; unknown names get a default.
const CATEGORY_LOOK = {
  Business: { icon: 'briefcase-outline', color: '#6C5CE7' },
  Finance: { icon: 'cash-outline', color: '#12B76A' },
  'Soft Skills': { icon: 'chatbubbles-outline', color: '#F79009' },
  'Computer Science': { icon: 'code-slash-outline', color: '#1769E0' },
  Design: { icon: 'color-palette-outline', color: '#E4447A' },
  Entrepreneurship: { icon: 'rocket-outline', color: '#00A3A3' },
};

const DEFAULT_LOOK = { icon: 'school-outline', color: '#6C5CE7' };

export default function CoursesScreen() {
  const { width } = useWindowDimensions();
  const columns = Math.max(2, Math.floor((width - sideMenuWidth(width) - spacing.md * 2 + spacing.md) / CARD_SPACE));

  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(new Map());
  const [categoryId, setCategoryId] = useState(null);
  const [view, setView] = useState('courses');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [courseData, categoryData, statsData] = await Promise.all([
        getCourses(),
        getCategories(),
        // Stats only enrich the screen; courses still show if this fails.
        getCourseStats().catch((e) => {
          console.error('Course stats error:', e);
          return new Map();
        }),
      ]);
      setCourses(courseData);
      setCategories(categoryData);
      setStats(statsData);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const visibleCourses = useMemo(
    () => (categoryId ? courses.filter((c) => c.category_id === categoryId) : courses),
    [courses, categoryId]
  );

  // Stats are already ordered by trending score.
  const trending = useMemo(() => {
    const byId = new Map(visibleCourses.map((c) => [c.id, c]));
    return [...stats.entries()]
      .filter(([id, s]) => byId.has(id) && s.score > 0)
      .slice(0, TRENDING_COUNT)
      .map(([id]) => byId.get(id));
  }, [visibleCourses, stats]);

  const activeCategory = categories.find((c) => c.id === categoryId);

  const countByCategory = useMemo(() => {
    const counts = new Map();
    courses.forEach((c) => counts.set(c.category_id, (counts.get(c.category_id) || 0) + 1));
    return counts;
  }, [courses]);

  const openCategory = (id) => {
    setCategoryId(id);
    setView('courses');
  };

  const tabs = (
    <View style={styles.tabs}>
      {[
        { id: 'courses', label: 'All courses' },
        { id: 'categories', label: 'Categories' },
      ].map((tab) => (
        <Pressable
          key={tab.id}
          onPress={() => setView(tab.id)}
          style={[styles.tab, view === tab.id && styles.tabSelected]}
        >
          <Text style={[styles.tabText, view === tab.id && styles.tabTextSelected]}>
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>Couldn't load courses: {error}</Text>
      </View>
    );
  }

  if (view === 'categories') {
    return (
      <View style={styles.container}>
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.categoryRow}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          ListHeaderComponent={
            <View>
              <Text style={styles.header}>Explore Courses</Text>
              {tabs}
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          renderItem={({ item }) => {
            const look = CATEGORY_LOOK[item.name] || DEFAULT_LOOK;
            const count = countByCategory.get(item.id) || 0;
            return (
              <Pressable style={styles.categoryCard} onPress={() => openCategory(item.id)}>
                <View style={[styles.categoryIcon, { backgroundColor: `${look.color}1F` }]}>
                  <Ionicons name={look.icon} size={24} color={look.color} />
                </View>
                <Text style={styles.categoryName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.categoryCount}>
                  {count} {count === 1 ? 'course' : 'courses'}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>
    );
  }

  const header = (
    <View>
      <Text style={styles.header}>Explore Courses</Text>
      {tabs}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {[{ id: null, name: 'All' }, ...categories].map((category) => {
          const selected = category.id === categoryId;
          return (
            <Pressable
              key={category.id ?? 'all'}
              onPress={() => setCategoryId(category.id)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {category.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {trending.length > 0 && (
        <View>
          <View style={styles.sectionRow}>
            <Ionicons name="flame" size={18} color={colors.accent} />
            <Text style={styles.section}>Trending now</Text>
          </View>
          <FlatList
            horizontal
            data={trending}
            keyExtractor={(item) => `trending-${item.id}`}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => <CourseCard course={item} stats={stats.get(item.id)} />}
          />
        </View>
      )}

      <Text style={[styles.section, styles.allSection]}>
        {activeCategory ? activeCategory.name : 'All courses'} ({visibleCourses.length})
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={visibleCourses}
        keyExtractor={(item) => item.id}
        key={columns}
        numColumns={columns}
        columnWrapperStyle={{ gap: spacing.md }}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No courses in {activeCategory ? activeCategory.name : 'this category'} yet.
          </Text>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <View style={{ flex: 1 / columns, marginBottom: spacing.md }}>
            <CourseCard course={item} stats={stats.get(item.id)} fill />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.md },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { ...typography.h1, fontSize: 22, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    padding: 4,
    marginBottom: spacing.md,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.pill },
  tabSelected: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tabText: { ...typography.caption, fontWeight: '700' },
  tabTextSelected: { color: colors.text },
  categoryRow: { justifyContent: 'space-between', marginBottom: spacing.md },
  categoryCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 6,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  categoryName: { ...typography.body, fontWeight: '700' },
  categoryCount: typography.caption,
  chips: { gap: spacing.sm, paddingBottom: spacing.md },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.caption, fontWeight: '600' },
  chipTextSelected: { color: '#fff' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  section: { ...typography.h2, fontSize: 17 },
  allSection: { marginTop: spacing.lg, marginBottom: spacing.sm },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center', padding: spacing.lg },
  errorText: { ...typography.body, color: colors.danger, textAlign: 'center', padding: spacing.lg },
});
