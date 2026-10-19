import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { PLATFORM_FEE_PERCENT, canReceivePayments, formatPrice, parsePrice } from '../../lib/payments';
import { SESSION_LENGTHS, createOffer, getMyOffers, setOfferActive } from '../../lib/tutoring';

export default function CreatorTutoringScreen() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [offers, setOffers] = useState([]);
  const [canSell, setCanSell] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(60);
  const [priceText, setPriceText] = useState('');
  const [availability, setAvailability] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      setError('');
      const [rows, sellable] = await Promise.all([getMyOffers(userId), canReceivePayments(userId)]);
      setOffers(rows);
      setCanSell(sellable);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const run = async (action) => {
    try {
      setWorking(true);
      setError('');
      await action();
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setWorking(false);
    }
  };

  const save = () => {
    const priceCents = parsePrice(priceText);
    if (title.trim().length < 3) return setError('Give the session a title of at least 3 characters.');
    if (!priceCents || priceCents < 100) return setError('Enter a price of at least €1.00, like 35.00.');

    return run(async () => {
      await createOffer(userId, { title, description, durationMinutes: duration, priceCents, availability });
      setTitle('');
      setDescription('');
      setPriceText('');
      setAvailability('');
      setFormOpen(false);
    });
  };

  if (loading) {
    return <View style={[styles.container, styles.center]}><ActivityIndicator color={colors.primary} /></View>;
  }

  if (!userId) {
    return (
      <View style={[styles.container, styles.center]}>
        <Pressable style={styles.button} onPress={() => router.push('/login')}>
          <Text style={styles.buttonText}>Log in to continue</Text>
        </Pressable>
      </View>
    );
  }

  const priceCents = parsePrice(priceText);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
      <Text style={styles.intro}>
        Offer paid 1-to-1 live sessions. Learners pick a time and pay up front; the session appears in My sessions for both of you.
      </Text>

      <Pressable style={styles.link} onPress={() => router.push('/bookings')}>
        <Ionicons name="calendar-outline" size={16} color={colors.primary} />
        <Text style={styles.linkText}>See booked sessions</Text>
      </Pressable>

      {!canSell ? (
        <Pressable style={styles.notice} onPress={() => router.push('/creator/payouts')}>
          <Ionicons name="card-outline" size={20} color={colors.primary} />
          <Text style={styles.noticeText}>Connect Stripe in Payouts before offering paid sessions.</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      ) : !formOpen ? (
        <Pressable style={styles.button} onPress={() => setFormOpen(true)}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.buttonText}>New private session offer</Text>
        </Pressable>
      ) : (
        <View style={styles.form}>
          <Text style={styles.label}>Title</Text>
          <TextInput value={title} onChangeText={setTitle} maxLength={120} placeholder="e.g. Business plan review" placeholderTextColor={colors.textMuted} style={styles.input} />

          <Text style={styles.label}>What learners get</Text>
          <TextInput value={description} onChangeText={setDescription} maxLength={3000} multiline placeholder="What you cover, who it is for, what to prepare" placeholderTextColor={colors.textMuted} style={[styles.input, { minHeight: 90, textAlignVertical: 'top' }]} />

          <Text style={styles.label}>Length</Text>
          <View style={styles.options}>
            {SESSION_LENGTHS.map((m) => (
              <Pressable key={m} onPress={() => setDuration(m)} style={[styles.option, duration === m && styles.optionSelected]}>
                <Text style={[styles.optionText, duration === m && styles.optionTextSelected]}>{m} min</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Price (€)</Text>
          <TextInput value={priceText} onChangeText={setPriceText} keyboardType="decimal-pad" placeholder="35.00" placeholderTextColor={colors.textMuted} style={styles.input} />
          {priceCents > 0 && (
            <Text style={styles.hint}>You receive {formatPrice(Math.round(priceCents * (100 - PLATFORM_FEE_PERCENT) / 100))} per session before Stripe fees.</Text>
          )}

          <Text style={styles.label}>When are you usually available?</Text>
          <TextInput value={availability} onChangeText={setAvailability} maxLength={500} placeholder="e.g. Weekdays 18:00–21:00 CET" placeholderTextColor={colors.textMuted} style={styles.input} />

          {!!error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.formActions}>
            <Pressable style={[styles.button, { flex: 1 }, working && styles.disabled]} disabled={working} onPress={save}>
              <Text style={styles.buttonText}>Publish offer</Text>
            </Pressable>
            <Pressable style={styles.cancel} onPress={() => setFormOpen(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}

      {!formOpen && !!error && <Text style={styles.error}>{error}</Text>}

      <Text style={styles.sectionTitle}>Your offers</Text>
      {offers.length === 0 && <Text style={styles.hint}>No offers yet.</Text>}
      {offers.map((offer) => (
        <View key={offer.id} style={styles.offer}>
          <Pressable style={{ flex: 1 }} onPress={() => router.push(`/tutoring/${offer.id}`)}>
            <Text style={styles.offerTitle}>{offer.title}</Text>
            <Text style={styles.hint}>{offer.duration_minutes} min · {formatPrice(offer.price_cents, offer.currency)}</Text>
          </Pressable>
          <View style={styles.toggle}>
            <Text style={styles.hint}>{offer.is_active ? 'Visible' : 'Hidden'}</Text>
            <Switch
              value={offer.is_active}
              disabled={working}
              onValueChange={(on) => run(() => setOfferActive(offer.id, on))}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor="#fff"
            />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  intro: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: spacing.md },
  linkText: { color: colors.primary, fontWeight: '700' },
  notice: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: spacing.md },
  noticeText: { ...typography.caption, color: colors.text, flex: 1 },
  button: { flexDirection: 'row', gap: 6, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 13 },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  disabled: { opacity: 0.6 },
  form: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
  label: { ...typography.body, fontWeight: '700', marginTop: spacing.md, marginBottom: 6 },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: spacing.sm, color: colors.text, fontSize: 15 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  optionSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionText: { ...typography.caption, fontWeight: '700' },
  optionTextSelected: { color: '#fff' },
  hint: { ...typography.caption, marginTop: 4 },
  error: { ...typography.caption, color: colors.danger, marginTop: spacing.sm },
  formActions: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', marginTop: spacing.lg },
  cancel: { paddingHorizontal: spacing.md, paddingVertical: 12 },
  cancelText: { color: colors.textMuted, fontWeight: '700' },
  sectionTitle: { ...typography.h2, fontSize: 17, marginTop: spacing.lg, marginBottom: spacing.sm },
  offer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  offerTitle: { ...typography.body, fontWeight: '800' },
  toggle: { alignItems: 'center', gap: 2 },
});
