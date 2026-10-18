
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, Linking } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { colors, spacing, typography, radius } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { completeLesson } from '../../lib/nesba';
import { useAuth } from '../../context/AuthContext';

export default function LessonScreen() {
  const { id } = useLocalSearchParams();
  const { session } = useAuth();
  const [lesson, setLesson] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.from('course_modules').select('*,courses(id,title)').eq('id', id).single();
      if (error) Alert.alert('Lesson error', error.message);
      else setLesson(data);

      if (session?.user) {
        const { data: p } = await supabase.from('lesson_progress').select('module_id,completed').eq('user_id', session.user.id).eq('module_id', id).maybeSingle();
        setCompleted(!!p?.completed);
      }
      setLoading(false);
    };
    load();
  }, [id, session]);

  const finish = async () => {
    if (!session?.user) return Alert.alert('Log in required');
    try {
      setSaving(true);
      const result = await completeLesson(id);
      setCompleted(true);
      const progress = Number(result?.progress_percent ?? result?.progress ?? 0);
      Alert.alert(
        result?.course_completed ? 'Course completed! 🎉' : 'Lesson completed',
        result?.certificate_id
          ? `Certificate ${result.certificate_id} is now available in Your Learning.`
          : `Your progress is now ${progress}%.`
      );
    } catch (e) {
      Alert.alert('Could not save progress', e.message);
    } finally { setSaving(false); }
  };

  if (loading) return <View style={[styles.container, styles.center]}><ActivityIndicator color={colors.primary} /></View>;
  if (!lesson) return <View style={styles.container}><Text style={styles.muted}>Lesson not found.</Text></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.course}>{lesson.courses?.title}</Text>
      <Text style={styles.title}>{lesson.title}</Text>
      <Text style={styles.muted}>{lesson.duration_minutes || 0} minutes</Text>

      <View style={styles.video}>
        <Text style={styles.videoText}>{lesson.video_url ? 'Video lesson' : 'Lesson content'}</Text>
        {lesson.video_url && (
          <Pressable style={styles.primary} onPress={() => Linking.openURL(lesson.video_url)}>
            <Text style={styles.primaryText}>Open Video</Text>
          </Pressable>
        )}
      </View>

      <Pressable style={[styles.primary, completed && styles.done]} onPress={finish} disabled={saving || completed}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{completed ? '✓ Completed' : 'Mark Lesson Complete'}</Text>}
      </Pressable>

      <Pressable style={styles.secondary} onPress={() => router.back()}>
        <Text style={styles.secondaryText}>Back to Course</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  center: { justifyContent: 'center', alignItems: 'center' },
  course: { ...typography.caption, marginBottom: 4 },
  title: { ...typography.h1, fontSize: 24 },
  muted: { ...typography.body, color: colors.textMuted, marginTop: 4 },
  video: { minHeight: 220, marginTop: spacing.lg, backgroundColor: '#070910', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', padding: spacing.md },
  videoText: { color: colors.textMuted, marginBottom: spacing.md },
  primary: { backgroundColor: colors.primary, padding: spacing.md, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.md, minHeight: 50, justifyContent: 'center' },
  done: { backgroundColor: colors.success },
  primaryText: { color: '#fff', fontWeight: '700' },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: spacing.md, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.sm },
  secondaryText: { color: colors.text, fontWeight: '700' },
});
