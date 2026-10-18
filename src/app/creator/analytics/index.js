import {
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import {
    colors,
    radius,
    spacing,
    typography,
} from '../../../constants/theme';

export default function CreatorAnalytics() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>
        Analytics
      </Text>

      <Text style={styles.subtitle}>
        Track your NESBA creator performance.
      </Text>

      <View style={styles.card}>
        <Ionicons
          name="analytics-outline"
          size={40}
          color={colors.primary}
        />

        <Text style={styles.cardTitle}>
          Creator Analytics
        </Text>

        <Text style={styles.cardText}>
          Course views, enrollments, lesson engagement,
          event attendance and creator performance
          analytics will appear here.
        </Text>
      </View>
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
  },

  title: {
    ...typography.h1,
    color: colors.text,
    fontSize: 30,
  },

  subtitle: {
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },

  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.xl,
  },

  cardTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    marginTop: spacing.sm,
  },

  cardText: {
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: spacing.xs,
  },
});