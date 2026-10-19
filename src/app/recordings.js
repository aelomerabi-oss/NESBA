import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { useFocusEffect } from 'expo-router';
import { colors, radius, spacing, typography } from '../constants/theme';
import { getRecordingUrl, getRecordings } from '../lib/recordings';

function duration(start, end) {
  if (!end) return '';
  const minutes = Math.max(1, Math.round((new Date(end) - new Date(start)) / 60000));
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes} min`;
}

export default function RecordingsScreen() {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [playing, setPlaying] = useState(null); // { id, url }
  const [opening, setOpening] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      setRecordings(await getRecordings());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const play = async (recording) => {
    try {
      setOpening(recording.id);
      setError('');
      setPlaying({ id: recording.id, url: await getRecordingUrl(recording.id) });
    } catch (e) {
      setError(e.message);
    } finally {
      setOpening(null);
    }
  };

  if (loading) {
    return <View style={[styles.container, styles.center]}><ActivityIndicator color={colors.primary} /></View>;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
    >
      <Text style={styles.intro}>Rewatch live sessions you hosted or could join.</Text>
      {!!error && <Text style={styles.error}>{error}</Text>}

      {recordings.length === 0 && (
        <View style={styles.empty}>
          <Ionicons name="film-outline" size={40} color={colors.textMuted} />
          <Text style={styles.muted}>No recordings yet. Hosts can press Record during a live session.</Text>
        </View>
      )}

      {recordings.map((r) => (
        <View key={r.id} style={styles.card}>
          {playing?.id === r.id ? (
            <Video
              source={{ uri: playing.url }}
              style={styles.video}
              useNativeControls
              shouldPlay
              resizeMode={ResizeMode.CONTAIN}
            />
          ) : (
            <Pressable accessibilityRole="button" accessibilityLabel="Play recording" style={styles.thumb} onPress={() => play(r)} disabled={r.status === 'recording' || opening === r.id}>
              {opening === r.id ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Ionicons name={r.status === 'recording' ? 'radio-button-on' : 'play-circle'} size={46} color="#fff" />
              )}
            </Pressable>
          )}
          <Text style={styles.title}>{r.event?.title || 'Live session'}</Text>
          <Text style={styles.muted}>
            {r.event?.host?.full_name ? `${r.event.host.full_name} · ` : ''}
            {new Date(r.started_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
            {r.status === 'recording' ? ' · recording now' : r.ended_at ? ` · ${duration(r.started_at, r.ended_at)}` : ''}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  intro: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.md },
  error: { ...typography.caption, color: colors.danger, marginBottom: spacing.sm },
  empty: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl },
  muted: { ...typography.caption, textAlign: 'left' },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.md, gap: 6 },
  thumb: { aspectRatio: 16 / 9, backgroundColor: '#111827', borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  video: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000', borderRadius: radius.sm },
  title: { ...typography.body, fontWeight: '800' },
});
