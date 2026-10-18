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
} from '../../../constants/theme';

export default function Courses() {
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
});