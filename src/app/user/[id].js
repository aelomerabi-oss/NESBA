import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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

import {
  getPublicProfile,
  getPublicProfileAudio,
  getPublicProfileBadges,
  getPublicProfileCertificates,
  getPublicProfileCompletedCourses,
  getPublicProfileCourses,
  getPublicProfileLectures,
  getPublicProfilePosts,
  getPublicProfileShares,
  toggleFollow,
} from '../../lib/nesba';

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();

  const userId = Array.isArray(id) ? id[0] : id;

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [courses, setCourses] = useState([]);
  const [completedCourses, setCompletedCourses] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [badges, setBadges] = useState([]);
  const [audio, setAudio] = useState([]);
  const [lectures, setLectures] = useState([]);
  const [shares, setShares] = useState([]);

  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const viewerId = user?.id || null;

        const [
          profileData,
          postsData,
          coursesData,
          completedData,
          certificatesData,
          badgesData,
          audioData,
          lecturesData,
          sharesData,
        ] = await Promise.all([
          getPublicProfile(userId, viewerId),
          getPublicProfilePosts(userId),
          getPublicProfileCourses(userId),
          getPublicProfileCompletedCourses(userId),
          getPublicProfileCertificates(userId),
          getPublicProfileBadges(userId),
          getPublicProfileAudio(userId),
          getPublicProfileLectures(userId),
          getPublicProfileShares(userId),
        ]);

        if (!mounted) return;

        console.log(
          'PUBLIC PROFILE:',
          profileData
        );

        console.log(
          'PUBLIC PROFILE COMPLETED COURSES:',
          completedData
        );

        console.log(
          'PUBLIC PROFILE CERTIFICATES:',
          certificatesData
        );

        console.log(
          'PUBLIC PROFILE BADGES:',
          badgesData
        );

        setProfile(profileData);
        setPosts(postsData || []);
        setCourses(coursesData || []);
        setCompletedCourses(completedData || []);
        setCertificates(certificatesData || []);
        setBadges(badgesData || []);
        setAudio(audioData || []);
        setLectures(lecturesData || []);
        setShares(sharesData || []);

        setFollowing(
          Boolean(profileData?.isFollowing)
        );
      } catch (error) {
        console.error(
          'Public profile loading error:',
          error
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [userId, user?.id]);

  async function handleFollow() {
    if (!user?.id || !userId) {
      return;
    }

    if (user.id === userId) {
      return;
    }

    try {
      setFollowLoading(true);

      const newFollowing = await toggleFollow({
        followerId: user.id,
        followingUserId: userId,
      });

      setFollowing(newFollowing);

      setProfile((current) => {
        if (!current) return current;

        const currentFollowers =
          Number(
            current.stats?.followers || 0
          );

        return {
          ...current,
          isFollowing: newFollowing,
          stats: {
            ...current.stats,
            followers: Math.max(
              0,
              currentFollowers +
                (newFollowing ? 1 : -1)
            ),
          },
        };
      });
    } catch (error) {
      console.error(
        'Follow error:',
        error
      );
    } finally {
      setFollowLoading(false);
    }
  }

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          styles.center,
        ]}
      >
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />

        <Text style={styles.loadingText}>
          Loading profile...
        </Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View
        style={[
          styles.container,
          styles.center,
        ]}
      >
        <Text style={styles.emptyTitle}>
          Profile not found
        </Text>

        <Text style={styles.muted}>
          We could not load this user's
          profile.
        </Text>

        <Pressable
          style={styles.primaryButton}
          onPress={() => router.back()}
        >
          <Text
            style={styles.primaryButtonText}
          >
            Go Back
          </Text>
        </Pressable>
      </View>
    );
  }

  const name =
    profile.full_name ||
    profile.name ||
    'NESBA Member';

  const role =
    profile.role === 'organization'
      ? 'Organization'
      : profile.role
        ? String(profile.role)
            .charAt(0)
            .toUpperCase() +
          String(profile.role).slice(1)
        : 'Student';

  const avatar =
    profile.avatar_url ||
    profile.avatar ||
    null;

  const bio =
    profile.bio ||
    'Hello World !';

  const isOwnProfile =
    user?.id === userId;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* BACK BUTTON */}

      <Pressable
        style={styles.backButton}
        onPress={() => router.back()}
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

      {/* PROFILE HEADER */}

      <View style={styles.header}>
        {avatar ? (
          <Image accessibilityLabel="Profile photo"
            source={{
              uri: avatar,
            }}
            style={styles.avatarImage}
          />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {name
                .charAt(0)
                .toUpperCase()}
            </Text>
          </View>
        )}

        <Text style={styles.name}>
          {name}
        </Text>

        <Text style={styles.role}>
          {role}
        </Text>

        <Text style={styles.bio}>
          {bio}
        </Text>

        {!isOwnProfile &&
          user?.id && (
            <Pressable
              style={[
                styles.followButton,
                following &&
                  styles.followingButton,
              ]}
              onPress={handleFollow}
              disabled={followLoading}
            >
              {followLoading ? (
                <ActivityIndicator
                  color="#fff"
                />
              ) : (
                <Text
                  style={
                    styles.followButtonText
                  }
                >
                  {following
                    ? 'Following'
                    : 'Follow'}
                </Text>
              )}
            </Pressable>
          )}
      </View>

      {/* STATS */}

      <View style={styles.stats}>
        <Stat
          value={
            profile.stats?.followers || 0
          }
          label="Followers"
        />

        <Stat
          value={
            profile.stats?.following || 0
          }
          label="Following"
        />

        <Stat
          value={
            profile.stats?.courses || 0
          }
          label="Courses"
        />

        <Stat
          value={
            profile.stats?.posts || 0
          }
          label="Posts"
        />
      </View>

      {/* COMPLETED COURSES */}

      <SectionTitle>
        Completed Courses
      </SectionTitle>

      {completedCourses.length === 0 ? (
        <EmptyText>
          No completed courses yet.
        </EmptyText>
      ) : (
        completedCourses.map(
          (item, index) => {
            const course =
              item.course ||
              item.courses ||
              null;

            const courseTitle =
              course?.title ||
              item.course_title ||
              item.courseTitle ||
              item.courseName ||
              item.title ||
              'Completed Course';

            const courseId =
              course?.id ||
              item.course_id ||
              null;

            return (
              <Pressable
                key={
                  item.id ||
                  courseId ||
                  `completed-${index}`
                }
                style={styles.card}
                onPress={() => {
                  if (courseId) {
                    router.push(
                      `/course/${courseId}`
                    );
                  }
                }}
              >
                <View
                  style={styles.cardIcon}
                >
                  <Text
                    style={styles.check}
                  >
                    ✓
                  </Text>
                </View>

                <View
                  style={styles.cardContent}
                >
                  <Text
                    style={styles.cardTitle}
                  >
                    {courseTitle}
                  </Text>

                  <Text
                    style={styles.successText}
                  >
                    Completed
                  </Text>
                </View>

                <Text
                  style={styles.percent}
                >
                  100%
                </Text>
              </Pressable>
            );
          }
        )
      )}

      {/* CERTIFICATES */}

      <SectionTitle>
        Certificates
      </SectionTitle>

      {certificates.length === 0 ? (
        <EmptyText>
          No certificates yet.
        </EmptyText>
      ) : (
        certificates.map(
          (certificate, index) => {
            const course =
              certificate.course ||
              certificate.courses ||
              null;

            const courseTitle =
              course?.title ||
              certificate.course_title ||
              certificate.courseTitle ||
              certificate.courseName ||
              certificate.title ||
              'NESBA Certificate';

            const certificateId =
              certificate.certificate_id ||
              certificate.id;

            return (
              <Pressable
                key={
                  certificateId ||
                  `certificate-${index}`
                }
                style={
                  styles.achievement
                }
                onPress={() => {
                  if (certificateId) {
                    router.push(
                      `/certificate/${certificateId}`
                    );
                  }
                }}
              >
                <View
                  style={
                    styles.achievementTop
                  }
                >
                  <Text
                    style={
                      styles.achievementIcon
                    }
                  >
                    🏆
                  </Text>

                  <View
                    style={
                      styles.cardContent
                    }
                  >
                    <Text
                      style={
                        styles.cardTitle
                      }
                    >
                      {courseTitle}
                    </Text>

                    <Text
                      style={
                        styles.certificateName
                      }
                    >
                      NESBA Certificate
                    </Text>
                  </View>
                </View>

                {!!certificate.issued_at && (
                  <Text
                    style={styles.muted}
                  >
                    Issued{' '}
                    {new Date(
                      certificate.issued_at
                    ).toLocaleDateString()}
                  </Text>
                )}

                {!!certificateId && (
                  <Text
                    style={
                      styles.certificateId
                    }
                  >
                    ID: {certificateId}
                  </Text>
                )}
              </Pressable>
            );
          }
        )
      )}

      {/* BADGES */}

      <SectionTitle>
        Badges
      </SectionTitle>

      {badges.length === 0 ? (
        <EmptyText>
          No badges yet.
        </EmptyText>
      ) : (
        badges.map(
          (badge, index) => {
            const course =
              badge.course ||
              badge.courses ||
              null;

            const badgeName =
              badge.badgeName ||
              badge.badges?.name ||
              badge.name ||
              'NESBA Badge';

            const description =
              badge.description ||
              badge.badges?.description ||
              '';

            const courseTitle =
              course?.title ||
              badge.courseTitle ||
              badge.course_title ||
              badge.courseName ||
              null;

            return (
              <View
                key={
                  badge.id ||
                  badge.badge_id ||
                  `badge-${index}`
                }
                style={
                  styles.achievement
                }
              >
                <View
                  style={
                    styles.achievementTop
                  }
                >
                  <Text
                    style={
                      styles.achievementIcon
                    }
                  >
                    🏅
                  </Text>

                  <View
                    style={
                      styles.cardContent
                    }
                  >
                    <Text
                      style={
                        styles.cardTitle
                      }
                    >
                      {badgeName}
                    </Text>

                    {!!courseTitle && (
                      <Text
                        style={
                          styles.courseReference
                        }
                      >
                        Course: {courseTitle}
                      </Text>
                    )}

                    {!!description && (
                      <Text
                        style={
                          styles.muted
                        }
                      >
                        {description}
                      </Text>
                    )}
                  </View>
                </View>

                {!!badge.awarded_at && (
                  <Text
                    style={styles.muted}
                  >
                    Awarded{' '}
                    {new Date(
                      badge.awarded_at
                    ).toLocaleDateString()}
                  </Text>
                )}
              </View>
            );
          }
        )
      )}

      {/* COURSE LIBRARY */}

      <SectionTitle>
        Course Library
      </SectionTitle>

      {courses.length === 0 ? (
        <EmptyText>
          Courses published by this teacher
          or organisation will appear here.
        </EmptyText>
      ) : (
        courses.map(
          (course, index) => (
            <Pressable
              key={
                course.id ||
                `course-${index}`
              }
              style={styles.card}
              onPress={() => {
                if (course.id) {
                  router.push(
                    `/course/${course.id}`
                  );
                }
              }}
            >
              <View
                style={styles.cardIcon}
              >
                <Ionicons
                  name="school-outline"
                  size={22}
                  color={colors.primary}
                />
              </View>

              <View
                style={styles.cardContent}
              >
                <Text
                  style={styles.cardTitle}
                >
                  {course.title ||
                    course.name ||
                    'Course'}
                </Text>

                {!!course.description && (
                  <Text
                    style={styles.muted}
                    numberOfLines={2}
                  >
                    {course.description}
                  </Text>
                )}
              </View>

              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textMuted}
              />
            </Pressable>
          )
        )
      )}

      {/* AUDIO */}

      <SectionTitle>
        Audio & Podcasts
      </SectionTitle>

      {audio.length === 0 ? (
        <EmptyText>
          Podcasts, audio lessons and recorded
          audio sessions will appear here.
        </EmptyText>
      ) : (
        audio.map(
          (item, index) => (
            <View
              key={
                item.id ||
                `audio-${index}`
              }
              style={styles.card}
            >
              <Ionicons
                name="headset-outline"
                size={24}
                color={colors.primary}
              />

              <View
                style={styles.cardContent}
              >
                <Text
                  style={styles.cardTitle}
                >
                  {item.title ||
                    'Audio Session'}
                </Text>
              </View>
            </View>
          )
        )
      )}

      {/* LECTURES */}

      <SectionTitle>
        Lectures & Recordings
      </SectionTitle>

      {lectures.length === 0 ? (
        <EmptyText>
          Lectures, live recordings and
          educational videos will appear here.
        </EmptyText>
      ) : (
        lectures.map(
          (item, index) => (
            <View
              key={
                item.id ||
                `lecture-${index}`
              }
              style={styles.card}
            >
              <Ionicons
                name="videocam-outline"
                size={24}
                color={colors.primary}
              />

              <View
                style={styles.cardContent}
              >
                <Text
                  style={styles.cardTitle}
                >
                  {item.title ||
                    'Lecture'}
                </Text>
              </View>
            </View>
          )
        )
      )}

      {/* POSTS */}

      <SectionTitle>
        Posts
      </SectionTitle>

      {posts.length === 0 ? (
        <EmptyText>
          No posts yet.
        </EmptyText>
      ) : (
        posts.map(
          (post, index) => (
            <View
              key={
                post.id ||
                `post-${index}`
              }
              style={styles.postCard}
            >
              {!!post.created_at && (
                <Text
                  style={styles.date}
                >
                  {new Date(
                    post.created_at
                  ).toLocaleDateString()}
                </Text>
              )}

              <Text
                style={styles.postText}
              >
                {post.content || ''}
              </Text>

              <Pressable
                onPress={() => {
                  if (post.id) {
                    router.push(
                      `/post/${post.id}`
                    );
                  }
                }}
              >
                <Text
                  style={styles.openPost}
                >
                  Open post →
                </Text>
              </Pressable>
            </View>
          )
        )
      )}

      {/* SHARES */}

      <SectionTitle>
        Shares
      </SectionTitle>

      {shares.length === 0 ? (
        <EmptyText>
          Content shared by this user will
          appear here.
        </EmptyText>
      ) : (
        shares.map(
          (share, index) => (
            <View
              key={
                share.id ||
                `share-${index}`
              }
              style={styles.card}
            >
              <Ionicons
                name="share-social-outline"
                size={22}
                color={colors.primary}
              />

              <View
                style={styles.cardContent}
              >
                <Text
                  style={styles.cardTitle}
                >
                  {share.title ||
                    share.content_type ||
                    'Shared Content'}
                </Text>

                {!!share.content_id && (
                  <Text
                    style={styles.muted}
                  >
                    {share.content_id}
                  </Text>
                )}
              </View>
            </View>
          )
        )
      )}
    </ScrollView>
  );
}

/*
|--------------------------------------------------------------------------
| STAT
|--------------------------------------------------------------------------
*/

function Stat({
  value,
  label,
}) {
  return (
    <View style={styles.stat}>
      <Text
        style={styles.statNumber}
      >
        {value}
      </Text>

      <Text
        style={styles.statLabel}
      >
        {label}
      </Text>
    </View>
  );
}

/*
|--------------------------------------------------------------------------
| SECTION TITLE
|--------------------------------------------------------------------------
*/

function SectionTitle({
  children,
}) {
  return (
    <Text
      style={styles.sectionTitle}
    >
      {children}
    </Text>
  );
}

/*
|--------------------------------------------------------------------------
| EMPTY TEXT
|--------------------------------------------------------------------------
*/

function EmptyText({
  children,
}) {
  return (
    <View
      style={styles.emptyBox}
    >
      <Text
        style={styles.muted}
      >
        {children}
      </Text>
    </View>
  );
}

/*
|--------------------------------------------------------------------------
| STYLES
|--------------------------------------------------------------------------
*/

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:
      colors.background,
  },

  content: {
    padding:
      spacing.md,
    paddingBottom:
      spacing.xl,
  },

  center: {
    justifyContent:
      'center',
    alignItems:
      'center',
    padding:
      spacing.lg,
  },

  loadingText: {
    color:
      colors.textMuted,
    marginTop:
      spacing.md,
  },

  backButton: {
    flexDirection:
      'row',
    alignItems:
      'center',
    gap:
      spacing.xs,
    marginBottom:
      spacing.md,
  },

  backText: {
    color:
      colors.text,
    fontSize: 15,
    fontWeight:
      '600',
  },

  header: {
    alignItems:
      'center',
    paddingTop:
      spacing.sm,
    paddingBottom:
      spacing.lg,
  },

  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom:
      spacing.sm,
  },

  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor:
      colors.primary,
    alignItems:
      'center',
    justifyContent:
      'center',
    marginBottom:
      spacing.sm,
  },

  avatarText: {
    color: '#fff',
    fontSize: 34,
    fontWeight:
      '800',
  },

  name: {
    ...typography.h1,
    fontSize: 26,
    textAlign:
      'center',
  },

  role: {
    color:
      colors.primaryLight,
    fontSize: 14,
    fontWeight:
      '700',
    marginTop: 3,
  },

  bio: {
    ...typography.body,
    color:
      colors.textMuted,
    textAlign:
      'center',
    marginTop:
      spacing.sm,
    maxWidth: 500,
  },

  followButton: {
    backgroundColor:
      colors.primary,
    paddingHorizontal:
      spacing.xl,
    paddingVertical:
      spacing.sm,
    borderRadius:
      radius.md,
    marginTop:
      spacing.md,
    minWidth: 110,
    alignItems:
      'center',
  },

  followingButton: {
    backgroundColor:
      colors.surfaceAlt,
    borderWidth: 1,
    borderColor:
      colors.border,
  },

  followButtonText: {
    color: '#fff',
    fontWeight:
      '700',
  },

  stats: {
    flexDirection:
      'row',
    gap:
      spacing.sm,
    marginBottom:
      spacing.md,
  },

  stat: {
    flex: 1,
    backgroundColor:
      colors.surface,
    borderWidth: 1,
    borderColor:
      colors.border,
    borderRadius:
      radius.md,
    padding:
      spacing.sm,
    alignItems:
      'center',
  },

  statNumber: {
    color:
      colors.primaryLight,
    fontSize: 20,
    fontWeight:
      '800',
  },

  statLabel: {
    color:
      colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },

  sectionTitle: {
    ...typography.h2,
    marginTop:
      spacing.lg,
    marginBottom:
      spacing.sm,
  },

  card: {
    flexDirection:
      'row',
    alignItems:
      'center',
    backgroundColor:
      colors.surface,
    borderWidth: 1,
    borderColor:
      colors.border,
    borderRadius:
      radius.md,
    padding:
      spacing.md,
    marginBottom:
      spacing.sm,
    gap:
      spacing.sm,
  },

  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor:
      colors.surfaceAlt,
    alignItems:
      'center',
    justifyContent:
      'center',
  },

  check: {
    color:
      colors.success,
    fontSize: 22,
    fontWeight:
      '800',
  },

  cardContent: {
    flex: 1,
  },

  cardTitle: {
    ...typography.body,
    fontWeight:
      '700',
  },

  successText: {
    color:
      colors.success,
    fontSize: 13,
    fontWeight:
      '700',
    marginTop: 4,
  },

  percent: {
    color:
      colors.success,
    fontSize: 13,
    fontWeight:
      '800',
  },

  achievement: {
    backgroundColor:
      colors.surface,
    borderWidth: 1,
    borderColor:
      colors.border,
    borderRadius:
      radius.md,
    padding:
      spacing.md,
    marginBottom:
      spacing.sm,
  },

  achievementTop: {
    flexDirection:
      'row',
    alignItems:
      'flex-start',
    gap:
      spacing.sm,
  },

  achievementIcon: {
    fontSize: 26,
  },

  certificateName: {
    color:
      colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },

  certificateId: {
    color:
      colors.primaryLight,
    fontSize: 12,
    fontWeight:
      '700',
    marginTop: 6,
  },

  courseReference: {
    color:
      colors.primaryLight,
    fontSize: 13,
    fontWeight:
      '600',
    marginTop: 5,
  },

  muted: {
    ...typography.caption,
    color:
      colors.textMuted,
    lineHeight: 18,
    marginTop: 5,
  },

  emptyBox: {
    backgroundColor:
      colors.surface,
    borderWidth: 1,
    borderColor:
      colors.border,
    borderRadius:
      radius.md,
    padding:
      spacing.md,
    marginBottom:
      spacing.sm,
  },

  emptyTitle: {
    ...typography.h2,
    marginBottom:
      spacing.md,
    textAlign:
      'center',
  },

  primaryButton: {
    backgroundColor:
      colors.primary,
    paddingHorizontal:
      spacing.lg,
    paddingVertical:
      spacing.sm,
    borderRadius:
      radius.md,
    marginTop:
      spacing.md,
  },

  primaryButtonText: {
    color: '#fff',
    fontWeight:
      '700',
  },

  postCard: {
    backgroundColor:
      colors.surface,
    borderWidth: 1,
    borderColor:
      colors.border,
    borderRadius:
      radius.md,
    padding:
      spacing.md,
    marginBottom:
      spacing.sm,
  },

  date: {
    color:
      colors.textMuted,
    fontSize: 12,
    marginBottom:
      spacing.sm,
  },

  postText: {
    ...typography.body,
    lineHeight: 21,
  },

  openPost: {
    color:
      colors.primaryLight,
    fontWeight:
      '700',
    marginTop:
      spacing.md,
  },
});