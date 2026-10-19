import React, {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

import {
  useRouter,
} from 'expo-router';

import {
  Ionicons,
} from '@expo/vector-icons';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  Audio,
  ResizeMode,
  Video,
} from 'expo-av';

import {
  STORY_FILTERS,
  STORY_MAX_SECONDS,
  filterMediaStyle,
  filterTintStyle,
} from '../../lib/story-filters';

import {
  colors as theme,
} from '../../constants/theme';

import {
  getLiveNowEvents,
} from '../../lib/nesba';

import {
  getCurrentPlaceName,
} from '../../lib/location';

import GuestWelcome from '../../components/GuestWelcome';
import {
  MAX_UPLOAD_BYTES,
  formatBytes,
  uploadWithProgress,
} from '../../lib/upload';


// Home follows the app-wide light/dark palette.
const colors = {
  background: theme.background,
  backgroundSoft: theme.surfaceAlt,
  surface: theme.surface,
  card: theme.surface,
  primary: theme.primary,
  primarySoft: theme.primarySoft,
  text: theme.text,
  textSecondary: theme.textSecondary,
  textMuted: theme.textMuted,
  border: theme.border,
  success: theme.success,
  warning: theme.warning,
  danger: theme.danger,
  white: '#FFFFFF',
  black: '#000000',
};

const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

// Only the first 45 seconds of a story's song are played, so a large
// file is mostly wasted upload time.
const MAX_STORY_AUDIO_BYTES = 15 * 1024 * 1024;

/* =========================================================
   NESBA HOME
   ========================================================= */

export default function HomeScreen() {

  const router =
    useRouter();


  /* =======================================================
     BASIC USER STATE
  ======================================================= */

  const [
    currentUser,
    setCurrentUser,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);


  /* =======================================================
     PROFILE
  ======================================================= */

  const [
    profile,
    setProfile,
  ] = useState(null);


  /* =======================================================
     SEARCH
  ======================================================= */

  const [
    searchText,
    setSearchText,
  ] = useState('');

  const [
    searchLoading,
    setSearchLoading,
  ] = useState(false);

  const [
    searchResults,
    setSearchResults,
  ] = useState({
    users: [],
    courses: [],
    posts: [],
  });


  /* =======================================================
     STORIES
  ======================================================= */

  const [
    stories,
    setStories,
  ] = useState([]);

  const [
    liveNow,
    setLiveNow,
  ] = useState([]);

  const [
    storyEditorVisible,
    setStoryEditorVisible,
  ] = useState(false);

  const [
    storyUploading,
    setStoryUploading,
  ] = useState(false);

  const [
    storyDraft,
    setStoryDraft,
  ] = useState(null);

  const [
    storyText,
    setStoryText,
  ] = useState('');

  const [
    storyLocation,
    setStoryLocation,
  ] = useState('');

  const [
    storyFilter,
    setStoryFilter,
  ] = useState('normal');

  const [
    storyAudio,
    setStoryAudio,
  ] = useState(null);

  const storySoundRef =
    useRef(null);

  const [
    storyAudioPlaying,
    setStoryAudioPlaying,
  ] = useState(false);

  // 0..1 while a post or story file is uploading, otherwise null.
  const [
    uploadProgress,
    setUploadProgress,
  ] = useState(null);


  /* =======================================================
     POSTS
     ======================================================= */

  const [
    posts,
    setPosts,
  ] = useState([]);

  const [
    postsLoading,
    setPostsLoading,
  ] = useState(false);


  /* =======================================================
     CREATE POST
     ======================================================= */

  const [
    composerVisible,
    setComposerVisible,
  ] = useState(false);

  const [
    creatingPost,
    setCreatingPost,
  ] = useState(false);

  const [
    postText,
    setPostText,
  ] = useState('');

  const [
    postImage,
    setPostImage,
  ] = useState(null);

  const [
    postVideo,
    setPostVideo,
  ] = useState(null);

  const [
    postLink,
    setPostLink,
  ] = useState('');

  const [
    postEmojiVisible,
    setPostEmojiVisible,
  ] = useState(false);


  /* =======================================================
     MENTIONS
     ======================================================= */

  const [
    mentionVisible,
    setMentionVisible,
  ] = useState(false);

  const [
    mentionSearch,
    setMentionSearch,
  ] = useState('');

  const [
    mentionUsers,
    setMentionUsers,
  ] = useState([]);


  /* =======================================================
     COMMENTS
     ======================================================= */

  const [
    comments,
    setComments,
  ] = useState({});

  const [
    commentsVisible,
    setCommentsVisible,
  ] = useState({});

  const [
    commentText,
    setCommentText,
  ] = useState({});

  const [
    commentMedia,
    setCommentMedia,
  ] = useState({});

  const [
    commentEmojiVisible,
    setCommentEmojiVisible,
  ] = useState({});

  const [
    replyTarget,
    setReplyTarget,
  ] = useState({});


  /* =======================================================
     LIKES
     ======================================================= */

  const [
    likedPosts,
    setLikedPosts,
  ] = useState({});

  const [
    postLikeCounts,
    setPostLikeCounts,
  ] = useState({});


  /* =======================================================
     COURSES
     ======================================================= */

  const [
    trendingCourses,
    setTrendingCourses,
  ] = useState([]);

  const [
    suggestedUsers,
    setSuggestedUsers,
  ] = useState([]);


  const EMOJIS = [
    '😀',
    '😂',
    '😍',
    '🥰',
    '😎',
    '🔥',
    '❤️',
    '👏',
    '🎉',
    '👍',
    '🙏',
    '💯',
    '📚',
    '🎓',
    '🚀',
  ];




  /* =======================================================
     USER ID
     ======================================================= */

  const currentUserId =
    currentUser?.id ||
    currentUser?.user?.id ||
    null;


  /* =======================================================
     PROFILE PHOTO
     ======================================================= */

  const profilePhoto =
    profile?.avatar_url ||
    currentUser?.avatar_url ||
    currentUser?.user_metadata?.avatar_url ||
    null;


  const profileName =
    profile?.full_name ||
    currentUser?.full_name ||
    currentUser?.user_metadata?.full_name ||
    'NESBA Member';


  /* =======================================================
     INITIAL LOAD
     ======================================================= */

  useEffect(() => {

    let mounted = true;

    const loadHome =
      async () => {

        try {

          /*
           * The database-specific loading functions
           * will be connected in the next parts.
           */

          if (!mounted) {
            return;
          }

          setLoading(false);

        } catch (error) {

          console.error(
            'NESBA home loading error:',
            error
          );

          if (mounted) {
            setLoading(false);
          }
        }
      };

    loadHome();

    return () => {
      mounted = false;
    };

  }, []);


  /* =======================================================
     INITIALS
     ======================================================= */

  const getInitials =
    useCallback(
      name => {

        const value =
          String(
            name || ''
          ).trim();

        if (!value) {
          return 'N';
        }

        const parts =
          value.split(/\s+/);

        if (
          parts.length === 1
        ) {
          return parts[0]
            .substring(0, 2)
            .toUpperCase();
        }

        return (
          parts[0][0] +
          parts[parts.length - 1][0]
        ).toUpperCase();

      },
      []
    );


  /* =======================================================
     TIME FORMATTER
     ======================================================= */

  const formatTime =
    useCallback(
      value => {

        if (!value) {
          return '';
        }

        const date =
          new Date(value);

        if (
          Number.isNaN(
            date.getTime()
          )
        ) {
          return '';
        }

        const now =
          Date.now();

        const difference =
          now -
          date.getTime();

        const minute =
          60 * 1000;

        const hour =
          60 * minute;

        const day =
          24 * hour;

        if (
          difference <
          minute
        ) {
          return 'Just now';
        }

        if (
          difference <
          hour
        ) {
          return `${Math.floor(
            difference / minute
          )}m`;
        }

        if (
          difference <
          day
        ) {
          return `${Math.floor(
            difference / hour
          )}h`;
        }

        if (
          difference <
          7 * day
        ) {
          return `${Math.floor(
            difference / day
          )}d`;
        }

        return date.toLocaleDateString();

      },
      []
    );


  /* =======================================================
     OPEN PROFILE
     ======================================================= */

  const openProfile =
    useCallback(
      userId => {

        if (!userId) {
          return;
        }

        router.push({
          pathname:
            '/profile/[id]',

          params: {
            id:
              String(userId),
          },
        });

      },
      [router]
    );


  /* =======================================================
     OPEN STORY
     ======================================================= */

  const openStory =
    useCallback(
      story => {

        const storyId =
          story?.id ||
          story?.storyId;

        if (!storyId) {
          return;
        }

        router.push({
          pathname:
            '/story/[id]',

          params: {
            id:
              String(storyId),
          },
        });

      },
      [router]
    );


  /* =======================================================
     OPEN COURSE
     ======================================================= */

  const openCourse =
    useCallback(
      course => {

        if (!course?.id) {
          return;
        }

        router.push({
          pathname:
            '/course/[id]',

          params: {
            id:
              String(course.id),
          },
        });

      },
      [router]
    );


  /* =======================================================
     OPEN COMPOSER
     ======================================================= */

  const openComposer =
    useCallback(
      () => {

        // Guests cannot post, so send them to log in first.
        if (!currentUser) {
          router.push('/login');
          return;
        }

        setComposerVisible(true);

      },
      [currentUser, router]
    );


  /* =======================================================
     CLOSE COMPOSER
     ======================================================= */

  const closeComposer =
    useCallback(
      () => {

        if (creatingPost) {
          return;
        }

        setComposerVisible(false);

        setPostText('');

        setPostImage(null);

        setPostVideo(null);

        setPostLink('');

        setPostEmojiVisible(false);

        setMentionVisible(false);

      },
      [creatingPost]
    );


  /* =======================================================
     STORY AUDIO PREVIEW
     ======================================================= */

  // Play the chosen song while the story is being made, the way it will
  // sound in the story: looping, and only the first STORY_MAX_SECONDS.
  useEffect(() => {

    let cancelled = false;

    const start = async () => {

      if (
        !storyAudio?.uri ||
        !storyEditorVisible
      ) {
        return;
      }

      try {

        const { sound } =
          await Audio.Sound.createAsync(
            { uri: storyAudio.uri },
            { shouldPlay: true, isLooping: true }
          );

        if (cancelled) {
          sound.unloadAsync().catch(() => {});
          return;
        }

        sound.setOnPlaybackStatusUpdate(status => {
          if (!status.isLoaded) {
            return;
          }

          setStoryAudioPlaying(status.isPlaying);

          if (
            status.positionMillis >=
            STORY_MAX_SECONDS * 1000
          ) {
            sound.setPositionAsync(0).catch(() => {});
          }
        });

        storySoundRef.current = sound;

      } catch (error) {

        console.warn(
          'Story audio preview error:',
          error
        );
      }
    };

    start();

    return () => {

      cancelled = true;

      setStoryAudioPlaying(false);

      storySoundRef.current
        ?.unloadAsync()
        .catch(() => {});

      storySoundRef.current = null;
    };

  }, [
    storyAudio?.uri,
    storyEditorVisible,
  ]);


  const [
    locating,
    setLocating,
  ] = useState(false);

  const fillStoryLocation =
    useCallback(
      async () => {

        setLocating(true);

        try {

          const place =
            await getCurrentPlaceName();

          if (place) {
            setStoryLocation(place);
          }

        } catch (error) {

          Alert.alert(
            'Location',
            error?.message ||
              'Could not find your location. Type the place instead.'
          );

        } finally {

          setLocating(false);
        }

      },
      []
    );


  const toggleStoryAudio =
    useCallback(
      async () => {

        const sound =
          storySoundRef.current;

        if (!sound) {
          return;
        }

        if (storyAudioPlaying) {
          await sound.pauseAsync();
        } else {
          await sound.playAsync();
        }

      },
      [storyAudioPlaying]
    );


  /* =======================================================
     RESET STORY EDITOR
     ======================================================= */

  const closeStoryEditor =
    useCallback(
      () => {

        if (storyUploading) {
          return;
        }

        setStoryEditorVisible(false);

        setStoryDraft(null);

        setStoryText('');

        setStoryLocation('');

        setStoryFilter('normal');

        setStoryAudio(null);

      },
      [storyUploading]
    );


  /* =======================================================
     AVATAR COMPONENT
     ======================================================= */

  const Avatar = ({
    uri,
    name,
    size = 44,
  }) => {

    if (uri) {

      return (
        <Image accessibilityLabel="Selected photo preview"
          source={{
            uri,
          }}

          style={{
            width: size,
            height: size,
            borderRadius:
              size / 2,
          }}
        />
      );
    }

    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius:
            size / 2,
          alignItems:
            'center',
          justifyContent:
            'center',
          backgroundColor:
            colors.primarySoft,
        }}
      >
        <Text
          style={{
            color:
              colors.primary,
            fontSize:
              Math.max(
                11,
                size * 0.3
              ),
            fontWeight:
              '800',
          }}
        >
          {
            getInitials(
              name
            )
          }
        </Text>
      </View>
    );
  };


  /* =======================================================
     COURSE TITLE
     ======================================================= */

  const getCourseTitle =
    useCallback(
      course =>
        course?.title ||
        course?.name ||
        'NESBA Course',
      []
    );


  /* =======================================================
     COURSE DESCRIPTION
     ======================================================= */

  const getCourseDescription =
    useCallback(
      course =>
        course?.description ||
        course?.short_description ||
        'Explore this course on NESBA.',
      []
    );


  /* =======================================================
     POST AUTHOR
     ======================================================= */

  const getPostAuthor =
    useCallback(
      post => {

        const author =
          post?.profiles ||
          post?.profile ||
          post?.author ||
          null;

        return {
          id:
            author?.id ||
            post?.user_id ||
            post?.author_id ||
            null,

          name:
            author?.full_name ||
            post?.author_name ||
            'NESBA Member',

          avatar:
            author?.avatar_url ||
            post?.author_avatar_url ||
            null,
        };

      },
      []
    );


  /* =======================================================
     POST TIME
     ======================================================= */

  const getPostTime =
    useCallback(
      post =>
        formatTime(
          post?.created_at
        ),
      [formatTime]
    );


  /* =======================================================
     FILTER STYLE
     ======================================================= */



  /* =======================================================
     SEARCH ACTIVE
     ======================================================= */

  const searchActive =
    searchText
      .trim()
      .length >= 2;


  /* =======================================================
     PART 1 ENDS HERE
     ======================================================= */
  /* =======================================================
     SUPABASE CLIENT
     ======================================================= */

  let supabaseClient = null;

  try {
    const supabaseModule =
      require('../../lib/supabase');

    supabaseClient =
      supabaseModule.supabase ||
      supabaseModule.default ||
      supabaseModule;
  } catch (error) {
    console.warn(
      'Supabase client could not be loaded from ../../lib/supabase'
    );
  }


  /* =======================================================
     GET CURRENT USER
     ======================================================= */

  const loadCurrentUser =
    useCallback(
      async () => {

        if (!supabaseClient) {
          return null;
        }

        try {

          const {
            data,
            error,
          } =
            await supabaseClient.auth.getUser();

          // Not signed in is normal for guests, not an error.
          if (
            error &&
            error.name !== 'AuthSessionMissingError'
          ) {
            throw error;
          }

          const user =
            data?.user || null;

          setCurrentUser(
            user
          );

          return user;

        } catch (error) {

          console.error(
            'Could not load current user:',
            error
          );

          return null;
        }
      },
      []
    );


  /* =======================================================
     LOAD PROFILE
     ======================================================= */

  const loadProfile =
    useCallback(
      async userId => {

        if (
          !supabaseClient ||
          !userId
        ) {
          return null;
        }

        try {

          const {
            data,
            error,
          } =
            await supabaseClient
              .from('profiles')
              .select('*')
              .eq(
                'id',
                userId
              )
              .maybeSingle();

          if (error) {
            throw error;
          }

          setProfile(
            data || null
          );

          return data;

        } catch (error) {

          console.error(
            'Profile loading error:',
            error
          );

          return null;
        }
      },
      []
    );


  /* =======================================================
     LOAD POSTS
     ======================================================= */

  const loadPosts =
    useCallback(
      async () => {

        if (
          !supabaseClient
        ) {
          return [];
        }

        setPostsLoading(
          true
        );

        try {

          const {
            data,
            error,
          } =
            await supabaseClient
              .from('posts')
              .select(`
                *,
                profiles:author_id (
                  id,
                  full_name,
                  avatar_url
                )
              `)
              .order(
                'created_at',
                {
                  ascending:
                    false,
                }
              )
              .limit(50);

          if (error) {
            throw error;
          }

          const loadedPosts =
            Array.isArray(data)
              ? data
              : [];

          setPosts(
            loadedPosts
          );

          return loadedPosts;

        } catch (error) {

          console.error(
            'Posts loading error:',
            error
          );

          setPosts(
            []
          );

          return [];

        } finally {

          setPostsLoading(
            false
          );
        }
      },
      []
    );


  /* =======================================================
     LOAD COURSES
     ======================================================= */

  const loadCourses =
    useCallback(
      async () => {

        if (
          !supabaseClient
        ) {
          return [];
        }

        try {

          const {
            data,
            error,
          } =
            await supabaseClient
              .from('courses')
              .select('*')
              .order(
                'created_at',
                {
                  ascending:
                    false,
                }
              )
              .limit(20);

          if (error) {
            throw error;
          }

          const courses =
            Array.isArray(data)
              ? data
              : [];

          setTrendingCourses(
            courses.slice(
              0,
              10
            )
          );

          return courses;

        } catch (error) {

          console.error(
            'Courses loading error:',
            error
          );

          setTrendingCourses(
            []
          );

          return [];
        }
      },
      []
    );


  /* =======================================================
     LOAD STORIES
     ======================================================= */

  const loadLiveNow =
    useCallback(
      async () => {
        try {
          setLiveNow(await getLiveNowEvents());
        } catch (error) {
          // The rest of Home still works without this section.
          console.error('Live now error:', error);
          setLiveNow([]);
        }
      },
      []
    );


  const loadStories =
    useCallback(
      async () => {

        if (
          !supabaseClient
        ) {
          return [];
        }

        try {

          const expiry =
            new Date();

          expiry.setHours(
            expiry.getHours() -
            24
          );

          const {
            data,
            error,
          } =
            await supabaseClient
              .from('stories')
              .select(`
                *,
                profiles:user_id (
                  id,
                  full_name,
                  avatar_url
                )
              `)
              .gte(
                'created_at',
                expiry.toISOString()
              )
              .order(
                'created_at',
                {
                  ascending:
                    false,
                }
              );

          if (error) {
            throw error;
          }

          const rawStories =
            Array.isArray(data)
              ? data
              : [];

          /*
           * Group stories by user.
           */

          const grouped = {};

          rawStories.forEach(
            story => {

              const userId =
                story.user_id;

              if (!userId) {
                return;
              }

              if (
                !grouped[userId]
              ) {
                grouped[userId] = {
                  userId,
                  fullName:
                    story.profiles
                      ?.full_name ||
                    'NESBA Member',

                  avatarUrl:
                    story.profiles
                      ?.avatar_url ||
                    null,

                  stories: [],
                };
              }

              grouped[
                userId
              ].stories.push(
                story
              );
            }
          );

          const result =
            Object.values(
              grouped
            );

          setStories(
            result
          );

          return result;

        } catch (error) {

          console.error(
            'Stories loading error:',
            error
          );

          setStories(
            []
          );

          return [];
        }
      },
      []
    );


  /* =======================================================
     LOAD SUGGESTED USERS
     ======================================================= */

  const loadSuggestedUsers =
    useCallback(
      async userId => {

        if (
          !supabaseClient ||
          !userId
        ) {
          return [];
        }

        try {

          const {
            data,
            error,
          } =
            await supabaseClient
              .from('profiles')
              .select(
                'id, full_name, avatar_url'
              )
              .neq(
                'id',
                userId
              )
              .limit(12);

          if (error) {
            throw error;
          }

          const users =
            Array.isArray(data)
              ? data
              : [];

          setSuggestedUsers(
            users
          );

          return users;

        } catch (error) {

          console.error(
            'Suggested users error:',
            error
          );

          setSuggestedUsers(
            []
          );

          return [];
        }
      },
      []
    );


  /* =======================================================
     LOAD LIKES FOR POSTS
     ======================================================= */

  const loadPostLikes =
    useCallback(
      async (
        postList,
        userId
      ) => {

        if (
          !supabaseClient ||
          !Array.isArray(postList)
        ) {
          return;
        }

        const postIds =
          postList
            .map(
              post =>
                post?.id
            )
            .filter(Boolean);

        if (
          postIds.length === 0
        ) {
          return;
        }

        try {

          const {
            data,
            error,
          } =
            await supabaseClient
              .from('post_likes')
              .select(
                'post_id, user_id'
              )
              .in(
                'post_id',
                postIds
              );

          if (error) {
            throw error;
          }

          const counts = {};
          const mine = {};

          (
            Array.isArray(data)
              ? data
              : []
          ).forEach(
            like => {

              if (
                !like.post_id
              ) {
                return;
              }

              counts[
                like.post_id
              ] =
                (
                  counts[
                    like.post_id
                  ] || 0
                ) + 1;

              if (
                String(
                  like.user_id
                ) ===
                String(
                  userId
                )
              ) {
                mine[
                  like.post_id
                ] = true;
              }
            }
          );

          setPostLikeCounts(
            counts
          );

          setLikedPosts(
            mine
          );

        } catch (error) {

          console.error(
            'Post likes loading error:',
            error
          );
        }
      },
      []
    );


  /* =======================================================
     LOAD COMMENTS
     ======================================================= */

  const loadComments =
    useCallback(
      async postId => {

        if (
          !supabaseClient ||
          !postId
        ) {
          return [];
        }

        try {

          const {
            data,
            error,
          } =
            await supabaseClient
              .from('post_comments')
              .select(`
                *,
                profiles:author_id (
                  id,
                  full_name,
                  avatar_url
                )
              `)
              .eq(
                'post_id',
                postId
              )
              .order(
                'created_at',
                {
                  ascending:
                    true,
                }
              );

          if (error) {
            throw error;
          }

          const result =
            Array.isArray(data)
              ? data
              : [];

          setComments(
            previous => ({
              ...previous,

              [postId]:
                result,
            })
          );

          return result;

        } catch (error) {

          console.error(
            'Comments loading error:',
            error
          );

          return [];
        }
      },
      []
    );


  /* =======================================================
     INITIAL DATA LOAD
     ======================================================= */

  useEffect(() => {

    let active = true;

    const initialise =
      async () => {

        try {

          const user =
            await loadCurrentUser();

          if (
            !active
          ) {
            return;
          }

          if (
            user?.id
          ) {

            await Promise.all([
              loadProfile(
                user.id
              ),

              loadSuggestedUsers(
                user.id
              ),
            ]);
          }

          const loadedPosts =
            await loadPosts();

          await Promise.all([
            loadCourses(),
            loadStories(),
            loadLiveNow(),
          ]);

          if (
            user?.id &&
            loadedPosts.length
          ) {
            await loadPostLikes(
              loadedPosts,
              user.id
            );
          }

        } catch (error) {

          console.error(
            'NESBA initialization error:',
            error
          );

        } finally {

          if (active) {
            setLoading(
              false
            );
          }
        }
      };

    initialise();

    return () => {
      active = false;
    };

  }, [
    loadCurrentUser,
    loadProfile,
    loadSuggestedUsers,
    loadPosts,
    loadCourses,
    loadStories,
    loadPostLikes,
  ]);


  /* =======================================================
     REFRESH HOME DATA
     ======================================================= */

  const refreshHome =
    useCallback(
      async () => {

        const user =
          currentUser ||
          await loadCurrentUser();

        const loadedPosts =
          await loadPosts();

        await Promise.all([
          loadCourses(),
          loadStories(),
          loadLiveNow(),
        ]);

        if (
          user?.id
        ) {

          await Promise.all([
            loadProfile(
              user.id
            ),

            loadSuggestedUsers(
              user.id
            ),
          ]);

          await loadPostLikes(
            loadedPosts,
            user.id
          );
        }

      },
      [
        currentUser,
        loadCurrentUser,
        loadPosts,
        loadCourses,
        loadStories,
        loadProfile,
        loadSuggestedUsers,
        loadPostLikes,
      ]
    );


  /* =======================================================
     REPLACE REFRESH HANDLER
     ======================================================= */

  const handleRefreshData =
    useCallback(
      async () => {

        setRefreshing(
          true
        );

        try {

          await refreshHome();

        } catch (error) {

          console.error(
            'Refresh error:',
            error
          );

        } finally {

          setRefreshing(
            false
          );
        }
      },
      [refreshHome]
    );


  /* =======================================================
     IMAGE PERMISSION
     ======================================================= */

  const requestMediaPermission =
    useCallback(
      async () => {

        const result =
          await ImagePicker
            .requestMediaLibraryPermissionsAsync();

        if (
          !result.granted
        ) {

          Alert.alert(
            'Permission required',
            'NESBA needs access to your photos and videos.'
          );

          return false;
        }

        return true;
      },
      []
    );


  /* =======================================================
     PICK POST IMAGE
     ======================================================= */

  const pickPostImage =
    useCallback(
      async () => {

        const allowed =
          await requestMediaPermission();

        if (!allowed) {
          return;
        }

        try {

          const result =
            await ImagePicker.launchImageLibraryAsync({
              mediaTypes: [
                'images',
              ],

              allowsEditing:
                true,

              quality:
                0.85,

              selectionLimit:
                1,
            });

          if (
            result.canceled ||
            !result.assets?.length
          ) {
            return;
          }

          const asset =
            result.assets[0];

          setPostImage({
            uri:
              asset.uri,

            file:
              asset.file,

            size:
              asset.fileSize,

            name:
              asset.fileName ||
              `post-${Date.now()}.jpg`,

            mimeType:
              asset.mimeType ||
              'image/jpeg',

            type:
              'image',
          });

          setPostVideo(
            null
          );

          setComposerVisible(
            true
          );

        } catch (error) {

          console.error(
            'Pick post image error:',
            error
          );

          Alert.alert(
            'NESBA',
            'Could not select the image.'
          );
        }
      },
      [
        requestMediaPermission,
      ]
    );


  /* =======================================================
     PICK POST VIDEO
     ======================================================= */

  const pickPostVideo =
    useCallback(
      async () => {

        const allowed =
          await requestMediaPermission();

        if (!allowed) {
          return;
        }

        try {

          const result =
            await ImagePicker.launchImageLibraryAsync({
              mediaTypes: [
                'videos',
              ],

              allowsEditing:
                false,

              quality:
                0.8,

              // iOS re-encodes to 720p, which makes uploads much smaller.
              videoExportPreset:
                ImagePicker.VideoExportPreset.H264_1280x720,

              videoMaxDuration:
                180,

              selectionLimit:
                1,
            });

          if (
            result.canceled ||
            !result.assets?.length
          ) {
            return;
          }

          const asset =
            result.assets[0];

          if (
            asset.fileSize &&
            asset.fileSize > MAX_UPLOAD_BYTES
          ) {
            Alert.alert(
              'Video too large',
              `This video is ${formatBytes(asset.fileSize)}. The maximum is ${formatBytes(MAX_UPLOAD_BYTES)}. Try a shorter clip.`
            );
            return;
          }

          setPostVideo({
            uri:
              asset.uri,

            file:
              asset.file,

            size:
              asset.fileSize,

            name:
              asset.fileName ||
              `post-${Date.now()}.mp4`,

            mimeType:
              asset.mimeType ||
              'video/mp4',

            type:
              'video',
          });

          setPostImage(
            null
          );

          setComposerVisible(
            true
          );

        } catch (error) {

          console.error(
            'Pick post video error:',
            error
          );

          Alert.alert(
            'NESBA',
            'Could not select the video.'
          );
        }
      },
      [
        requestMediaPermission,
      ]
    );


  /* =======================================================
     PICK STORY MEDIA
     ======================================================= */

  const pickStoryMedia =
    useCallback(
      async () => {

        const allowed =
          await requestMediaPermission();

        if (!allowed) {
          return;
        }

        try {

          const result =
            await ImagePicker.launchImageLibraryAsync({
              mediaTypes: [
                'images',
                'videos',
              ],

              allowsEditing:
                false,

              quality:
                0.85,

              videoExportPreset:
                ImagePicker.VideoExportPreset.H264_1280x720,

              videoMaxDuration:
                STORY_MAX_SECONDS,

              selectionLimit:
                1,
            });

          if (
            result.canceled ||
            !result.assets?.length
          ) {
            return;
          }

          const asset =
            result.assets[0];

          const type =
            asset.type ===
            'video'
              ? 'video'
              : 'image';

          // The picker reports duration in milliseconds.
          if (
            type === 'video' &&
            asset.duration &&
            asset.duration > STORY_MAX_SECONDS * 1000 + 500
          ) {
            Alert.alert(
              'Video too long',
              `Stories can be up to ${STORY_MAX_SECONDS} seconds. This video is ${Math.round(asset.duration / 1000)} seconds. Trim it and try again.`
            );
            return;
          }

          if (
            asset.fileSize &&
            asset.fileSize > MAX_UPLOAD_BYTES
          ) {
            Alert.alert(
              'File too large',
              `This file is ${formatBytes(asset.fileSize)}. The maximum is ${formatBytes(MAX_UPLOAD_BYTES)}.`
            );
            return;
          }

          setStoryDraft({
            uri:
              asset.uri,

            file:
              asset.file,

            size:
              asset.fileSize,

            type,

            name:
              asset.fileName ||
              `story-${Date.now()}`,

            mimeType:
              asset.mimeType ||
              (
                type === 'video'
                  ? 'video/mp4'
                  : 'image/jpeg'
              ),
          });

          setStoryText(
            ''
          );

          setStoryLocation(
            ''
          );

          setStoryFilter(
            'normal'
          );

          setStoryAudio(
            null
          );

          setStoryEditorVisible(
            true
          );

        } catch (error) {

          console.error(
            'Pick story media error:',
            error
          );

          Alert.alert(
            'NESBA',
            'Could not select story media.'
          );
        }
      },
      [
        requestMediaPermission,
      ]
    );


  /* =======================================================
     PICK STORY AUDIO
     ======================================================= */

  const pickStoryAudio =
    useCallback(
      async () => {

        try {

          const result =
            await DocumentPicker
              .getDocumentAsync({
                type:
                  'audio/*',

                copyToCacheDirectory:
                  true,

                multiple:
                  false,
              });

          if (
            result.canceled
          ) {
            return;
          }

          const file =
            result.assets?.[0];

          if (!file) {
            return;
          }

          if (
            file.size &&
            file.size > MAX_STORY_AUDIO_BYTES
          ) {
            Alert.alert(
              'Audio too large',
              `This audio file is ${formatBytes(file.size)}. Choose one under ${formatBytes(MAX_STORY_AUDIO_BYTES)}.`
            );
            return;
          }

          setStoryAudio({
            uri:
              file.uri,

            file:
              file.file,

            size:
              file.size,

            name:
              file.name ||
              'story-audio',

            mimeType:
              file.mimeType ||
              'audio/mpeg',
          });

        } catch (error) {

          console.error(
            'Story audio picker error:',
            error
          );

          Alert.alert(
            'NESBA',
            'Could not select audio.'
          );
        }
      },
      []
    );


  /* =======================================================
     PICK COMMENT MEDIA
     ======================================================= */

  const pickCommentMedia =
    useCallback(
      async postId => {

        if (!postId) {
          return;
        }

        const allowed =
          await requestMediaPermission();

        if (!allowed) {
          return;
        }

        try {

          const result =
            await ImagePicker.launchImageLibraryAsync({
              mediaTypes: [
                'images',
                'videos',
              ],

              allowsEditing:
                false,

              quality:
                0.8,

              selectionLimit:
                1,
            });

          if (
            result.canceled ||
            !result.assets?.length
          ) {
            return;
          }

          const asset =
            result.assets[0];

          setCommentMedia(
            previous => ({
              ...previous,

              [postId]: {
                uri:
                  asset.uri,

                type:
                  asset.type ===
                  'video'
                    ? 'video'
                    : 'image',

                name:
                  asset.fileName ||
                  `comment-${Date.now()}`,

                mimeType:
                  asset.mimeType ||
                  (
                    asset.type ===
                    'video'
                      ? 'video/mp4'
                      : 'image/jpeg'
                  ),
              },
            })
          );

        } catch (error) {

          console.error(
            'Comment media picker error:',
            error
          );

          Alert.alert(
            'NESBA',
            'Could not select the attachment.'
          );
        }
      },
      [
        requestMediaPermission,
      ]
    );


  /* =======================================================
     SUPABASE STORAGE UPLOAD
     ======================================================= */

  const uploadFile =
    useCallback(
      async ({
        file,
        bucket,
        folder,
      }) => {

        if (
          !supabaseClient ||
          !file?.uri
        ) {
          throw new Error(
            'Upload service is unavailable.'
          );
        }

        const nameParts =
          (
            file.name ||
            ''
          ).split('.');

        const extension =
          (
            nameParts.length > 1 &&
            nameParts
              .pop()
              .toLowerCase()
          ) ||
          (
            file.type ===
            'video'
              ? 'mp4'
              : file.type ===
                'audio'
              ? 'm4a'
              : 'jpg'
          );

        if (!currentUserId) {
          throw new Error(
            'Please log in to upload.'
          );
        }

        /*
         * Storage policies only allow uploads inside a
         * folder named after the signed-in user's id.
         */
        const path =
          `${currentUserId}/${folder}/${Date.now()}-${Math.random()
            .toString(36)
            .substring(2)}.${extension}`;

        setUploadProgress(0);

        try {
          return await uploadWithProgress({
            bucket,
            path,
            file: {
              ...file,
              mimeType:
                file.mimeType ||
                (
                  file.type ===
                  'video'
                    ? 'video/mp4'
                    : 'image/jpeg'
                ),
            },
            onProgress:
              setUploadProgress,
          });
        } finally {
          setUploadProgress(null);
        }
      },
      [
        currentUserId,
      ]
    );


  /* =======================================================
     POST IMAGE UPLOAD
     ======================================================= */

  const uploadPostMedia =
    useCallback(
      async file => {

        return uploadFile({
          file,

          bucket:
            'posts',

          folder:
            'media',
        });

      },
      [
        uploadFile,
      ]
    );


  /* =======================================================
     STORY MEDIA UPLOAD
     ======================================================= */

  const uploadStoryMedia =
    useCallback(
      async file => {

        return uploadFile({
          file,

          bucket:
            'stories',

          folder:
            'media',
        });

      },
      [
        uploadFile,
      ]
    );


  /* =======================================================
     COMMENT MEDIA UPLOAD
     ======================================================= */

  const uploadCommentAttachment =
    useCallback(
      async file => {

        return uploadFile({
          file,

          bucket:
            'posts',

          folder:
            'comments',
        });

      },
      [
        uploadFile,
      ]
    );


  /* =======================================================
     STORY AUDIO UPLOAD
     ======================================================= */

  const uploadStoryAudio =
    useCallback(
      async file => {

        return uploadFile({
          file,

          bucket:
            'stories',

          folder:
            'audio',
        });

      },
      [
        uploadFile,
      ]
    );


  /* =======================================================
     ADD POST EMOJI
     ======================================================= */

  const addPostEmoji =
    useCallback(
      emoji => {

        setPostText(
          previous =>
            `${previous}${emoji}`
        );

        setPostEmojiVisible(
          false
        );

      },
      []
    );


  /* =======================================================
     UPDATE COMMENT TEXT
     ======================================================= */

  const updateCommentText =
    useCallback(
      (
        postId,
        value
      ) => {

        setCommentText(
          previous => ({
            ...previous,

            [postId]:
              value,
          })
        );

      },
      []
    );


  /* =======================================================
     ADD COMMENT EMOJI
     ======================================================= */

  const addCommentEmoji =
    useCallback(
      (
        postId,
        emoji
      ) => {

        setCommentText(
          previous => ({
            ...previous,

            [postId]:
              `${previous[postId] || ''}${emoji}`,
          })
        );

        setCommentEmojiVisible(
          previous => ({
            ...previous,

            [postId]:
              false,
          })
        );

      },
      []
    );


  /* =======================================================
     COMMENT MENTION / REPLY
     ======================================================= */

  const startReply =
    useCallback(
      (
        postId,
        comment
      ) => {

        if (
          !postId ||
          !comment?.id
        ) {
          return;
        }

        setReplyTarget(
          previous => ({
            ...previous,

            [postId]:
              comment,
          })
        );

        setCommentsVisible(
          previous => ({
            ...previous,

            [postId]:
              true,
          })
        );

      },
      []
    );


  /* =======================================================
     CANCEL REPLY
     ======================================================= */

  const cancelReply =
    useCallback(
      postId => {

        setReplyTarget(
          previous => {

            const next = {
              ...previous,
            };

            delete next[
              postId
            ];

            return next;
          }
        );

      },
      []
    );


  /* =======================================================
     TOGGLE COMMENTS
     ======================================================= */

  const toggleComments =
    useCallback(
      async post => {

        if (!post?.id) {
          return;
        }

        const postId =
          post.id;

        const opening =
          !commentsVisible[
            postId
          ];

        setCommentsVisible(
          previous => ({
            ...previous,

            [postId]:
              opening,
          })
        );

        if (
          opening &&
          !comments[
            postId
          ]
        ) {
          await loadComments(
            postId
          );
        }

      },
      [
        commentsVisible,
        comments,
        loadComments,
      ]
    );


  /* =======================================================
     PART 2 ENDS HERE
     ======================================================= */
       /* =======================================================
     CREATE POST
     ======================================================= */

  const createPost =
    useCallback(
      async () => {

        const text =
          postText.trim();

        if (
          !text &&
          !postImage &&
          !postVideo &&
          !postLink.trim()
        ) {

          Alert.alert(
            'Create Post',
            'Write something or add a photo, video, or link first.'
          );

          return;
        }

        if (
          !supabaseClient ||
          !currentUserId
        ) {

          Alert.alert(
            'NESBA',
            'You must be signed in to create a post.'
          );

          return;
        }

        if (creatingPost) {
          return;
        }

        setCreatingPost(
          true
        );

        try {

          let imageUrl =
            null;

          let videoUrl =
            null;


          /* ===============================================
             UPLOAD IMAGE
          =============================================== */

          if (postImage) {

            const uploaded =
              await uploadPostMedia(
                postImage
              );

            imageUrl =
              uploaded.publicUrl;
          }


          /* ===============================================
             UPLOAD VIDEO
          =============================================== */

          if (postVideo) {

            const uploaded =
              await uploadPostMedia(
                postVideo
              );

            videoUrl =
              uploaded.publicUrl;
          }


          /* ===============================================
             INSERT POST
          =============================================== */

          const insertData = {
            author_id:
              currentUserId,

            // posts.content is NOT NULL, so media-only posts send ''.
            content:
              text,

            image_url:
              imageUrl,

            video_url:
              videoUrl,

            link_url:
              postLink.trim() ||
              null,
          };


          const {
            data,
            error,
          } =
            await supabaseClient
              .from('posts')
              .insert(
                insertData
              )
              .select(`
                *,
                profiles:author_id (
                  id,
                  full_name,
                  avatar_url
                )
              `)
              .single();


          if (error) {
            throw error;
          }


          /* ===============================================
             ADD NEW POST IMMEDIATELY
          =============================================== */

          if (data) {

            setPosts(
              previous => [
                data,
                ...previous,
              ]
            );

            setPostLikeCounts(
              previous => ({
                ...previous,

                [data.id]:
                  0,
              })
            );
          }


          /* ===============================================
             RESET COMPOSER
          =============================================== */

          setPostText('');

          setPostImage(null);

          setPostVideo(null);

          setPostLink('');

          setPostEmojiVisible(
            false
          );

          setMentionVisible(
            false
          );

          setComposerVisible(
            false
          );


          Alert.alert(
            'Posted',
            'Your post has been published.'
          );

        } catch (error) {

          console.error(
            'CREATE POST ERROR:',
            error
          );

          Alert.alert(
            'Could not create post',
            error?.message ||
              'Something went wrong while creating your post.'
          );

        } finally {

          setCreatingPost(
            false
          );
        }

      },
      [
        postText,
        postImage,
        postVideo,
        postLink,
        currentUserId,
        creatingPost,
        uploadPostMedia,
      ]
    );


  /* =======================================================
     DELETE POST
     ======================================================= */

  const deletePost =
    useCallback(
      async post => {

        if (
          !post?.id ||
          !currentUserId ||
          !supabaseClient
        ) {
          return;
        }

        const authorId =
          post.user_id ||
          post.author_id;

        if (
          String(authorId) !==
          String(currentUserId)
        ) {

          Alert.alert(
            'NESBA',
            'You can only delete your own posts.'
          );

          return;
        }


        Alert.alert(
          'Delete post?',
          'This cannot be undone.',
          [
            {
              text:
                'Cancel',

              style:
                'cancel',
            },

            {
              text:
                'Delete',

              style:
                'destructive',

              onPress:
                async () => {

                  try {

                    const {
                      error,
                    } =
                      await supabaseClient
                        .from('posts')
                        .delete()
                        .eq(
                          'id',
                          post.id
                        )
                        .eq(
                          'author_id',
                          currentUserId
                        );

                    if (error) {
                      throw error;
                    }

                    setPosts(
                      previous =>
                        previous.filter(
                          item =>
                            String(
                              item.id
                            ) !==
                            String(
                              post.id
                            )
                        )
                    );

                    setComments(
                      previous => {

                        const next = {
                          ...previous,
                        };

                        delete next[
                          post.id
                        ];

                        return next;
                      }
                    );

                  } catch (error) {

                    console.error(
                      'Delete post error:',
                      error
                    );

                    Alert.alert(
                      'NESBA',
                      error?.message ||
                        'Could not delete the post.'
                    );
                  }
                },
            },
          ]
        );

      },
      [
        currentUserId,
      ]
    );


  /* =======================================================
     LIKE / UNLIKE POST
     ======================================================= */

  const handlePostLike =
    useCallback(
      async post => {

        if (
          !post?.id ||
          !currentUserId ||
          !supabaseClient
        ) {

          Alert.alert(
            'NESBA',
            'Please sign in to like posts.'
          );

          return;
        }

        const postId =
          post.id;

        const currentlyLiked =
          Boolean(
            likedPosts[
              postId
            ]
          );


        /*
         * Optimistic update.
         *
         * One click = one like.
         * Second click = unlike.
         */

        setLikedPosts(
          previous => ({
            ...previous,

            [postId]:
              !currentlyLiked,
          })
        );

        setPostLikeCounts(
          previous => ({
            ...previous,

            [postId]:
              Math.max(
                0,
                (
                  previous[
                    postId
                  ] || 0
                ) +
                (
                  currentlyLiked
                    ? -1
                    : 1
                )
              ),
          })
        );


        try {

          if (
            currentlyLiked
          ) {

            /*
             * Remove ONLY this user's like.
             */

            const {
              error,
            } =
              await supabaseClient
                .from('post_likes')
                .delete()
                .eq(
                  'post_id',
                  postId
                )
                .eq(
                  'user_id',
                  currentUserId
                );

            if (error) {
              throw error;
            }

          } else {

            /*
             * Insert this user's like.
             *
             * The database should have a unique
             * constraint on (post_id, user_id).
             */

            const {
              error,
            } =
              await supabaseClient
                .from('post_likes')
                .insert({
                  post_id:
                    postId,

                  user_id:
                    currentUserId,
                });

            if (error) {
              throw error;
            }
          }

        } catch (error) {

          /*
           * Roll back optimistic update.
           */

          setLikedPosts(
            previous => ({
              ...previous,

              [postId]:
                currentlyLiked,
            })
          );

          setPostLikeCounts(
            previous => ({
              ...previous,

              [postId]:
                Math.max(
                  0,
                  (
                    previous[
                      postId
                    ] || 0
                  ) +
                  (
                    currentlyLiked
                      ? 1
                      : -1
                  )
                ),
            })
          );

          console.error(
            'Post like error:',
            error
          );

          Alert.alert(
            'NESBA',
            error?.message ||
              'Could not update the like.'
          );
        }

      },
      [
        currentUserId,
        likedPosts,
      ]
    );


  /* =======================================================
     SUBMIT COMMENT
     ======================================================= */

  const submitComment =
    useCallback(
      async post => {

        if (
          !post?.id ||
          !currentUserId ||
          !supabaseClient
        ) {

          Alert.alert(
            'NESBA',
            'Please sign in to comment.'
          );

          return;
        }

        const postId =
          post.id;

        const text =
          (
            commentText[
              postId
            ] || ''
          ).trim();

        const media =
          commentMedia[
            postId
          ] || null;

        const reply =
          replyTarget[
            postId
          ] || null;


        if (
          !text &&
          !media
        ) {

          return;
        }


        try {

          let mediaUrl =
            null;


          /* =============================================
             UPLOAD COMMENT MEDIA
          ============================================= */

          if (media) {

            const uploaded =
              await uploadCommentAttachment(
                media
              );

            mediaUrl =
              uploaded.publicUrl;
          }


          /* =============================================
             CREATE COMMENT
          ============================================= */

          const commentData = {
            post_id:
              postId,

            author_id:
              currentUserId,

            // post_comments.content is NOT NULL.
            content:
              text,

            media_url:
              mediaUrl,

            media_type:
              mediaUrl
                ? media?.type ||
                  'image'
                : null,

            parent_id:
              reply?.id ||
              null,
          };


          const {
            data,
            error,
          } =
            await supabaseClient
              .from('post_comments')
              .insert(
                commentData
              )
              .select(`
                *,
                profiles:author_id (
                  id,
                  full_name,
                  avatar_url
                )
              `)
              .single();


          if (error) {
            throw error;
          }


          /* =============================================
             ADD COMMENT LOCALLY
          ============================================= */

          if (data) {

            setComments(
              previous => ({
                ...previous,

                [postId]: [
                  ...(previous[
                    postId
                  ] || []),

                  data,
                ],
              })
            );
          }


          /* =============================================
             CLEAR INPUT
          ============================================= */

          setCommentText(
            previous => ({
              ...previous,

              [postId]:
                '',
            })
          );

          setCommentMedia(
            previous => {

              const next = {
                ...previous,
              };

              delete next[
                postId
              ];

              return next;
            }
          );

          setReplyTarget(
            previous => {

              const next = {
                ...previous,
              };

              delete next[
                postId
              ];

              return next;
            }
          );

          setCommentEmojiVisible(
            previous => ({
              ...previous,

              [postId]:
                false,
            })
          );


          /*
           * Keep comments open.
           */

          setCommentsVisible(
            previous => ({
              ...previous,

              [postId]:
                true,
            })
          );


        } catch (error) {

          console.error(
            'Submit comment error:',
            error
          );

          Alert.alert(
            'NESBA',
            error?.message ||
              'Could not publish the comment.'
          );
        }

      },
      [
        currentUserId,
        commentText,
        commentMedia,
        replyTarget,
        uploadCommentAttachment,
      ]
    );


  /* =======================================================
     PUBLISH STORY
     ======================================================= */

  const publishStory =
    useCallback(
      async () => {

        if (
          !storyDraft
        ) {

          Alert.alert(
            'Story',
            'Choose a photo or video first.'
          );

          return;
        }

        if (
          !supabaseClient ||
          !currentUserId
        ) {

          Alert.alert(
            'NESBA',
            'Please sign in to publish a story.'
          );

          return;
        }

        if (
          storyUploading
        ) {
          return;
        }

        setStoryUploading(
          true
        );

        try {

          /* =============================================
             UPLOAD MEDIA
          ============================================= */

          const uploaded =
            await uploadStoryMedia(
              storyDraft
            );


          /* =============================================
             UPLOAD AUDIO
          ============================================= */

          let audioUrl =
            null;

          if (
            storyAudio
          ) {

            const audioUpload =
              await uploadStoryAudio(
                storyAudio
              );

            audioUrl =
              audioUpload.publicUrl;
          }


          /* =============================================
             STORY DATA
          ============================================= */

          const storyData = {
            user_id:
              currentUserId,

            media_url:
              uploaded.publicUrl,

            media_type:
              storyDraft.type,

            caption:
              storyText.trim() ||
              null,

            location_text:
              storyLocation.trim() ||
              null,

            filter_name:
              storyFilter ||
              'normal',

            audio_url:
              audioUrl,

            audio_name:
              storyAudio?.name ||
              null,
          };


          /* =============================================
             INSERT STORY
          ============================================= */

          const {
            data,
            error,
          } =
            await supabaseClient
              .from('stories')
              .insert(
                storyData
              )
              .select('*')
              .single();


          if (error) {
            throw error;
          }


          /* =============================================
             CLOSE EDITOR
          ============================================= */

          closeStoryEditor();


          /*
           * Refresh stories so the newly uploaded
           * story immediately appears.
           */

          await loadStories();


          Alert.alert(
            'Story published',
            'Your story is now live.'
          );

        } catch (error) {

          console.error(
            'Publish story error:',
            error
          );

          Alert.alert(
            'Could not publish story',
            error?.message ||
              'Something went wrong while publishing your story.'
          );

        } finally {

          setStoryUploading(
            false
          );
        }

      },
      [
        storyDraft,
        currentUserId,
        storyUploading,
        storyAudio,
        storyText,
        storyLocation,
        storyFilter,
        uploadStoryMedia,
        uploadStoryAudio,
        closeStoryEditor,
        loadStories,
      ]
    );


  /* =======================================================
     SHARE POST
     ======================================================= */

  const handleSharePost =
    useCallback(
      async post => {

        if (!post?.id) {
          return;
        }

        try {

          const result =
            await Share.share({
              message:
                `Check out this post on NESBA.`,
            });


          if (
            result.action ===
            Share.sharedAction
          ) {

            /*
             * Share count can be added later
             * if your database contains it.
             */

          }

        } catch (error) {

          console.error(
            'Share post error:',
            error
          );
        }
      },
      []
    );


  /* =======================================================
     FOLLOW USER
     ======================================================= */

  const handleFollow =
    useCallback(
      async user => {

        if (
          !user?.id ||
          !currentUserId ||
          !supabaseClient
        ) {
          return;
        }

        try {

          /*
           * Try the standard follows table.
           */

          const {
            data: existing,
            error:
              lookupError,
          } =
            await supabaseClient
              .from('follows')
              .select('id')
              .eq(
                'follower_id',
                currentUserId
              )
              .eq(
                'followed_user_id',
                user.id
              )
              .maybeSingle();


          if (lookupError) {
            throw lookupError;
          }


          if (existing) {

            await supabaseClient
              .from('follows')
              .delete()
              .eq(
                'id',
                existing.id
              );

          } else {

            const {
              error,
            } =
              await supabaseClient
                .from('follows')
                .insert({
                  follower_id:
                    currentUserId,

                  followed_user_id:
                    user.id,
                });

            if (error) {
              throw error;
            }
          }


          setSuggestedUsers(
            previous =>
              [...previous]
          );

        } catch (error) {

          console.error(
            'Follow error:',
            error
          );

          Alert.alert(
            'NESBA',
            error?.message ||
              'Could not update follow status.'
          );
        }

      },
      [
        currentUserId,
      ]
    );


  /* =======================================================
     SEARCH USERS / COURSES / POSTS
     ======================================================= */

  const performSearch =
    useCallback(
      async value => {

        const query =
          value.trim();

        // Characters that would break PostgREST or() filters.
        const safeQuery =
          query.replace(
            /[,()%*\\]/g,
            ' '
          );

        if (
          query.length < 2
        ) {

          setSearchResults({
            users: [],
            courses: [],
            posts: [],
          });

          return;
        }

        if (
          !supabaseClient
        ) {
          return;
        }

        setSearchLoading(
          true
        );

        try {

          const [
            usersResult,
            coursesResult,
            postsResult,
          ] =
            await Promise.all([

              supabaseClient
                .from('profiles')
                .select(
                  'id, full_name, avatar_url'
                )
                .ilike(
                  'full_name',
                  `%${query}%`
                )
                .limit(8),

              supabaseClient
                .from('courses')
                .select('*')
                .or(
                  `title.ilike.%${safeQuery}%,description.ilike.%${safeQuery}%`
                )
                .eq(
                  'is_published',
                  true
                )
                .limit(8),

              supabaseClient
                .from('posts')
                .select(`
                  *,
                  profiles:author_id (
                    id,
                    full_name,
                    avatar_url
                  )
                `)
                .ilike(
                  'content',
                  `%${query}%`
                )
                .limit(8),
            ]);


          setSearchResults({
            users:
              usersResult.data || [],

            courses:
              coursesResult.data || [],

            posts:
              postsResult.data || [],
          });

        } catch (error) {

          console.error(
            'Search error:',
            error
          );

          setSearchResults({
            users: [],
            courses: [],
            posts: [],
          });

        } finally {

          setSearchLoading(
            false
          );
        }

      },
      []
    );


  /* =======================================================
     SEARCH INPUT
  ======================================================= */

  useEffect(() => {

    const timer =
      setTimeout(
        () => {

          if (
            searchActive
          ) {

            performSearch(
              searchText
            );

          } else {

            setSearchResults({
              users: [],
              courses: [],
              posts: [],
            });
          }

        },
        350
      );

    return () =>
      clearTimeout(
        timer
      );

  }, [
    searchText,
    searchActive,
    performSearch,
  ]);


  /* =======================================================
     MENTION SEARCH
  ======================================================= */

  const searchMentionUsers =
    useCallback(
      async value => {

        const query =
          value.trim();

        setMentionSearch(
          query
        );

        if (
          query.length < 1 ||
          !supabaseClient
        ) {

          setMentionUsers(
            []
          );

          return;
        }

        try {

          const {
            data,
            error,
          } =
            await supabaseClient
              .from('profiles')
              .select(
                'id, full_name, avatar_url'
              )
              .ilike(
                'full_name',
                `%${query}%`
              )
              .limit(6);

          if (error) {
            throw error;
          }

          setMentionUsers(
            data || []
          );

        } catch (error) {

          console.error(
            'Mention search error:',
            error
          );

          setMentionUsers(
            []
          );
        }
      },
      []
    );


  /* =======================================================
     INSERT MENTION
  ======================================================= */

  const insertMention =
    useCallback(
      user => {

        if (!user) {
          return;
        }

        const name =
          user.full_name ||
          'NESBA Member';

        setPostText(
          previous => {

            const separator =
              previous.length &&
              !previous.endsWith(
                ' '
              )
                ? ' '
                : '';

            return (
              previous +
              separator +
              `@${name} `
            );
          }
        );

        setMentionVisible(
          false
        );

        setMentionSearch(
          ''
        );

        setMentionUsers(
          []
        );

      },
      []
    );


  /* =======================================================
     STORY TEXT UPDATE
  ======================================================= */

  const updateStoryText =
    useCallback(
      value => {

        setStoryText(
          value
        );

      },
      []
    );


  /* =======================================================
     STORY LOCATION UPDATE
  ======================================================= */

  const updateStoryLocation =
    useCallback(
      value => {

        setStoryLocation(
          value
        );

      },
      []
    );


  /* =======================================================
     STORY FILTER UPDATE
  ======================================================= */

  const updateStoryFilter =
    useCallback(
      filter => {

        setStoryFilter(
          filter
        );

      },
      []
    );


  /* =======================================================
     REMOVE POST IMAGE
  ======================================================= */

  const removePostImage =
    useCallback(
      () => {

        setPostImage(
          null
        );

      },
      []
    );


  /* =======================================================
     REMOVE POST VIDEO
  ======================================================= */

  const removePostVideo =
    useCallback(
      () => {

        setPostVideo(
          null
        );

      },
      []
    );


  /* =======================================================
     GET POST LIKE COUNT
  ======================================================= */

  const getPostLikeCount =
    useCallback(
      post => {

        if (!post?.id) {
          return 0;
        }

        return (
          postLikeCounts[
            post.id
          ] || 0
        );

      },
      [
        postLikeCounts,
      ]
    );


  /* =======================================================
     GET COMMENTS
  ======================================================= */

  const getPostComments =
    useCallback(
      postId => {

        return (
          comments[
            postId
          ] || []
        );

      },
      [
        comments,
      ]
    );


  /* =======================================================
     GET COMMENT COUNT
  ======================================================= */

  const getCommentCount =
    useCallback(
      postId => {

        return getPostComments(
          postId
        ).length;

      },
      [
        getPostComments,
      ]
    );


  /* =======================================================
     REMOVE COMMENT MEDIA
  ======================================================= */

  const removeCommentMedia =
    useCallback(
      postId => {

        setCommentMedia(
          previous => {

            const next = {
              ...previous,
            };

            delete next[
              postId
            ];

            return next;
          }
        );

      },
      []
    );


  /* =======================================================
     STORY MEDIA FILTER
     ======================================================= */



  /* =======================================================
     PART 3 ENDS HERE
     ======================================================= */
       /* =======================================================
     LOADING SCREEN
     ======================================================= */

  if (loading) {

    return (
      <SafeAreaView
        style={styles.container}
      >
        <View
          style={styles.loadingContainer}
        >
          <View
            style={styles.logoCircle}
          >
            <Text
              style={styles.logoText}
            >
              N
            </Text>
          </View>

          <ActivityIndicator
            size="large"
            color={colors.primary}
          />

          <Text
            style={styles.loadingText}
          >
            Loading NESBA...
          </Text>
        </View>
      </SafeAreaView>
    );
  }


  /* =======================================================
     HEADER
     ======================================================= */

  const Header = () => {

    return (
      <View
        style={styles.header}
      >

        <View
          style={styles.headerLeft}
        >

          <Image accessibilityLabel="NESBA logo"
            source={require('../../assets/images/nesba-logo.png')}
            style={styles.brandMark}
          />

          <Text
            style={styles.brandName}
          >
            NESBA
          </Text>

        </View>


        <View
          style={styles.headerActions}
        >

          <Pressable
            style={styles.headerIconButton}
            onPress={() => {

              if (currentUserId) {
                openProfile(
                  currentUserId
                );
              }

            }}
          >

            {Avatar({
                uri: profilePhoto,
                name: profileName,
                size: 36,
              })}

          </Pressable>

        </View>

      </View>
    );
  };


  /* =======================================================
     SEARCH BAR
     ======================================================= */

  const SearchBar = () => {

    return (
      <View
        style={styles.searchWrapper}
      >

        <View
          style={styles.searchBar}
        >

          <Ionicons
            name="search-outline"
            size={20}
            color={
              colors.textMuted
            }
          />

          <TextInput
            value={
              searchText
            }

            onChangeText={
              setSearchText
            }

            placeholder={
              'Search courses, people and posts'
            }

            placeholderTextColor={
              colors.textMuted
            }

            style={
              styles.searchInput
            }

            returnKeyType="search"
            autoCorrect={false}
          />

          {searchText.length > 0 && (

            <Pressable accessibilityRole="button" accessibilityLabel="Clear"
              onPress={() =>
                setSearchText('')
              }
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={
                  colors.textMuted
                }
              />
            </Pressable>

          )}

        </View>


        {searchActive && (

          <View
            style={
              styles.searchResults
            }
          >

            {searchLoading ? (

              <View
                style={
                  styles.searchLoading
                }
              >
                <ActivityIndicator
                  size="small"
                  color={
                    colors.primary
                  }
                />

                <Text
                  style={
                    styles.searchLoadingText
                  }
                >
                  Searching...
                </Text>
              </View>

            ) : (

              <>

                {searchResults.courses.length >
                  0 && (

                  <View
                    style={
                      styles.searchSection
                    }
                  >

                    <Text
                      style={
                        styles.searchSectionTitle
                      }
                    >
                      Courses
                    </Text>

                    {searchResults.courses.map(
                      course => (

                        <Pressable
                          key={
                            `course-${course.id}`
                          }

                          style={
                            styles.searchResultRow
                          }

                          onPress={() => {

                            setSearchText('');

                            openCourse(
                              course
                            );

                          }}
                        >

                          <View
                            style={
                              styles.searchResultIcon
                            }
                          >
                            <Ionicons
                              name="school-outline"
                              size={20}
                              color={
                                colors.primary
                              }
                            />
                          </View>

                          <View
                            style={
                              styles.searchResultContent
                            }
                          >

                            <Text
                              style={
                                styles.searchResultTitle
                              }
                              numberOfLines={1}
                            >
                              {
                                getCourseTitle(
                                  course
                                )
                              }
                            </Text>

                            <Text
                              style={
                                styles.searchResultSubtitle
                              }
                              numberOfLines={1}
                            >
                              Course
                            </Text>

                          </View>

                          <Ionicons
                            name="chevron-forward"
                            size={18}
                            color={
                              colors.textMuted
                            }
                          />

                        </Pressable>

                      )
                    )}

                  </View>

                )}


                {searchResults.users.length >
                  0 && (

                  <View
                    style={
                      styles.searchSection
                    }
                  >

                    <Text
                      style={
                        styles.searchSectionTitle
                      }
                    >
                      People
                    </Text>

                    {searchResults.users.map(
                      user => (

                        <Pressable
                          key={
                            `user-${user.id}`
                          }

                          style={
                            styles.searchResultRow
                          }

                          onPress={() => {

                            setSearchText('');

                            openProfile(
                              user.id
                            );

                          }}
                        >

                          {Avatar({
                              uri: user.avatar_url,
                              name: user.full_name,
                              size: 38,
                            })}

                          <View
                            style={
                              styles.searchResultContent
                            }
                          >

                            <Text
                              style={
                                styles.searchResultTitle
                              }
                            >
                              {
                                user.full_name ||
                                'NESBA Member'
                              }
                            </Text>

                            <Text
                              style={
                                styles.searchResultSubtitle
                              }
                            >
                              Member
                            </Text>

                          </View>

                          <Ionicons
                            name="chevron-forward"
                            size={18}
                            color={
                              colors.textMuted
                            }
                          />

                        </Pressable>

                      )
                    )}

                  </View>

                )}


                {searchResults.posts.length >
                  0 && (

                  <View
                    style={
                      styles.searchSection
                    }
                  >

                    <Text
                      style={
                        styles.searchSectionTitle
                      }
                    >
                      Posts
                    </Text>

                    {searchResults.posts.map(
                      post => {

                        const author =
                          getPostAuthor(
                            post
                          );

                        return (
                          <Pressable
                            key={
                              `post-${post.id}`
                            }

                            style={
                              styles.searchResultRow
                            }

                            onPress={() => {

                              setSearchText('');

                            }}
                          >

                            {Avatar({
                                uri: author.avatar,
                                name: author.name,
                                size: 38,
                              })}

                            <View
                              style={
                                styles.searchResultContent
                              }
                            >

                              <Text
                                style={
                                  styles.searchResultTitle
                                }
                                numberOfLines={1}
                              >
                                {
                                  author.name
                                }
                              </Text>

                              <Text
                                style={
                                  styles.searchResultSubtitle
                                }
                                numberOfLines={2}
                              >
                                {
                                  post.content ||
                                  'Post'
                                }
                              </Text>

                            </View>

                          </Pressable>
                        );
                      }
                    )}

                  </View>

                )}


                {searchResults.courses.length === 0 &&
                  searchResults.users.length === 0 &&
                  searchResults.posts.length === 0 && (

                  <View
                    style={
                      styles.emptySearch
                    }
                  >

                    <Ionicons
                      name="search-outline"
                      size={30}
                      color={
                        colors.textMuted
                      }
                    />

                    <Text
                      style={
                        styles.emptySearchTitle
                      }
                    >
                      No results found
                    </Text>

                    <Text
                      style={
                        styles.emptySearchText
                      }
                    >
                      Try another course, person or keyword.
                    </Text>

                  </View>

                )}

              </>

            )}

          </View>

        )}

      </View>
    );
  };


  /* =======================================================
     STORY CARD
     ======================================================= */

  const StoryCard = ({
    storyGroup,
  }) => {

    const firstStory =
      storyGroup?.stories?.[0];

    const hasStory =
      Boolean(
        firstStory
      );

    return (
      <Pressable
        style={
          styles.storyCard
        }

        onPress={() => {

          if (
            hasStory
          ) {
            openStory(
              firstStory
            );
          }

        }}
      >

        <View
          style={
            styles.storyAvatarRing
          }
        >

          {Avatar({
              uri: storyGroup.avatarUrl,
              name: storyGroup.fullName,
              size: 58,
            })}

        </View>

        <Text
          style={
            styles.storyName
          }
          numberOfLines={1}
        >
          {
            storyGroup.userId ===
            currentUserId
              ? 'Your story'
              : (
                storyGroup.fullName ||
                'Member'
              )
          }
        </Text>

      </Pressable>
    );
  };


  /* =======================================================
     ADD STORY CARD
     ======================================================= */

  const AddStoryCard = () => {

    return (
      <Pressable
        style={
          styles.storyCard
        }

        onPress={() =>
          currentUser
            ? pickStoryMedia()
            : router.push('/login')
        }
      >

        <View
          style={
            styles.addStoryAvatar
          }
        >

          {Avatar({
              uri: profilePhoto,
              name: profileName,
              size: 58,
            })}

          <View
            style={
              styles.addStoryButton
            }
          >

            <Ionicons
              name="add"
              size={17}
              color={
                colors.white
              }
            />

          </View>

        </View>

        <Text
          style={
            styles.storyName
          }
        >
          Add story
        </Text>

      </Pressable>
    );
  };


  /* =======================================================
     STORIES SECTION
     ======================================================= */

  const StoriesSection = () => {

    return (
      <View
        style={
          styles.section
        }
      >

        <View
          style={
            styles.sectionHeader
          }
        >

          <Text
            style={
              styles.sectionTitle
            }
          >
            Stories
          </Text>

          <Pressable
            onPress={() =>
              currentUser
                ? pickStoryMedia()
                : router.push('/login')
            }
          >

            <Text
              style={
                styles.seeAllText
              }
            >
              Add
            </Text>

          </Pressable>

        </View>


        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }

          contentContainerStyle={
            styles.storyList
          }
        >

          {AddStoryCard()}

          {stories.map(
            storyGroup => (

              <Fragment key={`story-${storyGroup.userId}`}>
                {StoryCard({
                  storyGroup: storyGroup,
                })}
              </Fragment>

            )
          )}

        </ScrollView>

      </View>
    );
  };


  /* =======================================================
     CREATE POST BUTTON
     ======================================================= */

  const CreatePostButton = () => {

    return (
      <View
        style={
          styles.createPostCard
        }
      >

        <Pressable
          style={
            styles.createPostTop
          }

          onPress={
            openComposer
          }
        >

          {Avatar({
              uri: profilePhoto,
              name: profileName,
              size: 42,
            })}

          <View
            style={
              styles.createPostInputFake
            }
          >

            <Text
              style={
                styles.createPostPlaceholder
              }
            >
              What's on your mind?
            </Text>

          </View>

        </Pressable>


        <View
          style={
            styles.createPostActions
          }
        >

          <Pressable
            style={
              styles.createPostAction
            }

            onPress={
              pickPostImage
            }
          >

            <Ionicons
              name="image-outline"
              size={21}
              color={
                '#12B76A'
              }
            />

            <Text
              style={
                styles.createPostActionText
              }
            >
              Photo
            </Text>

          </Pressable>


          <Pressable
            style={
              styles.createPostAction
            }

            onPress={
              pickPostVideo
            }
          >

            <Ionicons
              name="videocam-outline"
              size={21}
              color={
                '#F04438'
              }
            />

            <Text
              style={
                styles.createPostActionText
              }
            >
              Video
            </Text>

          </Pressable>


          <Pressable
            style={
              styles.createPostAction
            }

            onPress={
              openComposer
            }
          >

            <Ionicons
              name="create-outline"
              size={21}
              color={
                colors.primary
              }
            />

            <Text
              style={
                styles.createPostActionText
              }
            >
              Post
            </Text>

          </Pressable>

        </View>

      </View>
    );
  };


  /* =======================================================
     POST MEDIA PREVIEW IN COMPOSER
     ======================================================= */

  const ComposerMediaPreview = () => {

    if (
      !postImage &&
      !postVideo
    ) {
      return null;
    }

    const media =
      postImage ||
      postVideo;

    const isVideo =
      Boolean(
        postVideo
      );

    return (
      <View
        style={
          styles.composerMedia
        }
      >

        <Image accessibilityLabel="Selected photo preview"
          source={{
            uri:
              media.uri,
          }}

          style={
            styles.composerMediaImage
          }

          resizeMode="cover"
        />


        <View
          style={
            styles.composerMediaBadge
          }
        >

          <Ionicons
            name={
              isVideo
                ? 'videocam'
                : 'image'
            }

            size={15}

            color={
              colors.white
            }
          />

          <Text
            style={
              styles.composerMediaBadgeText
            }
          >
            {
              isVideo
                ? 'Video'
                : 'Photo'
            }
          </Text>

        </View>


        <Pressable accessibilityRole="button" accessibilityLabel="Close"
          style={
            styles.removeMediaButton
          }

          onPress={
            isVideo
              ? removePostVideo
              : removePostImage
          }
        >

          <Ionicons
            name="close"
            size={19}
            color={
              colors.white
            }
          />

        </Pressable>

      </View>
    );
  };


  /* =======================================================
     POST EMOJI PICKER
     ======================================================= */

  const PostEmojiPicker = () => {

    if (
      !postEmojiVisible
    ) {
      return null;
    }

    return (
      <View
        style={
          styles.emojiPanel
        }
      >

        {EMOJIS.map(
          emoji => (

            <Pressable
              key={
                `post-emoji-${emoji}`
              }

              style={
                styles.emojiButton
              }

              onPress={() =>
                addPostEmoji(
                  emoji
                )
              }
            >

              <Text
                style={
                  styles.emojiText
                }
              >
                {emoji}
              </Text>

            </Pressable>

          )
        )}

      </View>
    );
  };


  /* =======================================================
     MENTION PANEL
     ======================================================= */

  const MentionPanel = () => {

    if (
      !mentionVisible
    ) {
      return null;
    }

    return (
      <View
        style={
          styles.mentionPanel
        }
      >

        <View
          style={
            styles.mentionSearchRow
          }
        >

          <Ionicons
            name="at-outline"
            size={19}
            color={
              colors.textMuted
            }
          />

          <TextInput
            value={
              mentionSearch
            }

            onChangeText={
              searchMentionUsers
            }

            placeholder={
              'Search people'
            }

            placeholderTextColor={
              colors.textMuted
            }

            style={
              styles.mentionInput
            }

            autoFocus
          />

        </View>


        {mentionUsers.map(
          user => (

            <Pressable
              key={
                `mention-${user.id}`
              }

              style={
                styles.mentionRow
              }

              onPress={() =>
                insertMention(
                  user
                )
              }
            >

              {Avatar({
                  uri: user.avatar_url,
                  name: user.full_name,
                  size: 34,
                })}

              <Text
                style={
                  styles.mentionName
                }
              >
                {
                  user.full_name ||
                  'NESBA Member'
                }
              </Text>

            </Pressable>

          )
        )}

        {mentionSearch.length > 0 &&
          mentionUsers.length === 0 && (

          <Text
            style={
              styles.noMentionText
            }
          >
            No people found
          </Text>

        )}

      </View>
    );
  };


  /* =======================================================
     CREATE POST COMPOSER
     ======================================================= */

  const PostComposer = () => {

    if (
      !composerVisible
    ) {
      return null;
    }

    return (
      <View
        style={
          styles.composerOverlay
        }
      >

        <KeyboardAvoidingView
          behavior={
            Platform.OS ===
            'ios'
              ? 'padding'
              : undefined
          }

          style={
            styles.composerKeyboard
          }
        >

          <View
            style={
              styles.composerCard
            }
          >

            <View
              style={
                styles.composerHeader
              }
            >

              <Text
                style={
                  styles.composerTitle
                }
              >
                Create Post
              </Text>

              <Pressable accessibilityRole="button" accessibilityLabel="Clear"
                onPress={
                  closeComposer
                }

                disabled={
                  creatingPost
                }
              >

                <Ionicons
                  name="close-circle"
                  size={28}
                  color={
                    colors.textMuted
                  }
                />

              </Pressable>

            </View>


            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={
                false
              }
            >

              <View
                style={
                  styles.composerAuthor
                }
              >

                {Avatar({
                    uri: profilePhoto,
                    name: profileName,
                    size: 44,
                  })}

                <View>
                  <Text
                    style={
                      styles.composerAuthorName
                    }
                  >
                    {
                      profileName
                    }
                  </Text>

                  <Text
                    style={
                      styles.composerPrivacy
                    }
                  >
                    Public
                  </Text>
                </View>

              </View>


              <TextInput
                value={
                  postText
                }

                onChangeText={
                  setPostText
                }

                placeholder={
                  "What's on your mind?"
                }

                placeholderTextColor={
                  colors.textMuted
                }

                multiline

                textAlignVertical="top"

                style={
                  styles.composerTextInput
                }

                autoFocus
              />


              {ComposerMediaPreview()}


              {postLink.length > 0 && (

                <View
                  style={
                    styles.linkPreview
                  }
                >

                  <Ionicons
                    name="link-outline"
                    size={20}
                    color={
                      colors.primary
                    }
                  />

                  <Text
                    style={
                      styles.linkPreviewText
                    }
                    numberOfLines={2}
                  >
                    {
                      postLink
                    }
                  </Text>

                  <Pressable accessibilityRole="button" accessibilityLabel="Close"
                    onPress={() =>
                      setPostLink('')
                    }
                  >

                    <Ionicons
                      name="close"
                      size={18}
                      color={
                        colors.textMuted
                      }
                    />

                  </Pressable>

                </View>

              )}


              {PostEmojiPicker()}

              {MentionPanel()}


              <View
                style={
                  styles.composerTools
                }
              >

                <Text
                  style={
                    styles.composerToolsTitle
                  }
                >
                  Add to your post
                </Text>


                <View
                  style={
                    styles.composerToolGrid
                  }
                >

                  <Pressable
                    style={
                      styles.composerTool
                    }

                    onPress={
                      pickPostImage
                    }
                  >

                    <View
                      style={
                        styles.composerToolIcon
                      }
                    >

                      <Ionicons
                        name="image"
                        size={21}
                        color={
                          '#12B76A'
                        }
                      />

                    </View>

                    <Text
                      style={
                        styles.composerToolText
                      }
                    >
                      Photo
                    </Text>

                  </Pressable>


                  <Pressable
                    style={
                      styles.composerTool
                    }

                    onPress={
                      pickPostVideo
                    }
                  >

                    <View
                      style={
                        styles.composerToolIcon
                      }
                    >

                      <Ionicons
                        name="videocam"
                        size={21}
                        color={
                          '#F04438'
                        }
                      />

                    </View>

                    <Text
                      style={
                        styles.composerToolText
                      }
                    >
                      Video
                    </Text>

                  </Pressable>


                  <Pressable
                    style={
                      styles.composerTool
                    }

                    onPress={() =>
                      setPostEmojiVisible(
                        previous =>
                          !previous
                      )
                    }
                  >

                    <View
                      style={
                        styles.composerToolIcon
                      }
                    >

                      <Ionicons
                        name="happy"
                        size={21}
                        color={
                          '#F79009'
                        }
                      />

                    </View>

                    <Text
                      style={
                        styles.composerToolText
                      }
                    >
                      Feeling
                    </Text>

                  </Pressable>


                  <Pressable
                    style={
                      styles.composerTool
                    }

                    onPress={() => {

                      setMentionVisible(
                        previous =>
                          !previous
                      );

                      setMentionSearch(
                        ''
                      );

                      setMentionUsers(
                        []
                      );

                    }}
                  >

                    <View
                      style={
                        styles.composerToolIcon
                      }
                    >

                      <Ionicons
                        name="at"
                        size={21}
                        color={
                          colors.primary
                        }
                      />

                    </View>

                    <Text
                      style={
                        styles.composerToolText
                      }
                    >
                      Mention
                    </Text>

                  </Pressable>


                  <Pressable
                    style={
                      styles.composerTool
                    }

                    onPress={() => {

                      Alert.prompt(
                        'Add link',
                        'Enter a URL',
                        value => {

                          if (
                            value
                          ) {
                            setPostLink(
                              value.trim()
                            );
                          }

                        }
                      );

                    }}
                  >

                    <View
                      style={
                        styles.composerToolIcon
                      }
                    >

                      <Ionicons
                        name="link"
                        size={21}
                        color={
                          '#7F56D9'
                        }
                      />

                    </View>

                    <Text
                      style={
                        styles.composerToolText
                      }
                    >
                      Link
                    </Text>

                  </Pressable>

                </View>

              </View>


              <Pressable
                style={[
                  styles.publishButton,

                  creatingPost &&
                  styles.publishButtonDisabled,
                ]}

                onPress={
                  createPost
                }

                disabled={
                  creatingPost
                }
              >

                {creatingPost ? (

                  <View style={styles.progressRow}>
                    <ActivityIndicator
                      size="small"
                      color={
                        colors.white
                      }
                    />
                    <Text
                      style={
                        styles.publishButtonText
                      }
                    >
                      {uploadProgress === null
                        ? 'Posting…'
                        : `Uploading ${Math.round(uploadProgress * 100)}%`}
                    </Text>
                  </View>

                ) : (

                  <Text
                    style={
                      styles.publishButtonText
                    }
                  >
                    Post
                  </Text>

                )}

              </Pressable>

            </ScrollView>

          </View>

        </KeyboardAvoidingView>

      </View>
    );
  };


  /* =======================================================
     PART 4 ENDS HERE
     ======================================================= */
       /* =======================================================
     STORY EDITOR
     ======================================================= */

  const StoryEditor = () => {

    if (
      !storyEditorVisible ||
      !storyDraft
    ) {
      return null;
    }


    const isVideo =
      storyDraft.type ===
      'video';


    return (
      <View
        style={
          styles.storyEditorOverlay
        }
      >

        <SafeAreaView
          style={
            styles.storyEditorSafe
          }
        >

          {/* =================================================
              TOP BAR
          ================================================= */}

          <View
            style={
              styles.storyEditorHeader
            }
          >

            <Pressable accessibilityRole="button" accessibilityLabel="Close"
              style={
                styles.storyHeaderButton
              }

              onPress={
                closeStoryEditor
              }

              disabled={
                storyUploading
              }
            >

              <Ionicons
                name="close"
                size={27}
                color={
                  colors.white
                }
              />

            </Pressable>


            <Text
              style={
                styles.storyEditorTitle
              }
            >
              Edit Story
            </Text>


            <Pressable accessibilityRole="button" accessibilityLabel="Done"
              style={
                styles.storyHeaderButton
              }

              onPress={
                publishStory
              }

              disabled={
                storyUploading
              }
            >

              {storyUploading ? (

                <ActivityIndicator
                  size="small"
                  color={
                    colors.white
                  }
                />

              ) : (

                <Ionicons
                  name="checkmark"
                  size={29}
                  color={
                    colors.white
                  }
                />

              )}

            </Pressable>

          </View>


          {/* =================================================
              STORY PREVIEW
          ================================================= */}

          <View
            style={
              styles.storyPreviewContainer
            }
          >

            <View
              style={
                styles.storyPreview
              }
            >

              {isVideo ? (

                <Video
                  source={{
                    uri:
                      storyDraft.uri,
                  }}

                  style={[
                    styles.storyPreviewImage,
                    filterMediaStyle(
                      storyFilter
                    ),
                  ]}

                  resizeMode={
                    ResizeMode.COVER
                  }

                  shouldPlay

                  isLooping

                  // The chosen song replaces the clip's own sound.
                  isMuted={
                    !!storyAudio
                  }
                />

              ) : (

                <Image accessibilityLabel="Selected photo preview"
                  source={{
                    uri:
                      storyDraft.uri,
                  }}

                  style={[
                    styles.storyPreviewImage,
                    filterMediaStyle(
                      storyFilter
                    ),
                  ]}

                  resizeMode="cover"
                />

              )}


              {/* =============================================
                  FILTER OVERLAY
              ============================================= */}

              <View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFillObject,

                  filterTintStyle(
                    storyFilter
                  ),
                ]}
              />


              {/* =============================================
                  STORY TEXT
              ============================================= */}

              {storyText.length > 0 && (

                <View
                  style={
                    styles.storyTextOverlay
                  }
                >

                  <Text
                    style={
                      styles.storyOverlayText
                    }
                  >
                    {
                      storyText
                    }
                  </Text>

                </View>

              )}


              {/* =============================================
                  LOCATION
              ============================================= */}

              {storyLocation.length > 0 && (

                <View
                  style={
                    styles.storyLocationOverlay
                  }
                >

                  <Ionicons
                    name="location"
                    size={16}
                    color={
                      colors.white
                    }
                  />

                  <Text
                    style={
                      styles.storyLocationText
                    }
                  >
                    {
                      storyLocation
                    }
                  </Text>

                </View>

              )}


              {/* =============================================
                  AUDIO INDICATOR
              ============================================= */}

              {storyAudio && (

                <View
                  style={
                    styles.storyAudioOverlay
                  }
                >

                  <Ionicons
                    name="musical-notes"
                    size={16}
                    color={
                      colors.white
                    }
                  />

                  <Text
                    style={
                      styles.storyAudioText
                    }
                    numberOfLines={1}
                  >
                    {
                      storyAudio.name ||
                      'Audio'
                    }
                  </Text>

                </View>

              )}


              {/* =============================================
                  VIDEO INDICATOR
              ============================================= */}


            </View>

          </View>


          {/* =================================================
              STORY TOOLBAR
          ================================================= */}

          <View
            style={
              styles.storyToolsContainer
            }
          >

            <ScrollView
              showsVerticalScrollIndicator={
                false
              }

              contentContainerStyle={
                styles.storyToolsContent
              }
            >

              {/* =============================================
                  TEXT
              ============================================= */}

              <View
                style={
                  styles.storyToolSection
                }
              >

                <View
                  style={
                    styles.storyToolSectionHeader
                  }
                >

                  <Ionicons
                    name="text-outline"
                    size={20}
                    color={
                      colors.white
                    }
                  />

                  <Text
                    style={
                      styles.storyToolSectionTitle
                    }
                  >
                    Text
                  </Text>

                </View>


                <TextInput
                  value={
                    storyText
                  }

                  onChangeText={
                    updateStoryText
                  }

                  placeholder={
                    'Add text to your story'
                  }

                  placeholderTextColor={
                    'rgba(255,255,255,0.55)'
                  }

                  multiline

                  style={
                    styles.storyTextInput
                  }

                  maxLength={
                    250
                  }
                />

              </View>


              {/* =============================================
                  FILTERS
              ============================================= */}

              <View
                style={
                  styles.storyToolSection
                }
              >

                <View
                  style={
                    styles.storyToolSectionHeader
                  }
                >

                  <Ionicons
                    name="color-filter-outline"
                    size={20}
                    color={
                      colors.white
                    }
                  />

                  <Text
                    style={
                      styles.storyToolSectionTitle
                    }
                  >
                    Filters
                  </Text>

                </View>


                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={
                    false
                  }
                >

                  {STORY_FILTERS.map(
                    filter => {

                      const selected =
                        storyFilter ===
                        filter.id;

                      return (
                        <Pressable
                          key={
                            filter.id
                          }

                          style={[
                            styles.filterButton,

                            selected &&
                            styles.filterButtonSelected,
                          ]}

                          onPress={() =>
                            updateStoryFilter(
                              filter.id
                            )
                          }
                        >

                          <View
                            style={
                              styles.filterPreview
                            }
                          >

                            {isVideo ? (
                              <View
                                style={[
                                  styles.filterPreviewImage,
                                  styles.filterVideoSwatch,
                                ]}
                              />
                            ) : (
                              <Image accessibilityLabel="Selected photo preview"
                                source={{
                                  uri:
                                    storyDraft.uri,
                                }}

                                style={[
                                  styles.filterPreviewImage,
                                  filterMediaStyle(
                                    filter.id
                                  ),
                                ]}

                                resizeMode="cover"
                              />
                            )}

                            <View
                              pointerEvents="none"
                              style={[
                                StyleSheet.absoluteFillObject,
                                filterTintStyle(
                                  filter.id
                                ),
                              ]}
                            />

                          </View>


                          <Text
                            style={[
                              styles.filterButtonText,

                              selected &&
                              styles.filterButtonTextSelected,
                            ]}
                          >
                            {
                              filter.label
                            }
                          </Text>

                        </Pressable>
                      );
                    }
                  )}

                </ScrollView>

              </View>


              {/* =============================================
                  LOCATION
              ============================================= */}

              <View
                style={
                  styles.storyToolSection
                }
              >

                <View
                  style={
                    styles.storyToolSectionHeader
                  }
                >

                  <Ionicons
                    name="location-outline"
                    size={20}
                    color={
                      colors.white
                    }
                  />

                  <Text
                    style={
                      styles.storyToolSectionTitle
                    }
                  >
                    Location
                  </Text>

                </View>


                <View
                  style={
                    styles.storyInputRow
                  }
                >

                  <Ionicons
                    name="location-outline"
                    size={19}
                    color={
                      colors.textMuted
                    }
                  />

                  <TextInput
                    value={
                      storyLocation
                    }

                    onChangeText={
                      updateStoryLocation
                    }

                    placeholder={
                      'Add a location'
                    }

                    placeholderTextColor={
                      colors.textMuted
                    }

                    style={
                      styles.storyLocationInput
                    }
                  />

                </View>

                <Pressable
                  style={
                    styles.useLocationButton
                  }

                  onPress={
                    fillStoryLocation
                  }

                  disabled={
                    locating
                  }
                >

                  {locating ? (
                    <ActivityIndicator
                      size="small"
                      color={
                        colors.primary
                      }
                    />
                  ) : (
                    <Ionicons
                      name="navigate"
                      size={17}
                      color={
                        colors.primary
                      }
                    />
                  )}

                  <Text
                    style={
                      styles.useLocationText
                    }
                  >
                    {locating
                      ? 'Finding your location…'
                      : 'Use my current location'}
                  </Text>

                </Pressable>

              </View>


              {/* =============================================
                  AUDIO
              ============================================= */}

              <View
                style={
                  styles.storyToolSection
                }
              >

                <View
                  style={
                    styles.storyToolSectionHeader
                  }
                >

                  <Ionicons
                    name="musical-notes-outline"
                    size={20}
                    color={
                      colors.white
                    }
                  />

                  <Text
                    style={
                      styles.storyToolSectionTitle
                    }
                  >
                    Audio
                  </Text>

                </View>


                {storyAudio ? (

                  <View
                    style={
                      styles.selectedAudio
                    }
                  >

                    <View
                      style={
                        styles.selectedAudioIcon
                      }
                    >

                      <Ionicons
                        name="musical-notes"
                        size={20}
                        color={
                          colors.primary
                        }
                      />

                    </View>


                    <View
                      style={
                        styles.selectedAudioInfo
                      }
                    >

                      <Text
                        style={
                          styles.selectedAudioName
                        }

                        numberOfLines={
                          1
                        }
                      >
                        {
                          storyAudio.name ||
                          'Selected audio'
                        }
                      </Text>

                      <Text
                        style={
                          styles.selectedAudioSubtitle
                        }
                      >
                        {storyAudioPlaying
                          ? `Playing · first ${STORY_MAX_SECONDS} sec`
                          : 'Paused'}
                      </Text>

                    </View>


                    <Pressable accessibilityRole="button" accessibilityLabel={storyAudioPlaying ? "Pause audio" : "Play audio"}
                      onPress={
                        toggleStoryAudio
                      }
                      style={
                        styles.audioPlayButton
                      }
                    >
                      <Ionicons
                        name={
                          storyAudioPlaying
                            ? 'pause-circle'
                            : 'play-circle'
                        }
                        size={30}
                        color={
                          colors.primary
                        }
                      />
                    </Pressable>


                    <Pressable accessibilityRole="button" accessibilityLabel="Clear"
                      onPress={() =>
                        setStoryAudio(
                          null
                        )
                      }
                    >

                      <Ionicons
                        name="close-circle"
                        size={23}
                        color={
                          colors.textMuted
                        }
                      />

                    </Pressable>

                  </View>

                ) : (

                  <Pressable
                    style={
                      styles.addAudioButton
                    }

                    onPress={
                      pickStoryAudio
                    }
                  >

                    <Ionicons
                      name="musical-notes"
                      size={22}
                      color={
                        colors.primary
                      }
                    />

                    <Text
                      style={
                        styles.addAudioButtonText
                      }
                    >
                      Add audio
                    </Text>

                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={
                        colors.textMuted
                      }
                    />

                  </Pressable>

                )}

              </View>


              {/* =============================================
                  STORY INFO
              ============================================= */}

              <View
                style={
                  styles.storyInfoBox
                }
              >

                <Ionicons
                  name="information-circle-outline"
                  size={19}
                  color={
                    colors.textMuted
                  }
                />

                <Text
                  style={
                    styles.storyInfoText
                  }
                >
                  Stories disappear automatically after 24 hours.
                </Text>

              </View>


              {/* =============================================
                  PUBLISH BUTTON
              ============================================= */}

              <Pressable
                style={[
                  styles.storyPublishButton,

                  storyUploading &&
                  styles.publishButtonDisabled,
                ]}

                onPress={
                  publishStory
                }

                disabled={
                  storyUploading
                }
              >

                {storyUploading ? (

                  <>
                    <ActivityIndicator
                      size="small"
                      color={
                        colors.white
                      }
                    />
                    <Text
                      style={
                        styles.storyPublishButtonText
                      }
                    >
                      {uploadProgress === null
                        ? 'Sharing…'
                        : `Uploading ${Math.round(uploadProgress * 100)}%`}
                    </Text>
                  </>

                ) : (

                  <>
                    <Ionicons
                      name="send"
                      size={19}
                      color={
                        colors.white
                      }
                    />

                    <Text
                      style={
                        styles.storyPublishButtonText
                      }
                    >
                      Share Story
                    </Text>
                  </>

                )}

              </Pressable>

            </ScrollView>

          </View>

        </SafeAreaView>

      </View>
    );
  };


  /* =======================================================
     PART 5 ENDS HERE
     ======================================================= */
       /* =======================================================
     TRENDING COURSES
     ======================================================= */

  const LiveNowSection = () => {

    if (liveNow.length === 0) {
      return null;
    }

    return (
      <View style={styles.section}>

        <View style={styles.sectionHeader}>
          <View>
            <View style={styles.liveTitleRow}>
              <View style={styles.liveDot} />
              <Text style={styles.sectionTitle}>
                Live Now
              </Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              Join a session happening right now
            </Text>
          </View>

          <Pressable onPress={() => router.push('/live')}>
            <Text style={styles.seeAllText}>
              See all
            </Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.liveList}
        >
          {liveNow.map(event => (
            <Pressable
              key={event.id}
              style={styles.liveCard}
              onPress={() => {
                if (!currentUser) {
                  router.push('/login');
                } else if (event.liveRoom) {
                  router.push(`/live/${event.liveRoom.id}`);
                } else {
                  router.push('/live');
                }
              }}
            >
              <View style={styles.liveBadge}>
                <View style={styles.liveBadgeDot} />
                <Text style={styles.liveBadgeText}>LIVE</Text>
              </View>

              <Text style={styles.liveCardTitle} numberOfLines={2}>
                {event.title || 'Live session'}
              </Text>

              <View style={styles.liveHostRow}>
                {Avatar({
                  uri: event.host?.avatar_url,
                  name: event.host?.full_name,
                  size: 24,
                })}
                <Text style={styles.liveHostName} numberOfLines={1}>
                  {event.organizations?.name || event.host?.full_name || 'NESBA host'}
                </Text>
              </View>

              <View style={styles.liveJoinButton}>
                <Ionicons name="radio" size={15} color={colors.white} />
                <Text style={styles.liveJoinText}>Join</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>

      </View>
    );
  };


  const TrendingCourses = () => {

    return (
      <View
        style={styles.section}
      >

        <View
          style={styles.sectionHeader}
        >

          <View>

            <Text
              style={styles.sectionTitle}
            >
              Trending Courses
            </Text>

            <Text
              style={styles.sectionSubtitle}
            >
              Learn what people are exploring
            </Text>

          </View>

          <Pressable
            onPress={() => {

              router.push(
                '/courses'
              );

            }}
          >

            <Text
              style={styles.seeAllText}
            >
              See all
            </Text>

          </Pressable>

        </View>


        {trendingCourses.length === 0 ? (

          <View
            style={styles.emptyCard}
          >

            <Ionicons
              name="school-outline"
              size={32}
              color={colors.textMuted}
            />

            <Text
              style={styles.emptyCardTitle}
            >
              No courses yet
            </Text>

            <Text
              style={styles.emptyCardText}
            >
              Courses will appear here when they are published.
            </Text>

          </View>

        ) : (

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={
              styles.courseList
            }
          >

            {trendingCourses.map(
              course => (

                <Pressable
                  key={
                    `trending-course-${course.id}`
                  }

                  style={
                    styles.courseCard
                  }

                  onPress={() =>
                    openCourse(
                      course
                    )
                  }
                >

                  <View
                    style={
                      styles.courseImageContainer
                    }
                  >

                    {course.thumbnail_url ||
                    course.cover_url ||
                    course.image_url ? (

                      <Image accessibilityLabel={course?.title || "Course image"}
                        source={{
                          uri:
                            course.thumbnail_url ||
                            course.cover_url ||
                            course.image_url,
                        }}

                        style={
                          styles.courseImage
                        }

                        resizeMode="cover"
                      />

                    ) : (

                      <View
                        style={
                          styles.coursePlaceholder
                        }
                      >

                        <Ionicons
                          name="school"
                          size={32}
                          color={
                            colors.primary
                          }
                        />

                      </View>

                    )}


                    <View
                      style={
                        styles.trendingBadge
                      }
                    >

                      <Ionicons
                        name="trending-up"
                        size={13}
                        color={
                          colors.white
                        }
                      />

                      <Text
                        style={
                          styles.trendingBadgeText
                        }
                      >
                        Trending
                      </Text>

                    </View>

                  </View>


                  <View
                    style={
                      styles.courseContent
                    }
                  >

                    <Text
                      style={
                        styles.courseTitle
                      }

                      numberOfLines={2}
                    >
                      {
                        getCourseTitle(
                          course
                        )
                      }
                    </Text>


                    <Text
                      style={
                        styles.courseDescription
                      }

                      numberOfLines={2}
                    >
                      {
                        getCourseDescription(
                          course
                        )
                      }
                    </Text>


                    <View
                      style={
                        styles.courseMeta
                      }
                    >

                      <Ionicons
                        name="people-outline"
                        size={15}
                        color={
                          colors.textMuted
                        }
                      />

                      <Text
                        style={
                          styles.courseMetaText
                        }
                      >
                        {course.students_count ||
                         course.enrollment_count ||
                         0}{' '}
                        learners
                      </Text>

                    </View>

                  </View>

                </Pressable>

              )
            )}

          </ScrollView>

        )}

      </View>
    );
  };


  /* =======================================================
     POST HEADER
     ======================================================= */

  const PostHeader = ({
    post,
  }) => {

    const author =
      getPostAuthor(
        post
      );

    const isOwnPost =
      String(
        author.id
      ) ===
      String(
        currentUserId
      );


    return (
      <View
        style={
          styles.postHeader
        }
      >

        <Pressable
          style={
            styles.postAuthorButton
          }

          onPress={() => {

            if (
              author.id
            ) {
              openProfile(
                author.id
              );
            }

          }}
        >

          {Avatar({
              uri: author.avatar,
              name: author.name,
              size: 45,
            })}

          <View
            style={
              styles.postAuthorInfo
            }
          >

            <Text
              style={
                styles.postAuthorName
              }

              numberOfLines={1}
            >
              {
                author.name
              }
            </Text>

            <Text
              style={
                styles.postTime
              }
            >
              {
                getPostTime(
                  post
                )
              }
            </Text>

          </View>

        </Pressable>


        <Pressable accessibilityRole="button" accessibilityLabel="More options"
          style={
            styles.postMoreButton
          }

          onPress={() => {

            const options = [
              {
                text:
                  'Cancel',

                style:
                  'cancel',
              },
            ];


            if (
              isOwnPost
            ) {

              options.push({
                text:
                  'Delete post',

                style:
                  'destructive',

                onPress:
                  () =>
                    deletePost(
                      post
                    ),
              });

            } else {

              options.push({
                text:
                  'Report post',

                onPress:
                  () => {

                    Alert.alert(
                      'Report',
                      'Thank you. This report option will be connected to moderation.'
                    );

                  },
              });

            }


            Alert.alert(
              'Post options',
              undefined,
              options
            );

          }}
        >

          <Ionicons
            name="ellipsis-horizontal"
            size={22}
            color={
              colors.textSecondary
            }
          />

        </Pressable>

      </View>
    );
  };


  /* =======================================================
     POST BODY
     ======================================================= */

  const PostBody = ({
    post,
  }) => {

    return (
      <View
        style={
          styles.postBody
        }
      >

        {!!post.content && (

          <Text
            style={
              styles.postText
            }
          >
            {
              post.content
            }
          </Text>

        )}


        {!!post.link_url && (

          <Pressable
            style={
              styles.postLinkCard
            }

            onPress={() =>
              Linking.openURL(
                post.link_url
              )
            }
          >

            <View
              style={
                styles.postLinkIcon
              }
            >

              <Ionicons
                name="link"
                size={22}
                color={
                  colors.primary
                }
              />

            </View>

            <View
              style={
                styles.postLinkContent
              }
            >

              <Text
                style={
                  styles.postLinkTitle
                }
              >
                Shared link
              </Text>

              <Text
                style={
                  styles.postLinkUrl
                }

                numberOfLines={2}
              >
                {
                  post.link_url
                }
              </Text>

            </View>

            <Ionicons
              name="open-outline"
              size={19}
              color={
                colors.textMuted
              }
            />

          </Pressable>

        )}


        {!!post.image_url && (

          <Image accessibilityLabel="Photo in post"
            source={{
              uri:
                post.image_url,
            }}

            style={
              styles.postImage
            }

            resizeMode="cover"
          />

        )}


        {!!post.video_url && (

          <View
            style={
              styles.postVideoContainer
            }
          >

            <View
              style={
                styles.postVideoPlaceholder
              }
            >

              <Ionicons
                name="play-circle"
                size={58}
                color={
                  colors.white
                }
              />

              <Text
                style={
                  styles.postVideoText
                }
              >
                Video
              </Text>

            </View>

          </View>

        )}

      </View>
    );
  };


  /* =======================================================
     COMMENT ITEM
     ======================================================= */

  const CommentItem = ({
    comment,
    postId,
    isReply = false,
  }) => {

    const author =
      comment?.profiles ||
      comment?.profile ||
      {};

    const authorName =
      author.full_name ||
      'NESBA Member';

    const authorAvatar =
      author.avatar_url ||
      null;


    return (
      <View
        style={[
          styles.commentItem,

          isReply &&
          styles.replyItem,
        ]}
      >

        {Avatar({
            uri: authorAvatar,
            name: authorName,
            size: isReply
              ? 30
              : 36,
          })}


        <View
          style={
            styles.commentContent
          }
        >

          <View
            style={
              styles.commentBubble
            }
          >

            <Text
              style={
                styles.commentAuthor
              }
            >
              {
                authorName
              }
            </Text>


            {!!comment.content && (

              <Text
                style={
                  styles.commentText
                }
              >
                {
                  comment.content
                }
              </Text>

            )}


            {!!comment.media_url && (

              <Image accessibilityLabel="Photo in comment"
                source={{
                  uri:
                    comment.media_url,
                }}

                style={
                  styles.commentMedia
                }

                resizeMode="cover"
              />

            )}

          </View>


          <View
            style={
              styles.commentActions
            }
          >

            <Text
              style={
                styles.commentTime
              }
            >
              {
                formatTime(
                  comment.created_at
                )
              }
            </Text>


            {!isReply && (

              <Pressable
                onPress={() =>
                  startReply(
                    postId,
                    comment
                  )
                }
              >

                <Text
                  style={
                    styles.commentActionText
                  }
                >
                  Reply
                </Text>

              </Pressable>

            )}

          </View>

        </View>

      </View>
    );
  };


  /* =======================================================
     COMMENTS SECTION
     ======================================================= */

  const CommentsSection = ({
    post,
  }) => {

    const postId =
      post.id;

    const postComments =
      getPostComments(
        postId
      );


    const topLevelComments =
      postComments.filter(
        comment =>
          !comment.parent_id
      );


    const replies =
      postComments.filter(
        comment =>
          Boolean(
            comment.parent_id
          )
      );


    const activeReply =
      replyTarget[
        postId
      ];


    const activeCommentMedia =
      commentMedia[
        postId
      ];


    return (
      <View
        style={
          styles.commentsContainer
        }
      >

        {postComments.length === 0 ? (

          <View
            style={
              styles.noComments
            }
          >

            <Ionicons
              name="chatbubble-outline"
              size={25}
              color={
                colors.textMuted
              }
            />

            <Text
              style={
                styles.noCommentsText
              }
            >
              Be the first to comment
            </Text>

          </View>

        ) : (

          <View>

            {topLevelComments.map(
              comment => (

                <View
                  key={
                    `comment-${comment.id}`
                  }
                >

                  {CommentItem({
                      comment: comment,
                      postId: postId,
                    })}


                  {replies
                    .filter(
                      reply =>
                        String(
                          reply.parent_id
                        ) ===
                        String(
                          comment.id
                        )
                    )
                    .map(
                      reply => (

                        <Fragment key={`reply-${reply.id}`}>
                          {CommentItem({
                            comment: reply,
                            postId: postId,
                            isReply: true,
                          })}
                        </Fragment>

                      )
                    )}

                </View>

              )
            )}

          </View>

        )}


        {/* =================================================
            REPLY INDICATOR
        ================================================= */}

        {activeReply && (

          <View
            style={
              styles.replyIndicator
            }
          >

            <View>

              <Text
                style={
                  styles.replyIndicatorTitle
                }
              >
                Replying to
              </Text>

              <Text
                style={
                  styles.replyIndicatorText
                }

                numberOfLines={1}
              >
                {
                  activeReply.profiles
                    ?.full_name ||
                  'comment'
                }
              </Text>

            </View>


            <Pressable accessibilityRole="button" accessibilityLabel="Clear"
              onPress={() =>
                cancelReply(
                  postId
                )
              }
            >

              <Ionicons
                name="close-circle"
                size={21}
                color={
                  colors.textMuted
                }
              />

            </Pressable>

          </View>

        )}


        {/* =================================================
            COMMENT MEDIA PREVIEW
        ================================================= */}

        {activeCommentMedia && (

          <View
            style={
              styles.commentAttachmentPreview
            }
          >

            <Image accessibilityLabel="Selected photo preview"
              source={{
                uri:
                  activeCommentMedia.uri,
              }}

              style={
                styles.commentAttachmentImage
              }

              resizeMode="cover"
            />

            <Pressable accessibilityRole="button" accessibilityLabel="Close"
              style={
                styles.commentAttachmentRemove
              }

              onPress={() =>
                removeCommentMedia(
                  postId
                )
              }
            >

              <Ionicons
                name="close"
                size={17}
                color={
                  colors.white
                }
              />

            </Pressable>

          </View>

        )}


        {/* =================================================
            COMMENT EMOJIS
        ================================================= */}

        {commentEmojiVisible[
          postId
        ] && (

          <View
            style={
              styles.commentEmojiPanel
            }
          >

            {EMOJIS.map(
              emoji => (

                <Pressable
                  key={
                    `comment-emoji-${postId}-${emoji}`
                  }

                  style={
                    styles.commentEmojiButton
                  }

                  onPress={() =>
                    addCommentEmoji(
                      postId,
                      emoji
                    )
                  }
                >

                  <Text
                    style={
                      styles.commentEmojiText
                    }
                  >
                    {emoji}
                  </Text>

                </Pressable>

              )
            )}

          </View>

        )}


        {/* =================================================
            COMMENT INPUT
        ================================================= */}

        <View
          style={
            styles.commentInputContainer
          }
        >

          {Avatar({
              uri: profilePhoto,
              name: profileName,
              size: 34,
            })}


          <View
            style={
              styles.commentInputBox
            }
          >

            <TextInput
              value={
                commentText[
                  postId
                ] || ''
              }

              onChangeText={
                value =>
                  updateCommentText(
                    postId,
                    value
                  )
              }

              placeholder={
                activeReply
                  ? 'Write a reply...'
                  : 'Write a comment...'
              }

              placeholderTextColor={
                colors.textMuted
              }

              style={
                styles.commentInput
              }

              multiline
            />


            <View
              style={
                styles.commentTools
              }
            >

              <Pressable accessibilityRole="button" accessibilityLabel="Add emoji"
                onPress={() =>
                  setCommentEmojiVisible(
                    previous => ({
                      ...previous,

                      [postId]:
                        !previous[
                          postId
                        ],
                    })
                  )
                }
              >

                <Ionicons
                  name="happy-outline"
                  size={20}
                  color={
                    colors.textSecondary
                  }
                />

              </Pressable>


              <Pressable accessibilityRole="button" accessibilityLabel="Add photo"
                onPress={() =>
                  pickCommentMedia(
                    postId
                  )
                }
              >

                <Ionicons
                  name="image-outline"
                  size={20}
                  color={
                    colors.textSecondary
                  }
                />

              </Pressable>


              <Pressable accessibilityRole="button" accessibilityLabel="Send"
                onPress={() =>
                  submitComment(
                    post
                  )
                }

                disabled={
                  !(
                    (
                      commentText[
                        postId
                      ] || ''
                    ).trim() ||
                    activeCommentMedia
                  )
                }
              >

                <Ionicons
                  name="send"
                  size={20}
                  color={
                    (
                      (
                        commentText[
                          postId
                        ] || ''
                      ).trim() ||
                      activeCommentMedia
                    )
                      ? colors.primary
                      : colors.textMuted
                  }
                />

              </Pressable>

            </View>

          </View>

        </View>

      </View>
    );
  };


  /* =======================================================
     POST ACTION BAR
     ======================================================= */

  const PostActions = ({
    post,
  }) => {

    const postId =
      post.id;

    const isLiked =
      Boolean(
        likedPosts[
          postId
        ]
      );

    const likeCount =
      getPostLikeCount(
        post
      );

    const commentCount =
      getCommentCount(
        postId
      );

    const showingComments =
      Boolean(
        commentsVisible[
          postId
        ]
      );


    return (
      <View>

        <View
          style={
            styles.postStats
          }
        >

          <View
            style={
              styles.postStatsLeft
            }
          >

            {likeCount > 0 && (

              <View
                style={
                  styles.likeCount
                }
              >

                <View
                  style={
                    styles.likeCircle
                  }
                >

                  <Ionicons
                    name="heart"
                    size={11}
                    color={
                      colors.white
                    }
                  />

                </View>

                <Text
                  style={
                    styles.postStatsText
                  }
                >
                  {
                    likeCount
                  }
                </Text>

              </View>

            )}

          </View>


          <Text
            style={
              styles.postStatsText
            }
          >
            {commentCount}{' '}
            {commentCount === 1
              ? 'comment'
              : 'comments'}
          </Text>

        </View>


        <View
          style={
            styles.postActionBar
          }
        >

          <Pressable
            style={
              styles.postAction
            }

            onPress={() =>
              handlePostLike(
                post
              )
            }
          >

            <Ionicons
              name={
                isLiked
                  ? 'heart'
                  : 'heart-outline'
              }

              size={21}

              color={
                isLiked
                  ? colors.danger
                  : colors.textSecondary
              }
            />

            <Text
              style={[
                styles.postActionText,

                isLiked &&
                styles.postActionTextLiked,
              ]}
            >
              Like
            </Text>

          </Pressable>


          <Pressable
            style={
              styles.postAction
            }

            onPress={() =>
              toggleComments(
                post
              )
            }
          >

            <Ionicons
              name={
                showingComments
                  ? 'chatbubble'
                  : 'chatbubble-outline'
              }

              size={20}

              color={
                colors.textSecondary
              }
            />

            <Text
              style={
                styles.postActionText
              }
            >
              Comment
            </Text>

          </Pressable>


          <Pressable
            style={
              styles.postAction
            }

            onPress={() =>
              handleSharePost(
                post
              )
            }
          >

            <Ionicons
              name="share-outline"
              size={21}
              color={
                colors.textSecondary
              }
            />

            <Text
              style={
                styles.postActionText
              }
            >
              Share
            </Text>

          </Pressable>

        </View>


        {showingComments && (

          CommentsSection({
              post: post,
            })

        )}

      </View>
    );
  };


  /* =======================================================
     POST CARD
     ======================================================= */

  const PostCard = ({
    post,
  }) => {

    if (!post) {
      return null;
    }


    return (
      <View
        style={
          styles.postCard
        }
      >

        {PostHeader({
            post: post,
          })}

        {PostBody({
            post: post,
          })}

        {PostActions({
            post: post,
          })}

      </View>
    );
  };


  /* =======================================================
     LATEST POSTS
     ======================================================= */

  const LatestPosts = () => {

    return (
      <View
        style={
          styles.section
        }
      >

        <View
          style={
            styles.sectionHeader
          }
        >

          <View>

            <Text
              style={
                styles.sectionTitle
              }
            >
              Latest Posts
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              What's happening on NESBA
            </Text>

          </View>

        </View>


        {postsLoading ? (

          <View
            style={
              styles.emptyCard
            }
          >

            <ActivityIndicator
              size="small"
              color={
                colors.primary
              }
            />

            <Text
              style={
                styles.emptyCardText
              }
            >
              Loading posts...
            </Text>

          </View>

        ) : posts.length === 0 ? (

          <View
            style={
              styles.emptyCard
            }
          >

            <Ionicons
              name="newspaper-outline"
              size={34}
              color={
                colors.textMuted
              }
            />

            <Text
              style={
                styles.emptyCardTitle
              }
            >
              No posts yet
            </Text>

            <Text
              style={
                styles.emptyCardText
              }
            >
              Be the first person to share something with the NESBA community.
            </Text>


            <Pressable
              style={
                styles.emptyCardButton
              }

              onPress={
                openComposer
              }
            >

              <Ionicons
                name="create-outline"
                size={18}
                color={
                  colors.white
                }
              />

              <Text
                style={
                  styles.emptyCardButtonText
                }
              >
                Create Post
              </Text>

            </Pressable>

          </View>

        ) : (

          <View
            style={
              styles.postsList
            }
          >

            {posts.map(
              post => (

                <Fragment key={`post-card-${post.id}`}>
                  {PostCard({
                    post: post,
                  })}
                </Fragment>

              )
            )}

          </View>

        )}

      </View>
    );
  };


  /* =======================================================
     PART 6 ENDS HERE
     ======================================================= */
       /* =======================================================
     SUGGESTED PEOPLE
     ======================================================= */

  const SuggestedPeople = () => {

    if (
      !suggestedUsers ||
      suggestedUsers.length === 0
    ) {
      return null;
    }


    return (
      <View
        style={styles.section}
      >

        <View
          style={styles.sectionHeader}
        >

          <View>

            <Text
              style={styles.sectionTitle}
            >
              People you may know
            </Text>

            <Text
              style={styles.sectionSubtitle}
            >
              Connect with the NESBA community
            </Text>

          </View>

        </View>


        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }

          contentContainerStyle={
            styles.peopleList
          }
        >

          {suggestedUsers.map(
            user => (

              <View
                key={
                  `suggested-${user.id}`
                }

                style={
                  styles.personCard
                }
              >

                <Pressable
                  onPress={() =>
                    openProfile(
                      user.id
                    )
                  }
                >

                  {Avatar({
                      uri: user.avatar_url,
                      name: user.full_name,
                      size: 58,
                    })}

                </Pressable>


                <Text
                  style={
                    styles.personName
                  }

                  numberOfLines={1}
                >
                  {
                    user.full_name ||
                    'NESBA Member'
                  }
                </Text>


                <Pressable
                  style={
                    styles.followButton
                  }

                  onPress={() =>
                    handleFollow(
                      user
                    )
                  }
                >

                  <Ionicons
                    name="person-add-outline"
                    size={16}
                    color={
                      colors.white
                    }
                  />

                  <Text
                    style={
                      styles.followButtonText
                    }
                  >
                    Follow
                  </Text>

                </Pressable>

              </View>

            )
          )}

        </ScrollView>

      </View>
    );
  };


  /* =======================================================
     MAIN PAGE
     ======================================================= */

  return (
    <SafeAreaView
      style={
        styles.container
      }

      edges={[
        'top',
        'left',
        'right',
      ]}
    >

      {Header()}


      <ScrollView
        style={
          styles.scrollView
        }

        contentContainerStyle={
          styles.contentContainer
        }

        showsVerticalScrollIndicator={
          false
        }

        keyboardShouldPersistTaps="handled"

        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }

            onRefresh={
              handleRefreshData
            }

            tintColor={
              colors.primary
            }

            colors={[
              colors.primary,
            ]}
          />
        }
      >

        {!currentUserId && !loading && <GuestWelcome />}

        {SearchBar()}

        {StoriesSection()}

        {!!currentUserId && CreatePostButton()}

        {LiveNowSection()}

        {TrendingCourses()}

        {LatestPosts()}

        {SuggestedPeople()}

        <View
          style={
            styles.bottomSpace
          }
        />

      </ScrollView>


      {/* ===================================================
          POST COMPOSER
      =================================================== */}

      {PostComposer()}


      {/* ===================================================
          STORY EDITOR
      =================================================== */}

      {StoryEditor()}

    </SafeAreaView>
  );

}


  /* =======================================================
     PART 7 ENDS HERE
     ======================================================= */
     /* ============================================================
   NESBA HOME — STYLES
   ============================================================ */

const styles = StyleSheet.create({

  /* ==========================================================
     ROOT
     ========================================================== */

  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollView: {
    flex: 1,
  },

  contentContainer: {
    paddingBottom: 40,
  },

  bottomSpace: {
    height: 40,
  },


  /* ==========================================================
     LOADING
     ========================================================== */

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  logoCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  logoText: {
    color: colors.white,
    fontSize: 30,
    fontWeight: '800',
  },

  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: colors.textSecondary,
  },


  /* ==========================================================
     HEADER
     ========================================================== */

  header: {
    height: 64,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  brandMark: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  brandMarkText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '800',
  },

  brandName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.3,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  headerIconButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },


  /* ==========================================================
     SEARCH
     ========================================================== */

  searchWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    zIndex: 50,
  },

  searchBar: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
  },

  searchInput: {
    flex: 1,
    marginLeft: 9,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
  },

  searchResults: {
    marginTop: 7,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    maxHeight: 440,
  },

  searchLoading: {
    minHeight: 70,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },

  searchLoadingText: {
    color: colors.textSecondary,
    fontSize: 14,
  },

  searchSection: {
    paddingVertical: 7,
  },

  searchSectionTitle: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  searchResultRow: {
    minHeight: 58,
    paddingHorizontal: 13,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },

  searchResultIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchResultContent: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },

  searchResultTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },

  searchResultSubtitle: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 12,
  },

  emptySearch: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 25,
    paddingVertical: 35,
  },

  emptySearchTitle: {
    marginTop: 9,
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },

  emptySearchText: {
    marginTop: 4,
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 12,
  },


  /* ==========================================================
     SECTIONS
     ========================================================== */

  section: {
    marginTop: 20,
  },

  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },

  sectionSubtitle: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 12,
  },

  seeAllText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },


  /* ==========================================================
     STORIES
     ========================================================== */

  storyList: {
    paddingHorizontal: 14,
    gap: 12,
  },

  storyCard: {
    width: 78,
    alignItems: 'center',
  },

  storyAvatarRing: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  addStoryAvatar: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  addStoryButton: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  storyName: {
    marginTop: 6,
    maxWidth: 74,
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },


  /* ==========================================================
     CREATE POST
     ========================================================== */

  createPostCard: {
    marginTop: 18,
    marginHorizontal: 14,
    backgroundColor: colors.card,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },

  createPostTop: {
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },

  createPostInputFake: {
    flex: 1,
    height: 42,
    marginLeft: 10,
    borderRadius: 21,
    backgroundColor: colors.backgroundSoft,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },

  createPostPlaceholder: {
    color: colors.textMuted,
    fontSize: 14,
  },

  createPostActions: {
    minHeight: 52,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },

  createPostAction: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },

  createPostActionText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },


  /* ==========================================================
     COURSE CARDS
     ========================================================== */

  courseList: {
    paddingHorizontal: 14,
    gap: 12,
  },

  courseCard: {
    width: 245,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },

  courseImageContainer: {
    height: 130,
    position: 'relative',
    overflow: 'hidden',
  },

  courseImage: {
    width: '100%',
    height: '100%',
  },

  coursePlaceholder: {
    flex: 1,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  trendingBadge: {
    position: 'absolute',
    top: 9,
    left: 9,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: 'rgba(0,0,0,0.68)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  trendingBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },

  courseContent: {
    padding: 12,
  },

  courseTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
  },

  courseDescription: {
    marginTop: 5,
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },

  courseMeta: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  courseMetaText: {
    color: colors.textMuted,
    fontSize: 11,
  },


  /* ==========================================================
     EMPTY STATES
     ========================================================== */

  emptyCard: {
    marginHorizontal: 14,
    paddingHorizontal: 22,
    paddingVertical: 32,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyCardTitle: {
    marginTop: 9,
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },

  emptyCardText: {
    marginTop: 5,
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },

  emptyCardButton: {
    marginTop: 15,
    minHeight: 40,
    paddingHorizontal: 15,
    borderRadius: 12,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  emptyCardButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },


  /* ==========================================================
     POSTS
     ========================================================== */

  postsList: {
    gap: 12,
  },

  postCard: {
    marginHorizontal: 14,
    borderRadius: 17,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },

  postHeader: {
    minHeight: 68,
    paddingHorizontal: 13,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  postAuthorButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  postAuthorInfo: {
    flex: 1,
    marginLeft: 10,
  },

  postAuthorName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },

  postTime: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 11,
  },

  postMoreButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  postBody: {
    paddingBottom: 3,
  },

  postText: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
  },

  postImage: {
    width: '100%',
    height: 300,
    backgroundColor: colors.backgroundSoft,
  },

  postVideoContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#111111',
  },

  postVideoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  postVideoText: {
    marginTop: 7,
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },

  postLinkCard: {
    marginHorizontal: 14,
    marginBottom: 12,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  postLinkIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  postLinkContent: {
    flex: 1,
    marginHorizontal: 9,
  },

  postLinkTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },

  postLinkUrl: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 11,
  },

  postStats: {
    minHeight: 38,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  postStatsLeft: {
    flex: 1,
  },

  likeCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  likeCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },

  postStatsText: {
    color: colors.textMuted,
    fontSize: 11,
  },

  postActionBar: {
    minHeight: 49,
    marginHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },

  postAction: {
    flex: 1,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },

  postActionText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },

  postActionTextLiked: {
    color: colors.danger,
  },


  /* ==========================================================
     COMMENTS
     ========================================================== */

  commentsContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
  },

  noComments: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },

  noCommentsText: {
    marginTop: 5,
    color: colors.textMuted,
    fontSize: 12,
  },

  commentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
  },

  replyItem: {
    marginLeft: 42,
  },

  commentContent: {
    flex: 1,
    marginLeft: 8,
  },

  commentBubble: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    borderRadius: 13,
    backgroundColor: colors.backgroundSoft,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  commentAuthor: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },

  commentText: {
    marginTop: 2,
    color: colors.text,
    fontSize: 12,
    lineHeight: 17,
  },

  commentMedia: {
    marginTop: 7,
    width: 150,
    height: 110,
    borderRadius: 9,
  },

  commentActions: {
    paddingHorizontal: 4,
    marginTop: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  commentTime: {
    color: colors.textMuted,
    fontSize: 10,
  },

  commentActionText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },

  replyIndicator: {
    marginTop: 7,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  replyIndicatorTitle: {
    color: colors.textMuted,
    fontSize: 10,
  },

  replyIndicatorText: {
    marginTop: 2,
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    maxWidth: 240,
  },

  commentInputContainer: {
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },

  commentInputBox: {
    flex: 1,
    minHeight: 42,
    marginLeft: 8,
    paddingLeft: 11,
    paddingRight: 8,
    borderRadius: 14,
    backgroundColor: colors.backgroundSoft,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },

  commentInput: {
    flex: 1,
    minHeight: 39,
    maxHeight: 100,
    color: colors.text,
    fontSize: 12,
    paddingVertical: 10,
  },

  commentTools: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 6,
  },

  commentEmojiPanel: {
    marginTop: 7,
    borderRadius: 12,
    backgroundColor: colors.backgroundSoft,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 7,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  commentEmojiButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },

  commentEmojiText: {
    fontSize: 22,
  },

  commentAttachmentPreview: {
    marginTop: 8,
    width: 90,
    height: 75,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },

  commentAttachmentImage: {
    width: '100%',
    height: '100%',
  },

  commentAttachmentRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },


  /* ==========================================================
     COMPOSER
     ========================================================== */

  composerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.48)',
    zIndex: 100,
    justifyContent: 'flex-end',
  },

  composerKeyboard: {
    width: '100%',
    maxHeight: '94%',
  },

  composerCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 15,
    overflow: 'hidden',
  },

  composerHeader: {
    height: 60,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  composerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },

  composerAuthor: {
    paddingHorizontal: 16,
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  composerAuthorName: {
    marginLeft: 9,
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },

  composerPrivacy: {
    marginLeft: 9,
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 10,
  },

  composerTextInput: {
    minHeight: 120,
    marginHorizontal: 16,
    marginTop: 12,
    color: colors.text,
    fontSize: 16,
    lineHeight: 23,
  },

  composerMedia: {
    height: 210,
    marginHorizontal: 16,
    marginTop: 7,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },

  composerMediaImage: {
    width: '100%',
    height: '100%',
  },

  composerMediaBadge: {
    position: 'absolute',
    top: 9,
    left: 9,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  composerMediaBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },

  removeMediaButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  linkPreview: {
    marginHorizontal: 16,
    marginTop: 9,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },

  linkPreviewText: {
    flex: 1,
    marginHorizontal: 8,
    color: colors.textSecondary,
    fontSize: 12,
  },

  emojiPanel: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 13,
    backgroundColor: colors.backgroundSoft,
    padding: 7,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  emojiButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emojiText: {
    fontSize: 23,
  },

  mentionPanel: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },

  mentionSearchRow: {
    minHeight: 44,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  mentionInput: {
    flex: 1,
    marginLeft: 7,
    color: colors.text,
    fontSize: 13,
  },

  mentionRow: {
    minHeight: 50,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
  },

  mentionName: {
    marginLeft: 9,
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },

  noMentionText: {
    padding: 14,
    color: colors.textMuted,
    fontSize: 12,
  },

  composerTools: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },

  composerToolsTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },

  composerToolGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  composerTool: {
    width: '33.333%',
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },

  composerToolIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.backgroundSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  composerToolText: {
    marginTop: 4,
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },

  publishButton: {
    height: 48,
    marginHorizontal: 16,
    marginTop: 15,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  publishButtonDisabled: {
    opacity: 0.55,
  },

  publishButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },

  liveTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.danger,
  },

  liveList: {
    gap: 12,
    paddingRight: 12,
  },

  liveCard: {
    width: 220,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
  },

  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: colors.danger,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },

  liveBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.white,
  },

  liveBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '800',
  },

  liveCardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    minHeight: 40,
  },

  liveHostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  liveHostName: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13,
  },

  liveJoinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 9,
  },

  liveJoinText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 14,
  },

  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },


  /* ==========================================================
     STORY EDITOR
     ========================================================== */

  storyEditorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    zIndex: 200,
  },

  storyEditorSafe: {
    flex: 1,
    backgroundColor: '#000000',
  },

  storyEditorHeader: {
    height: 58,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  storyHeaderButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },

  storyEditorTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },

  storyPreviewContainer: {
    flex: 1,
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },

  storyPreview: {
    width: '100%',
    maxWidth: 480,
    aspectRatio: 9 / 16,
    borderRadius: 15,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#111111',
  },

  storyPreviewImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },

  storyTextOverlay: {
    position: 'absolute',
    left: 15,
    right: 15,
    bottom: 70,
    alignItems: 'center',
  },

  storyOverlayText: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: {
      width: 1,
      height: 1,
    },
    textShadowRadius: 4,
  },

  storyLocationOverlay: {
    position: 'absolute',
    left: 12,
    top: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.58)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  storyLocationText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },

  storyAudioOverlay: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    maxWidth: '70%',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.58)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  storyAudioText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '600',
  },

  storyVideoIndicator: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },

  storyToolsContainer: {
    maxHeight: '48%',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },

  storyToolsContent: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },

  storyToolSection: {
    marginBottom: 15,
  },

  storyToolSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 7,
  },

  storyToolSectionTitle: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
  },

  storyTextInput: {
    minHeight: 48,
    maxHeight: 90,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.white,
    fontSize: 13,
  },

  filterButton: {
    width: 75,
    marginRight: 9,
    alignItems: 'center',
  },

  filterButtonSelected: {
    opacity: 1,
  },

  filterPreview: {
    width: 62,
    height: 62,
    borderRadius: 13,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },

  filterVideoSwatch: {
    backgroundColor: '#4B5563',
  },

  filterPreviewImage: {
    width: '100%',
    height: '100%',
  },

  filterButtonText: {
    marginTop: 5,
    color: 'rgba(255,255,255,0.65)',
    fontSize: 10,
    fontWeight: '600',
  },

  filterButtonTextSelected: {
    color: colors.white,
    fontWeight: '800',
  },

  storyInputRow: {
    minHeight: 45,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
  },

  storyLocationInput: {
    flex: 1,
    marginLeft: 7,
    color: colors.white,
    fontSize: 13,
  },

  selectedAudio: {
    minHeight: 52,
    paddingHorizontal: 9,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    flexDirection: 'row',
    alignItems: 'center',
  },

  selectedAudioIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectedAudioInfo: {
    flex: 1,
    marginHorizontal: 9,
  },

  selectedAudioName: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },

  audioPlayButton: {
    marginRight: 6,
  },

  useLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingVertical: 6,
  },

  useLocationText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },

  selectedAudioSubtitle: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.55)',
    fontSize: 10,
  },

  addAudioButton: {
    minHeight: 52,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    flexDirection: 'row',
    alignItems: 'center',
  },

  addAudioButtonText: {
    flex: 1,
    marginLeft: 9,
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },

  storyInfoBox: {
    marginTop: 2,
    marginBottom: 12,
    padding: 10,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  storyInfoText: {
    flex: 1,
    color: 'rgba(255,255,255,0.55)',
    fontSize: 10,
    lineHeight: 15,
  },

  storyPublishButton: {
    height: 48,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },

  storyPublishButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },


  /* ==========================================================
     PEOPLE
     ========================================================== */

  peopleList: {
    paddingHorizontal: 14,
    gap: 10,
  },

  personCard: {
    width: 145,
    padding: 13,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },

  personName: {
    width: '100%',
    marginTop: 8,
    textAlign: 'center',
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },

  followButton: {
    marginTop: 9,
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
  },

  followButtonText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
});
