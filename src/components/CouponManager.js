import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing, typography } from '../constants/theme';
import { createCoupon, getMyCoupons, setCouponActive } from '../lib/payments';

const PERCENTS = [10, 20, 30, 50, 100];
const VALIDITY = [[7, '1 week'], [30, '1 month'], [0, 'No end']];

// Discount codes for a creator's paid courses (My Courses page).
export default function CouponManager({ userId, courses }) {
  const [coupons, setCoupons] = useState([]);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [percent, setPercent] = useState(20);
  const [courseId, setCourseId] = useState(null);
  const [maxUses, setMaxUses] = useState('');
  const [days, setDays] = useState(30);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    try {
      setCoupons(await getMyCoupons(userId));
    } catch (e) {
      setError(e.message);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    const clean = code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,30}$/.test(clean)) {
      setError('Use 3–30 letters, numbers, - or _ (for example LAUNCH20).');
      return;
    }

    try {
      setWorking(true);
      setError('');
      await createCoupon(userId, {
        code: clean,
        percentOff: percent,
        courseId,
        maxRedemptions: parseInt(maxUses, 10) || null,
        days,
      });
      setCode('');
      setMaxUses('');
      setOpen(false);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setWorking(false);
    }
  };

  const paidCourses = courses.filter((c) => c.price_cents > 0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Discount codes</Text>
      <Text style={styles.muted}>Share a code to give learners a percentage off your paid courses.</Text>

      {coupons.map((coupon) => {
        const expired = coupon.expires_at && new Date(coupon.expires_at) < new Date();
        return (
          <View key={coupon.id} style={styles.coupon}>
            <View style={{ flex: 1 }}>
              <Text style={styles.code}>{coupon.code} · {coupon.percent_off}% off</Text>
              <Text style={styles.muted}>
                {coupon.course?.title || 'All my courses'} · used {coupon.redeemed_count}
                {coupon.max_redemptions ? `/${coupon.max_redemptions}` : ''} times
                {coupon.expires_at ? ` · ${expired ? 'expired' : `until ${new Date(coupon.expires_at).toLocaleDateString()}`}` : ''}
              </Text>
            </View>
            <Switch
              value={coupon.is_active}
              onValueChange={async (on) => {
                await setCouponActive(coupon.id, on).catch((e) => setError(e.message));
                load();
              }}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor="#fff"
            />
          </View>
        );
      })}

      {!open ? (
        <Pressable onPress={() => setOpen(true)} disabled={paidCourses.length === 0}>
          <Text style={[styles.link, paidCourses.length === 0 && { color: colors.textMuted }]}>
            {paidCourses.length === 0 ? 'Set a price on a course to create codes' : '+ New discount code'}
          </Text>
        </Pressable>
      ) : (
        <View style={styles.form}>
          <TextInput
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            autoCapitalize="characters"
            placeholder="CODE, e.g. LAUNCH20"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />

          <Text style={styles.label}>Discount</Text>
          <View style={styles.options}>
            {PERCENTS.map((p) => (
              <Pressable key={p} onPress={() => setPercent(p)} style={[styles.option, percent === p && styles.selected]}>
                <Text style={[styles.optionText, percent === p && styles.selectedText]}>{p === 100 ? 'Free' : `${p}%`}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>For</Text>
          <View style={styles.options}>
            <Pressable onPress={() => setCourseId(null)} style={[styles.option, !courseId && styles.selected]}>
              <Text style={[styles.optionText, !courseId && styles.selectedText]}>All my courses</Text>
            </Pressable>
            {paidCourses.map((c) => (
              <Pressable key={c.id} onPress={() => setCourseId(c.id)} style={[styles.option, courseId === c.id && styles.selected]}>
                <Text style={[styles.optionText, courseId === c.id && styles.selectedText]} numberOfLines={1}>{c.title}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Valid for</Text>
          <View style={styles.options}>
            {VALIDITY.map(([d, label]) => (
              <Pressable key={label} onPress={() => setDays(d)} style={[styles.option, days === d && styles.selected]}>
                <Text style={[styles.optionText, days === d && styles.selectedText]}>{label}</Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            value={maxUses}
            onChangeText={setMaxUses}
            keyboardType="number-pad"
            placeholder="Maximum uses (optional)"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />

          <View style={styles.actions}>
            <Pressable style={[styles.button, working && { opacity: 0.6 }]} disabled={working} onPress={save}>
              <Text style={styles.buttonText}>Create code</Text>
            </Pressable>
            <Pressable onPress={() => setOpen(false)}>
              <Text style={styles.muted}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.lg, gap: spacing.sm },
  title: { ...typography.h2, fontSize: 17 },
  muted: { ...typography.caption },
  coupon: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  code: { ...typography.body, fontWeight: '800', letterSpacing: 0.5 },
  link: { color: colors.primary, fontWeight: '700', marginTop: 4 },
  form: { gap: spacing.sm, marginTop: spacing.sm },
  label: { ...typography.caption, fontWeight: '700', color: colors.text },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: spacing.sm, color: colors.text },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  option: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6, maxWidth: 220 },
  optionText: { ...typography.caption, fontWeight: '700' },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  selectedText: { color: '#fff' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  button: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 16 },
  buttonText: { color: '#fff', fontWeight: '800' },
  error: { ...typography.caption, color: colors.danger },
});
