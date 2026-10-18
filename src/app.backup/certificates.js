import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, spacing, typography, radius } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { getMyCertificates, getMyBadges } from '../lib/learning';

export default function CertificatesScreen() {
  const { session } = useAuth();
  const [certificates, setCertificates] = useState([]);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) {
      setLoading(false);
      return;
    }
    Promise.all([getMyCertificates(session.user.id), getMyBadges(session.user.id)])
      .then(([certs, bdg]) => {
        setCertificates(certs);
        setBadges(bdg);
      })
      .finally(() => setLoading(false));
  }, [session]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Badges</Text>
      {badges.length === 0 ? (
        <Text style={styles.emptyText}>Complete courses to start earning badges.</Text>
      ) : (
        <View style={styles.badgeGrid}>
          {badges.map((b) => (
            <View key={b.badges.name} style={styles.badgeCard}>
              {b.badges.icon_url ? (
                <Image source={{ uri: b.badges.icon_url }} style={{ width: 24, height: 24 }} />
              ) : (
                <Ionicons name="ribbon" size={24} color={colors.premium} />
              )}
              <Text style={styles.badgeName}>{b.badges.name}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Certificates</Text>
      {certificates.length === 0 ? (
        <Text style={styles.emptyText}>Finish a course 100% to earn your first certificate.</Text>
      ) : (
        <FlatList
          data={certificates}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          renderItem={({ item }) => (
            <Pressable style={styles.certRow} onPress={() => router.push(`/certificate/${item.id}`)}>
              <View style={styles.certIconWrap}>
                <Ionicons name="ribbon" size={20} color={colors.premium} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.certTitle}>{item.courses?.title}</Text>
                <Text style={styles.certMeta}>Issued {new Date(item.issued_at).toLocaleDateString()}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  center: { justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { ...typography.h2 },
  emptyText: { ...typography.caption, marginTop: spacing.sm },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  badgeCard: {
    width: 100, alignItems: 'center', gap: 6, backgroundColor: colors.surface,
    borderRadius: radius.md, padding: spacing.sm, borderWidth: 1, borderColor: colors.border,
  },
  badgeName: { ...typography.caption, fontSize: 11, textAlign: 'center' },
  certRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface,
    borderRadius: radius.md, padding: spacing.sm, marginTop: spacing.sm, borderWidth: 1, borderColor: colors.border,
  },
  certIconWrap: {
    width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  certTitle: { ...typography.body, fontWeight: '700' },
  certMeta: { ...typography.caption, marginTop: 2 },
});
