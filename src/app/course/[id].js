import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import PremiumBadge from '../../components/PremiumBadge';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { getCourseById } from '../../lib/courses';
import { supabase } from '../../lib/supabase';

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
  const [shareVisible, setShareVisible] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});

  useEffect(() => {
    getCourseById(id)
      .then((courseData) => {
        setCourse(courseData);

        const initialExpanded = {};

        (courseData.sections || []).forEach((section, index) => {
          initialExpanded[section.id] = index === 0;
        });

        setExpandedSections(initialExpanded);
      })
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

          const { data: r } = await supabase
            .from('course_reviews')
            .select('rating,review')
            .eq('user_id', session.user.id)
            .eq('course_id', id)
            .maybeSingle();

          if (r) {
            setReview(r);
          }

          if (data) {
            const { data: modules } = await supabase
              .from('course_modules')
              .select('id')
              .eq('course_id', id);

            const ids = (modules || []).map((m) => m.id);

            if (ids.length) {
              const { data: completed } = await supabase
                .from('lesson_progress')
                .select('module_id')
                .eq('user_id', session.user.id)
                .eq('completed', true)
                .in('module_id', ids);

              setCompletedModuleIds(
                (completed || []).map((x) => x.module_id)
              );
            }
          }
        });
    }
  }, [id, session]);

  const handleEnroll = async () => {
    if (!session?.user) {
      Alert.alert(
        'Log in required',
        'Please log in to enroll in this course.'
      );
      return;
    }

    setEnrolling(true);

    const { error } = await supabase
      .from('enrollments')
      .insert({
        user_id: session.user.id,
        course_id: id,
      });

    setEnrolling(false);

    if (error && !error.message.includes('duplicate')) {
      Alert.alert('Could not enroll', error.message);
      return;
    }

    setEnrolled(true);

    Alert.alert(
      'Enrolled!',
      "You're all set. Start learning whenever you're ready."
    );
  };

  const getShareUrl = () => {
    const slug =
      course?.slug ||
      course?.title
        ?.toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    return `https://nesba.app/course/${slug || id}`;
  };

  const handleShare = () => {
    setShareVisible(true);
  };

  const copyCourseLink = async () => {
    const url = getShareUrl();

    try {
      await Clipboard.setStringAsync(url);

      Alert.alert(
        'Link copied',
        'The course link has been copied to your clipboard.'
      );
    } catch (error) {
      Alert.alert(
        'Could not copy link',
        'Please try again.'
      );
    }
  };

  const shareToWhatsApp = async () => {
    const url = getShareUrl();

    const message = encodeURIComponent(
      `Check out "${course.title}" on NESBA:\n${url}`
    );

    const whatsappUrl = `whatsapp://send?text=${message}`;

    try {
      const supported = await Linking.canOpenURL(whatsappUrl);

      if (supported) {
        await Linking.openURL(whatsappUrl);
      } else {
        Alert.alert(
          'WhatsApp unavailable',
          'WhatsApp is not installed on this device.'
        );
      }
    } catch (error) {
      Alert.alert(
        'Unable to open WhatsApp',
        'Please try again or copy the course link.'
      );
    }
  };

  const shareToFacebook = async () => {
    const url = getShareUrl();

    const facebookUrl =
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

    try {
      await Linking.openURL(facebookUrl);
    } catch (error) {
      Alert.alert(
        'Unable to open Facebook',
        'Please copy the course link instead.'
      );
    }
  };

  const shareToLinkedIn = async () => {
    const url = getShareUrl();

    const linkedInUrl =
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;

    try {
      await Linking.openURL(linkedInUrl);
    } catch (error) {
      Alert.alert(
        'Unable to open LinkedIn',
        'Please copy the course link instead.'
      );
    }
  };

  const shareByEmail = async () => {
    const url = getShareUrl();

    const subject = encodeURIComponent(
      `Check out ${course.title} on NESBA`
    );

    const body = encodeURIComponent(
      `I thought you might be interested in this course on NESBA:\n\n${course.title}\n\n${url}`
    );

    const emailUrl = `mailto:?subject=${subject}&body=${body}`;

    try {
      await Linking.openURL(emailUrl);
    } catch (error) {
      Alert.alert(
        'Unable to open email',
        'Please copy the course link instead.'
      );
    }
  };

  const toggleSection = (sectionId) => {
    setExpandedSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  };

  const openLesson = (lesson) => {
    if (!enrolled) {
      Alert.alert(
        'Enroll first',
        'Enroll in this course before opening lessons.'
      );
      return;
    }

    if (lesson.locked) {
      Alert.alert(
        'Lesson locked',
        'This lesson is currently locked by the course creator.'
      );
      return;
    }

    router.push(`/lesson/${lesson.id}`);
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          {
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!course) {
    return (
      <View style={styles.container}>
        <Text style={typography.body}>
          Course not found.
        </Text>
      </View>
    );
  }

  const isLocked = false;

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingBottom: spacing.xl,
        }}
      >
        <Image
          source={{ uri: course.thumbnail }}
          style={styles.hero}
        />

        <View style={{ padding: spacing.md }}>
          {course.isPremium && (
            <View style={{ marginBottom: spacing.sm }}>
              <PremiumBadge />
            </View>
          )}

          <Text style={styles.title}>
            {course.title}
          </Text>

          <Text style={styles.teacher}>
            Taught by {course.teacher}
          </Text>

          <View style={styles.metaRow}>
            <Ionicons
              name="play-circle-outline"
              size={16}
              color={colors.textMuted}
            />

            <Text style={styles.meta}>
              {course.lessons} lessons
            </Text>

            <Ionicons
              name="time-outline"
              size={16}
              color={colors.textMuted}
              style={{
                marginLeft: spacing.sm,
              }}
            />

            <Text style={styles.meta}>
              {course.duration}
            </Text>
          </View>

          {course.description && (
            <Text style={styles.description}>
              {course.description}
            </Text>
          )}

          {isLocked ? (
            <Link href="/premium" asChild>
              <Pressable style={styles.unlockBanner}>
                <Ionicons
                  name="lock-closed"
                  size={18}
                  color="#181C2E"
                />

                <Text style={styles.unlockText}>
                  Unlock this course with Premium
                </Text>
              </Pressable>
            </Link>
          ) : (
            <View style={styles.actionRow}>
              <Pressable
                style={[
                  styles.enrollBtn,
                  enrolled && styles.enrolledBtn,
                ]}
                onPress={handleEnroll}
                disabled={enrolling || enrolled}
              >
                {enrolling ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.enrollBtnText}>
                    {enrolled
                      ? '✓ Enrolled'
                      : 'Enroll in this Course'}
                  </Text>
                )}
              </Pressable>

              <Pressable
                style={styles.shareBtn}
                onPress={handleShare}
                accessibilityRole="button"
                accessibilityLabel="Share this course"
              >
                <Ionicons
                  name="share-outline"
                  size={20}
                  color={colors.primary}
                />

                <Text style={styles.shareBtnText}>
                  Share
                </Text>
              </Pressable>
            </View>
          )}

          <Text style={styles.sectionTitle}>
            Modules
          </Text>

          {(course.sections || []).length === 0 && (
            <Text style={styles.meta}>
              Modules coming soon.
            </Text>
          )}

          {(course.sections || []).map((section, sectionIndex) => {
            const isExpanded =
              expandedSections[section.id] === true;

            const lessons = section.lessons || [];

            const completedLessons = lessons.filter((lesson) =>
              completedModuleIds.includes(lesson.id)
            ).length;

            return (
              <View
                key={section.id}
                style={styles.sectionCard}
              >
                <Pressable
                  style={styles.sectionHeader}
                  onPress={() => toggleSection(section.id)}
                >
                  <View style={styles.sectionNumber}>
                    <Text style={styles.sectionNumberText}>
                      {sectionIndex + 1}
                    </Text>
                  </View>

                  <View style={styles.sectionHeaderContent}>
                    <Text style={styles.sectionTitleText}>
                      {section.title}
                    </Text>

                    {section.description ? (
                      <Text
                        style={styles.sectionDescription}
                        numberOfLines={2}
                      >
                        {section.description}
                      </Text>
                    ) : null}

                    <Text style={styles.sectionProgress}>
                      {lessons.length} lesson
                      {lessons.length === 1 ? '' : 's'}
                      {completedLessons > 0
                        ? ` • ${completedLessons} completed`
                        : ''}
                    </Text>
                  </View>

                  <Ionicons
                    name={
                      isExpanded
                        ? 'chevron-up'
                        : 'chevron-down'
                    }
                    size={22}
                    color={colors.textMuted}
                  />
                </Pressable>

                {isExpanded && (
                  <View style={styles.lessonList}>
                    {lessons.length === 0 ? (
                      <Text style={styles.emptyLessonText}>
                        Lessons coming soon.
                      </Text>
                    ) : (
                      lessons.map((lesson, lessonIndex) => {
                        const completed =
                          completedModuleIds.includes(
                            lesson.id
                          );

                        const locked =
                          lesson.locked === true;

                        return (
                          <Pressable
                            key={lesson.id}
                            style={styles.lessonRow}
                            onPress={() =>
                              openLesson(lesson)
                            }
                          >
                            <View
                              style={[
                                styles.lessonIndex,
                                completed &&
                                  styles.lessonIndexCompleted,
                              ]}
                            >
                              {completed ? (
                                <Ionicons
                                  name="checkmark"
                                  size={16}
                                  color="#fff"
                                />
                              ) : (
                                <Text
                                  style={
                                    styles.lessonIndexText
                                  }
                                >
                                  {lessonIndex + 1}
                                </Text>
                              )}
                            </View>

                            <View
                              style={
                                styles.lessonContent
                              }
                            >
                              <Text
                                style={
                                  styles.lessonTitle
                                }
                                numberOfLines={2}
                              >
                                {lesson.title}
                              </Text>

                              <View
                                style={
                                  styles.lessonMetaRow
                                }
                              >
                                <Ionicons
                                  name="time-outline"
                                  size={14}
                                  color={
                                    colors.textMuted
                                  }
                                />

                                <Text
                                  style={
                                    styles.lessonDuration
                                  }
                                >
                                  {lesson.duration ||
                                    'Lesson'}
                                </Text>
                              </View>
                            </View>

                            <Ionicons
                              name={
                                locked
                                  ? 'lock-closed'
                                  : completed
                                  ? 'checkmark-circle'
                                  : 'play-circle-outline'
                              }
                              size={24}
                              color={
                                locked
                                  ? colors.textMuted
                                  : completed
                                  ? colors.success
                                  : colors.primaryLight
                              }
                            />
                          </Pressable>
                        );
                      })
                    )}
                  </View>
                )}
              </View>
            );
          })}

          {enrolled && progress >= 100 && (
            <View style={styles.reviewCard}>
              <Text style={styles.sectionTitle}>
                Your Review
              </Text>

              {review ? (
                <>
                  <Text style={styles.reviewStars}>
                    {'★'.repeat(review.rating)}
                    {'☆'.repeat(5 - review.rating)}
                  </Text>

                  <Text style={styles.description}>
                    {review.review}
                  </Text>
                </>
              ) : (
                <>
                  <View style={styles.starRow}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Pressable
                        key={n}
                        onPress={() => setRating(n)}
                      >
                        <Text style={styles.star}>
                          {n <= rating ? '★' : '☆'}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <TextInput
                    value={reviewText}
                    onChangeText={setReviewText}
                    style={styles.reviewInput}
                    placeholder="What did you think of this course?"
                    placeholderTextColor={
                      colors.textMuted
                    }
                    multiline
                  />

                  <Pressable
                    style={styles.enrollBtn}
                    onPress={async () => {
                      if (!reviewText.trim()) {
                        return Alert.alert(
                          'Write a review first'
                        );
                      }

                      const { error } =
                        await supabase
                          .from('course_reviews')
                          .insert({
                            course_id: id,
                            user_id:
                              session.user.id,
                            rating,
                            review:
                              reviewText.trim(),
                          });

                      if (error) {
                        Alert.alert(
                          'Could not submit review',
                          error.message
                        );
                      } else {
                        setReview({
                          rating,
                          review:
                            reviewText.trim(),
                        });

                        Alert.alert(
                          'Thank you',
                          'Your review was submitted.'
                        );
                      }
                    }}
                  >
                    <Text
                      style={styles.enrollBtnText}
                    >
                      Submit Review
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={shareVisible}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setShareVisible(false)
        }
      >
        <View style={styles.shareOverlay}>
          <Pressable
            style={styles.shareBackdrop}
            onPress={() =>
              setShareVisible(false)
            }
          />

          <View style={styles.shareSheet}>
            <View style={styles.shareHandle} />

            <Text style={styles.shareTitle}>
              Share Course
            </Text>

            <Text style={styles.shareCourseTitle}>
              {course.title}
            </Text>

            <View style={styles.linkBox}>
              <Text
                style={styles.shareUrl}
                numberOfLines={2}
              >
                {getShareUrl()}
              </Text>

              <Pressable
                style={styles.copyBtn}
                onPress={copyCourseLink}
              >
                <Ionicons
                  name="copy-outline"
                  size={20}
                  color={colors.primary}
                />

                <Text style={styles.copyBtnText}>
                  Copy
                </Text>
              </Pressable>
            </View>

            <Text style={styles.shareViaTitle}>
              Share via
            </Text>

            <View style={styles.socialGrid}>
              <Pressable
                style={styles.socialItem}
                onPress={shareToWhatsApp}
              >
                <View style={styles.socialIcon}>
                  <Ionicons
                    name="logo-whatsapp"
                    size={28}
                    color="#25D366"
                  />
                </View>

                <Text style={styles.socialText}>
                  WhatsApp
                </Text>
              </Pressable>

              <Pressable
                style={styles.socialItem}
                onPress={shareToFacebook}
              >
                <View style={styles.socialIcon}>
                  <Ionicons
                    name="logo-facebook"
                    size={28}
                    color="#1877F2"
                  />
                </View>

                <Text style={styles.socialText}>
                  Facebook
                </Text>
              </Pressable>

              <Pressable
                style={styles.socialItem}
                onPress={shareToLinkedIn}
              >
                <View style={styles.socialIcon}>
                  <Ionicons
                    name="logo-linkedin"
                    size={28}
                    color="#0A66C2"
                  />
                </View>

                <Text style={styles.socialText}>
                  LinkedIn
                </Text>
              </Pressable>

              <Pressable
                style={styles.socialItem}
                onPress={shareByEmail}
              >
                <View style={styles.socialIcon}>
                  <Ionicons
                    name="mail-outline"
                    size={28}
                    color={colors.primary}
                  />
                </View>

                <Text style={styles.socialText}>
                  Email
                </Text>
              </Pressable>
            </View>

            <Pressable
              style={styles.closeShareBtn}
              onPress={() =>
                setShareVisible(false)
              }
            >
              <Text style={styles.closeShareText}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  hero: {
    width: '100%',
    height: 200,
    backgroundColor: colors.surfaceAlt,
  },

  title: {
    ...typography.h1,
    fontSize: 22,
  },

  teacher: {
    ...typography.caption,
    marginTop: 4,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },

  meta: {
    ...typography.caption,
    marginLeft: 4,
  },

  description: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.md,
    lineHeight: 21,
  },

  unlockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.premium,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },

  unlockText: {
    fontWeight: '700',
    color: '#181C2E',
  },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
    marginTop: spacing.md,
  },

  enrollBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
  },

  enrolledBtn: {
    backgroundColor: colors.success,
  },

  enrollBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },

  shareBtn: {
    minHeight: 50,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  shareBtnText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 15,
  },

  sectionCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },

  sectionNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionNumberText: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 14,
  },

  sectionHeaderContent: {
    flex: 1,
  },

  sectionTitleText: {
    ...typography.body,
    fontWeight: '700',
  },

  sectionDescription: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 3,
    lineHeight: 18,
  },

  sectionProgress: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 5,
  },

  lessonList: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.sm,
  },

  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },

  lessonRowLast: {
    marginBottom: 0,
  },

  lessonIndex: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },

  lessonIndexCompleted: {
    backgroundColor: colors.success,
  },

  lessonIndexText: {
    color: colors.textMuted,
    fontWeight: '700',
    fontSize: 12,
  },

  lessonContent: {
    flex: 1,
  },

  lessonTitle: {
    ...typography.body,
    fontWeight: '600',
  },

  lessonMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },

  lessonDuration: {
    ...typography.caption,
    color: colors.textMuted,
  },

  emptyLessonText: {
    ...typography.caption,
    color: colors.textMuted,
    padding: spacing.sm,
  },

  reviewCard: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },

  starRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.sm,
  },

  star: {
    color: colors.premium,
    fontSize: 28,
  },

  reviewStars: {
    color: colors.premium,
    fontSize: 22,
    marginBottom: spacing.sm,
  },

  reviewInput: {
    minHeight: 100,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.text,
    padding: spacing.sm,
    textAlignVertical: 'top',
  },

  shareOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  shareBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },

  shareSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },

  shareHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },

  shareTitle: {
    ...typography.h2,
    textAlign: 'center',
  },

  shareCourseTitle: {
    ...typography.body,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  linkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.lg,
  },

  shareUrl: {
    flex: 1,
    ...typography.caption,
    marginRight: spacing.sm,
  },

  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },

  copyBtnText: {
    color: colors.primary,
    fontWeight: '700',
  },

  shareViaTitle: {
    ...typography.caption,
    fontWeight: '700',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },

  socialGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  socialItem: {
    alignItems: 'center',
    width: '23%',
  },

  socialIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  socialText: {
    ...typography.caption,
    marginTop: 6,
    textAlign: 'center',
  },

  closeShareBtn: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
  },

  closeShareText: {
    fontWeight: '700',
    color: colors.text,
  },
});