import {
    useEffect,
    useRef,
    useState,
} from 'react';

import {
    ActivityIndicator,
    Dimensions,
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import {
    Audio,
    Video,
} from 'expo-av';

import {
    useLocalSearchParams,
    useRouter,
} from 'expo-router';

import {
    Ionicons,
} from '@expo/vector-icons';

import {
    getCurrentUserId,
    getStoryGroups,
    markStoryViewed,
} from '../../lib/nesba';


const {
  width,
  height,
} = Dimensions.get('window');


/* =========================================================
   HELPERS
========================================================= */

const safeArray = value => (
  Array.isArray(value)
    ? value
    : []
);


const getStoryMedia = story => (
  story?.media_url ||
  story?.image_url ||
  story?.video_url ||
  story?.mediaUrl ||
  story?.imageUrl ||
  story?.videoUrl ||
  null
);


const getStoryAuthor = story => (
  story?.profiles ||
  story?.profile ||
  story?.author ||
  story?.user ||
  {}
);


const getAuthorName = story => {

  const author =
    getStoryAuthor(
      story
    );

  return (
    author?.full_name ||
    author?.name ||
    author?.display_name ||
    author?.username ||
    'NESBA Member'
  );
};


const getAuthorAvatar = story => {

  const author =
    getStoryAuthor(
      story
    );

  return (
    author?.avatar_url ||
    author?.avatarUrl ||
    null
  );
};


const getAuthorId = story => {

  const author =
    getStoryAuthor(
      story
    );

  return (
    story?.user_id ||
    story?.author_id ||
    story?.profile_id ||
    author?.id ||
    null
  );
};


const getStoryCreatedAt = story => (
  story?.created_at ||
  story?.createdAt ||
  story?.published_at ||
  null
);


const getStoryText = story => (
  story?.caption ||
  story?.content ||
  story?.text ||
  ''
);


const getInitials = story => {

  const name =
    getAuthorName(
      story
    );

  const parts =
    String(name)
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (
    parts.length === 0
  ) {
    return 'N';
  }

  if (
    parts.length === 1
  ) {
    return parts[0]
      .slice(0, 1)
      .toUpperCase();
  }

  return (
    parts[0][0] +
    parts[
      parts.length - 1
    ][0]
  ).toUpperCase();
};


const formatStoryTime = value => {

  if (!value) {
    return '';
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '';
  }

  const difference =
    Date.now() -
    date.getTime();

  const minutes =
    Math.floor(
      difference /
      60000
    );

  if (
    minutes < 1
  ) {
    return 'Just now';
  }

  if (
    minutes < 60
  ) {
    return `${minutes}m`;
  }

  const hours =
    Math.floor(
      minutes /
      60
    );

  if (
    hours < 24
  ) {
    return `${hours}h`;
  }

  return `${Math.floor(
    hours / 24
  )}d`;
};


/* =========================================================
   STORY SCREEN
========================================================= */

export default function StoryScreen() {

  const router =
    useRouter();

  const params =
    useLocalSearchParams();


  /*
   * Expo Router:
   *
   * src/app/Story/[id].js
   *
   * receives:
   *
   * /Story/<story-id>
   *
   * We also support lowercase /story/<story-id>
   * because Expo Router normally treats route names
   * case-sensitively depending on the filesystem.
   */

  const storyId =
    Array.isArray(
      params.id
    )
      ? params.id[0]
      : params.id;


  const mountedRef =
    useRef(true);


  const [loading, setLoading] =
    useState(true);


  const [stories, setStories] =
    useState([]);


  const [currentIndex, setCurrentIndex] =
    useState(0);


  const [error, setError] =
    useState('');


  const [viewedStories, setViewedStories] =
    useState({});

  const audioRef =
    useRef(null);


  /* =======================================================
     LOAD STORIES
  ======================================================= */

  useEffect(() => {

    mountedRef.current =
      true;

    loadStoryData();


    return () => {

      mountedRef.current =
        false;

    };

  }, [
    storyId,
  ]);


  const loadStoryData =
    async () => {

      try {

        setLoading(true);
        setError('');

        if (!storyId) {
          throw new Error(
            'Story user ID is missing.'
          );
        }

        const groups =
          await getStoryGroups();

        const group =
          safeArray(groups).find(
            item =>
              String(item?.userId) ===
              String(storyId)
          );

        if (!group) {
          throw new Error(
            'This story could not be found.'
          );
        }

        const userStories =
          safeArray(group.stories);

        if (!userStories.length) {
          throw new Error(
            'This user has no active stories.'
          );
        }

        const firstStoryIndex =
          userStories.findIndex(
            story =>
              String(story?.id) ===
              String(params.storyId || '')
          );

        if (mountedRef.current) {
          setStories(userStories);

          setCurrentIndex(
            firstStoryIndex >= 0
              ? firstStoryIndex
              : 0
          );
        }

      } catch (loadError) {

        console.error(
          'NESBA story loading error:',
          loadError
        );

        if (mountedRef.current) {
          setError(
            loadError?.message ||
            'Unable to load this story.'
          );
        }

      } finally {

        if (mountedRef.current) {
          setLoading(false);
        }

      }
    };

  /* =======================================================
     CURRENT STORY
  ======================================================= */

  const currentStory =
    stories[
      currentIndex
    ] || null;


  /* =======================================================
     MARK STORY VIEWED
  ======================================================= */

  useEffect(() => {

    if (
      !currentStory?.id
    ) {
      return;
    }


    const storyKey =
      String(
        currentStory.id
      );


    if (
      viewedStories[
        storyKey
      ]
    ) {

      return;

    }


    setViewedStories(
      current => ({
        ...current,

        [storyKey]:
          true,
      })
    );


    getCurrentUserId()
      .then(viewerId => {
        if (!viewerId) {
          return null;
        }

        return markStoryViewed({
          storyId: currentStory.id,
          userId: viewerId,
        });
      })
      .catch(
      viewError => {

        console.warn(
          'NESBA story view error:',
          viewError
        );

      }
    );

  }, [
    currentStory?.id,
  ]);


  /* =======================================================
     STORY AUDIO
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    const playAudio = async () => {
      try {
        if (audioRef.current) {
          await audioRef.current.unloadAsync();
          audioRef.current = null;
        }

        if (!currentStory?.audio_url) return;

        const { sound } = await Audio.Sound.createAsync(
          { uri: currentStory.audio_url },
          { shouldPlay: true, isLooping: true }
        );

        if (cancelled) {
          await sound.unloadAsync();
          return;
        }

        audioRef.current = sound;
      } catch (audioError) {
        console.warn('Story audio error:', audioError);
      }
    };

    playAudio();

    return () => {
      cancelled = true;
      if (audioRef.current) {
        audioRef.current.unloadAsync().catch(() => {});
        audioRef.current = null;
      }
    };
  }, [currentStory?.id, currentStory?.audio_url]);


  /* =======================================================
     NAVIGATION
  ======================================================= */

  const closeStory =
    () => {

      if (
        router.canGoBack()
      ) {

        router.back();

      } else {

        router.replace(
          '/(tabs)'
        );

      }

    };


  const goNext =
    () => {

      if (
        currentIndex <
        stories.length - 1
      ) {

        setCurrentIndex(
          currentIndex + 1
        );

      } else {

        closeStory();

      }

    };


  const goPrevious =
    () => {

      if (
        currentIndex > 0
      ) {

        setCurrentIndex(
          currentIndex - 1
        );

      }

    };


  const openProfile =
    () => {

      const profileId =
        getAuthorId(
          currentStory
        );


      if (
        !profileId
      ) {
        return;
      }


      router.push(
        `/profile/${profileId}`
      );

    };


  /* =======================================================
     LOADING SCREEN
  ======================================================= */

  if (
    loading
  ) {

    return (
      <View
        style={
          styles.loadingScreen
        }
      >

        <View
          style={
            styles.loadingLogo
          }
        >

          <Text
            style={
              styles.loadingLogoText
            }
          >
            NESBA
          </Text>

        </View>


        <ActivityIndicator
          size="large"
          color="#fff"
        />


        <Text
          style={
            styles.loadingText
          }
        >
          Loading story...
        </Text>

      </View>
    );

  }


  /* =======================================================
     ERROR SCREEN
  ======================================================= */

  if (
    error ||
    !currentStory
  ) {

    return (
      <View
        style={
          styles.errorScreen
        }
      >

        <Ionicons
          name="alert-circle-outline"
          size={50}
          color="#fff"
        />


        <Text
          style={
            styles.errorTitle
          }
        >
          Story unavailable
        </Text>


        <Text
          style={
            styles.errorMessage
          }
        >
          {
            error ||
            'This story could not be found.'
          }
        </Text>


        <Pressable
          style={
            styles.errorButton
          }
          onPress={
            closeStory
          }
        >

          <Ionicons
            name="arrow-back"
            size={18}
            color="#111"
          />


          <Text
            style={
              styles.errorButtonText
            }
          >
            Back
          </Text>

        </Pressable>

      </View>
    );

  }


  /* =======================================================
     CURRENT MEDIA
  ======================================================= */

  const media =
    getStoryMedia(
      currentStory
    );


  const authorName =
    getAuthorName(
      currentStory
    );


  const authorAvatar =
    getAuthorAvatar(
      currentStory
    );


  const storyTime =
    formatStoryTime(
      getStoryCreatedAt(
        currentStory
      )
    );


  const caption =
    getStoryText(
      currentStory
    );


  /* =======================================================
     MAIN STORY SCREEN
  ======================================================= */

  return (
    <View
      style={
        styles.container
      }
    >

      {/* ===================================================
         STORY IMAGE
      =================================================== */}

      {
        media ? (
          currentStory.media_type === 'video' ? (
            <Video
              key={String(currentStory.id)}
              source={{ uri: media }}
              style={styles.media}
              resizeMode="contain"
              shouldPlay
              isLooping
              useNativeControls={false}
            />
          ) : (
            <Image
              key={String(currentStory.id)}
              source={{ uri: media }}
              style={styles.media}
              resizeMode="contain"
            />
          )
        ) : (

          <View
            style={
              styles.noMedia
            }
          >

            <Ionicons
              name="image-outline"
              size={48}
              color="#fff"
            />


            <Text
              style={
                styles.noMediaText
              }
            >
              No story image
            </Text>

          </View>

        )
      }


      {/* ===================================================
         TOP DARK AREA
      =================================================== */}

      <View
        pointerEvents="none"
        style={
          styles.topOverlay
        }
      />


      {/* ===================================================
         BOTTOM DARK AREA
      =================================================== */}

      <View
        pointerEvents="none"
        style={
          styles.bottomOverlay
        }
      />


      {/* ===================================================
         STORY EDITS / FILTER / LOCATION / AUDIO
      =================================================== */}

      {currentStory.filter_name && currentStory.filter_name !== 'normal' ? (
        <View
          pointerEvents="none"
          style={[styles.storyFilterOverlay, styles[`filter_${currentStory.filter_name}`]]}
        />
      ) : null}

      {currentStory.overlay_text ? (
        <View pointerEvents="none" style={styles.storyTextOverlay}>
          <Text style={styles.storyTextOverlayText}>{currentStory.overlay_text}</Text>
        </View>
      ) : null}

      {currentStory.location_text ? (
        <View pointerEvents="none" style={styles.storyLocationOverlay}>
          <Ionicons name="location" size={16} color="#fff" />
          <Text style={styles.storyLocationText}>{currentStory.location_text}</Text>
        </View>
      ) : null}

      {currentStory.audio_url ? (
        <View pointerEvents="none" style={styles.audioBadge}>
          <Ionicons name="musical-notes" size={15} color="#fff" />
          <Text style={styles.audioBadgeText}>Music</Text>
        </View>
      ) : null}


      {/* ===================================================
         PROGRESS BARS
      =================================================== */}

      <View
        style={
          styles.progressContainer
        }
      >

        {
          stories.map(
            (
              story,
              index
            ) => {

              const completed =
                index <
                currentIndex;


              const current =
                index ===
                currentIndex;


              return (
                <View
                  key={
                    String(
                      story?.id ||
                      index
                    )
                  }
                  style={
                    styles.progressTrack
                  }
                >

                  <View
                    style={[
                      styles.progressFill,

                      completed &&
                        styles.progressCompleted,

                      current &&
                        styles.progressCurrent,
                    ]}
                  />

                </View>
              );

            }
          )
        }

      </View>


      {/* ===================================================
         STORY HEADER
      =================================================== */}

      <View
        style={
          styles.header
        }
      >

        <Pressable
          style={
            styles.authorButton
          }
          onPress={
            openProfile
          }
        >

          {
            authorAvatar ? (

              <Image
                source={{
                  uri:
                    authorAvatar,
                }}
                style={
                  styles.avatar
                }
              />

            ) : (

              <View
                style={
                  styles.avatarFallback
                }
              >

                <Text
                  style={
                    styles.avatarInitials
                  }
                >
                  {
                    getInitials(
                      currentStory
                    )
                  }
                </Text>

              </View>

            )
          }


          <View
            style={
              styles.authorInfo
            }
          >

            <Text
              numberOfLines={
                1
              }
              style={
                styles.authorName
              }
            >
              {
                authorName
              }
            </Text>


            {
              storyTime ? (

                <Text
                  style={
                    styles.storyTime
                  }
                >
                  {
                    storyTime
                  }
                </Text>

              ) : null
            }

          </View>

        </Pressable>


        <Pressable
          style={
            styles.closeButton
          }
          onPress={
            closeStory
          }
        >

          <Ionicons
            name="close"
            size={29}
            color="#fff"
          />

        </Pressable>

      </View>


      {/* ===================================================
         PREVIOUS TAP AREA
      =================================================== */}

      <Pressable
        style={
          styles.previousArea
        }
        onPress={
          goPrevious
        }
      />


      {/* ===================================================
         NEXT TAP AREA
      =================================================== */}

      <Pressable
        style={
          styles.nextArea
        }
        onPress={
          goNext
        }
      />


      {/* ===================================================
         CAPTION
      =================================================== */}

      {
        caption ? (

          <View
            pointerEvents="none"
            style={
              styles.captionContainer
            }
          >

            <Text
              style={
                styles.caption
              }
            >
              {
                caption
              }
            </Text>

          </View>

        ) : null
      }

    </View>
  );
}


/* =========================================================
   STYLES
========================================================= */

const styles =
  StyleSheet.create({

    /* =====================================================
       MAIN
    ===================================================== */

    container: {
      flex: 1,
      backgroundColor: '#000',
    },


    media: {
      position: 'absolute',
      top: 0,
      left: 0,
      width,
      height,
      backgroundColor: '#000',
    },


    noMedia: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#111',
    },


    storyFilterOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },

    filter_warm: { backgroundColor: 'rgba(255,150,70,0.20)' },
    filter_cool: { backgroundColor: 'rgba(80,150,255,0.18)' },
    filter_mono: { backgroundColor: 'rgba(40,40,40,0.40)' },
    filter_dream: { backgroundColor: 'rgba(255,160,220,0.16)' },
    filter_vivid: { backgroundColor: 'rgba(255,60,60,0.12)' },

    storyTextOverlay: {
      position: 'absolute',
      left: 20,
      right: 20,
      bottom: 95,
      alignItems: 'center',
    },

    storyTextOverlayText: {
      color: '#fff',
      fontSize: 25,
      fontWeight: '900',
      textAlign: 'center',
      textShadowColor: '#000',
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 5,
    },

    storyLocationOverlay: {
      position: 'absolute',
      top: 82,
      left: 18,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 14,
      backgroundColor: 'rgba(0,0,0,0.55)',
    },

    storyLocationText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '800',
    },

    audioBadge: {
      position: 'absolute',
      right: 18,
      bottom: 88,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 14,
      backgroundColor: 'rgba(0,0,0,0.55)',
    },

    audioBadgeText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '800',
    },

    noMediaText: {
      marginTop: 12,
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },


    /* =====================================================
       LOADING
    ===================================================== */

    loadingScreen: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#000',
    },


    loadingLogo: {
      width: 76,
      height: 76,
      marginBottom: 22,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#fff',
    },


    loadingLogoText: {
      color: '#111',
      fontSize: 16,
      fontWeight: '900',
      letterSpacing: 0.5,
    },


    loadingText: {
      marginTop: 14,
      color: 'rgba(255,255,255,0.75)',
      fontSize: 13,
    },


    /* =====================================================
       ERROR
    ===================================================== */

    errorScreen: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 30,
      backgroundColor: '#000',
    },


    errorTitle: {
      marginTop: 14,
      color: '#fff',
      fontSize: 20,
      fontWeight: '900',
    },


    errorMessage: {
      marginTop: 8,
      textAlign: 'center',
      color: 'rgba(255,255,255,0.65)',
      fontSize: 13,
      lineHeight: 20,
    },


    errorButton: {
      marginTop: 24,
      minHeight: 44,
      paddingHorizontal: 18,
      borderRadius: 13,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      backgroundColor: '#fff',
    },


    errorButtonText: {
      color: '#111',
      fontSize: 13,
      fontWeight: '800',
    },


    /* =====================================================
       OVERLAYS
    ===================================================== */

    topOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 155,
      backgroundColor:
        'rgba(0,0,0,0.38)',
    },


    bottomOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 180,
      backgroundColor:
        'rgba(0,0,0,0.38)',
    },


    /* =====================================================
       PROGRESS
    ===================================================== */

    progressContainer: {
      position: 'absolute',
      top: 10,
      left: 9,
      right: 9,
      zIndex: 20,
      flexDirection: 'row',
      gap: 4,
    },


    progressTrack: {
      flex: 1,
      height: 3,
      overflow: 'hidden',
      borderRadius: 3,
      backgroundColor:
        'rgba(255,255,255,0.32)',
    },


    progressFill: {
      width: 0,
      height: '100%',
      borderRadius: 3,
      backgroundColor: '#fff',
    },


    progressCompleted: {
      width: '100%',
    },


    progressCurrent: {
      width: '100%',
    },


    /* =====================================================
       HEADER
    ===================================================== */

    header: {
      position: 'absolute',
      top: 24,
      left: 11,
      right: 9,
      minHeight: 55,
      zIndex: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },


    authorButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },


    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: '#fff',
    },


    avatarFallback: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#555',
      borderWidth: 1.5,
      borderColor: '#fff',
    },


    avatarInitials: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '900',
    },


    authorInfo: {
      flex: 1,
      marginLeft: 9,
    },


    authorName: {
      maxWidth: 230,
      color: '#fff',
      fontSize: 13,
      fontWeight: '800',
    },


    storyTime: {
      marginTop: 2,
      color:
        'rgba(255,255,255,0.75)',
      fontSize: 10,
    },


    closeButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },


    /* =====================================================
       TAP AREAS
    ===================================================== */

    previousArea: {
      position: 'absolute',
      left: 0,
      top: 100,
      bottom: 100,
      width: width * 0.35,
      zIndex: 15,
    },


    nextArea: {
      position: 'absolute',
      right: 0,
      top: 100,
      bottom: 100,
      width: width * 0.65,
      zIndex: 15,
    },


    /* =====================================================
       CAPTION
    ===================================================== */

    captionContainer: {
      position: 'absolute',
      left: 20,
      right: 20,
      bottom: 36,
      zIndex: 20,
      alignItems: 'center',
    },


    caption: {
      color: '#fff',
      textAlign: 'center',
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '500',
    },

  });