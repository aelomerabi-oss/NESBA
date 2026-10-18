import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
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
} from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { completeLesson } from '../../lib/nesba';
import { supabase } from '../../lib/supabase';

export default function LessonScreen() {
  const { id } = useLocalSearchParams();
  const { session } = useAuth();

  const [lesson, setLesson] = useState(null);
  const [content, setContent] = useState([]);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [courseLessons, setCourseLessons] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('course_modules')
          .select('*, courses(id,title)')
          .eq('id', id)
          .single();

        if (error) {
          Alert.alert('Lesson error', error.message);
          return;
        }

        setLesson(data);

        /*
         * Load lesson content.
         */
        const {
          data: contentData,
          error: contentError,
        } = await supabase
          .from('lesson_content')
          .select('*')
          .eq('lesson_id', id)
          .eq('is_published', true)
          .order('sort_order', {
            ascending: true,
          });

        if (contentError) {
          Alert.alert(
            'Content error',
            contentError.message
          );
        } else {
          setContent(contentData || []);
        }

        /*
         * Load all lessons belonging to the same course.
         * This supports Previous / Next navigation.
         */
        if (data?.course_id) {
          const {
            data: lessons,
            error: lessonsError,
          } = await supabase
            .from('course_modules')
            .select(
              'id,title,duration_minutes,sort_order,is_locked,video_url'
            )
            .eq('course_id', data.course_id)
            .order('sort_order', {
              ascending: true,
            });

          if (!lessonsError) {
            setCourseLessons(lessons || []);

            const index = (lessons || []).findIndex(
              (item) => item.id === id
            );

            setCurrentIndex(index);
          }
        }

        /*
         * Load learner completion state.
         */
        if (session?.user) {
          const { data: p } = await supabase
            .from('lesson_progress')
            .select('module_id,completed')
            .eq('user_id', session.user.id)
            .eq('module_id', id)
            .maybeSingle();

          setCompleted(!!p?.completed);
        }
      } catch (error) {
        Alert.alert(
          'Lesson error',
          error.message
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, session]);

  const finish = async () => {
    if (!session?.user) {
      return Alert.alert(
        'Log in required',
        'Please log in to complete this lesson.'
      );
    }

    try {
      setSaving(true);

      const result = await completeLesson(id);

      setCompleted(true);

      const progress = Number(
        result?.progress_percent ??
          result?.progress ??
          0
      );

      Alert.alert(
        result?.course_completed
          ? 'Course completed! 🎉'
          : 'Lesson completed',
        result?.certificate_id
          ? `Certificate ${result.certificate_id} is now available in Your Learning.`
          : `Your progress is now ${progress}%.`
      );
    } catch (e) {
      Alert.alert(
        'Could not save progress',
        e.message
      );
    } finally {
      setSaving(false);
    }
  };

  const openUrl = async (url, label = 'content') => {
    if (!url) {
      Alert.alert(
        'Unavailable',
        `This ${label} does not have a link yet.`
      );
      return;
    }

    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert(
        'Unable to open',
        `The ${label} link could not be opened.`
      );
    }
  };

  const getProviderLabel = (provider) => {
    if (!provider) {
      return null;
    }

    const providers = {
      nesba: 'NESBA',
      zoom: 'Zoom',
      microsoft_teams: 'Microsoft Teams',
      google_meet: 'Google Meet',
      youtube: 'YouTube',
      vimeo: 'Vimeo',
    };

    return providers[provider] || provider;
  };

  const getContentIcon = (type) => {
    switch (type) {
      case 'video':
        return 'videocam-outline';

      case 'recording':
        return 'radio-outline';

      case 'document':
        return 'document-text-outline';

      case 'text':
        return 'book-outline';

      case 'audio':
        return 'headset-outline';

      case 'quiz':
        return 'help-circle-outline';

      case 'assignment':
        return 'create-outline';

      case 'external_link':
        return 'open-outline';

      default:
        return 'document-outline';
    }
  };

  const getContentLabel = (item) => {
    switch (item.content_type) {
      case 'video':
        return 'Video';

      case 'recording':
        return 'Recorded Session';

      case 'document':
        return 'Document';

      case 'text':
        return 'Reading';

      case 'audio':
        return 'Audio';

      case 'quiz':
        return 'Quiz';

      case 'assignment':
        return 'Assignment';

      case 'external_link':
        return 'External Resource';

      default:
        return 'Content';
    }
  };

  const goToPreviousLesson = () => {
    if (currentIndex <= 0) {
      return;
    }

    const previous =
      courseLessons[currentIndex - 1];

    if (!previous) {
      return;
    }

    if (previous.is_locked) {
      Alert.alert(
        'Lesson locked',
        'This lesson is currently locked.'
      );
      return;
    }

    router.replace(`/lesson/${previous.id}`);
  };

  const goToNextLesson = () => {
    if (
      currentIndex === -1 ||
      currentIndex >= courseLessons.length - 1
    ) {
      return;
    }

    const next =
      courseLessons[currentIndex + 1];

    if (!next) {
      return;
    }

    if (next.is_locked) {
      Alert.alert(
        'Lesson locked',
        'This lesson is currently locked.'
      );
      return;
    }

    router.replace(`/lesson/${next.id}`);
  };

  const isFirstLesson =
    currentIndex <= 0;

  const isLastLesson =
    currentIndex !== -1 &&
    currentIndex >= courseLessons.length - 1;

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          styles.center,
        ]}
      >
        <ActivityIndicator
          color={colors.primary}
        />
      </View>
    );
  }

  if (!lesson) {
    return (
      <View style={styles.container}>
        <Text style={styles.muted}>
          Lesson not found.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* COURSE */}
      <View style={styles.courseHeader}>
        <Ionicons
          name="school-outline"
          size={18}
          color={colors.primary}
        />

        <Text style={styles.course}>
          {lesson.courses?.title}
        </Text>
      </View>

      {/* LESSON TITLE */}
      <Text style={styles.title}>
        {lesson.title}
      </Text>

      {/* META */}
      <View style={styles.metaRow}>
        <Ionicons
          name="time-outline"
          size={16}
          color={colors.textMuted}
        />

        <Text style={styles.muted}>
          {lesson.duration_minutes || 0} minutes
        </Text>

        {completed && (
          <View style={styles.completedBadge}>
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={colors.success}
            />

            <Text style={styles.completedText}>
              Completed
            </Text>
          </View>
        )}
      </View>

      {/* LESSON CONTENT */}
      <View style={styles.contentSection}>
        <Text style={styles.sectionHeading}>
          Lesson Content
        </Text>

        {content.length === 0 ? (
          <View style={styles.emptyContent}>
            <Ionicons
              name="document-outline"
              size={36}
              color={colors.textMuted}
            />

            <Text style={styles.emptyContentTitle}>
              No content yet
            </Text>

            <Text style={styles.emptyContentText}>
              Learning content will be available here.
            </Text>
          </View>
        ) : (
          content.map((item) => {
            const provider = getProviderLabel(
              item.provider
            );

            return (
              <View
                key={item.id}
                style={styles.contentCard}
              >
                <View style={styles.contentIcon}>
                  <Ionicons
                    name={getContentIcon(
                      item.content_type
                    )}
                    size={24}
                    color={colors.primary}
                  />
                </View>

                <View
                  style={styles.contentInfo}
                >
                  <Text style={styles.contentTitle}>
                    {item.title}
                  </Text>

                  <View
                    style={styles.contentMeta}
                  >
                    <Text
                      style={
                        styles.contentTypeLabel
                      }
                    >
                      {getContentLabel(item)}
                    </Text>

                    {provider && (
                      <>
                        <Text
                          style={
                            styles.contentSeparator
                          }
                        >
                          •
                        </Text>

                        <Text
                          style={
                            styles.contentProvider
                          }
                        >
                          {provider}
                        </Text>
                      </>
                    )}
                  </View>

                  {item.description ? (
                    <Text
                      style={
                        styles.contentDescription
                      }
                    >
                      {item.description}
                    </Text>
                  ) : null}

                  {item.content_type === 'text' &&
                  item.description ? (
                    <View
                      style={
                        styles.textContent
                      }
                    >
                      <Text
                        style={
                          styles.textContentText
                        }
                      >
                        {item.description}
                      </Text>
                    </View>
                  ) : null}

                  {item.content_url ? (
                    <Pressable
                      style={
                        styles.contentButton
                      }
                      onPress={() =>
                        openUrl(
                          item.content_url,
                          getContentLabel(item)
                        )
                      }
                    >
                      <Ionicons
                        name={
                          item.content_type ===
                            'document'
                            ? 'download-outline'
                            : 'open-outline'
                        }
                        size={18}
                        color="#fff"
                      />

                      <Text
                        style={
                          styles.contentButtonText
                        }
                      >
                        {item.content_type ===
                        'document'
                          ? 'Open Document'
                          : item.content_type ===
                            'recording'
                          ? 'Watch Recording'
                          : item.content_type ===
                            'video'
                          ? 'Watch Video'
                          : item.content_type ===
                            'audio'
                          ? 'Play Audio'
                          : item.content_type ===
                            'external_link'
                          ? 'Open Resource'
                          : 'Open Content'}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* COMPLETE LESSON */}
      <Pressable
        style={[
          styles.primary,
          completed && styles.done,
        ]}
        onPress={finish}
        disabled={saving || completed}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <View style={styles.buttonContent}>
            <Ionicons
              name={
                completed
                  ? 'checkmark-circle'
                  : 'checkmark-circle-outline'
              }
              size={20}
              color="#fff"
            />

            <Text style={styles.primaryText}>
              {completed
                ? '✓ Lesson Completed'
                : 'Mark Lesson Complete'}
            </Text>
          </View>
        )}
      </Pressable>

      {/* PREVIOUS / NEXT */}
      <View style={styles.navigationRow}>
        <Pressable
          style={[
            styles.navigationButton,
            isFirstLesson &&
              styles.navigationDisabled,
          ]}
          onPress={goToPreviousLesson}
          disabled={isFirstLesson}
        >
          <Ionicons
            name="arrow-back"
            size={18}
            color={
              isFirstLesson
                ? colors.textMuted
                : colors.text
            }
          />

          <Text
            style={[
              styles.navigationText,
              isFirstLesson &&
                styles.navigationTextDisabled,
            ]}
          >
            Previous
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.navigationButton,
            isLastLesson &&
              styles.navigationDisabled,
          ]}
          onPress={goToNextLesson}
          disabled={isLastLesson}
        >
          <Text
            style={[
              styles.navigationText,
              isLastLesson &&
                styles.navigationTextDisabled,
            ]}
          >
            Next
          </Text>

          <Ionicons
            name="arrow-forward"
            size={18}
            color={
              isLastLesson
                ? colors.textMuted
                : colors.text
            }
          />
        </Pressable>
      </View>

      {/* BACK TO COURSE */}
      <Pressable
        style={styles.secondary}
        onPress={() => router.back()}
      >
        <Ionicons
          name="arrow-back-outline"
          size={18}
          color={colors.text}
        />

        <Text style={styles.secondaryText}>
          Back to Course
        </Text>
      </Pressable>
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
  },

  courseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },

  course: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primary,
  },

  title: {
    ...typography.h1,
    fontSize: 26,
    lineHeight: 32,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: 6,
  },

  muted: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: 4,
  },

  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },

  completedText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '700',
  },

  contentSection: {
    marginTop: spacing.lg,
  },

  sectionHeading: {
    ...typography.h2,
    fontSize: 20,
    marginBottom: spacing.sm,
  },

  emptyContent: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyContentTitle: {
    ...typography.body,
    fontWeight: '700',
    marginTop: spacing.sm,
  },

  emptyContentText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },

  contentCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },

  contentIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  contentInfo: {
    flex: 1,
  },

  contentTitle: {
    ...typography.body,
    fontWeight: '700',
  },

  contentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },

  contentTypeLabel: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },

  contentSeparator: {
    ...typography.caption,
    color: colors.textMuted,
    marginHorizontal: 5,
  },

  contentProvider: {
    ...typography.caption,
    color: colors.textMuted,
  },

  contentDescription: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 6,
    lineHeight: 18,
  },

  textContent: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
  },

  textContentText: {
    ...typography.body,
    lineHeight: 21,
  },

  contentButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },

  contentButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },

  primary: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.md,
    minHeight: 50,
    justifyContent: 'center',
  },

  done: {
    backgroundColor: colors.success,
  },

  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  primaryText: {
    color: '#fff',
    fontWeight: '700',
  },

  navigationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.md,
  },

  navigationButton: {
    flex: 1,
    minHeight: 48,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },

  navigationDisabled: {
    opacity: 0.45,
  },

  navigationText: {
    color: colors.text,
    fontWeight: '700',
  },

  navigationTextDisabled: {
    color: colors.textMuted,
  },

  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
    marginTop: spacing.sm,
  },

  secondaryText: {
    color: colors.text,
    fontWeight: '700',
  },
});