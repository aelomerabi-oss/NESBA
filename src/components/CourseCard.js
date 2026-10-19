import React from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { colors, radius, spacing, typography } from '../constants/theme';
import PremiumBadge from './PremiumBadge';
import { formatPrice } from '../lib/payments';

export default function CourseCard({ course, stats }) {
  return (
    <Link href={`/course/${course.id}`} asChild>
      <Pressable style={styles.card}>
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
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 170,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumb: {
    width: '100%',
    height: 100,
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
