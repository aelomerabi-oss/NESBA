import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
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

import {
  getMyCertificates,
} from '../lib/learning';

import {
  supabase,
} from '../lib/supabase';

export default function CertificatesScreen() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCertificates = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setCertificates([]);
          return;
        }

        const data = await getMyCertificates(user.id);

        setCertificates(data || []);
      } catch (error) {
        console.error(
          'Could not load certificates:',
          error
        );

        setCertificates([]);
      } finally {
        setLoading(false);
      }
    };

    loadCertificates();
  }, []);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>

      <View style={styles.header}>

        <Pressable
          style={styles.backButton}
          onPress={handleBack}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={colors.text}
          />

          <Text style={styles.backText}>
            Back
          </Text>
        </Pressable>

        <Text style={styles.title}>
          My Certificates
        </Text>

        <Text style={styles.subtitle}>
          Certificates you have earned through NESBA.
        </Text>

      </View>

      <FlatList
        data={certificates}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}

        contentContainerStyle={
          certificates.length > 0
            ? styles.list
            : styles.emptyList
        }

        ListEmptyComponent={
          <View style={styles.empty}>

            <Ionicons
              name="ribbon-outline"
              size={52}
              color={colors.textMuted}
            />

            <Text style={styles.emptyTitle}>
              No certificates yet
            </Text>

            <Text style={styles.emptyText}>
              Complete a course to earn your first NESBA certificate.
            </Text>

          </View>
        }

        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() =>
              router.push(`/certificate/${item.id}`)
            }
          >

            <View style={styles.iconContainer}>
              <Ionicons
                name="ribbon"
                size={30}
                color={colors.premium}
              />
            </View>

            <View style={styles.info}>

              <Text style={styles.courseTitle}>
                {item.courses?.title || 'NESBA Certificate'}
              </Text>

              {item.courses?.teacher_name ? (
                <Text style={styles.teacher}>
                  Instructed by {item.courses.teacher_name}
                </Text>
              ) : null}

              {item.issued_at ? (
                <Text style={styles.date}>
                  Issued{' '}
                  {new Date(item.issued_at).toLocaleDateString()}
                </Text>
              ) : null}

              {item.certificate_id ? (
                <Text style={styles.certificateId}>
                  Certificate ID: {item.certificate_id}
                </Text>
              ) : null}

            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textMuted}
            />

          </Pressable>
        )}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },

  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  header: {
    marginBottom: spacing.md,
  },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: spacing.md,
  },

  backText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },

  title: {
    ...typography.h1,
    fontSize: 26,
  },

  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: 4,
  },

  list: {
    paddingBottom: spacing.xl,
  },

  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  empty: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },

  emptyTitle: {
    ...typography.h2,
    marginTop: spacing.md,
  },

  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 21,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },

  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  info: {
    flex: 1,
  },

  courseTitle: {
    ...typography.body,
    fontWeight: '800',
  },

  teacher: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 3,
  },

  date: {
    ...typography.caption,
    color: colors.primaryLight,
    marginTop: 4,
  },

  certificateId: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 3,
  },
});
