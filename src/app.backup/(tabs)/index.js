import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { colors, spacing, typography, radius } from '../../constants/theme';
import { liveRooms } from '../../data/mockData';
import { getCourses } from '../../lib/courses';
import CourseCard from '../../components/CourseCard';
import {
  getFeed,
  createPost,
  togglePostLike,
  getPostLikeCount,
} from '../../lib/nesba';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

export default function HomeScreen() {
  const { user, session } = useAuth();

  const [courses, setCourses] = useState([]);
  const [posts, setPosts] = useState([]);
  const [postText, setPostText] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [likeState, setLikeState] = useState({});
  const [liveListenerCounts, setLiveListenerCounts] = useState({});

  const load = useCallback(async () => {
    try {
      const [courseData, feedData] = await Promise.all([
        getCourses(),
        getFeed(session?.user?.id),
      ]);

      setCourses(courseData);
      setPosts(feedData);

      if (session?.user?.id && feedData.length) {
        const counts = {};

        await Promise.all(
          feedData.map(async (p) => {
            counts[p.id] = await getPostLikeCount(p.id);
          })
        );

        setLikeState((prev) =>
          Object.fromEntries(
            feedData.map((p) => [
              p.id,
              {
                ...(prev[p.id] || {}),
                count: counts[p.id] || 0,
              },
            ])
          )
        );
      }
    } catch (e) {
      if (session) console.log(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session]);

  useEffect(() => {
    load();
  }, [load]);

  const loadLiveListenerCounts = useCallback(async () => {
    const counts = {};

    await Promise.all(
      liveRooms
        .filter((room) => room.isLive)
        .map(async (room) => {
          try {
            const { data, error } = await supabase.functions.invoke(
              'livekit-participants',
              {
                body: {
                  roomName: room.title,
                },
              }
            );

            if (!error && typeof data?.count === 'number') {
              counts[room.id] = data.count;
            }
          } catch (error) {
            console.log(
              'Live participant count error:',
              error?.message || error
            );
          }
        })
    );

    setLiveListenerCounts(counts);
  }, []);

  useEffect(() => {
    loadLiveListenerCounts();

    const interval = setInterval(
      loadLiveListenerCounts,
      5000
    );

    return () => clearInterval(interval);
  }, [loadLiveListenerCounts]);

  const submitPost = async () => {
    if (!session) return router.push('/login');

    if (!postText.trim()) return;

    try {
      setPosting(true);

      await createPost(postText.trim());

      setPostText('');

      await load();
    } catch (e) {
      Alert.alert('Could not post', e.message);
    } finally {
      setPosting(false);
    }
  };

  const like = async (post) => {
    if (!session) return router.push('/login');

    const current = likeState[post.id] || {
      liked: false,
      count: 0,
    };

    const nextLiked = !current.liked;

    setLikeState((prev) => ({
      ...prev,
      [post.id]: {
        liked: nextLiked,
        count: Math.max(
          0,
          current.count + (nextLiked ? 1 : -1)
        ),
      },
    }));

    try {
      await togglePostLike(post.id, session.user.id);
    } catch (e) {
      setLikeState((prev) => ({
        ...prev,
        [post.id]: current,
      }));

      Alert.alert('Could not update like', e.message);
    }
  };

  const openLiveRoom = (room) => {
    router.push({
      pathname: '/live-test',
      params: {
        roomId: room.id,
        roomName: room.title,
        roomType: room.type,
        host: room.host,
      },
    });
  };

  const freeCourses = courses.filter((c) => !c.isPremium);
  const featured = courses.slice(0, 5);
  const liveNow = liveRooms.filter((r) => r.isLive);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: spacing.xl }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.brandRow}>
        <Image
          source={require('../../assets/images/nesba-logo.png')}
          style={styles.logo}
        />

        <Text style={styles.brandName}>NESBA</Text>

        <Pressable
          style={styles.searchBtn}
          onPress={() => router.push('/(tabs)/courses')}
        >
          <Ionicons
            name="search"
            size={19}
            color={colors.text}
          />
        </Pressable>
      </View>

      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>

          <Text style={styles.name}>
            {user.name} ðŸ‘‹
          </Text>
        </View>

        <Link href="/learn" asChild>
          <Pressable style={styles.learnBtn}>
            <Ionicons
              name="school"
              size={15}
              color="#fff"
            />

            <Text style={styles.learnText}>
              Learn
            </Text>
          </Pressable>
        </Link>
      </View>

      {session && (
        <View style={styles.composer}>
          <TextInput
            value={postText}
            onChangeText={setPostText}
            placeholder="Share something educational..."
            placeholderTextColor={colors.textMuted}
            style={styles.composerInput}
            multiline
          />

          <View style={styles.composerFooter}>
            <Text style={styles.muted}>
              Build your learning network.
            </Text>

            <Pressable
              style={styles.postBtn}
              onPress={submitPost}
              disabled={posting}
            >
              {posting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.postBtnText}>
                  Post
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      )}

      {liveNow.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.liveDot} />

            <Text style={styles.sectionTitle}>
              Live Now
            </Text>
          </View>

          {liveNow.map((room) => (
            <Pressable
              key={room.id}
              style={styles.liveCard}
              onPress={() => openLiveRoom(room)}
            >
              <Ionicons
                name={
                  room.type === 'video'
                    ? 'videocam'
                    : 'mic'
                }
                size={20}
                color={colors.accent}
              />

              <View style={{ flex: 1 }}>
                <Text style={styles.liveTitle}>
                  {room.title}
                </Text>

                <Text style={styles.liveMeta}>
                  {room.host} · {liveListenerCounts[room.id] ?? room.listeners} listening
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textMuted}
              />
            </Pressable>
          ))}
        </View>
      )}

      <Link href="/organizations" asChild>
        <Pressable style={styles.orgBanner}>
          <Ionicons
            name="business"
            size={22}
            color={colors.primaryLight}
          />

          <View style={{ flex: 1 }}>
            <Text style={styles.creatorTitle}>
              Explore Organizations
            </Text>

            <Text style={styles.mutedSmall}>
              Follow schools, nonprofits, mentors and education partners.
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.textMuted}
          />
        </Pressable>
      </Link>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Discover Learning
        </Text>

        {loading ? (
          <ActivityIndicator
            color={colors.primary}
            style={{ marginTop: spacing.md }}
          />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: spacing.sm }}
          >
            {featured.map((c) => (
              <CourseCard
                key={c.id}
                course={c}
              />
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Latest from the Community
        </Text>

        {posts.length === 0 ? (
          <Text style={styles.muted}>
            No posts yet. Be one of the first to share something useful.
          </Text>
        ) : (
          posts.map((post) => {
            const state = likeState[post.id] || {
              liked: false,
              count: 0,
            };

            return (
              <Pressable
                key={post.id}
                style={styles.post}
                onPress={() =>
                  router.push(`/post/${post.id}`)
                }
              >
                <Pressable
                  style={styles.postHeader}
                  onPress={() =>
                    post.author_id &&
                    router.push(`/user/${post.author_id}`)
                  }
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {(post.author_name || 'N')
                        .charAt(0)
                        .toUpperCase()}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.author}>
                      {post.author_name || 'NESBA Member'}
                    </Text>

                    <Text style={styles.mutedSmall}>
                      {new Date(
                        post.created_at
                      ).toLocaleDateString()}
                    </Text>
                  </View>

                  {post.organizations?.verification_status ===
                    'verified' && (
                    <Ionicons
                      name="checkmark-circle"
                      size={17}
                      color={colors.primaryLight}
                    />
                  )}
                </Pressable>

                <Text style={styles.postContent}>
                  {post.content}
                </Text>

                <View style={styles.postActions}>
                  <Pressable
                    style={styles.action}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      like(post);
                    }}
                  >
                    <Ionicons
                      name={
                        state.liked
                          ? 'heart'
                          : 'heart-outline'
                      }
                      size={19}
                      color={
                        state.liked
                          ? colors.danger
                          : colors.textMuted
                      }
                    />

                    <Text style={styles.actionText}>
                      {state.count}{' '}
                      {state.count === 1
                        ? 'Like'
                        : 'Likes'}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={styles.action}
                    onPress={() =>
                      router.push(`/post/${post.id}`)
                    }
                  >
                    <Ionicons
                      name="chatbubble-outline"
                      size={18}
                      color={colors.textMuted}
                    />

                    <Text style={styles.actionText}>
                      Comment
                    </Text>
                  </Pressable>

                  <Pressable
                    style={styles.action}
                    onPress={() =>
                      router.push(`/post/${post.id}`)
                    }
                  >
                    <Ionicons
                      name="arrow-redo-outline"
                      size={18}
                      color={colors.textMuted}
                    />

                    <Text style={styles.actionText}>
                      Share
                    </Text>
                  </Pressable>
                </View>
              </Pressable>
            );
          })
        )}
      </View>

      {freeCourses.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Free Courses
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: spacing.sm }}
          >
            {freeCourses.map((c) => (
              <CourseCard
                key={c.id}
                course={c}
              />
            ))}
          </ScrollView>
        </View>
      )}

      <Link href="/creator" asChild>
        <Pressable style={styles.creatorBanner}>
          <Ionicons
            name="create"
            size={22}
            color={colors.primaryLight}
          />

          <View style={{ flex: 1 }}>
            <Text style={styles.creatorTitle}>
              Teach on NESBA
            </Text>

            <Text style={styles.mutedSmall}>
              Share your knowledge with learners.
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.textMuted}
          />
        </Pressable>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
  },

  logo: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },

  brandName: {
    ...typography.h2,
    fontSize: 18,
    letterSpacing: 1,
  },

  searchBtn: {
    marginLeft: 'auto',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },

  greeting: {
    ...typography.caption,
  },

  name: {
    ...typography.h1,
    fontSize: 22,
    marginTop: 2,
  },

  learnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },

  learnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },

  composer: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.lg,
  },

  composerInput: {
    color: colors.text,
    minHeight: 55,
    textAlignVertical: 'top',
  },

  composerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },

  postBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    minWidth: 60,
    alignItems: 'center',
  },

  postBtnText: {
    color: '#fff',
    fontWeight: '700',
  },

  section: {
    marginBottom: spacing.lg,
  },

  sectionTitle: {
    ...typography.h2,
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },

  liveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },

  liveTitle: {
    ...typography.body,
    fontWeight: '700',
  },

  liveMeta: {
    ...typography.caption,
    marginTop: 2,
  },

  muted: {
    ...typography.body,
    color: colors.textMuted,
    lineHeight: 21,
    marginTop: spacing.sm,
  },

  mutedSmall: {
    ...typography.caption,
  },

  post: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },

  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    color: '#fff',
    fontWeight: '700',
  },

  author: {
    ...typography.body,
    fontWeight: '700',
  },

  postContent: {
    ...typography.body,
    lineHeight: 22,
    marginTop: spacing.sm,
  },

  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  actionText: {
    color: colors.textMuted,
    fontSize: 12,
  },

  orgBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },

  creatorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },

  creatorTitle: {
    ...typography.body,
    fontWeight: '700',
  },
});
