import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import {
  PLATFORM_FEE_PERCENT,
  formatPrice,
  getMySales,
  getPayoutStatus,
  openPayoutDashboard,
  openPayoutOnboarding,
} from '../../lib/payments';
import { getMyTicketSales } from '../../lib/workshops';

export default function PayoutsScreen() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [status, setStatus] = useState(null);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      setError('');
      const [account, courseRows, ticketRows] = await Promise.all([getPayoutStatus(), getMySales(userId), getMyTicketSales(userId)]);
      // Course sales and workshop tickets in one list, newest first.
      const rows = [...courseRows, ...ticketRows].sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at));
      setStatus(account);
      setSales(rows);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Re-check when coming back from Stripe's onboarding pages.
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const run = async (action) => {
    try {
      setWorking(true);
      setError('');
      await action();
    } catch (e) {
      setError(e.message);
    } finally {
      setWorking(false);
    }
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

  const ready = status?.chargesEnabled;
  const earned = sales.reduce((sum, s) => sum + s.amount_cents - s.platform_fee_cents, 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
      <View style={[styles.card, ready ? styles.cardReady : styles.cardPending]}>
        <Ionicons
          name={ready ? 'checkmark-circle' : 'card-outline'}
          size={28}
          color={ready ? colors.success : colors.primary}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>
            {ready ? 'You can receive payments' : status?.connected ? 'Finish your Stripe setup' : 'Get paid with Stripe'}
          </Text>
          <Text style={styles.cardText}>
            {ready
              ? status.payoutsEnabled
                ? 'Sales are paid out to your bank account by Stripe.'
                : 'Stripe still needs your bank details before it can pay you out.'
              : 'Connect a Stripe account to sell premium courses and private sessions. NESBA never sees your bank details.'}
          </Text>
        </View>
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      {!ready || !status?.payoutsEnabled ? (
        <Pressable style={[styles.button, working && styles.disabled]} disabled={working} onPress={() => run(openPayoutOnboarding)}>
          {working ? <ActivityIndicator color="#fff" /> : (
            <Text style={styles.buttonText}>{status?.connected ? 'Continue Stripe setup' : 'Connect Stripe'}</Text>
          )}
        </Pressable>
      ) : (
        <Pressable style={[styles.outlineButton, working && styles.disabled]} disabled={working} onPress={() => run(openPayoutDashboard)}>
          <Ionicons name="open-outline" size={16} color={colors.primary} />
          <Text style={styles.outlineText}>Open Stripe dashboard</Text>
        </Pressable>
      )}

      <View style={styles.info}>
        <Text style={styles.infoTitle}>How payouts work</Text>
        <Text style={styles.infoText}>• You set the price of a course or private session.</Text>
        <Text style={styles.infoText}>• Learners pay on the NESBA website by card, iDEAL, Apple Pay or Google Pay.</Text>
        <Text style={styles.infoText}>• NESBA keeps {PLATFORM_FEE_PERCENT}%; Stripe sends the rest to you, minus Stripe&apos;s own fee.</Text>
        <Text style={styles.infoText}>• Refunds and payout schedules are managed in your Stripe dashboard.</Text>
      </View>

      <Text style={styles.sectionTitle}>Sales</Text>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{sales.length}</Text>
          <Text style={styles.statLabel}>Sales</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{formatPrice(earned)}</Text>
          <Text style={styles.statLabel}>Your share</Text>
        </View>
      </View>

      {sales.map((sale) => (
        <View key={sale.id} style={styles.sale}>
          <View style={{ flex: 1 }}>
            <Text style={styles.saleTitle} numberOfLines={1}>{sale.course?.title || (sale.event ? `Ticket: ${sale.event.title}` : 'Course')}</Text>
            <Text style={styles.cardText}>{new Date(sale.paid_at).toLocaleDateString()}</Text>
          </View>
          <Text style={styles.saleAmount}>{formatPrice(sale.amount_cents - sale.platform_fee_cents, sale.currency)}</Text>
        </View>
      ))}

      {sales.length === 0 && <Text style={styles.cardText}>No sales yet.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  card: { flexDirection: 'row', gap: spacing.sm, borderRadius: radius.md, padding: spacing.md, borderWidth: 1 },
  cardReady: { backgroundColor: colors.surface, borderColor: colors.success },
  cardPending: { backgroundColor: colors.primarySoft, borderColor: colors.primarySoft },
  cardTitle: { ...typography.body, fontWeight: '800', fontSize: 16 },
  cardText: { ...typography.caption, color: colors.textSecondary, marginTop: 2, lineHeight: 19 },
  error: { ...typography.caption, color: colors.danger, marginTop: spacing.sm },
  button: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center', marginTop: spacing.md },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  outlineButton: { flexDirection: 'row', gap: 6, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md, paddingVertical: 12, marginTop: spacing.md },
  outlineText: { color: colors.primary, fontWeight: '800' },
  disabled: { opacity: 0.6 },
  info: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.lg, gap: 4 },
  infoTitle: { ...typography.body, fontWeight: '800', marginBottom: 4 },
  infoText: { ...typography.caption, color: colors.textSecondary, lineHeight: 19 },
  sectionTitle: { ...typography.h2, fontSize: 17, marginTop: spacing.lg, marginBottom: spacing.sm },
  stats: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  stat: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
  statNumber: { ...typography.h2 },
  statLabel: typography.caption,
  sale: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, marginBottom: 6 },
  saleTitle: { ...typography.body, fontWeight: '700', fontSize: 14 },
  saleAmount: { ...typography.body, fontWeight: '800', color: colors.success },
});
