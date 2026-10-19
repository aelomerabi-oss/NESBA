import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { formatPrice, startCheckout } from '../../lib/payments';
import { eventLink, getEvent, getSeatsTaken, isRegistered, registerFree } from '../../lib/workshops';
import { startLiveRoom } from '../../lib/nesba';
import { addToCalendar } from '../../lib/calendar';
import { setReturnTo } from '../../lib/return-to';
import { shareLink } from '../../lib/share-link';
import PersonAvatar from '../../components/PersonAvatar';

const TYPE_LABELS = {
  workshop: 'Workshop',
  masterclass: 'Masterclass',
  webinar: 'Webinar',
  live_class: 'Live class',
  event: 'Event',
};

/*
 * Public page for one workshop or event. Hosts share this link; visitors
 * create an account, pay and land back here with their ticket.
 */
export default function EventScreen() {
  const { id, paid } = useLocalSearchParams();
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [event, setEvent] = useState(null);
  const [seatsTaken, setSeatsTaken] = useState(null);
  const [hasTicket, setHasTicket] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [waitingForPayment, setWaitingForPayment] = useState(paid === '1');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [row, taken, registered] = await Promise.all([
        getEvent(id),
        getSeatsTaken(id),
        isRegistered(id, userId),
      ]);
      setEvent(row);
      setSeatsTaken(taken);
      setHasTicket(registered);
      return registered;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [id, userId]);

  useEffect(() => { load(); }, [load]);

  // Back from Stripe: the webhook registers the ticket a few seconds later.
  useEffect(() => {
    if (!waitingForPayment || !userId) return undefined;
    let tries = 0;
    const timer = setInterval(async () => {
      tries += 1;
      const registered = await load();
      if (registered || tries >= 15) {
        clearInterval(timer);
        setWaitingForPayment(false);
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [waitingForPayment, userId, load]);

  const share = () =>
    shareLink({
      title: event.title,
      message: `Join my ${(TYPE_LABELS[event.event_type] || 'event').toLowerCase()} "${event.title}" on NESBA`,
      url: eventLink(event.id),
    }).catch(() => {});

  const goToAccount = (path) => {
    setReturnTo(`/event/${id}`);
    router.push(path);
  };

  const getTicket = async () => {
    try {
      setBusy(true);
      setError('');
      if (event.price_cents > 0) {
        await startCheckout({ kind: 'event', eventId: event.id, webPath: `/event/${event.id}` });
      } else {
        await registerFree(event.id, userId);
        setHasTicket(true);
        setSeatsTaken((n) => (n ?? 0) + 1);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const goLive = async () => {
    try {
      setBusy(true);
      const room = await startLiveRoom(event.id);
      router.push(`/live/${room.id}`);
    } catch (e) {
      Alert.alert('Could not go live', e.message);
    } finally {
      setBusy(false);
    }
  };

  const saveToCalendar = () =>
    addToCalendar({
      title: event.title,
      startsAt: event.starts_at,
      endsAt: event.ends_at || new Date(new Date(event.starts_at).getTime() + 60 * 60 * 1000).toISOString(),
      notes: event.description,
      url: eventLink(event.id),
    }).catch((e) => Alert.alert('Could not add to calendar', e.message));

  if (loading) {
    return <View style={[styles.container, styles.center]}><ActivityIndicator color={colors.primary} /></View>;
  }

  if (!event) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="calendar-outline" size={42} color={colors.textMuted} />
        <Text style={styles.muted}>{error || 'This workshop is not available any more.'}</Text>
        <Pressable style={[styles.button, { alignSelf: 'stretch' }]} onPress={() => router.replace('/live')}>
          <Text style={styles.buttonText}>See upcoming events</Text>
        </Pressable>
      </View>
    );
  }

  const startsAt = new Date(event.starts_at);
  const minutes = event.ends_at ? Math.round((new Date(event.ends_at) - startsAt) / 60000) : null;
  const isHost = !!userId && event.host_id === userId;
  const isLive = event.status === 'live';
  const isOver = ['ended', 'cancelled'].includes(event.status);
  const isPaid = event.price_cents > 0;
  const seatsLeft = event.capacity && seatsTaken !== null ? Math.max(event.capacity - seatsTaken, 0) : null;
  const soldOut = seatsLeft === 0 && !hasTicket;
  const hostName = event.organizations?.name || event.host?.full_name || 'NESBA host';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.badges}>
        <View style={styles.typeBadge}><Text style={styles.typeText}>{TYPE_LABELS[event.event_type] || 'Event'}</Text></View>
        {isLive && <View style={styles.liveBadge}><Text style={styles.liveText}>LIVE NOW</Text></View>}
      </View>

      <Text style={styles.title}>{event.title}</Text>

      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
        <Text style={styles.meta}>
          {startsAt.toLocaleString(undefined, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      <View style={styles.metaRow}>
        <Ionicons name="videocam-outline" size={16} color={colors.textMuted} />
        <Text style={styles.meta}>{minutes ? `${minutes} minutes · ` : ''}Live online in the NESBA 3D hall</Text>
      </View>

      <Pressable style={styles.host} onPress={() => router.push(`/user/${event.host_id}`)}>
        <PersonAvatar person={event.host} size={52} />
        <View style={{ flex: 1 }}>
          <Text style={styles.hostLabel}>Hosted by</Text>
          <Text style={styles.hostName}>{hostName}</Text>
          {!!event.host?.expertise && <Text style={styles.muted} numberOfLines={2}>{event.host.expertise}</Text>}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>

      <View style={styles.priceRow}>
        <Text style={styles.price}>{isPaid ? formatPrice(event.price_cents, event.currency) : 'Free'}</Text>
        {seatsLeft !== null && !isOver && (
          <Text style={[styles.seats, seatsLeft <= 5 && { color: colors.danger }]}>
            {seatsLeft === 0 ? 'Sold out' : `${seatsLeft} ${seatsLeft === 1 ? 'seat' : 'seats'} left`}
          </Text>
        )}
      </View>

      {!!event.description && <Text style={styles.description}>{event.description}</Text>}

      {waitingForPayment && !hasTicket && (
        <View style={styles.notice}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.noticeText}>Confirming your payment…</Text>
        </View>
      )}

      {isOver ? (
        <View style={styles.notice}><Text style={styles.noticeText}>This {TYPE_LABELS[event.event_type]?.toLowerCase() || 'event'} has ended.</Text></View>
      ) : isHost ? (
        <>
          <View style={styles.notice}>
            <Ionicons name="people-outline" size={18} color={colors.primary} />
            <Text style={styles.noticeText}>
              {seatsTaken ?? 0} {seatsTaken === 1 ? 'person has' : 'people have'} a seat. Share your link to sell more tickets.
            </Text>
          </View>
          <Pressable style={styles.button} onPress={share}>
            <Ionicons name="share-social-outline" size={18} color="#fff" />
            <Text style={styles.buttonText}>Share your workshop link</Text>
          </Pressable>
          <Text style={styles.link} selectable>{eventLink(event.id)}</Text>
          <Pressable style={styles.secondary} disabled={busy} onPress={event.liveRoom ? () => router.push(`/live/${event.liveRoom.id}`) : goLive}>
            <Text style={styles.secondaryText}>{event.liveRoom ? 'Open the live room' : busy ? 'Starting…' : 'Go live now'}</Text>
          </Pressable>
        </>
      ) : hasTicket ? (
        <>
          <View style={[styles.notice, styles.success]}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.noticeText}>You're in! You'll get a notification when the host goes live.</Text>
          </View>
          {event.liveRoom ? (
            <Pressable style={styles.button} onPress={() => router.push(`/live/${event.liveRoom.id}`)}>
              <Ionicons name="enter-outline" size={18} color="#fff" />
              <Text style={styles.buttonText}>Join the live room</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.button} onPress={saveToCalendar}>
              <Ionicons name="calendar-number-outline" size={18} color="#fff" />
              <Text style={styles.buttonText}>Add to my calendar</Text>
            </Pressable>
          )}
          <Pressable style={styles.secondary} onPress={share}>
            <Text style={styles.secondaryText}>Invite a friend</Text>
          </Pressable>
        </>
      ) : soldOut ? (
        <View style={styles.notice}><Text style={styles.noticeText}>This workshop is sold out.</Text></View>
      ) : !session ? (
        <>
          <Pressable style={styles.button} onPress={() => goToAccount('/signup/student')}>
            <Text style={styles.buttonText}>{isPaid ? 'Create a free account to get your ticket' : 'Create a free account to join'}</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={() => goToAccount('/login')}>
            <Text style={styles.secondaryText}>I already have an account</Text>
          </Pressable>
          <Text style={styles.steps}>
            {isPaid ? '1. Create your account  ·  2. Pay securely  ·  3. Join live' : '1. Create your account  ·  2. Join live'}
          </Text>
        </>
      ) : (
        <Pressable style={[styles.button, busy && styles.disabled]} disabled={busy} onPress={getTicket}>
          {busy ? <ActivityIndicator color="#fff" /> : (
            <Text style={styles.buttonText}>
              {!isPaid
                ? 'Reserve my free seat'
                : Platform.OS === 'web'
                  ? `Buy ticket · ${formatPrice(event.price_cents, event.currency)}`
                  : 'Get your ticket on the website'}
            </Text>
          )}
        </Pressable>
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}

      {!session && (
        <View style={styles.about}>
          <Text style={styles.aboutTitle}>What is NESBA?</Text>
          <Text style={styles.muted}>
            The hub for entrepreneurs and zzp'ers: practical courses, live classes in a 3D lecture hall,
            1-to-1 sessions with experienced teachers and real projects with a certificate. Your account is free.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2, width: '100%', maxWidth: 680, alignSelf: 'center' },
  center: { justifyContent: 'center', alignItems: 'center', padding: spacing.lg, gap: spacing.sm },
  badges: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm },
  typeBadge: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  typeText: { color: colors.primary, fontWeight: '800', fontSize: 12 },
  liveBadge: { backgroundColor: colors.danger, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  liveText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  title: { ...typography.h1, fontSize: 26 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  meta: { ...typography.body, color: colors.textSecondary, fontSize: 14, flex: 1 },
  host: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, marginTop: spacing.md },
  hostLabel: { ...typography.caption, fontSize: 11 },
  hostName: { ...typography.body, fontWeight: '800', fontSize: 16 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: spacing.md },
  price: { ...typography.h1, color: colors.primary },
  seats: { ...typography.caption, fontWeight: '800' },
  description: { ...typography.body, color: colors.textSecondary, lineHeight: 22, marginTop: spacing.sm },
  notice: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: spacing.sm, marginTop: spacing.lg },
  success: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.success },
  noticeText: { ...typography.body, fontSize: 14, flex: 1 },
  button: { flexDirection: 'row', gap: 8, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 15, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 16, textAlign: 'center' },
  secondary: { borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md, paddingVertical: 13, alignItems: 'center', marginTop: spacing.sm },
  secondaryText: { color: colors.primary, fontWeight: '800', fontSize: 15 },
  link: { ...typography.caption, textAlign: 'center', marginTop: spacing.sm },
  steps: { ...typography.caption, textAlign: 'center', marginTop: spacing.sm },
  disabled: { opacity: 0.6 },
  error: { ...typography.caption, color: colors.danger, marginTop: spacing.sm, textAlign: 'center' },
  muted: { ...typography.caption, lineHeight: 19, textAlign: 'left' },
  about: { marginTop: spacing.xl, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 6 },
  aboutTitle: { ...typography.body, fontWeight: '800' },
});
