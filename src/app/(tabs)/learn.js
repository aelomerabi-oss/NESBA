import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Link } from 'expo-router';

import {
  colors,
  radius,
  spacing,
  typography,
} from '../../constants/theme';

import { useAuth } from '../../context/AuthContext';

import { supabase } from '../../lib/supabase';


export default function LearningScreen() {
  const { session } = useAuth();

  const [enrollments, setEnrollments] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [badges, setBadges] = useState([]);

  const [courses, setCourses] = useState({});
  const [badgeDetails, setBadgeDetails] = useState({});
  const [lockedBadges, setLockedBadges] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);


  const load = useCallback(async () => {
    const userId = session?.user?.id;

    if (!userId) {
      setEnrollments([]);
      setCertificates([]);
      setBadges([]);
      setCourses({});
      setBadgeDetails({});
      setLockedBadges([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      /*
       * ---------------------------------------------------------------
       * 1. ENROLLMENTS
       * ---------------------------------------------------------------
       */

      const {
        data: enrollmentData,
        error: enrollmentError,
      } = await supabase
        .from('enrollments')
        .select('*')
        .eq('user_id', userId);

      if (enrollmentError) {
        throw enrollmentError;
      }


      /*
       * ---------------------------------------------------------------
       * 2. CERTIFICATES
       * ---------------------------------------------------------------
       */

      const {
        data: certificateData,
        error: certificateError,
      } = await supabase
        .from('certificates')
        .select('*')
        .eq('user_id', userId);

      if (certificateError) {
        throw certificateError;
      }


      /*
       * ---------------------------------------------------------------
       * 3. BADGES
       * ---------------------------------------------------------------
       */

      const {
        data: badgeData,
        error: badgeError,
      } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', userId);

      if (badgeError) {
        throw badgeError;
      }


      const safeEnrollments =
        enrollmentData || [];

      const safeCertificates =
        certificateData || [];

      const safeBadges =
        badgeData || [];


      setEnrollments(
        safeEnrollments
      );

      setCertificates(
        safeCertificates
      );

      setBadges(
        safeBadges
      );


      /*
       * ---------------------------------------------------------------
       * 4. GET COURSE IDs
       * ---------------------------------------------------------------
       */

      const courseIds = [
        ...new Set(
          [
            ...safeEnrollments.map(
              (item) => item.course_id
            ),

            ...safeCertificates.map(
              (item) => item.course_id
            ),
          ].filter(Boolean)
        ),
      ];


      /*
       * ---------------------------------------------------------------
       * 5. GET COURSE INFORMATION
       * ---------------------------------------------------------------
       */

      if (courseIds.length > 0) {

        const {
          data: courseData,
          error: courseError,
        } = await supabase
          .from('courses')
          .select('*')
          .in('id', courseIds);

        if (courseError) {
          console.error(
            'Course lookup error:',
            courseError
          );
        } else {

          const courseMap = {};

          (courseData || []).forEach(
            (course) => {
              courseMap[course.id] =
                course;
            }
          );

          setCourses(courseMap);
        }

      } else {
        setCourses({});
      }


      /*
       * ---------------------------------------------------------------
       * 6. GET BADGE INFORMATION
       * ---------------------------------------------------------------
       */

      const badgeIds = [
        ...new Set(
          safeBadges
            .map(
              (item) => item.badge_id
            )
            .filter(Boolean)
        ),
      ];


      if (badgeIds.length > 0) {

        const {
          data: badgeDataFull,
          error: badgeDetailsError,
        } = await supabase
          .from('badges')
          .select('*')
          .in('id', badgeIds);

        if (badgeDetailsError) {

          console.error(
            'Badge lookup error:',
            badgeDetailsError
          );

        } else {

          const badgeMap = {};

          (badgeDataFull || []).forEach(
            (badge) => {
              badgeMap[badge.id] =
                badge;
            }
          );

          setBadgeDetails(
            badgeMap
          );
        }

      } else {
        setBadgeDetails({});
      }


      /*
       * ---------------------------------------------------------------
       * 7. BADGES STILL TO UNLOCK
       * ---------------------------------------------------------------
       *
       * Course-completion badges are awarded automatically by the
       * database when a course reaches 100%.
       */

      const {
        data: activeBadges,
        error: activeBadgesError,
      } = await supabase
        .from('badges')
        .select('id,name,description,criteria')
        .eq('is_active', true);

      if (activeBadgesError) {
        console.error(
          'Active badge lookup error:',
          activeBadgesError
        );

        setLockedBadges([]);
      } else {
        setLockedBadges(
          (activeBadges || [])
            .filter(
              (badge) =>
                badge?.criteria?.type ===
                  'course_completion' &&
                !badgeIds.includes(badge.id)
            )
            .map((badge) => ({
              ...badge,
              target: Math.max(
                1,
                Number(badge.criteria?.count) || 1
              ),
            }))
            .sort(
              (a, b) => a.target - b.target
            )
        );
      }

    } catch (error) {

      console.error(
        'Learning screen error:',
        error
      );

    } finally {

      setLoading(false);
      setRefreshing(false);
    }

  }, [session?.user?.id]);


  useEffect(() => {
    load();
  }, [load]);


  /*
   * ---------------------------------------------------------------
   * COMPLETED
   * ---------------------------------------------------------------
   */

  const completed = useMemo(
    () =>
      enrollments.filter(
        (item) =>
          Number(
            item.progress_percent || 0
          ) >= 100
      ),
    [enrollments]
  );


  /*
   * ---------------------------------------------------------------
   * IN PROGRESS
   * ---------------------------------------------------------------
   */

  const inProgress = useMemo(
    () =>
      enrollments.filter(
        (item) =>
          Number(
            item.progress_percent || 0
          ) < 100
      ),
    [enrollments]
  );


  /*
   * ---------------------------------------------------------------
   * NOT LOGGED IN
   * ---------------------------------------------------------------
   */

  if (!session) {

    return (
      <View
        style={[
          styles.container,
          styles.center,
        ]}
      >

        <Text style={styles.title}>
          Your Learning
        </Text>

        <Text style={styles.muted}>
          Log in to track courses,
          certificates and badges.
        </Text>

      </View>
    );
  }


  /*
   * ---------------------------------------------------------------
   * LOADING
   * ---------------------------------------------------------------
   */

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


  /*
   * ---------------------------------------------------------------
   * SCREEN
   * ---------------------------------------------------------------
   */

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}

      refreshControl={
        <RefreshControl
          refreshing={refreshing}

          onRefresh={() => {
            setRefreshing(true);
            load();
          }}

          tintColor={
            colors.primary
          }
        />
      }
    >

      <Text style={styles.title}>
        Your Learning
      </Text>

      <Text style={styles.muted}>
        Continue where you left off
        and build your NESBA portfolio.
      </Text>


      {/* ============================================================
          STATISTICS
          ============================================================ */}

      <View style={styles.statsRow}>

        <View style={styles.stat}>

          <Text style={styles.statNumber}>
            {enrollments.length}
          </Text>

          <Text style={styles.statLabel}>
            Enrolled
          </Text>

        </View>


        <View style={styles.stat}>

          <Text style={styles.statNumber}>
            {completed.length}
          </Text>

          <Text style={styles.statLabel}>
            Completed
          </Text>

        </View>


        <View style={styles.stat}>

          <Text style={styles.statNumber}>
            {certificates.length}
          </Text>

          <Text style={styles.statLabel}>
            Certificates
          </Text>

        </View>


        <View style={styles.stat}>

          <Text style={styles.statNumber}>
            {badges.length}
          </Text>

          <Text style={styles.statLabel}>
            Badges
          </Text>

        </View>

      </View>


      {/* ============================================================
          CONTINUE LEARNING
          ============================================================ */}

      <Text style={styles.section}>
        Continue Learning
      </Text>


      {inProgress.length === 0 && (

        <View style={styles.empty}>

          <Text style={styles.emptyTitle}>
            Nothing in progress
          </Text>

          <Text style={styles.muted}>
            All your enrolled courses are
            completed, or enroll in a course
            to start your learning journey.
          </Text>

          <Link
            href="/courses"
            asChild
          >

            <Pressable
              style={styles.primary}
            >

              <Text style={styles.primaryText}>
                Explore Courses
              </Text>

            </Pressable>

          </Link>

        </View>
      )}


      {inProgress.map((item) => {

        const progress = Math.max(
          0,
          Math.min(
            100,
            Number(
              item.progress_percent || 0
            )
          )
        );

        const course =
          courses[item.course_id];

        const courseTitle =
          course?.title ||
          'Course';


        return (

          <Link
            key={item.id}
            href={`/course/${item.course_id}`}
            asChild
          >

            <Pressable
              style={styles.card}
            >

              <View
                style={styles.courseTop}
              >

                <View
                  style={styles.courseIcon}
                >

                  <Text>
                    📚
                  </Text>

                </View>


                <View
                  style={styles.courseInfo}
                >

                  <Text
                    style={styles.courseTitle}
                    numberOfLines={2}
                  >
                    {courseTitle}
                  </Text>

                  <Text
                    style={styles.mutedSmall}
                  >
                    {progress === 0
                      ? 'Not started'
                      : 'Continue learning'}
                  </Text>

                </View>


                <Text
                  style={styles.progress}
                >
                  {progress}%
                </Text>

              </View>


              <View
                style={styles.track}
              >

                <View
                  style={[
                    styles.fill,
                    {
                      width:
                        `${progress}%`,
                    },
                  ]}
                />

              </View>

            </Pressable>

          </Link>
        );
      })}


      {/* ============================================================
          COMPLETED COURSES
          ============================================================ */}

      <Text style={styles.section}>
        Completed Courses ({completed.length})
      </Text>


      {completed.length === 0 && (

        <Text style={styles.muted}>
          Completed courses will appear here.
        </Text>
      )}


      {completed.map((item) => {

        const course =
          courses[item.course_id];

        const courseTitle =
          course?.title ||
          'Course';


        return (

          <Link
            key={item.id}
            href={`/course/${item.course_id}`}
            asChild
          >

            <Pressable
              style={styles.card}
            >

              <View
                style={styles.courseTop}
              >

                <View
                  style={styles.completedIcon}
                >

                  <Text>
                    ✓
                  </Text>

                </View>


                <View
                  style={styles.courseInfo}
                >

                  <Text
                    style={styles.courseTitle}
                    numberOfLines={2}
                  >
                    {courseTitle}
                  </Text>

                  <Text
                    style={styles.mutedSmall}
                  >
                    Completed
                  </Text>

                </View>


                <Text
                  style={styles.completedText}
                >
                  100%
                </Text>

              </View>

            </Pressable>

          </Link>
        );
      })}


      {/* ============================================================
          CERTIFICATES
          ============================================================ */}

      <Text style={styles.section}>
        Certificates ({certificates.length})
      </Text>


      {certificates.length === 0 && (

        <Text style={styles.muted}>
          Complete an eligible course to earn
          your first certificate.
        </Text>
      )}


      {certificates.map((certificate) => {

        const course =
          courses[certificate.course_id];

        const courseTitle =
          course?.title ||
          'NESBA Certificate';

        const certificateId =
          certificate.certificate_id ||
          certificate.id;


        return (

          <Link
            key={certificate.id}
            href={`/certificate/${certificateId}`}
            asChild
          >

            <Pressable
              style={styles.achievement}
            >

              <View
                style={styles.achievementRow}
              >

                <View
                  style={styles.certificateIcon}
                >

                  <Text>
                    🏆
                  </Text>

                </View>


                <View
                  style={styles.courseInfo}
                >

                  <Text
                    style={styles.achievementTitle}
                  >
                    {courseTitle}
                  </Text>


                  <Text
                    style={styles.mutedSmall}
                  >
                    NESBA Certificate
                  </Text>


                  {!!certificate.issued_at && (

                    <Text
                      style={styles.mutedSmall}
                    >
                      Issued{' '}
                      {new Date(
                        certificate.issued_at
                      ).toLocaleDateString()}
                    </Text>

                  )}


                  <Text
                    style={styles.certificateId}
                  >
                    {certificateId}
                  </Text>

                </View>

              </View>

            </Pressable>

          </Link>
        );
      })}


      {/* ============================================================
          BADGES
          ============================================================ */}

      <Text style={styles.section}>
        Badges ({badges.length})
      </Text>


      {badges.length === 0 && (

        <Text style={styles.muted}>
          Your achievements will appear here.
        </Text>
      )}


      <View style={styles.badgeWrap}>

        {badges.map((item) => {

          const badge =
            badgeDetails[item.badge_id];

          return (

            <View
              key={item.id}
              style={styles.badge}
            >

              <View
                style={styles.badgeIcon}
              >

                <Text>
                  🏅
                </Text>

              </View>


              <View
                style={styles.badgeInfo}
              >

                <Text
                  style={styles.badgeName}
                >
                  {badge?.name ||
                    'NESBA Badge'}
                </Text>


                <Text
                  style={styles.badgeDescription}
                >
                  {badge?.description ||
                    'Achievement earned on NESBA.'}
                </Text>

              </View>

            </View>
          );
        })}

      </View>


      {lockedBadges.length > 0 && (

        <Text style={styles.subsection}>
          Badges to unlock
        </Text>
      )}


      <View style={styles.badgeWrap}>

        {lockedBadges.map((badge) => {

          const done = Math.min(
            certificates.length,
            badge.target
          );

          return (

            <View
              key={badge.id}
              style={[
                styles.badge,
                styles.badgeLocked,
              ]}
            >

              <View
                style={styles.badgeIcon}
              >

                <Text>
                  🔒
                </Text>

              </View>


              <View
                style={styles.badgeInfo}
              >

                <Text
                  style={styles.badgeName}
                >
                  {badge.name}
                </Text>


                <Text
                  style={styles.badgeDescription}
                >
                  {done} of {badge.target}{' '}
                  {badge.target === 1
                    ? 'course'
                    : 'courses'}{' '}
                  completed
                </Text>


                <View
                  style={styles.badgeTrack}
                >

                  <View
                    style={[
                      styles.badgeFill,
                      {
                        width: `${Math.round(
                          (done / badge.target) * 100
                        )}%`,
                      },
                    ]}
                  />

                </View>

              </View>

            </View>
          );
        })}

      </View>

    </ScrollView>
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

  title: {
    ...typography.h1,
    fontSize: 24,
  },

  muted: {
    ...typography.body,

    color:
      colors.textMuted,

    lineHeight:
      21,

    marginTop:
      4,
  },

  mutedSmall: {
    ...typography.caption,

    color:
      colors.textMuted,

    marginTop:
      3,
  },

  section: {
    ...typography.h2,

    marginTop:
      spacing.lg,

    marginBottom:
      spacing.sm,
  },


  /*
  |--------------------------------------------------------------------------
  | STATISTICS
  |--------------------------------------------------------------------------
  */

  statsRow: {
    flexDirection:
      'row',

    gap:
      spacing.sm,

    marginTop:
      spacing.md,
  },

  stat: {
    flex: 1,

    backgroundColor:
      colors.surface,

    borderWidth:
      1,

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

    fontSize:
      20,

    fontWeight:
      '800',
  },

  statLabel: {
    color:
      colors.textMuted,

    fontSize:
      10,

    marginTop:
      2,
  },


  /*
  |--------------------------------------------------------------------------
  | COURSE CARDS
  |--------------------------------------------------------------------------
  */

  card: {
    backgroundColor:
      colors.surface,

    borderWidth:
      1,

    borderColor:
      colors.border,

    borderRadius:
      radius.md,

    padding:
      spacing.md,

    marginBottom:
      spacing.sm,
  },

  courseTop: {
    flexDirection:
      'row',

    alignItems:
      'center',

    gap:
      spacing.sm,
  },

  courseIcon: {
    width:
      40,

    height:
      40,

    borderRadius:
      20,

    backgroundColor:
      colors.surfaceAlt,

    alignItems:
      'center',

    justifyContent:
      'center',
  },

  completedIcon: {
    width:
      40,

    height:
      40,

    borderRadius:
      20,

    backgroundColor:
      colors.surfaceAlt,

    alignItems:
      'center',

    justifyContent:
      'center',
  },

  courseInfo: {
    flex: 1,
  },

  courseTitle: {
    ...typography.body,

    fontWeight:
      '700',
  },

  track: {
    height:
      8,

    borderRadius:
      4,

    backgroundColor:
      colors.surfaceAlt,

    overflow:
      'hidden',

    marginTop:
      spacing.md,
  },

  fill: {
    height:
      '100%',

    backgroundColor:
      colors.primary,
  },

  progress: {
    color:
      colors.primaryLight,

    fontSize:
      13,

    fontWeight:
      '800',
  },

  completedText: {
    color:
      colors.success,

    fontWeight:
      '800',

    fontSize:
      13,
  },


  /*
  |--------------------------------------------------------------------------
  | EMPTY
  |--------------------------------------------------------------------------
  */

  empty: {
    backgroundColor:
      colors.surface,

    borderWidth:
      1,

    borderColor:
      colors.border,

    borderRadius:
      radius.md,

    padding:
      spacing.md,
  },

  emptyTitle: {
    ...typography.body,

    fontWeight:
      '700',
  },

  primary: {
    backgroundColor:
      colors.primary,

    padding:
      spacing.md,

    borderRadius:
      radius.md,

    alignItems:
      'center',

    marginTop:
      spacing.md,
  },

  primaryText: {
    color:
      '#fff',

    fontWeight:
      '700',
  },


  /*
  |--------------------------------------------------------------------------
  | CERTIFICATES
  |--------------------------------------------------------------------------
  */

  achievement: {
    backgroundColor:
      colors.surface,

    borderWidth:
      1,

    borderColor:
      colors.border,

    borderRadius:
      radius.md,

    padding:
      spacing.md,

    marginBottom:
      spacing.sm,
  },

  achievementRow: {
    flexDirection:
      'row',

    alignItems:
      'center',

    gap:
      spacing.sm,
  },

  certificateIcon: {
    width:
      40,

    height:
      40,

    borderRadius:
      20,

    backgroundColor:
      colors.surfaceAlt,

    alignItems:
      'center',

    justifyContent:
      'center',
  },

  achievementTitle: {
    ...typography.body,

    fontWeight:
      '700',
  },

  certificateId: {
    color:
      colors.primaryLight,

    fontSize:
      12,

    marginTop:
      6,

    fontWeight:
      '700',
  },


  /*
  |--------------------------------------------------------------------------
  | BADGES
  |--------------------------------------------------------------------------
  */

  badgeWrap: {
    gap:
      spacing.sm,
  },

  badge: {
    flexDirection:
      'row',

    alignItems:
      'center',

    gap:
      spacing.sm,

    backgroundColor:
      colors.surface,

    borderWidth:
      1,

    borderColor:
      colors.border,

    borderRadius:
      radius.md,

    padding:
      spacing.md,
  },

  badgeIcon: {
    width:
      40,

    height:
      40,

    borderRadius:
      20,

    backgroundColor:
      colors.surfaceAlt,

    alignItems:
      'center',

    justifyContent:
      'center',
  },

  badgeInfo: {
    flex: 1,
  },

  badgeName: {
    color:
      colors.text,

    fontWeight:
      '700',

    fontSize:
      14,
  },

  badgeDescription: {
    color:
      colors.textMuted,

    fontSize:
      12,

    marginTop:
      4,

    lineHeight:
      17,
  },

  badgeLocked: {
    opacity:
      0.85,
  },

  badgeTrack: {
    height:
      6,

    borderRadius:
      3,

    backgroundColor:
      colors.surfaceAlt,

    marginTop:
      spacing.xs,

    overflow:
      'hidden',
  },

  badgeFill: {
    height:
      '100%',

    borderRadius:
      3,

    backgroundColor:
      colors.primary,
  },

  subsection: {
    color:
      colors.textMuted,

    fontWeight:
      '700',

    fontSize:
      13,

    marginTop:
      spacing.md,

    marginBottom:
      spacing.sm,
  },

});