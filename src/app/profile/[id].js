import {
    useCallback,
    useEffect,
    useState,
} from 'react';

import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import {
    Stack,
    router,
    useLocalSearchParams,
} from 'expo-router';

import {
    Ionicons,
} from '@expo/vector-icons';


/*
|--------------------------------------------------------------------------
| IMPORTANT
|--------------------------------------------------------------------------
|
| This file is located at:
|
| src/app/profile/[id].js
|
| Therefore imports from src/constants, src/context,
| src/lib and src/components must use ../../
|
|--------------------------------------------------------------------------
*/

import {
    colors,
    radius,
    spacing,
    typography,
} from '../../constants/theme';

import {
    useAuth,
} from '../../context/AuthContext';

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



/*
|--------------------------------------------------------------------------
| PUBLIC PROFILE SCREEN
|--------------------------------------------------------------------------
*/

export default function PublicProfileScreen() {

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <PublicProfileContent />
    </>
  );
}


/*
|--------------------------------------------------------------------------
| PUBLIC PROFILE CONTENT
|--------------------------------------------------------------------------
*/

function PublicProfileContent() {

  const {
    id,
  } = useLocalSearchParams();


  const {
    session,
  } = useAuth();


  /*
  |--------------------------------------------------------------------------
  | NORMALIZE PROFILE ID
  |--------------------------------------------------------------------------
  */

  const profileId =
    Array.isArray(id)
      ? id[0]
      : id;


  /*
  |--------------------------------------------------------------------------
  | STATE
  |--------------------------------------------------------------------------
  */

  const [
    profile,
    setProfile,
  ] = useState(null);


  const [
    posts,
    setPosts,
  ] = useState([]);


  const [
    courses,
    setCourses,
  ] = useState([]);


  const [
    completedCourses,
    setCompletedCourses,
  ] = useState([]);


  const [
    certificates,
    setCertificates,
  ] = useState([]);


  const [
    badges,
    setBadges,
  ] = useState([]);


  const [
    audio,
    setAudio,
  ] = useState([]);


  const [
    lectures,
    setLectures,
  ] = useState([]);


  const [
    shares,
    setShares,
  ] = useState([]);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    refreshing,
    setRefreshing,
  ] = useState(false);


  const [
    followLoading,
    setFollowLoading,
  ] = useState(false);


  /*
  |--------------------------------------------------------------------------
  | LOAD PROFILE
  |--------------------------------------------------------------------------
  */

  const load =
    useCallback(
      async () => {

        if (!profileId) {

          setLoading(false);

          return;
        }


        try {

          setLoading(true);


          const viewerId =
            session?.user?.id ||
            null;


          /*
          |--------------------------------------------------------------------------
          | LOAD PUBLIC PROFILE CONTENT
          |--------------------------------------------------------------------------
          */

          const [
            profileData,
            postsData,
            coursesData,
            completedCoursesData,
            certificatesData,
            badgesData,
            audioData,
            lecturesData,
            sharesData,
          ] =
            await Promise.all([

              getPublicProfile(
                profileId,
                viewerId
              ),

              getPublicProfilePosts(
                profileId
              ),

              getPublicProfileCourses(
                profileId
              ),

              getPublicProfileCompletedCourses(
                profileId
              ),

              getPublicProfileCertificates(
                profileId
              ),

              getPublicProfileBadges(
                profileId
              ),

              getPublicProfileAudio(
                profileId
              ),

              getPublicProfileLectures(
                profileId
              ),

              getPublicProfileShares(
                profileId
              ),

            ]);


          /*
          |--------------------------------------------------------------------------
          | SAVE DATA
          |--------------------------------------------------------------------------
          */

          setProfile(
            profileData
          );


          setPosts(
            Array.isArray(
              postsData
            )
              ? postsData
              : []
          );


          setCourses(
            Array.isArray(
              coursesData
            )
              ? coursesData
              : []
          );


          setCompletedCourses(
            Array.isArray(
              completedCoursesData
            )
              ? completedCoursesData
              : []
          );


          setCertificates(
            Array.isArray(
              certificatesData
            )
              ? certificatesData
              : []
          );


          setBadges(
            Array.isArray(
              badgesData
            )
              ? badgesData
              : []
          );


          setAudio(
            Array.isArray(
              audioData
            )
              ? audioData
              : []
          );


          setLectures(
            Array.isArray(
              lecturesData
            )
              ? lecturesData
              : []
          );


          setShares(
            Array.isArray(
              sharesData
            )
              ? sharesData
              : []
          );

        } catch (
          error
        ) {

          console.error(
            'PUBLIC PROFILE ERROR:',
            error
          );


          Alert.alert(
            'Could not load profile',
            error?.message ||
              'Something went wrong.'
          );

        } finally {

          setLoading(false);

          setRefreshing(false);

        }

      },
      [
        profileId,
        session?.user?.id,
      ]
    );


  /*
  |--------------------------------------------------------------------------
  | INITIAL LOAD
  |--------------------------------------------------------------------------
  */

  useEffect(
    () => {

      load();

    },
    [load]
  );


  /*
  |--------------------------------------------------------------------------
  | REFRESH
  |--------------------------------------------------------------------------
  */

  const refresh =
    async () => {

      setRefreshing(true);

      await load();

    };


  /*
  |--------------------------------------------------------------------------
  | BACK
  |--------------------------------------------------------------------------
  */

  const goBack =
    () => {

      if (
        router.canGoBack()
      ) {

        router.back();

        return;

      }


      router.replace(
        '/(tabs)'
      );

    };


  /*
  |--------------------------------------------------------------------------
  | FOLLOW / UNFOLLOW
  |--------------------------------------------------------------------------
  */

  const handleFollow =
    async () => {

      /*
      |----------------------------------------------------------------------
      | User must be logged in
      |----------------------------------------------------------------------
      */

      if (
        !session?.user?.id
      ) {

        router.push(
          '/login'
        );

        return;
      }


      /*
      |----------------------------------------------------------------------
      | Don't follow yourself
      |----------------------------------------------------------------------
      */

      if (
        String(
          session.user.id
        ) ===
        String(
          profileId
        )
      ) {

        return;

      }


      /*
      |----------------------------------------------------------------------
      | Prevent double presses
      |----------------------------------------------------------------------
      */

      if (
        followLoading
      ) {

        return;

      }


      try {

        setFollowLoading(
          true
        );


        const newFollowing =
          await toggleFollow({

            followerId:
              session.user.id,

            followingUserId:
              profileId,

          });


        /*
        |----------------------------------------------------------------------
        | Update immediately
        |----------------------------------------------------------------------
        */

        setProfile(
          current => {

            if (!current) {

              return current;

            }


            const oldFollowers =
              Number(
                current.stats?.followers ||
                0
              );


            const newFollowers =
              Math.max(
                0,

                oldFollowers +
                (
                  newFollowing
                    ? 1
                    : -1
                )
              );


            return {

              ...current,

              isFollowing:
                newFollowing,

              stats: {

                ...(current.stats || {}),

                followers:
                  newFollowers,

              },

            };

          }
        );


      } catch (
        error
      ) {

        console.error(
          'FOLLOW ERROR:',
          error
        );


        Alert.alert(
          'Could not update follow',
          error?.message ||
            'Something went wrong.'
        );

      } finally {

        setFollowLoading(
          false
        );

      }

    };


  /*
  |--------------------------------------------------------------------------
  | OPEN CERTIFICATE
  |--------------------------------------------------------------------------
  */

  const openCertificate =
    certificate => {

      const certificateId =
        certificate?.certificate_id ||
        certificate?.id;


      if (!certificateId) {

        Alert.alert(
          'Certificate unavailable',
          'This certificate does not have a valid ID.'
        );

        return;

      }


      router.push(
        `/certificate/${certificateId}`
      );

    };


  /*
  |--------------------------------------------------------------------------
  | OPEN COURSE
  |--------------------------------------------------------------------------
  */

  const openCourse =
    course => {

      const courseId =
        course?.id ||
        course?.course_id ||
        course?.courses?.id;


      if (!courseId) {

        return;

      }


      router.push(
        `/course/${courseId}`
      );

    };


  /*
  |--------------------------------------------------------------------------
  | OPEN POST
  |--------------------------------------------------------------------------
  */

  const openPost =
    post => {

      if (!post?.id) {

        return;

      }


      router.push(
        `/post/${post.id}`
      );

    };


  /*
  |--------------------------------------------------------------------------
  | OPEN PROFILE
  |--------------------------------------------------------------------------
  |
  | Kept here for future profile links.
  |
  |--------------------------------------------------------------------------
  */

  const openProfile =
    userId => {

      if (!userId) {

        return;

      }


      router.push({

        pathname:
          '/profile/[id]',

        params: {
          id:
            String(
              userId
            ),
        },

      });

    };


  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (
    loading
  ) {

    return (
      <View
        style={[
          styles.container,
          styles.center,
        ]}
      >

        <ActivityIndicator
          size="large"
          color={
            colors.primary
          }
        />


        <Text
          style={
            styles.loadingText
          }
        >
          Loading profile...
        </Text>

      </View>
    );

  }


  /*
  |--------------------------------------------------------------------------
  | PROFILE NOT FOUND
  |--------------------------------------------------------------------------
  */

  if (
    !profile
  ) {

    return (
      <View
        style={[
          styles.container,
          styles.center,
        ]}
      >

        <Ionicons
          name="person-circle-outline"
          size={60}
          color={
            colors.textMuted
          }
        />


        <Text
          style={
            styles.notFoundTitle
          }
        >
          Profile not found
        </Text>


        <Text
          style={
            styles.notFoundText
          }
        >
          This NESBA profile does not exist
          or is not publicly available.
        </Text>


        <Pressable
          style={
            styles.backButtonFilled
          }
          onPress={
            goBack
          }
        >

          <Ionicons
            name="arrow-back"
            size={18}
            color="#fff"
          />


          <Text
            style={
              styles.backButtonFilledText
            }
          >
            Go Back
          </Text>

        </Pressable>

      </View>
    );

  }


  /*
  |--------------------------------------------------------------------------
  | PROFILE DISPLAY DATA
  |--------------------------------------------------------------------------
  */

  const fullName =
    profile.full_name ||
    'NESBA Member';


  const initials =
    getInitials(
      fullName
    );


  const roleLabel =
    profile.role ===
    'teacher'

      ? 'Teacher / Mentor'

      : profile.role ===
        'organization'

        ? 'Organization'

        : 'Student';


  const followers =
    Number(
      profile.stats?.followers ||
      0
    );


  const followingCount =
    Number(
      profile.stats?.following ||
      0
    );


  const postsCount =
    Number(
      profile.stats?.posts ??
      posts.length
    );


  const coursesCount =
    Number(
      profile.stats?.courses ??
      courses.length
    );


  const isOwnProfile =
    session?.user?.id &&
    String(
      session.user.id
    ) ===
    String(
      profileId
    );


  /*
  |--------------------------------------------------------------------------
  | SCREEN
  |--------------------------------------------------------------------------
  */

  return (

    <View
      style={
        styles.container
      }
    >

      <ScrollView
        style={
          styles.scroll
        }
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={
              refresh
            }
            tintColor={
              colors.primary
            }
          />
        }
      >

        {/* ==================================================
           BACK BUTTON
        ================================================== */}

        <Pressable
          style={
            styles.backButton
          }
          onPress={
            goBack
          }
        >

          <Ionicons
            name="arrow-back"
            size={21}
            color={
              colors.text
            }
          />


          <Text
            style={
              styles.backText
            }
          >
            Back
          </Text>

        </Pressable>


        {/* ==================================================
           PROFILE HEADER
        ================================================== */}

        <View
          style={
            styles.header
          }
        >

          {/* AVATAR */}

          {
            profile.avatar_url ? (

              <Image accessibilityLabel="Profile photo"
                source={{
                  uri:
                    profile.avatar_url,
                }}
                style={
                  styles.avatarImage
                }
              />

            ) : (

              <View
                style={
                  styles.avatar
                }
              >

                <Text
                  style={
                    styles.avatarText
                  }
                >
                  {
                    initials
                  }
                </Text>

              </View>

            )
          }


          {/* NAME */}

          <Text
            style={
              styles.name
            }
          >
            {
              fullName
            }
          </Text>


          {/* ROLE */}

          <View
            style={
              styles.rolePill
            }
          >

            <Text
              style={
                styles.roleText
              }
            >
              {
                roleLabel
              }
            </Text>

          </View>


          {/* BIO */}

          {
            profile.bio ? (

              <Text
                style={
                  styles.bio
                }
              >
                {
                  profile.bio
                }
              </Text>

            ) : null
          }


          {/* FOLLOW */}

          {
            !isOwnProfile ? (

              <Pressable
                style={[
                  styles.followButton,

                  profile.isFollowing &&
                    styles.followingButton,

                  followLoading &&
                    styles.followButtonDisabled,
                ]}
                disabled={
                  followLoading
                }
                onPress={
                  handleFollow
                }
              >

                {
                  followLoading ? (

                    <ActivityIndicator
                      size="small"
                      color="#fff"
                    />

                  ) : (

                    <Ionicons
                      name={
                        profile.isFollowing
                          ? 'checkmark'
                          : 'person-add-outline'
                      }
                      size={16}
                      color="#fff"
                    />

                  )
                }


                <Text
                  style={
                    styles.followButtonText
                  }
                >
                  {
                    profile.isFollowing
                      ? 'Following'
                      : 'Follow'
                  }
                </Text>

              </Pressable>

            ) : (

              <View
                style={
                  styles.youPill
                }
              >

                <Ionicons
                  name="person"
                  size={14}
                  color={
                    colors.primary
                  }
                />

                <Text
                  style={
                    styles.youText
                  }
                >
                  Your Profile
                </Text>

              </View>

            )
          }

        </View>


        {/* ==================================================
           STATS
        ================================================== */}

        <View
          style={
            styles.statsCard
          }
        >

          <Stat
            value={
              followers
            }
            label="Followers"
          />


          <View
            style={
              styles.statDivider
            }
          />


          <Stat
            value={
              followingCount
            }
            label="Following"
          />


          <View
            style={
              styles.statDivider
            }
          />


          <Stat
            value={
              postsCount
            }
            label="Posts"
          />


          <View
            style={
              styles.statDivider
            }
          />


          <Stat
            value={
              coursesCount
            }
            label="Courses"
          />

        </View>


        {/* ==================================================
           POSTS
        ================================================== */}

        <SectionTitle>
          Posts
        </SectionTitle>


        {
          posts.length === 0 ? (

            <EmptyText>
              No posts yet.
            </EmptyText>

          ) : (

            posts.map(
              (
                post,
                index
              ) => {

                const image =
                  post?.image_url ||
                  post?.imageUrl ||
                  null;


                return (
                  <Pressable
                    key={
                      String(
                        post?.id ||
                        index
                      )
                    }
                    style={
                      styles.postCard
                    }
                    onPress={() =>
                      openPost(
                        post
                      )
                    }
                  >

                    {
                      post?.content ? (

                        <Text
                          style={
                            styles.postText
                          }
                        >
                          {
                            post.content
                          }
                        </Text>

                      ) : null
                    }


                    {
                      image ? (

                        <Image accessibilityLabel="Photo"
                          source={{
                            uri:
                              image,
                          }}
                          style={
                            styles.postImage
                          }
                          resizeMode="cover"
                        />

                      ) : null
                    }


                    <View
                      style={
                        styles.postFooter
                      }
                    >

                      <Text
                        style={
                          styles.muted
                        }
                      >
                        Open post →
                      </Text>

                    </View>

                  </Pressable>
                );

              }
            )

          )
        }


        {/* ==================================================
           COURSES
        ================================================== */}

        <SectionTitle>
          Courses
        </SectionTitle>


        {
          courses.length === 0 ? (

            <EmptyText>
              No published courses yet.
            </EmptyText>

          ) : (

            courses.map(
              (
                course,
                index
              ) => (

                <Pressable
                  key={
                    String(
                      course?.id ||
                      index
                    )
                  }
                  onPress={() =>
                    openCourse(
                      course
                    )
                  }
                  style={
                    styles.courseCard
                  }
                >

                  {
                    course?.thumbnail_url ? (

                      <Image accessibilityLabel={course?.title || "Course image"}
                        source={{
                          uri:
                            course.thumbnail_url,
                        }}
                        style={
                          styles.courseImage
                        }
                      />

                    ) : (

                      <View
                        style={
                          styles.coursePlaceholder
                        }
                      >

                        <Ionicons
                          name="school-outline"
                          size={30}
                          color={
                            colors.primary
                          }
                        />

                      </View>

                    )
                  }


                  <View
                    style={
                      styles.courseContent
                    }
                  >

                    <Text
                      numberOfLines={
                        2
                      }
                      style={
                        styles.cardTitle
                      }
                    >
                      {
                        course?.title ||
                        'NESBA Course'
                      }
                    </Text>


                    {
                      course?.description ? (

                        <Text
                          numberOfLines={
                            2
                          }
                          style={
                            styles.muted
                          }
                        >
                          {
                            course.description
                          }
                        </Text>

                      ) : null
                    }

                  </View>

                </Pressable>

              )
            )

          )
        }


        {/* ==================================================
           COMPLETED COURSES
        ================================================== */}

        <SectionTitle>
          Completed Courses
        </SectionTitle>


        {
          completedCourses.length === 0 ? (

            <EmptyText>
              No completed courses yet.
            </EmptyText>

          ) : (

            completedCourses.map(
              (
                item,
                index
              ) => {

                const course =
                  item?.course ||
                  item?.courses ||
                  item;


                return (
                  <Pressable
                    key={
                      String(
                        item?.id ||
                        course?.id ||
                        index
                      )
                    }
                    style={
                      styles.card
                    }
                    onPress={() =>
                      openCourse(
                        course
                      )
                    }
                  >

                    <View
                      style={
                        styles.cardIcon
                      }
                    >

                      <Ionicons
                        name="checkmark-circle"
                        size={23}
                        color={
                          colors.primary
                        }
                      />

                    </View>


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
                        {
                          course?.title ||
                          item?.courseTitle ||
                          'Completed Course'
                        }
                      </Text>


                      <Text
                        style={
                          styles.muted
                        }
                      >
                        Completed
                      </Text>

                    </View>

                  </Pressable>
                );

              }
            )

          )
        }


        {/* ==================================================
           CERTIFICATES
        ================================================== */}

        <SectionTitle>
          Certificates
        </SectionTitle>


        {
          certificates.length === 0 ? (

            <EmptyText>
              No certificates yet.
            </EmptyText>

          ) : (

            certificates.map(
              (
                certificate,
                index
              ) => (

                <Pressable
                  key={
                    String(
                      certificate?.id ||
                      certificate?.certificate_id ||
                      index
                    )
                  }
                  style={
                    styles.card
                  }
                  onPress={() =>
                    openCertificate(
                      certificate
                    )
                  }
                >

                  <View
                    style={
                      styles.cardIcon
                    }
                  >

                    <Ionicons
                      name="ribbon-outline"
                      size={23}
                      color={
                        colors.primary
                      }
                    />

                  </View>


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
                      {
                        certificate?.courseTitle ||
                        certificate?.course?.title ||
                        certificate?.title ||
                        'NESBA Certificate'
                      }
                    </Text>


                    <Text
                      style={
                        styles.muted
                      }
                    >
                      Certificate
                    </Text>

                  </View>


                  <Ionicons
                    name="chevron-forward"
                    size={19}
                    color={
                      colors.textMuted
                    }
                  />

                </Pressable>

              )
            )

          )
        }


        {/* ==================================================
           BADGES
        ================================================== */}

        <SectionTitle>
          Badges
        </SectionTitle>


        {
          badges.length === 0 ? (

            <EmptyText>
              No badges yet.
            </EmptyText>

          ) : (

            <View
              style={
                styles.badgesGrid
              }
            >

              {
                badges.map(
                  (
                    badge,
                    index
                  ) => (

                    <View
                      key={
                        String(
                          badge?.id ||
                          badge?.badge_id ||
                          index
                        )
                      }
                      style={
                        styles.badgeCard
                      }
                    >

                      {
                        badge?.icon_url ? (

                          <Image accessibilityLabel={badge?.name || "Badge"}
                            source={{
                              uri:
                                badge.icon_url,
                            }}
                            style={
                              styles.badgeImage
                            }
                          />

                        ) : (

                          <View
                            style={
                              styles.badgeIcon
                            }
                          >

                            <Ionicons
                              name="medal-outline"
                              size={27}
                              color={
                                colors.primary
                              }
                            />

                          </View>

                        )
                      }


                      <Text
                        numberOfLines={
                          2
                        }
                        style={
                          styles.badgeName
                        }
                      >
                        {
                          badge?.badgeName ||
                          badge?.name ||
                          badge?.badges?.name ||
                          'NESBA Badge'
                        }
                      </Text>

                    </View>

                  )
                )
              }

            </View>

          )
        }


        {/* ==================================================
           AUDIO
        ================================================== */}

        <SectionTitle>
          Audio
        </SectionTitle>


        {
          audio.length === 0 ? (

            <EmptyText>
              No audio published yet.
            </EmptyText>

          ) : (

            audio.map(
              (
                item,
                index
              ) => (

                <View
                  key={
                    String(
                      item?.id ||
                      index
                    )
                  }
                  style={
                    styles.card
                  }
                >

                  <View
                    style={
                      styles.cardIcon
                    }
                  >

                    <Ionicons
                      name="headset-outline"
                      size={23}
                      color={
                        colors.primary
                      }
                    />

                  </View>


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
                      {
                        item?.title ||
                        item?.name ||
                        'Audio'
                      }
                    </Text>


                    <Text
                      style={
                        styles.muted
                      }
                    >
                      Audio
                    </Text>

                  </View>

                </View>

              )
            )

          )
        }


        {/* ==================================================
           LECTURES
        ================================================== */}

        <SectionTitle>
          Lectures
        </SectionTitle>


        {
          lectures.length === 0 ? (

            <EmptyText>
              No lectures published yet.
            </EmptyText>

          ) : (

            lectures.map(
              (
                item,
                index
              ) => (

                <View
                  key={
                    String(
                      item?.id ||
                      index
                    )
                  }
                  style={
                    styles.card
                  }
                >

                  <View
                    style={
                      styles.cardIcon
                    }
                  >

                    <Ionicons
                      name="videocam-outline"
                      size={23}
                      color={
                        colors.primary
                      }
                    />

                  </View>


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
                      {
                        item?.title ||
                        item?.name ||
                        'Lecture'
                      }
                    </Text>


                    <Text
                      style={
                        styles.muted
                      }
                    >
                      Lecture
                    </Text>

                  </View>

                </View>

              )
            )

          )
        }


        {/* ==================================================
           SHARES
        ================================================== */}

        <SectionTitle>
          Shares
        </SectionTitle>


        {
          shares.length === 0 ? (

            <EmptyText>
              Content shared by this user will
              appear here.
            </EmptyText>

          ) : (

            shares.map(
              (
                share,
                index
              ) => (

                <View
                  key={
                    String(
                      share?.id ||
                      index
                    )
                  }
                  style={
                    styles.card
                  }
                >

                  <View
                    style={
                      styles.cardIcon
                    }
                  >

                    <Ionicons
                      name="share-social-outline"
                      size={23}
                      color={
                        colors.primary
                      }
                    />

                  </View>


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
                      {
                        share?.content_type ||
                        share?.type ||
                        'Shared Content'
                      }
                    </Text>


                    {
                      share?.content_id ? (

                        <Text
                          style={
                            styles.muted
                          }
                        >
                          {
                            String(
                              share.content_id
                            )
                          }
                        </Text>

                      ) : null
                    }

                  </View>

                </View>

              )
            )

          )
        }


        {/* ==================================================
           BOTTOM SPACE
        ================================================== */}

        <View
          style={
            styles.bottomSpace
          }
        />

      </ScrollView>

    </View>
  );
}


/*
|--------------------------------------------------------------------------
| STAT COMPONENT
|--------------------------------------------------------------------------
*/

function Stat({
  value,
  label,
}) {

  return (

    <View
      style={
        styles.stat
      }
    >

      <Text
        style={
          styles.statNumber
        }
      >
        {
          value
        }
      </Text>


      <Text
        style={
          styles.statLabel
        }
      >
        {
          label
        }
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
      style={
        styles.sectionTitle
      }
    >
      {
        children
      }
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
      style={
        styles.emptyBox
      }
    >

      <Text
        style={
          styles.muted
        }
      >
        {
          children
        }
      </Text>

    </View>

  );

}


/*
|--------------------------------------------------------------------------
| INITIALS
|--------------------------------------------------------------------------
*/

function getInitials(
  name
) {

  const value =
    String(
      name ||
      'NESBA'
    )
      .trim();


  if (!value) {

    return 'N';

  }


  const parts =
    value
      .split(/\s+/)
      .filter(Boolean);


  if (
    parts.length === 1
  ) {

    return parts[0]
      .slice(
        0,
        2
      )
      .toUpperCase();

  }


  return (
    parts[0][0] +
    parts[
      parts.length - 1
    ][0]
  ).toUpperCase();

}


/*
|--------------------------------------------------------------------------
| STYLES
|--------------------------------------------------------------------------
*/

const styles =
  StyleSheet.create({

    /*
    |--------------------------------------------------------------------------
    | MAIN
    |--------------------------------------------------------------------------
    */

    container: {
      flex: 1,

      backgroundColor:
        colors.background,
    },


    scroll: {
      flex: 1,
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
      marginTop:
        spacing.sm,

      ...typography.body,

      color:
        colors.textMuted,
    },


    /*
    |--------------------------------------------------------------------------
    | BACK
    |--------------------------------------------------------------------------
    */

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


    /*
    |--------------------------------------------------------------------------
    | HEADER
    |--------------------------------------------------------------------------
    */

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

      borderWidth: 2,

      borderColor:
        colors.primary,
    },


    avatar: {
      width: 88,

      height: 88,

      borderRadius: 44,

      marginBottom:
        spacing.sm,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.primary,
    },


    avatarText: {
      color:
        '#fff',

      fontSize: 26,

      fontWeight:
        '900',
    },


    name: {
      fontSize: 23,

      fontWeight:
        '900',

      color:
        colors.text,

      textAlign:
        'center',
    },


    rolePill: {
      marginTop:
        spacing.xs,

      paddingHorizontal:
        spacing.sm,

      paddingVertical:
        5,

      borderRadius:
        radius.pill,

      backgroundColor:
        colors.surface,
    },


    roleText: {
      fontSize: 11,

      fontWeight:
        '700',

      color:
        colors.primary,
    },


    bio: {
      maxWidth: 340,

      marginTop:
        spacing.sm,

      textAlign:
        'center',

      ...typography.body,

      color:
        colors.textMuted,
    },


    followButton: {
      minWidth: 120,

      minHeight: 42,

      marginTop:
        spacing.md,

      paddingHorizontal:
        spacing.md,

      borderRadius:
        radius.pill,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        7,

      backgroundColor:
        colors.primary,
    },


    followingButton: {
      backgroundColor:
        colors.primaryLight ||
        colors.primary,
    },


    followButtonDisabled: {
      opacity:
        0.65,
    },


    followButtonText: {
      color:
        '#fff',

      fontSize: 13,

      fontWeight:
        '800',
    },


    youPill: {
      marginTop:
        spacing.md,

      paddingHorizontal:
        spacing.md,

      paddingVertical:
        9,

      borderRadius:
        radius.pill,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        6,

      backgroundColor:
        colors.surface,

      borderWidth:
        1,

      borderColor:
        colors.border,
    },


    youText: {
      color:
        colors.primary,

      fontSize: 12,

      fontWeight:
        '800',
    },


    /*
    |--------------------------------------------------------------------------
    | STATS
    |--------------------------------------------------------------------------
    */

    statsCard: {
      minHeight: 82,

      marginBottom:
        spacing.lg,

      paddingHorizontal:
        spacing.sm,

      borderRadius:
        radius.lg,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-around',

      backgroundColor:
        colors.surface,

      borderWidth:
        1,

      borderColor:
        colors.border,
    },


    stat: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    statNumber: {
      fontSize: 18,

      fontWeight:
        '900',

      color:
        colors.text,
    },


    statLabel: {
      marginTop:
        3,

      fontSize: 10,

      color:
        colors.textMuted,
    },


    statDivider: {
      width: 1,

      height: 34,

      backgroundColor:
        colors.border,
    },


    /*
    |--------------------------------------------------------------------------
    | SECTIONS
    |--------------------------------------------------------------------------
    */

    sectionTitle: {
      marginTop:
        spacing.lg,

      marginBottom:
        spacing.sm,

      fontSize: 17,

      fontWeight:
        '900',

      color:
        colors.text,
    },


    emptyBox: {
      minHeight: 58,

      padding:
        spacing.md,

      borderRadius:
        radius.md,

      justifyContent:
        'center',

      backgroundColor:
        colors.surface,

      borderWidth:
        1,

      borderColor:
        colors.border,
    },


    /*
    |--------------------------------------------------------------------------
    | POSTS
    |--------------------------------------------------------------------------
    */

    postCard: {
      marginBottom:
        spacing.sm,

      overflow:
        'hidden',

      borderRadius:
        radius.md,

      backgroundColor:
        colors.surface,

      borderWidth:
        1,

      borderColor:
        colors.border,
    },


    postText: {
      padding:
        spacing.md,

      fontSize: 14,

      lineHeight: 21,

      color:
        colors.text,
    },


    postImage: {
      width:
        '100%',

      height: 230,

      backgroundColor:
        colors.background,
    },


    postFooter: {
      padding:
        spacing.sm,

      borderTopWidth:
        1,

      borderTopColor:
        colors.border,
    },


    /*
    |--------------------------------------------------------------------------
    | COURSES
    |--------------------------------------------------------------------------
    */

    courseCard: {
      marginBottom:
        spacing.sm,

      overflow:
        'hidden',

      borderRadius:
        radius.md,

      backgroundColor:
        colors.surface,

      borderWidth:
        1,

      borderColor:
        colors.border,
    },


    courseImage: {
      width:
        '100%',

      height: 160,

      backgroundColor:
        colors.background,
    },


    coursePlaceholder: {
      width:
        '100%',

      height: 120,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.background,
    },


    courseContent: {
      padding:
        spacing.md,
    },


    /*
    |--------------------------------------------------------------------------
    | GENERIC CARD
    |--------------------------------------------------------------------------
    */

    card: {
      minHeight: 70,

      marginBottom:
        spacing.sm,

      padding:
        spacing.md,

      borderRadius:
        radius.md,

      flexDirection:
        'row',

      alignItems:
        'center',

      backgroundColor:
        colors.surface,

      borderWidth:
        1,

      borderColor:
        colors.border,
    },


    cardIcon: {
      width: 44,

      height: 44,

      borderRadius:
        radius.md,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.background,
    },


    cardContent: {
      flex: 1,

      marginLeft:
        spacing.sm,
    },


    cardTitle: {
      fontSize: 14,

      lineHeight: 19,

      fontWeight:
        '800',

      color:
        colors.text,
    },


    muted: {
      marginTop:
        3,

      fontSize: 11,

      lineHeight: 17,

      color:
        colors.textMuted,
    },


    /*
    |--------------------------------------------------------------------------
    | BADGES
    |--------------------------------------------------------------------------
    */

    badgesGrid: {
      flexDirection:
        'row',

      flexWrap:
        'wrap',

      gap:
        spacing.sm,
    },


    badgeCard: {
      width:
        '31%',

      minHeight: 105,

      padding:
        spacing.sm,

      borderRadius:
        radius.md,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.surface,

      borderWidth:
        1,

      borderColor:
        colors.border,
    },


    badgeImage: {
      width: 48,

      height: 48,

      borderRadius: 24,

      marginBottom:
        spacing.xs,
    },


    badgeIcon: {
      width: 48,

      height: 48,

      marginBottom:
        spacing.xs,

      borderRadius: 24,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.background,
    },


    badgeName: {
      textAlign:
        'center',

      fontSize: 10,

      lineHeight: 14,

      fontWeight:
        '700',

      color:
        colors.text,
    },


    /*
    |--------------------------------------------------------------------------
    | NOT FOUND
    |--------------------------------------------------------------------------
    */

    notFoundTitle: {
      marginTop:
        spacing.md,

      fontSize: 20,

      fontWeight:
        '900',

      color:
        colors.text,
    },


    notFoundText: {
      maxWidth: 320,

      marginTop:
        spacing.xs,

      textAlign:
        'center',

      fontSize: 13,

      lineHeight: 19,

      color:
        colors.textMuted,
    },


    backButtonFilled: {
      marginTop:
        spacing.lg,

      paddingHorizontal:
        spacing.md,

      paddingVertical:
        11,

      borderRadius:
        radius.md,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        7,

      backgroundColor:
        colors.primary,
    },


    backButtonFilledText: {
      color:
        '#fff',

      fontSize: 13,

      fontWeight:
        '800',
    },


    /*
    |--------------------------------------------------------------------------
    | BOTTOM
    |--------------------------------------------------------------------------
    */

    bottomSpace: {
      height:
        50,
    },

  });