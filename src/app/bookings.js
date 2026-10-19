import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { colors, radius, spacing, typography } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { startLiveRoom } from '../lib/nesba';
import { formatPrice } from '../lib/payments';
import { completeBooking, getMyBookings, getReviewsForBookings, reviewSession } from '../lib/tutoring';
import { addToCalendar } from '../lib/calendar';
import { SITE_URL } from '../lib/payments';
import PersonAvatar from '../components/PersonAvatar';

function Stars({ value, onChange, size = 24 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} disabled={!onChange} onPress={() => onChange?.(n)} hitSlop={4}>
          <Ionicons name={n <= value ? 'star' : 'star-outline'} size={size} color={colors.premium} />
        </Pressable>
      ))}
    </View>
  );
}

// Rate a private session once it has taken place.
function ReviewForm({ booking, existing, onSaved }) {
  const [rating, setRating] = useState(existing?.rating || 0);
  const [text, setText] = useState(existing?.review || '');
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  if (existing && !open) {
    return (
      <View style={{ gap: 4 }}>
        <Stars value={existing.rating} size={18} />
        {!!existing.review && <Text style={styles.muted}>“{existing.review}”</Text>}
        <Pressable onPress={() => setOpen(true)}><Text style={styles.link}>Edit review</Text></Pressable>
      </View>
    );
  }

  if (!open) {
    return (
      <Pressable onPress={() => setOpen(true)}>
        <Text style={styles.link}>★ Rate this session</Text>
      </Pressable>
    );
  }

  const save = async () => {
    if (!rating) {
      setError('Choose 1 to 5 stars.');
      return;
    }
    try {
      setWorking(true);
      setError('');
      await reviewSession(booking.id, rating, text);
      setOpen(false);
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setWorking(false);
    }
  };

  return (
    <View style={{ gap: 8 }}>
      <Stars value={rating} onChange={setRating} />
      <TextInput
        value={text}
        onChangeText={setText}
        maxLength={2000}
        multiline
        placeholder="What was helpful? (optional, shown publicly)"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
      <Pressable style={[styles.button, working && styles.disabled]} disabled={working} onPress={save}>
        <Text style={styles.buttonText}>Save review</Text>
      </Pressable>
    </View>
  );
}

// Teachers can open the room a little before the booked time.
const EARLY_START_MS = 15 * 60 * 1000;

export default function BookingsScreen() {
  const { paid } = useLocalSearchParams();
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [working, setWorking] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      setError('');
      const rows = await getMyBookings(userId);
      setBookings(rows);
      setReviews(await getReviewsForBookings(rows.map((b) => b.id)));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const run = async (id, action) => {
    try {
      setWorking(id);
      setError('');
      await action();
    } catch (e) {
      setError(e.message);
    } finally {
      setWorking(null);
    }
  };

  if (!userId) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.muted}>Log in to see your sessions.</Text>
        <Pressable style={styles.button} onPress={() => router.push('/login')}>
          <Text style={styles.buttonText}>Log in</Text>
        </Pressable>
      </View>
    );
  }

  if (loading) {
    return <View style={[styles.container, styles.center]}><ActivityIndicator color={colors.primary} /></View>;
  }

  const now = Date.now();
  const upcoming = bookings.filter((b) => b.status === 'confirmed');
  const past = bookings.filter((b) => b.status === 'completed').reverse();

  const renderBooking = (b) => {
    const isTeacher = b.teacher_id === userId;
    const other = isTeacher ? b.student : b.teacher;
    const start = new Date(b.starts_at).getTime();
    const end = start + b.duration_minutes * 60 * 1000;
    const canStart = isTeacher && b.status === 'confirmed' && now >= start - EARLY_START_MS && !!b.event_id;

    return (
      <View key={b.id} style={styles.card}>
        <View style={styles.cardTop}>
          <PersonAvatar person={other} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{b.offer?.title || 'Private session'}</Text>
            <Text style={styles.muted}>
              {isTeacher ? 'With student ' : 'With '}{other?.full_name || 'NESBA member'}
            </Text>
          </View>
          {!!b.liveRoom && <Text style={styles.live}>LIVE</Text>}
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={15} color={colors.textMuted} />
          <Text style={styles.muted}>
            {new Date(b.starts_at).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            {' · '}{b.duration_minutes} min · {formatPrice(b.amount_cents, b.currency)}
          </Text>
        </View>

        {!!b.note && <Text style={styles.note}>“{b.note}”</Text>}

        {now < end && (
          <Pressable
            style={styles.calendar}
            onPress={() => addToCalendar({
              title: b.offer?.title ? `NESBA: ${b.offer.title}` : 'NESBA private session',
              startsAt: b.starts_at,
              endsAt: new Date(end).toISOString(),
              notes: `Private session with ${other?.full_name || 'your NESBA partner'}. Join from My Sessions in NESBA.`,
              url: `${SITE_URL}/bookings`,
            }).catch((e) => setError(e.message))}
          >
            <Ionicons name="calendar-number-outline" size={16} color={colors.primary} />
            <Text style={styles.link}>Add to calendar</Text>
          </Pressable>
        )}

        {!isTeacher && now > end && (
          <ReviewForm booking={b} existing={reviews[b.id]} onSaved={load} />
        )}

        {b.status === 'confirmed' && (
          <View style={styles.actions}>
            {b.liveRoom ? (
              <Pressable style={styles.button} onPress={() => router.push(`/live/${b.liveRoom.id}`)}>
                <Ionicons name="videocam" size={16} color="#fff" />
                <Text style={styles.buttonText}>Join session</Text>
              </Pressable>
            ) : canStart ? (
              <Pressable
                style={[styles.button, working === b.id && styles.disabled]}
                disabled={working === b.id}
                onPress={() => run(b.id, async () => {
                  const room = await startLiveRoom(b.event_id);
                  router.push(`/live/${room.id}`);
                })}
              >
                <Ionicons name="videocam" size={16} color="#fff" />
                <Text style={styles.buttonText}>Start session</Text>
              </Pressable>
            ) : (
              <Text style={styles.muted}>
                {isTeacher ? 'You can start the room 15 minutes before.' : 'Join here when your teacher starts the session.'}
              </Text>
            )}

            {isTeacher && now > end && (
              <Pressable
                style={styles.outline}
                disabled={working === b.id}
                onPress={() => run(b.id, async () => { await completeBooking(b.id); await load(); })}
              >
                <Text style={styles.outlineText}>Mark completed</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
    >
      {paid === '1' && (
        <View style={styles.success}>
          <Ionicons name="checkmark-circle" size={22} color={colors.success} />
          <Text style={styles.successText}>
            Payment received. Your session appears below in a few seconds (pull to refresh).
          </Text>
        </View>
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Text style={styles.sectionTitle}>Upcoming</Text>
      {upcoming.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.muted}>No upcoming sessions.</Text>
          <Pressable onPress={() => router.push('/tutoring')}>
            <Text style={styles.link}>Find a teacher</Text>
          </Pressable>
        </View>
      ) : upcoming.map(renderBooking)}

      {past.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Past</Text>
          {past.map(renderBooking)}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { justifyContent: 'center', alignItems: 'center', padding: spacing.lg, gap: spacing.md },
  muted: { ...typography.caption, lineHeight: 19 },
  success: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.success, borderRadius: radius.md, padding: spacing.md },
  successText: { ...typography.body, flex: 1 },
  error: { ...typography.caption, color: colors.danger, marginTop: spacing.sm },
  sectionTitle: { ...typography.h2, fontSize: 17, marginTop: spacing.lg, marginBottom: spacing.sm },
  empty: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, gap: 6 },
  link: { color: colors.primary, fontWeight: '700' },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { ...typography.body, fontWeight: '800' },
  live: { backgroundColor: colors.danger, color: '#fff', fontSize: 11, fontWeight: '800', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  note: { ...typography.body, color: colors.textSecondary, fontStyle: 'italic', fontSize: 14 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  button: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 16 },
  buttonText: { color: '#fff', fontWeight: '800' },
  disabled: { opacity: 0.6 },
  calendar: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: spacing.sm, color: colors.text, minHeight: 70, textAlignVertical: 'top' },
  outline: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 9, paddingHorizontal: 14 },
  outlineText: { color: colors.text, fontWeight: '700' },
});
