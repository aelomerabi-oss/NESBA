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
  getLiveNowEvents,
} from '../../lib/nesba';

import {
  getCurrentPlaceName,
} from '../../lib/location';

import GuestWelcome from '../../components/GuestWelcome';
import { colors, styles } from '../../components/home/styles';
import { PostBody } from '../../components/home/PostBody';
import {
  MAX_UPLOAD_BYTES,
  formatBytes,
  uploadWithProgress,
} from '../../lib/upload';


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
              .select('id,full_name,avatar_url,bio,role,is_premium,created_at,updated_at,onboarded,goals,verification_status,requested_role,expertise,experience')
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


  
