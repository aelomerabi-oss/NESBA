import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { formatPrice } from '../../lib/payments';
import { getOffers, getTeacherRatings } from '../../lib/tutoring';
import PersonAvatar from '../../components/PersonAvatar';

const CREATOR_ROLES = ['teacher', 'mentor', 'organization', 'admin'];

export default function TutoringScreen() {
  const { session, user } = useAuth();
  const [offers, setOffers] = useState([]);
  const [ratings, setRatings] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const rows = await getOffers();
      setOffers(rows);
      // Ratings only decorate the list; offers still show without them.
      getTeacherRatings([...new Set(rows.map((o) => o.teacher_id))])
        .then(setRatings)
        .catch(() => {});
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

  const header = (
    <View>
      <View style={styles.hero}>
        <Ionicons name="person-circle-outline" size={28} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>1-to-1 with a teacher</Text>
          <Text style={styles.heroText}>Book a private live session and get personal help.</Text>
        </View>
      </View>

      <View style={styles.links}>
        {!!session && (
          <Pressable style={styles.link} onPress={() => router.push('/bookings')}>
            <Ionicons name="calendar-outline" size={16} color={colors.primary} />
            <Text style={styles.linkText}>My sessions</Text>
          </Pressable>
        )}
        {CREATOR_ROLES.includes(user.role) && (
          <Pressable style={styles.link} onPress={() => router.push('/creator/tutoring')}>
            <Ionicons name="create-outline" size={16} color={colors.primary} />
            <Text style={styles.linkText}>Offer sessions</Text>
          </Pressable>
        )}
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}
      data={offers}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={header}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="school-outline" size={40} color={colors.textMuted} />
          <Text style={styles.emptyText}>No private sessions are offered yet.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable style={styles.card} onPress={() => router.push(`/tutoring/${item.id}`)}>
          <View style={styles.cardTop}>
            <PersonAvatar person={item.teacher} />
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.meta}>
                {item.teacher?.full_name || 'NESBA teacher'}
                {ratings[item.teacher_id]
                  ? `  ·  ★ ${ratings[item.teacher_id].average.toFixed(1)} (${ratings[item.teacher_id].count})`
                  : '  ·  New teacher'}
              </Text>
            </View>
          </View>
          {!!item.description && <Text style={styles.cardText} numberOfLines={2}>{item.description}</Text>}
          <View style={styles.cardBottom}>
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={14} color={colors.textMuted} />
              <Text style={styles.meta}>{item.duration_minutes} min · live video</Text>
            </View>
            <Text style={styles.price}>{formatPrice(item.price_cents, item.currency)}</Text>
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  hero: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: spacing.md },
  heroTitle: { ...typography.h2, fontSize: 18 },
  heroText: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  links: { flexDirection: 'row', gap: spacing.md, marginVertical: spacing.md },
  link: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  linkText: { color: colors.primary, fontWeight: '700' },
  error: { ...typography.caption, color: colors.danger, marginBottom: spacing.sm },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md, gap: 10 },
  cardTop: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  cardTitle: { ...typography.body, fontWeight: '800', fontSize: 16 },
  cardText: { ...typography.body, color: colors.textSecondary, fontSize: 14 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: typography.caption,
  price: { ...typography.h2, fontSize: 18, color: colors.primary },
  empty: { alignItems: 'center', padding: spacing.xl, gap: spacing.sm },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
});
