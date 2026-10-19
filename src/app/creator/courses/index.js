import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';

import {
  colors,
  radius,
  spacing,
  typography,
} from '../../../constants/theme';

import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import {
  PLATFORM_FEE_PERCENT,
  canReceivePayments,
  formatPrice,
  parsePrice,
  setCoursePrice,
} from '../../../lib/payments';

export default function Courses() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [courses, setCourses] = useState([]);
  const [canSell, setCanSell] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [priceText, setPriceText] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      setError('');
      const [{ data, error: loadError }, sellable] = await Promise.all([
        supabase
          .from('courses')
          .select('id,title,is_published,price_cents,currency,lesson_count,created_at')
          .eq('teacher_id', userId)
          .order('created_at', { ascending: false }),
        canReceivePayments(userId),
      ]);

      if (loadError) throw loadError;
      setCourses(data || []);
      setCanSell(sellable);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const startEditing = (course) => {
    setEditingId(course.id);
    setPriceText(course.price_cents ? (course.price_cents / 100).toFixed(2) : '');
    setError('');
  };

  const savePrice = async (courseId) => {
    const cents = parsePrice(priceText);

    if (cents === null || (cents > 0 && cents < 100)) {
      setError('Enter a price like 19.99 (at least €1.00), or leave it empty for a free course.');
      return;
    }

    try {
      setWorking(true);
      await setCoursePrice(courseId, cents);
      setEditingId(null);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setWorking(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>
        Courses
      </Text>

      <Text style={styles.subtitle}>
        Create and manage your NESBA courses.
      </Text>

      <Pressable
        onPress={() =>
          router.push('/creator/courses/create')
        }
        style={styles.createButton}
      >
        <Ionicons
          name="add-circle-outline"
          size={21}
          color="#fff"
        />

        <Text style={styles.createButtonText}>
          Create Course
        </Text>
      </Pressable>

      {!canSell && (
        <Pressable style={styles.notice} onPress={() => router.push('/creator/payouts')}>
          <Ionicons name="card-outline" size={20} color={colors.primary} />
          <Text style={styles.noticeText}>
            Want to sell premium courses? Connect Stripe in Payouts first.
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
      ) : courses.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons
            name="school-outline"
            size={42}
            color={colors.textMuted}
          />

          <Text style={styles.emptyTitle}>
            Your Courses
          </Text>

          <Text style={styles.emptyText}>
            Your courses and drafts will appear here.
          </Text>
        </View>
      ) : (
        courses.map((course) => (
          <View key={course.id} style={styles.course}>
            <Pressable onPress={() => router.push(`/course/${course.id}`)}>
              <Text style={styles.courseTitle}>{course.title}</Text>
              <Text style={styles.courseMeta}>
                {course.is_published ? 'Published' : 'Draft'} · {course.lesson_count || 0} lessons ·{' '}
                {course.price_cents > 0 ? formatPrice(course.price_cents, course.currency) : 'Free'}
              </Text>
            </Pressable>

            {editingId === course.id ? (
              <View style={styles.priceEditor}>
                <View style={styles.priceRow}>
                  <Text style={styles.euro}>€</Text>
                  <TextInput
                    value={priceText}
                    onChangeText={setPriceText}
                    keyboardType="decimal-pad"
                    placeholder="0.00 = free"
                    placeholderTextColor={colors.textMuted}
                    style={styles.priceInput}
                  />
                  <Pressable style={[styles.smallButton, working && { opacity: 0.6 }]} disabled={working} onPress={() => savePrice(course.id)}>
                    <Text style={styles.smallButtonText}>Save</Text>
                  </Pressable>
                  <Pressable onPress={() => setEditingId(null)} hitSlop={8}>
                    <Ionicons name="close" size={20} color={colors.textMuted} />
                  </Pressable>
                </View>
                {parsePrice(priceText) > 0 && (
                  <Text style={styles.courseMeta}>
                    You receive {formatPrice(Math.round(parsePrice(priceText) * (100 - PLATFORM_FEE_PERCENT) / 100))} per sale before Stripe fees.
                  </Text>
                )}
              </View>
            ) : (
              <Pressable
                style={styles.priceLink}
                onPress={() => (canSell ? startEditing(course) : router.push('/creator/payouts'))}
              >
                <Ionicons name="pricetag-outline" size={15} color={colors.primary} />
                <Text style={styles.priceLinkText}>{course.price_cents > 0 ? 'Change price' : 'Set a price'}</Text>
              </Pressable>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 3,
  },

  title: {
    ...typography.h1,
    color: colors.text,
    fontSize: 30,
  },

  subtitle: {
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },

  createButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },

  createButtonText: {
    color: '#fff',
    fontWeight: '900',
  },

  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },

  noticeText: {
    ...typography.caption,
    color: colors.text,
    flex: 1,
  },

  error: {
    ...typography.caption,
    color: colors.danger,
    marginTop: spacing.sm,
  },

  empty: {
    marginTop: spacing.lg,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },

  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginTop: spacing.sm,
  },

  emptyText: {
    color: colors.textMuted,
    marginTop: 4,
  },

  course: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },

  courseTitle: {
    ...typography.body,
    fontWeight: '800',
    fontSize: 16,
  },

  courseMeta: {
    ...typography.caption,
    marginTop: 2,
  },

  priceEditor: {
    gap: 6,
  },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  euro: {
    ...typography.body,
    fontWeight: '800',
  },

  priceInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.sm,
    color: colors.text,
  },

  smallButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  smallButtonText: {
    color: '#fff',
    fontWeight: '800',
  },

  priceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  priceLinkText: {
    color: colors.primary,
    fontWeight: '700',
  },
});
