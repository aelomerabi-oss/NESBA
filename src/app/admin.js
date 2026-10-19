import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, radius, spacing, typography } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const feedbackIcons = {
  bug: 'bug-outline',
  idea: 'bulb-outline',
  praise: 'heart-outline',
  other: 'chatbubble-outline',
};

const feedbackLabels = {
  bug: 'Bug Report',
  idea: 'Idea',
  praise: 'Praise',
  other: 'Other',
};

export default function AdminScreen() {
  const { user, session } = useAuth();

  const [requests, setRequests] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(null);

  const load = async () => {
    try {
      const [r, metrics, feedbackResult] = await Promise.all([
        supabase
          .from('creator_applications')
          .select(
            'id,user_id,requested_role,organization_name,organization_type,description,website,location,contact_email,expertise,experience,reason,status,created_at'
          )
          .eq('status', 'pending')
          .order('created_at', { ascending: true }),

        supabase.rpc('get_admin_platform_metrics'),

        supabase
          .from('feedback')
          .select('id,user_id,category,message,created_at')
          .order('created_at', { ascending: false }),
      ]);

      if (r.error) throw r.error;
      if (metrics.error) throw metrics.error;
      if (feedbackResult.error) throw feedbackResult.error;

      setRequests(r.data || []);
      setStats(metrics.data || {});
      setFeedback(feedbackResult.data || []);
    } catch (e) {
      Alert.alert('Admin error', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user.role === 'admin') {
      load();
    } else {
      setLoading(false);
    }
  }, [user.role]);

  const review = async (id, approve) => {
    try {
      setReviewing(id);

      const { error } = await supabase.rpc('review_creator_request', {
        p_request_id: id,
        p_approve: approve,
      });

      if (error) throw error;

      await load();
    } catch (e) {
      Alert.alert('Could not review application', e.message);
    } finally {
      setReviewing(null);
    }
  };

  if (!session || user.role !== 'admin') {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons
          name="lock-closed-outline"
          size={40}
          color={colors.textMuted}
        />

        <Text style={styles.title}>Admin access required</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>Loading admin dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER */}

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>NESBA Admin</Text>

          <Text style={styles.muted}>
            Manage the platform and review user activity.
          </Text>
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel="Refresh" style={styles.refreshButton} onPress={load}>
          <Ionicons
            name="refresh-outline"
            size={20}
            color={colors.text}
          />
        </Pressable>
      </View>

      {/* PLATFORM STATS */}

      <View style={styles.grid}>
        {Object.entries(stats).map(([key, value]) => (
          <View key={key} style={styles.stat}>
            <Text style={styles.statValue}>{value}</Text>

            <Text style={styles.statLabel}>
              {key.replace(/_/g, ' ')}
            </Text>
          </View>
        ))}
      </View>

      {/* CREATOR APPLICATIONS */}

      <Text style={styles.section}>
        Creator Applications ({requests.length})
      </Text>

      {requests.length === 0 && (
        <View style={styles.emptyCard}>
          <Ionicons
            name="checkmark-circle-outline"
            size={28}
            color={colors.success}
          />

          <Text style={styles.emptyTitle}>
            No pending applications
          </Text>

          <Text style={styles.muted}>
            New creator applications will appear here.
          </Text>
        </View>
      )}

      {requests.map((r) => (
        <View key={r.id} style={styles.card}>
          <Text style={styles.name}>
            {r.requested_role?.toUpperCase()} application
          </Text>

          {r.organization_name ? (
            <Text style={styles.org}>
              {r.organization_name}
              {r.organization_type
                ? ` · ${r.organization_type.replace(/_/g, ' ')}`
                : ''}
            </Text>
          ) : null}

          {r.description ? (
            <Text style={styles.small}>
              {r.description}
            </Text>
          ) : null}

          {[r.website, r.location, r.contact_email]
            .filter(Boolean)
            .length ? (
            <Text style={styles.small}>
              {[r.website, r.location, r.contact_email]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          ) : null}

          <Text style={styles.muted}>
            {r.reason || 'No reason supplied'}
          </Text>

          {r.expertise ? (
            <Text style={styles.small}>
              Expertise: {r.expertise}
            </Text>
          ) : null}

          {r.experience ? (
            <Text style={styles.small}>
              Experience: {r.experience}
            </Text>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              style={styles.approve}
              onPress={() => review(r.id, true)}
              disabled={reviewing === r.id}
            >
              <Text style={styles.actionText}>
                {reviewing === r.id ? 'Working...' : 'Approve'}
              </Text>
            </Pressable>

            <Pressable
              style={styles.reject}
              onPress={() => review(r.id, false)}
              disabled={reviewing === r.id}
            >
              <Text style={styles.actionText}>
                Reject
              </Text>
            </Pressable>
          </View>
        </View>
      ))}

      {/* FEEDBACK */}

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.section}>
            User Feedback ({feedback.length})
          </Text>

          <Text style={styles.muted}>
            Feedback submitted by NESBA users.
          </Text>
        </View>

        <Ionicons
          name="chatbubbles-outline"
          size={24}
          color={colors.primaryLight}
        />
      </View>

      {feedback.length === 0 && (
        <View style={styles.emptyCard}>
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={28}
            color={colors.textMuted}
          />

          <Text style={styles.emptyTitle}>
            No feedback yet
          </Text>

          <Text style={styles.muted}>
            User feedback will appear here.
          </Text>
        </View>
      )}

      {feedback.map((item) => {
        const icon =
          feedbackIcons[item.category] || 'chatbubble-outline';

        const label =
          feedbackLabels[item.category] || 'Other';

        const date = item.created_at
          ? new Date(item.created_at).toLocaleString()
          : '';

        return (
          <View key={item.id} style={styles.feedbackCard}>
            <View style={styles.feedbackTop}>
              <View style={styles.feedbackCategory}>
                <View style={styles.feedbackIcon}>
                  <Ionicons
                    name={icon}
                    size={18}
                    color={colors.primaryLight}
                  />
                </View>

                <Text style={styles.feedbackCategoryText}>
                  {label}
                </Text>
              </View>

              <Text style={styles.feedbackDate}>
                {date}
              </Text>
            </View>

            <Text style={styles.feedbackMessage}>
              {item.message}
            </Text>

            {item.user_id ? (
              <Text style={styles.feedbackUser}>
                User: {item.user_id}
              </Text>
            ) : (
              <Text style={styles.feedbackUser}>
                Submitted by guest
              </Text>
            )}
          </View>
        );
      })}
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
    paddingBottom: spacing.xl,
  },

  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  title: {
    ...typography.h1,
    fontSize: 24,
  },

  muted: {
    ...typography.body,
    color: colors.textMuted,
    lineHeight: 21,
    marginTop: 4,
  },

  loadingText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },

  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },

  stat: {
    width: '48%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },

  statValue: {
    ...typography.h1,
    fontSize: 25,
  },

  statLabel: {
    ...typography.caption,
    marginTop: 4,
    textTransform: 'capitalize',
  },

  section: {
    ...typography.h2,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },

  name: {
    ...typography.body,
    fontWeight: '800',
  },

  org: {
    ...typography.body,
    fontWeight: '700',
    marginTop: 4,
  },

  small: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 4,
  },

  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },

  approve: {
    backgroundColor: colors.success,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.pill,
  },

  reject: {
    backgroundColor: colors.danger,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.pill,
  },

  actionText: {
    color: '#fff',
    fontWeight: '700',
  },

  emptyCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },

  emptyTitle: {
    ...typography.body,
    fontWeight: '700',
    marginTop: spacing.sm,
  },

  feedbackCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },

  feedbackTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },

  feedbackCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },

  feedbackIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  feedbackCategoryText: {
    ...typography.body,
    fontWeight: '700',
  },

  feedbackDate: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },

  feedbackMessage: {
    ...typography.body,
    marginTop: spacing.md,
    lineHeight: 22,
  },

  feedbackUser: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
    fontSize: 11,
  },
});