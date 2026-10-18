import React from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { colors, radius, spacing, typography } from '../constants/theme';
import PremiumBadge from './PremiumBadge';

export default function CourseCard({ course }) {
  return (
    <Link href={`/course/${course.id}`} asChild>
      <Pressable style={styles.card}>
        <Image source={{ uri: course.thumbnail }} style={styles.thumb} />
        {course.isPremium && (
          <View style={styles.badgeWrap}>
            <PremiumBadge small />
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>{course.title}</Text>
          <Text style={styles.teacher}>{course.teacher}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="play-circle-outline" size={14} color={colors.textMuted} />
            <Text style={styles.meta}>{course.lessons} lessons Â· {course.duration}</Text>
          </View>
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
});
