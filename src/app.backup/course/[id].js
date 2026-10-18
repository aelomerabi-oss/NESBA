import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, Link, router } from 'expo-router';
import { colors, spacing, typography, radius } from '../../constants/theme';
import { getCourseById } from '../../lib/courses';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import PremiumBadge from '../../components/PremiumBadge';

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user, session } = useAuth();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completedModuleIds, setCompletedModuleIds] = useState([]);
  const [review, setReview] = useState(null);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');

  useEffect(() => {
    getCourseById(id)
      .then(setCourse)
      .catch((e) => Alert.alert('Error', e.message))
      .finally(() => setLoading(false));

    if (session?.user) {
      supabase
        .from('enrollments')
        .select('id,progress_percent')
        .eq('user_id', session.user.id)
        .eq('course_id', id)
        .maybeSingle()
        .then(async ({ data }) => {
          setEnrolled(!!data);
          setProgress(data?.progress_percent || 0);
          const { data: r } = await supabase.from('course_reviews').select('rating,review').eq('user_id', session.user.id).eq('course_id', id).maybeSingle();
          if (r) setReview(r);
          if (data) {
            const { data: modules } = await supabase.from('course_modules').select('id').eq('course_id', id);
            const ids = (modules || []).map((m) => m.id);
            if (ids.length) {
              const { data: completed } = await supabase.from('lesson_progress').select('module_id').eq('user_id', session.user.id).eq('completed', true).in('module_id', ids);
              setCompletedModuleIds((completed || []).map((x) => x.module_id));
            }
          }
        });
    }
  }, [id, session]);

  const handleEnroll = async () => {
    if (!session?.user) {
      Alert.alert('Log in required', 'Please log in to enroll in this course.');
      return;
    }
    setEnrolling(true);
    const { error } = await supabase.from('enrollments').insert({ user_id: session.user.id, course_id: id });
    setEnrolling(false);
    if (error && !error.message.includes('duplicate')) {
      Alert.alert('Could not enroll', error.message);
      return;
    }
    setEnrolled(true);
    Alert.alert('Enrolled!', "You're all set. Start learning whenever you're ready.");
  };

  const openLesson = (module) => {
    if (!enrolled) {
      Alert.alert('Enroll first', 'Enroll in this course before opening lessons.');
      return;
    }
    if (module.locked) {
      Alert.alert('Lesson locked', 'This lesson is currently locked by the course creator.');
      return;
    }
    router.push(`/lesson/${module.id}`);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!course) {
    return (
      <View style={styles.container}>
        <Text style={typography.body}>Course not found.</Text>
      </View>
    );
  }

  const isLocked = false; // NESBA is free during the launch phase; premium flags are reserved for future monetization.

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: spacing.xl }}>
      <Image source={{ uri: course.thumbnail }} style={styles.hero} />
      <View style={{ padding: spacing.md }}>
        {course.isPremium && (
          <View style={{ marginBottom: spacing.sm }}>
            <PremiumBadge />
          </View>
        )}
        <Text style={styles.title}>{course.title}</Text>
        <Text style={styles.teacher}>Taught by {course.teacher}</Text>

        <View style={styles.metaRow}>
          <Ionicons name="play-circle-outline" size={16} color={colors.textMuted} />
          <Text style={styles.meta}>{course.lessons} lessons</Text>
          <Ionicons name="time-outline" size={16} color={colors.textMuted} style={{ marginLeft: spacing.sm }} />
          <Text style={styles.meta}>{course.duration}</Text>
        </View>

        {course.description && <Text style={styles.description}>{course.description}</Text>}

        {isLocked ? (
          <Link href="/premium" asChild>
            <Pressable style={styles.unlockBanner}>
              <Ionicons name="lock-closed" size={18} color="#181C2E" />
              <Text style={styles.unlockText}>Unlock this course with Premium</Text>
            </Pressable>
          </Link>
        ) : (
          <Pressable style={[styles.enrollBtn, enrolled && styles.enrolledBtn]} onPress={handleEnroll} disabled={enrolling || enrolled}>
            {enrolling ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.enrollBtnText}>{enrolled ? '✓ Enrolled' : 'Enroll in this Course'}</Text>
            )}
          </Pressable>
        )}

        <Text style={styles.sectionTitle}>Modules</Text>
        {course.modules.length === 0 && <Text style={styles.meta}>Modules coming soon.</Text>}
        {course.modules.map((m, i) => (
          <Pressable key={m.id} style={styles.moduleRow} onPress={() => openLesson(m)}>
            <View style={styles.moduleIndex}>
              <Text style={styles.moduleIndexText}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.moduleTitle}>{m.title}</Text>
              <Text style={styles.moduleDuration}>{m.duration}</Text>
            </View>
            <Ionicons
              name={completedModuleIds.includes(m.id) ? 'checkmark-circle' : (m.locked && !user.isPremium ? 'lock-closed' : 'play-circle')}
              size={22}
              color={completedModuleIds.includes(m.id) ? colors.success : (m.locked && !user.isPremium ? colors.textMuted : colors.primaryLight)}
            />
          </Pressable>
        ))}
        {enrolled && progress >= 100 && (
          <View style={styles.reviewCard}>
            <Text style={styles.sectionTitle}>Your Review</Text>
            {review ? (
              <>
                <Text style={styles.reviewStars}>{'★'.repeat(review.rating)}{'☆'.repeat(5-review.rating)}</Text>
                <Text style={styles.description}>{review.review}</Text>
              </>
            ) : (
              <>
                <View style={styles.starRow}>
                  {[1,2,3,4,5].map((n) => <Pressable key={n} onPress={() => setRating(n)}><Text style={styles.star}>{n <= rating ? '★' : '☆'}</Text></Pressable>)}
                </View>
                <TextInput value={reviewText} onChangeText={setReviewText} style={styles.reviewInput} placeholder="What did you think of this course?" placeholderTextColor={colors.textMuted} multiline />
                <Pressable style={styles.enrollBtn} onPress={async () => {
                  if (!reviewText.trim()) return Alert.alert('Write a review first');
                  const { error } = await supabase.from('course_reviews').insert({ course_id: id, user_id: session.user.id, rating, review: reviewText.trim() });
                  if (error) Alert.alert('Could not submit review', error.message);
                  else { setReview({ rating, review: reviewText.trim() }); Alert.alert('Thank you', 'Your review was submitted.'); }
                }}><Text style={styles.enrollBtnText}>Submit Review</Text></Pressable>
              </>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  hero: { width: '100%', height: 200, backgroundColor: colors.surfaceAlt },
  title: { ...typography.h1, fontSize: 22 },
  teacher: { ...typography.caption, marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  meta: { ...typography.caption, marginLeft: 4 },
  description: { ...typography.body, color: colors.textMuted, marginTop: spacing.md, lineHeight: 21 },
  unlockBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.premium, padding: spacing.md, borderRadius: radius.md, marginTop: spacing.md },
  unlockText: { fontWeight: '700', color: '#181C2E' },
  enrollBtn: { backgroundColor: colors.primary, padding: spacing.md, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.md, minHeight: 50, justifyContent: 'center' },
  enrolledBtn: { backgroundColor: colors.success },
  enrollBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  sectionTitle: { ...typography.h2, marginTop: spacing.lg, marginBottom: spacing.sm },
  moduleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  moduleIndex: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  moduleIndexText: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
  moduleTitle: { ...typography.body, fontWeight: '600' },
  moduleDuration: { ...typography.caption, marginTop: 2 },
  reviewCard: { marginTop: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
  starRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.sm },
  star: { color: colors.premium, fontSize: 28 },
  reviewStars: { color: colors.premium, fontSize: 22, marginBottom: spacing.sm },
  reviewInput: { minHeight: 100, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, color: colors.text, padding: spacing.sm, textAlignVertical: 'top' },
});
