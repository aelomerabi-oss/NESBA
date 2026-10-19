import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { formatPrice, startCheckout } from '../../lib/payments';
import { getOffer } from '../../lib/tutoring';
import PersonAvatar from '../../components/PersonAvatar';

const DAYS_AHEAD = 21;

// 08:00 to 21:30 in half hours, in the learner's own time zone.
const TIMES = Array.from({ length: 28 }, (_, i) => {
  const hour = 8 + Math.floor(i / 2);
  return `${String(hour).padStart(2, '0')}:${i % 2 ? '30' : '00'}`;
});

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function OfferScreen() {
  const { id } = useLocalSearchParams();
  const { session } = useAuth();

  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState(null);
  const [time, setTime] = useState(null);
  const [note, setNote] = useState('');
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getOffer(id)
      .then(setOffer)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const days = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: DAYS_AHEAD }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return d;
    });
  }, []);

  const startsAt = useMemo(() => {
    if (!day || !time) return null;
    const [h, m] = time.split(':').map(Number);
    const d = new Date(day);
    d.setHours(h, m, 0, 0);
    return d;
  }, [day, time]);

  // Bookings need at least an hour's notice.
  const isTooSoon = (d, t) => {
    const [h, m] = t.split(':').map(Number);
    const candidate = new Date(d);
    candidate.setHours(h, m, 0, 0);
    return candidate.getTime() < Date.now() + 60 * 60 * 1000;
  };

  const book = async () => {
    if (!session) {
      router.push('/login');
      return;
    }
    if (!startsAt) {
      setError('Choose a day and a time first.');
      return;
    }

    try {
      setPaying(true);
      setError('');
      await startCheckout({
        kind: 'tutoring',
        offerId: id,
        startsAt: startsAt.toISOString(),
        note,
        webPath: `/tutoring/${id}`,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return <View style={[styles.container, styles.center]}><ActivityIndicator color={colors.primary} /></View>;
  }

  if (!offer) {
    return <View style={[styles.container, styles.center]}><Text style={styles.muted}>{error || 'This offer is no longer available.'}</Text></View>;
  }

  const isOwn = offer.teacher_id === session?.user?.id;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
      <Pressable style={styles.teacher} onPress={() => router.push(`/user/${offer.teacher_id}`)}>
        <PersonAvatar person={offer.teacher} size={56} />
        <View style={{ flex: 1 }}>
          <Text style={styles.teacherName}>{offer.teacher?.full_name || 'NESBA teacher'}</Text>
          {!!offer.teacher?.expertise && <Text style={styles.muted} numberOfLines={2}>{offer.teacher.expertise}</Text>}
        </View>
      </Pressable>

      <Text style={styles.title}>{offer.title}</Text>
      <View style={styles.metaRow}>
        <Ionicons name="time-outline" size={15} color={colors.textMuted} />
        <Text style={styles.muted}>{offer.duration_minutes} minutes · private live video session</Text>
      </View>
      <Text style={styles.price}>{formatPrice(offer.price_cents, offer.currency)}</Text>

      {!!offer.description && <Text style={styles.description}>{offer.description}</Text>}

      {!!offer.availability && (
        <View style={styles.availability}>
          <Ionicons name="calendar-outline" size={16} color={colors.primary} />
          <Text style={styles.availabilityText}>Usually available: {offer.availability}</Text>
        </View>
      )}

      {isOwn ? (
        <Text style={[styles.muted, { marginTop: spacing.lg }]}>This is your offer. Learners book it from here.</Text>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Pick a day</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {days.map((d) => {
              const selected = day?.getTime() === d.getTime();
              return (
                <Pressable key={d.toISOString()} onPress={() => { setDay(d); setTime(null); }} style={[styles.day, selected && styles.selected]}>
                  <Text style={[styles.dayName, selected && styles.selectedText]}>{d.toLocaleDateString(undefined, { weekday: 'short' })}</Text>
                  <Text style={[styles.dayNumber, selected && styles.selectedText]}>{d.getDate()}</Text>
                  <Text style={[styles.dayName, selected && styles.selectedText]}>{d.toLocaleDateString(undefined, { month: 'short' })}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {!!day && (
            <>
              <Text style={styles.sectionTitle}>Pick a time</Text>
              <View style={styles.times}>
                {TIMES.filter((t) => !isTooSoon(day, t)).map((t) => (
                  <Pressable key={t} onPress={() => setTime(t)} style={[styles.time, time === t && styles.selected]}>
                    <Text style={[styles.timeText, time === t && styles.selectedText]}>{t}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.muted}>Times are in your time zone. The teacher gets a notification and the session appears in both of your calendars on NESBA.</Text>
            </>
          )}

          <Text style={styles.sectionTitle}>What do you need help with?</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            maxLength={1000}
            multiline
            placeholder="Optional: topics, questions or goals for the session"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />

          {!!error && <Text style={styles.error}>{error}</Text>}

          <Pressable style={[styles.button, (paying || !startsAt) && styles.disabled]} disabled={paying || !startsAt} onPress={book}>
            {paying ? <ActivityIndicator color="#fff" /> : (
              <Text style={styles.buttonText}>
                {Platform.OS === 'web'
                  ? `Book and pay ${formatPrice(offer.price_cents, offer.currency)}`
                  : 'Book on the website'}
              </Text>
            )}
          </Pressable>

          {!!startsAt && (
            <Text style={[styles.muted, { textAlign: 'center', marginTop: spacing.sm }]}>
              {startsAt.toLocaleString(undefined, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  teacher: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  teacherName: { ...typography.body, fontWeight: '800', fontSize: 16 },
  title: { ...typography.h1, fontSize: 24 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  muted: { ...typography.caption, lineHeight: 19 },
  price: { ...typography.h1, color: colors.primary, marginTop: spacing.sm },
  description: { ...typography.body, color: colors.textSecondary, lineHeight: 22, marginTop: spacing.md },
  availability: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: spacing.sm, marginTop: spacing.md },
  availabilityText: { ...typography.caption, color: colors.text, flex: 1 },
  sectionTitle: { ...typography.body, fontWeight: '800', marginTop: spacing.lg, marginBottom: spacing.sm },
  day: { width: 64, alignItems: 'center', paddingVertical: 8, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  dayName: { ...typography.caption, fontSize: 11 },
  dayNumber: { ...typography.h2, fontSize: 18 },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  selectedText: { color: '#fff' },
  times: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  time: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  timeText: { ...typography.caption, fontWeight: '700', color: colors.text },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, color: colors.text, minHeight: 90, textAlignVertical: 'top' },
  error: { ...typography.caption, color: colors.danger, marginTop: spacing.sm },
  button: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center', marginTop: spacing.lg },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  disabled: { opacity: 0.5 },
});
