import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import {
  colors,
  radius,
  spacing,
  typography,
} from '../../constants/theme';

export default function CreatorStudio() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Ionicons
            name="create-outline"
            size={28}
            color={colors.primary}
          />
        </View>

        <Text style={styles.title}>
          Creator Studio
        </Text>

        <Text style={styles.subtitle}>
          Create and manage your NESBA educational content.
        </Text>
      </View>

      {/* COURSES */}

      <StudioCard
        icon="school-outline"
        title="Courses"
        description="Create, edit and publish courses with modules, lessons and learning content."
        primaryLabel="Create Course"
        secondaryLabel="My Courses"
        onPrimary={() =>
          router.push('/creator/courses/create')
        }
        onSecondary={() =>
          router.push('/creator/courses')
        }
      />

      {/* LIVE & EVENTS */}

      <StudioCard
        icon="videocam-outline"
        title="Live & Events"
        description="Schedule live classes, workshops, webinars and educational events."
        primaryLabel="Schedule Event"
        secondaryLabel="Manage Events"
        onPrimary={() =>
          router.push('/creator/events')
        }
        onSecondary={() =>
          router.push('/creator/events')
        }
      />

      {/* MEDIA */}

      <StudioCard
        icon="mic-outline"
        title="Media Library"
        description="Publish recordings, podcasts, audio lessons and educational videos."
        primaryLabel="Upload Media"
        secondaryLabel="Media Library"
        onPrimary={() =>
          router.push('/creator/media')
        }
        onSecondary={() =>
          router.push('/creator/media')
        }
      />

      {/* PRIVATE TEACHING */}

      <StudioCard
        icon="person-circle-outline"
        title="Private Teaching"
        description="Offer paid 1-to-1 live sessions. Learners book a time and pay up front."
        primaryLabel="Manage Offers"
        secondaryLabel="Booked Sessions"
        onPrimary={() =>
          router.push('/creator/tutoring')
        }
        onSecondary={() =>
          router.push('/bookings')
        }
      />

      {/* PAYOUTS */}

      <StudioCard
        icon="card-outline"
        title="Payouts"
        description="Connect Stripe to sell premium courses and private sessions, and see your earnings."
        primaryLabel="Open Payouts"
        onPrimary={() =>
          router.push('/creator/payouts')
        }
      />

      {/* ANALYTICS */}

      <StudioCard
        icon="analytics-outline"
        title="Analytics"
        description="Track your courses, lessons, students and creator performance."
        primaryLabel="View Analytics"
        onPrimary={() =>
          router.push('/creator/analytics')
        }
      />

      {/* QUICK STATS */}

      <View style={styles.quickStats}>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>
            0
          </Text>

          <Text style={styles.statLabel}>
            Courses
          </Text>
        </View>

        <View style={styles.stat}>
          <Text style={styles.statNumber}>
            0
          </Text>

          <Text style={styles.statLabel}>
            Events
          </Text>
        </View>

        <View style={styles.stat}>
          <Text style={styles.statNumber}>
            0
          </Text>

          <Text style={styles.statLabel}>
            Media
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function StudioCard({
  icon,
  title,
  description,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}>
          <Ionicons
            name={icon}
            size={25}
            color={colors.primary}
          />
        </View>

        <View style={styles.cardHeaderText}>
          <Text style={styles.cardTitle}>
            {title}
          </Text>

          <Text style={styles.cardDescription}>
            {description}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={onPrimary}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {primaryLabel}
          </Text>

          <Ionicons
            name="arrow-forward"
            size={17}
            color="#fff"
          />
        </Pressable>

        {secondaryLabel && onSecondary ? (
          <Pressable
            onPress={onSecondary}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>
              {secondaryLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
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

  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
  },

  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },

  title: {
    ...typography.h1,
    color: colors.text,
    fontSize: 30,
    textAlign: 'center',
  },

  subtitle: {
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 500,
  },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  cardHeaderText: {
    flex: 1,
  },

  cardTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },

  cardDescription: {
    color: colors.textMuted,
    lineHeight: 20,
    marginTop: 4,
  },

  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },

  primaryButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },

  primaryButtonText: {
    color: '#fff',
    fontWeight: '900',
  },

  secondaryButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },

  secondaryButtonText: {
    color: colors.text,
    fontWeight: '800',
  },

  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },

  quickStats: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },

  stat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },

  statNumber: {
    color: colors.text,
    fontSize: 25,
    fontWeight: '900',
  },

  statLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 3,
  },
});
<Pressable
  onPress={() =>
    router.push('/creator/organizations/create')
  }
  style={styles.card}
>
  <Ionicons
    name="business-outline"
    size={25}
    color={colors.primary}
  />

  <View style={styles.cardHeaderText}>
    <Text style={styles.cardTitle}>
      Organizations
    </Text>

    <Text style={styles.cardDescription}>
      Create and manage your educational organization.
    </Text>
  </View>

  <Ionicons
    name="chevron-forward"
    size={20}
    color={colors.textMuted}
  />
</Pressable>