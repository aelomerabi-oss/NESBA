import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { colors, radius, shadow, spacing, typography } from '../constants/theme';
import { PressableScale } from './motion';
import PremiumBadge from './PremiumBadge';
import { formatPrice } from '../lib/payments';

// fill: take the full width of a grid column instead of the fixed card width.
export default function CourseCard({ course, stats, fill = false }) {
  return (
    <Link href={`/course/${course.id}`} asChild>
      {/* Link copies the style onto a web element, which needs one flat object. */}
      <PressableScale containerStyle={StyleSheet.flatten([styles.outer, fill && styles.fill])} style={styles.card}>
        <Image accessibilityLabel={course.title || "Course image"} source={{ uri: course.thumbnail }} style={styles.thumb} />
        {course.isPremium && (
          <View style={styles.badgeWrap}>
            <PremiumBadge small label={formatPrice(course.price_cents, course.currency)} />
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>{course.title}</Text>
          <Text style={styles.teacher}>{course.teacher}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="play-circle-outline" size={14} color={colors.textMuted} />
            <Text style={styles.meta}>
              {course.lessons} lessons{course.duration ? ` · ${course.duration}` : ''}
            </Text>
          </View>
          {!!stats && (stats.enrollments > 0 || stats.rating != null) && (
            <View style={[styles.metaRow, styles.statsRow]}>
              {stats.rating != null && (
                <>
                  <Ionicons name="star" size={12} color={colors.premium} />
                  <Text style={styles.meta}>{stats.rating.toFixed(1)}</Text>
                </>
              )}
              {stats.enrollments > 0 && (
                <>
                  <Ionicons name="people-outline" size={12} color={colors.textMuted} />
                  <Text style={styles.meta}>
                    {stats.enrollments} {stats.enrollments === 1 ? 'learner' : 'learners'}
                  </Text>
                </>
              )}
            </View>
          )}
        </View>
      </PressableScale>
    </Link>
  );
}

const styles = StyleSheet.create({
  fill: { width: '100%' },

  outer: {
    width: 170,
    marginRight: spacing.md,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  thumb: {
    width: '100%',
    height: 104,
    backgroundColor: colors.surfaceAlt,
  },
  badgeWrap: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  info: {
    padding: spacing.sm,
  },
  title: {
    ...typography.body,
    fontWeight: '700',
    marginBottom: 2,
  },
  teacher: {
    ...typography.caption,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  meta: {
    ...typography.caption,
    fontSize: 11,
  },
  statsRow: {
    marginTop: 4,
  },
});
