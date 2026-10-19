import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  colors,
  radius,
  spacing,
  typography,
} from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const roles = [
  {
    key: 'student',
    label: 'Learn',
    icon: 'school',
    desc: 'Take courses, join live classes, earn certificates',
  },
  {
    key: 'teacher',
    label: 'Teach / Mentor',
    icon: 'easel',
    desc: 'Create courses, host live classes, mentor students',
  },
  {
    key: 'organization',
    label: 'Organization',
    icon: 'business',
    desc: 'Represent a school, non-profit, or company',
  },
];

const goalOptions = [
  'Start a business',
  'Learn AI',
  'Improve my career',
  'Learn technology',
  'Become an entrepreneur',
  'Find a mentor',
  'Improve leadership',
  'Learn finance',
];

export default function OnboardingScreen() {
  const { session, user, refreshProfile } = useAuth();

  // Start from the role requested at sign-up, if any.
  const [selectedRole, setSelectedRole] =
    useState(
      user.requestedRole === 'organization'
        ? 'organization'
        : user.requestedRole
        ? 'teacher'
        : 'student'
    );

  const [selectedGoals, setSelectedGoals] =
    useState([]);

  const [saving, setSaving] =
    useState(false);

  const toggleGoal = (goal) => {
    setSelectedGoals((prev) =>
      prev.includes(goal)
        ? prev.filter((g) => g !== goal)
        : [...prev, goal]
    );
  };

  const handleFinish = async () => {
    if (!session?.user) {
      router.replace('/(tabs)');
      return;
    }

    setSaving(true);

    /*
     * Role and requested_role are privileged fields that users cannot
     * write directly; creator requests go through request_creator_role.
     */
    const updateData = {
      goals: selectedGoals,
      onboarded: true,
      updated_at: new Date().toISOString(),
    };

    console.log(
      'Saving onboarding:',
      updateData
    );

    const { error } =
      await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', session.user.id);

    let requestError = null;

    /*
     * Organizations apply through the registration form, which collects
     * the name and details an admin needs to create the organization.
     */
    if (
      !error &&
      selectedRole === 'teacher' &&
      user.role !== selectedRole &&
      user.requestedRole !== selectedRole
    ) {
      ({ error: requestError } =
        await supabase.rpc(
          'request_creator_role',
          {
            p_role: selectedRole,
          }
        ));
    }

    setSaving(false);

    if (error || requestError) {
      console.error(
        'Onboarding save error:',
        error || requestError
      );

      Alert.alert(
        'Something went wrong',
        (error || requestError).message
      );

      return;
    }

    // Without this the onboarding redirect would see the old profile.
    await refreshProfile();

    if (
      selectedRole === 'teacher'
    ) {
      Alert.alert(
        'Teacher / Mentor request submitted',
        'Your account will remain a student account until NESBA approves your Teacher / Mentor request.'
      );
    }

    if (
      selectedRole === 'organization' &&
      user.role !== 'organization' &&
      user.requestedRole !== 'organization'
    ) {
      router.replace('/organization-registration');
      return;
    }

    router.replace('/(tabs)');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={
        styles.contentContainer
      }
    >
      <Text style={styles.title}>
        Welcome to NESBA
        {user?.name
          ? `, ${user.name}`
          : ''}{' '}
        👋
      </Text>

      <Text style={styles.subtitle}>
        What are you joining NESBA for?
      </Text>

      <View style={styles.roleList}>
        {roles.map((r) => {
          const active =
            selectedRole === r.key;

          return (
            <Pressable
              key={r.key}
              style={[
                styles.roleCard,
                active &&
                  styles.roleCardActive,
              ]}
              onPress={() =>
                setSelectedRole(r.key)
              }
            >
              <View
                style={[
                  styles.roleIconWrap,
                  active &&
                    styles.roleIconWrapActive,
                ]}
              >
                <Ionicons
                  name={r.icon}
                  size={22}
                  color={
                    active
                      ? '#fff'
                      : colors.textMuted
                  }
                />
              </View>

              <View
                style={styles.roleContent}
              >
                <Text
                  style={styles.roleLabel}
                >
                  {r.label}
                </Text>

                <Text
                  style={styles.roleDesc}
                >
                  {r.desc}
                </Text>
              </View>

              {active && (
                <Ionicons
                  name="checkmark-circle"
                  size={22}
                  color={
                    colors.primary
                  }
                />
              )}
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.note}>
        Teacher, mentor and organization
        roles require NESBA approval. You
        can request one now, but your
        account will remain a student account
        until your request is approved.
      </Text>

      <Text style={styles.subtitle}>
        What are your goals? (optional,
        pick any)
      </Text>

      <View style={styles.goalWrap}>
        {goalOptions.map((goal) => {
          const active =
            selectedGoals.includes(goal);

          return (
            <Pressable
              key={goal}
              style={[
                styles.goalChip,
                active &&
                  styles.goalChipActive,
              ]}
              onPress={() =>
                toggleGoal(goal)
              }
            >
              <Text
                style={[
                  styles.goalChipText,
                  active &&
                    styles.goalChipTextActive,
                ]}
              >
                {goal}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={styles.finishBtn}
        onPress={handleFinish}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text
            style={styles.finishBtnText}
          >
            Continue to NESBA
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        colors.background,
    },

    contentContainer: {
      padding: spacing.md,
      paddingBottom: spacing.xl,
    },

    title: {
      ...typography.h1,
      fontSize: 22,
      marginTop: spacing.md,
    },

    subtitle: {
      ...typography.h2,
      fontSize: 16,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },

    debugText: {
      color: '#ff0000',
      fontSize: 18,
      fontWeight: '800',
      marginBottom: spacing.md,
    },

    roleList: {
      gap: spacing.sm,
    },

    roleCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor:
        colors.surface,
      borderRadius: radius.md,
      padding: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 70,
    },

    roleCardActive: {
      borderColor:
        colors.primary,
    },

    roleIconWrap: {
      width: 44,
      height: 44,
      borderRadius: radius.sm,
      backgroundColor:
        colors.surfaceAlt,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    roleIconWrapActive: {
      backgroundColor:
        colors.primary,
    },

    roleContent: {
      flex: 1,
    },

    roleLabel: {
      ...typography.body,
      fontWeight: '700',
    },

    roleDesc: {
      ...typography.caption,
      marginTop: 2,
      lineHeight: 18,
    },

    goalWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },

    goalChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radius.pill,
      backgroundColor:
        colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },

    goalChipActive: {
      backgroundColor:
        colors.primary,
      borderColor:
        colors.primary,
    },

    goalChipText: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
    },

    goalChipTextActive: {
      color: '#fff',
    },

    finishBtn: {
      marginTop: spacing.xl,
      backgroundColor:
        colors.primary,
      padding: spacing.md,
      borderRadius: radius.md,
      alignItems: 'center',
      minHeight: 50,
      justifyContent:
        'center',
    },

    finishBtnText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 16,
    },

    note: {
      ...typography.caption,
      marginTop: spacing.sm,
      lineHeight: 19,
    },
  });