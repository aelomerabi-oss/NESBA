import { useCallback, useEffect, useState } from 'react';

import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  colors,
  radius,
  spacing,
  typography,
} from '../constants/theme';

import { useAuth } from '../context/AuthContext';

import { supabase } from '../lib/supabase';

import { router } from 'expo-router';

export default function NotificationsScreen() {
  const {
    session,
    unreadNotificationCount,
    refreshUnreadNotificationCount,
  } = useAuth();

  const [items, setItems] = useState([]);
  const [loading, setLoading] =
    useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  /*
   * ============================================
   * LOAD NOTIFICATIONS
   * ============================================
   */

  const load = useCallback(async () => {
    if (!session?.user) {
      setLoading(false);
      return;
    }

    const {
      data,
      error,
    } = await supabase
      .from('notifications')
      .select(
        'id,type,title,body,data,read_at,created_at'
      )
      .eq(
        'user_id',
        session.user.id
      )
      .order('created_at', {
        ascending: false,
      })
      .limit(50);

    if (error) {
      console.error(
        'Notifications load error:',
        error
      );
    }

    setItems(data || []);

    await refreshUnreadNotificationCount(
      session.user.id
    );

    setLoading(false);
    setRefreshing(false);
  }, [
    session,
    refreshUnreadNotificationCount,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  /*
   * ============================================
   * MARK ONE NOTIFICATION AS READ
   * ============================================
   */

  const read = async (item) => {
    if (item.read_at) {
      return;
    }

    const readAt =
      new Date().toISOString();

    const {
      error,
    } = await supabase
      .from('notifications')
      .update({
        read_at: readAt,
      })
      .eq(
        'id',
        item.id
      );

    if (error) {
      console.error(
        'Notification read error:',
        error
      );

      return;
    }

    setItems((previous) =>
      previous.map((x) =>
        x.id === item.id
          ? {
              ...x,
              read_at: readAt,
            }
          : x
      )
    );

    await refreshUnreadNotificationCount(
      session?.user?.id
    );
  };

  /*
   * ============================================
   * HANDLE NOTIFICATION PRESS
   * ============================================
   */

  const handleNotificationPress =
    async (item) => {
      /*
       * Mark it as read first.
       */
      await read(item);

      /*
       * ========================================
       * FOLLOW NOTIFICATION
       * ========================================
       *
       * data.follower_id contains the ID
       * of the person who followed the
       * current user.
       */

      if (
        item.type === 'follow' &&
        item.data?.follower_id
      ) {
        router.push(
          `/user/${item.data.follower_id}`
        );

        return;
      }

      /*
       * ========================================
       * MESSAGE NOTIFICATION
       * ========================================
       *
       * If message notifications later
       * contain sender_id, we can route
       * directly to the conversation.
       */

      if (
        item.type === 'message' &&
        item.data?.sender_id
      ) {
        router.push(
          `/messages/${item.data.sender_id}`
        );

        return;
      }

      /*
       * ========================================
       * COURSE COMPLETION REWARDS
       * ========================================
       *
       * Issued by the database when a course
       * reaches 100%.
       */

      if (
        item.type === 'certificate_issued' &&
        item.data?.certificate_id
      ) {
        router.push(
          `/certificate/${item.data.certificate_id}`
        );

        return;
      }

      if (
        item.type === 'event_live' &&
        item.data?.room_id
      ) {
        router.push(
          `/live/${item.data.room_id}`
        );

        return;
      }

      if (
        item.type === 'invite_joined' &&
        item.data?.friend_id
      ) {
        router.push(
          `/user/${item.data.friend_id}`
        );

        return;
      }

      if (
        item.type === 'badge_earned'
      ) {
        router.push(
          '/learn'
        );

        return;
      }
    };

  /*
   * ============================================
   * GUEST
   * ============================================
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
          Notifications
        </Text>

        <Text style={styles.muted}>
          Log in to receive notifications.
        </Text>
      </View>
    );
  }

  /*
   * ============================================
   * LOADING
   * ============================================
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
   * ============================================
   * NOTIFICATION SCREEN
   * ============================================
   */

  return (
    <View style={styles.container}>
      <FlatList
        style={styles.container}

        contentContainerStyle={
          styles.content
        }

        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
            }}
            tintColor={
              colors.primary
            }
          />
        }

        data={items}

        keyExtractor={(item) =>
          item.id
        }

        ListHeaderComponent={
          <View
            style={
              styles.header
            }
          >
            <View
              style={
                styles.headerTitleRow
              }
            >
              <Text
                style={
                  styles.title
                }
              >
                Notifications
              </Text>

              {unreadNotificationCount >
                0 && (
                <View
                  style={
                    styles.countBadge
                  }
                >
                  <Text
                    style={
                      styles.countBadgeText
                    }
                  >
                    {unreadNotificationCount >
                    9
                      ? '9+'
                      : unreadNotificationCount}
                  </Text>
                </View>
              )}
            </View>

            <Text
              style={
                styles.headerSubtitle
              }
            >
              Your latest NESBA updates
            </Text>
          </View>
        }

        ListEmptyComponent={
          <View
            style={
              styles.emptyContainer
            }
          >
            <Text
              style={
                styles.emptyIcon
              }
            >
              🔔
            </Text>

            <Text
              style={
                styles.muted
              }
            >
              You're all caught up.
            </Text>
          </View>
        }

        renderItem={({ item }) => (
          <Pressable
            style={[
              styles.card,

              !item.read_at &&
                styles.unread,
            ]}
            onPress={() =>
              handleNotificationPress(
                item
              )
            }
          >
            <View
              style={
                styles.cardTop
              }
            >
              <View
                style={
                  styles.notificationIcon
                }
              >
                <Text
                  style={
                    styles.notificationIconText
                  }
                >
                  {item.type ===
                  'message'
                    ? '💬'
                    : item.type ===
                      'follow'
                    ? '👤'
                    : item.type ===
                      'certificate_issued'
                    ? '🎓'
                    : item.type ===
                      'badge_earned'
                    ? '🏅'
                    : item.type ===
                      'event_live'
                    ? '🔴'
                    : item.type ===
                      'invite_joined'
                    ? '🤝'
                    : '🔔'}
                </Text>
              </View>

              {!item.read_at && (
                <View
                  style={
                    styles.unreadDot
                  }
                />
              )}
            </View>

            <Text
              style={styles.name}
            >
              {item.title}
            </Text>

            <Text
              style={styles.body}
            >
              {item.body}
            </Text>

            <Text
              style={styles.date}
            >
              {new Date(
                item.created_at
              ).toLocaleString()}
            </Text>

            {!item.read_at && (
              <Text
                style={
                  styles.tapHint
                }
              >
                Tap to open
              </Text>
            )}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles =
  StyleSheet.create({
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
    },

    header: {
      marginBottom:
        spacing.md,
    },

    headerTitleRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: spacing.sm,
    },

    title: {
      ...typography.h1,

      fontSize: 24,

      marginBottom:
        0,
    },

    headerSubtitle: {
      ...typography.caption,

      color:
        colors.textMuted,

      marginTop: 4,
    },

    countBadge: {
      minWidth: 24,

      height: 24,

      paddingHorizontal: 6,

      borderRadius: 12,

      backgroundColor:
        '#ff3b30',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    countBadgeText: {
      color: '#fff',

      fontSize: 11,

      fontWeight: '900',
    },

    muted: {
      ...typography.body,

      color:
        colors.textMuted,
    },

    emptyContainer: {
      alignItems:
        'center',

      paddingTop:
        spacing.xl,
    },

    emptyIcon: {
      fontSize: 38,

      marginBottom:
        spacing.sm,
    },

    card: {
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

    unread: {
      borderColor:
        '#ff3b30',

      borderWidth: 1.5,
    },

    cardTop: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      marginBottom:
        spacing.sm,
    },

    notificationIcon: {
      width: 38,

      height: 38,

      borderRadius: 19,

      backgroundColor:
        colors.background,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    notificationIconText: {
      fontSize: 18,
    },

    unreadDot: {
      width: 9,

      height: 9,

      borderRadius: 5,

      backgroundColor:
        '#ff3b30',
    },

    name: {
      ...typography.body,

      fontWeight:
        '700',
    },

    body: {
      ...typography.body,

      color:
        colors.textMuted,

      marginTop: 4,
    },

    date: {
      ...typography.caption,

      marginTop: 8,
    },

    tapHint: {
      ...typography.caption,

      color:
        colors.primary,

      marginTop: 8,

      fontWeight:
        '600',
    },
  });