import {
  useCallback,
  useEffect,
  useState,
} from 'react';

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
  Ionicons,
} from '@expo/vector-icons';

import {
  router,
} from 'expo-router';

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
  getInbox,
} from '../../lib/nesba';


export default function MessagesScreen() {

  const { session } = useAuth();

  const [messages, setMessages] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState('');


  /*
  |--------------------------------------------------------------------------
  | LOAD INBOX
  |--------------------------------------------------------------------------
  */

  const load = useCallback(
    async () => {

      if (!session?.user?.id) {

        setLoading(false);

        return;
      }

      try {

        setError('');

        const data =
          await getInbox(
            session.user.id
          );

        setMessages(
          Array.isArray(data)
            ? data
            : []
        );

      } catch (e) {

        console.error(
          'MESSAGES INBOX ERROR:',
          e
        );

        setError(
          e?.message ||
            'Could not load your messages.'
        );

        setMessages([]);

      } finally {

        setLoading(false);
        setRefreshing(false);

      }

    },

    [
      session?.user?.id,
    ]
  );


  /*
  |--------------------------------------------------------------------------
  | INITIAL LOAD
  |--------------------------------------------------------------------------
  */

  useEffect(() => {

    load();

  }, [load]);


  /*
  |--------------------------------------------------------------------------
  | OPEN CONVERSATION
  |--------------------------------------------------------------------------
  */

  const openConversation =
    (item) => {

      if (!item?.personId) {
        return;
      }

      router.push(
        `/messages/${item.personId}`
      );

    };


  /*
  |--------------------------------------------------------------------------
  | FORMAT DATE
  |--------------------------------------------------------------------------
  */

  const formatDate =
    (value) => {

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

      const today =
        new Date();

      const sameDay =
        date.getDate() ===
          today.getDate() &&
        date.getMonth() ===
          today.getMonth() &&
        date.getFullYear() ===
          today.getFullYear();

      if (sameDay) {

        return date.toLocaleTimeString(
          [],
          {
            hour: '2-digit',
            minute: '2-digit',
          }
        );

      }

      return date.toLocaleDateString();

    };


  /*
  |--------------------------------------------------------------------------
  | GET INITIALS
  |--------------------------------------------------------------------------
  */

  const getInitials =
    (name) => {

      if (!name) {
        return 'N';
      }

      const parts =
        name
          .trim()
          .split(/\s+/);

      if (parts.length >= 2) {

        return (
          parts[0].charAt(0) +
          parts[
            parts.length - 1
          ].charAt(0)
        ).toUpperCase();

      }

      return name
        .charAt(0)
        .toUpperCase();

    };


  /*
  |--------------------------------------------------------------------------
  | NOT LOGGED IN
  |--------------------------------------------------------------------------
  */

  if (!session) {

    return (

      <View
        style={[
          styles.container,
          styles.center,
        ]}
      >

        <Ionicons
          name="chatbubbles-outline"
          size={48}
          color={
            colors.textMuted
          }
        />

        <Text
          style={
            styles.title
          }
        >
          Messages
        </Text>

        <Text
          style={
            styles.muted
          }
        >
          Log in to message NESBA members.
        </Text>

        <Pressable
          style={
            styles.loginButton
          }
          onPress={() =>
            router.push(
              '/login'
            )
          }
        >

          <Text
            style={
              styles.loginButtonText
            }
          >
            Log In
          </Text>

        </Pressable>

      </View>

    );

  }


  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
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
          size="large"
          color={
            colors.primary
          }
        />

      </View>

    );

  }


  /*
  |--------------------------------------------------------------------------
  | CONVERSATION ROW
  |--------------------------------------------------------------------------
  */

  const renderConversation =
    ({ item }) => {

      const person =
        item?.person || {};


      const name =
        person.full_name ||
        'NESBA Member';


      return (

        <Pressable
          style={({ pressed }) => [
            styles.row,

            pressed &&
              styles.pressed,
          ]}

          onPress={() =>
            openConversation(
              item
            )
          }
        >

          {/* ============================================================
              AVATAR
              ============================================================ */}

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
              {getInitials(
                name
              )}
            </Text>

          </View>


          {/* ============================================================
              NAME + LAST MESSAGE
              ============================================================ */}

          <View
            style={
              styles.conversationInfo
            }
          >

            <Text
              style={
                styles.name
              }

              numberOfLines={
                1
              }
            >
              {name}
            </Text>


            <Text
              style={
                styles.preview
              }

              numberOfLines={
                1
              }
            >
              {item.content ||
                'No messages yet'}
            </Text>

          </View>


          {/* ============================================================
              DATE + ARROW
              ============================================================ */}

          <View
            style={
              styles.rightSide
            }
          >

            <Text
              style={
                styles.date
              }
            >
              {formatDate(
                item.created_at
              )}
            </Text>


            <Ionicons
              name="chevron-forward"
              size={18}
              color={
                colors.textMuted
              }
            />

          </View>

        </Pressable>

      );

    };


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

      <FlatList

        data={
          messages
        }

        keyExtractor={(
          item,
          index
        ) =>
          item?.personId ||
          String(index)
        }

        renderItem={
          renderConversation
        }

        refreshControl={

          <RefreshControl
            refreshing={
              refreshing
            }

            onRefresh={() => {

              setRefreshing(
                true
              );

              load();

            }}

            tintColor={
              colors.primary
            }
          />

        }

        contentContainerStyle={
          messages.length > 0
            ? styles.content
            : styles.empty
        }

        showsVerticalScrollIndicator={
          false
        }

        ListHeaderComponent={

          <Text
            style={
              styles.title
            }
          >
            Messages
          </Text>

        }

        ListEmptyComponent={

          <View
            style={
              styles.emptyContent
            }
          >

            {error ? (

              <>

                <Ionicons
                  name="alert-circle-outline"
                  size={46}
                  color={
                    colors.danger
                  }
                />

                <Text
                  style={
                    styles.emptyTitle
                  }
                >
                  Could not load messages
                </Text>

                <Text
                  style={
                    styles.emptyText
                  }
                >
                  {error}
                </Text>

                <Pressable
                  style={
                    styles.retryButton
                  }

                  onPress={
                    load
                  }
                >

                  <Text
                    style={
                      styles.retryText
                    }
                  >
                    Try Again
                  </Text>

                </Pressable>

              </>

            ) : (

              <>

                <Ionicons
                  name="chatbubbles-outline"
                  size={46}
                  color={
                    colors.textMuted
                  }
                />

                <Text
                  style={
                    styles.emptyTitle
                  }
                >
                  No conversations yet
                </Text>

                <Text
                  style={
                    styles.emptyText
                  }
                >
                  Open a member profile to start
                  a conversation.
                </Text>

              </>

            )}

          </View>

        }

      />

    </View>

  );

}


/*
|--------------------------------------------------------------------------
| STYLES
|--------------------------------------------------------------------------
*/

const styles =
  StyleSheet.create({

    container: {
      flex: 1,
      backgroundColor:
        colors.background,
    },

    center: {
      justifyContent:
        'center',

      alignItems:
        'center',

      padding:
        spacing.lg,
    },

    content: {
      padding:
        spacing.md,

      paddingBottom:
        spacing.xl * 2,
    },

    empty: {
      flexGrow: 1,

      padding:
        spacing.md,

      paddingBottom:
        spacing.xl,

      justifyContent:
        'center',
    },

    title: {
      ...typography.h1,

      fontSize: 24,

      marginBottom:
        spacing.md,
    },

    muted: {
      ...typography.body,

      color:
        colors.textMuted,

      textAlign:
        'center',
    },

    row: {
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
        spacing.sm,

      marginBottom:
        spacing.sm,
    },

    pressed: {
      opacity:
        0.65,
    },

    avatar: {
      width: 48,

      height: 48,

      borderRadius: 24,

      backgroundColor:
        colors.primary,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight:
        spacing.sm,
    },

    avatarText: {
      color:
        '#fff',

      fontWeight:
        '800',

      fontSize: 18,
    },

    conversationInfo: {
      flex: 1,

      minWidth: 0,

      marginRight:
        spacing.sm,
    },

    name: {
      ...typography.body,

      fontWeight:
        '800',

      color:
        colors.text,
    },

    preview: {
      ...typography.caption,

      color:
        colors.textMuted,

      marginTop: 3,
    },

    rightSide: {
      alignItems:
        'flex-end',

      justifyContent:
        'space-between',

      minHeight: 42,
    },

    date: {
      ...typography.caption,

      fontSize: 11,

      color:
        colors.textMuted,
    },

    emptyContent: {
      alignItems:
        'center',

      justifyContent:
        'center',

      padding:
        spacing.xl,
    },

    emptyTitle: {
      ...typography.h2,

      fontSize: 18,

      textAlign:
        'center',

      marginTop:
        spacing.sm,
    },

    emptyText: {
      ...typography.body,

      color:
        colors.textMuted,

      textAlign:
        'center',

      lineHeight: 21,

      marginTop:
        spacing.xs,

      maxWidth: 350,
    },

    retryButton: {
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

    retryText: {
      color:
        '#fff',

      fontWeight:
        '800',
    },

    loginButton: {
      backgroundColor:
        colors.primary,

      paddingHorizontal:
        spacing.lg,

      paddingVertical:
        spacing.sm,

      borderRadius:
        radius.md,

      marginTop:
        spacing.lg,
    },

    loginButtonText: {
      color:
        '#fff',

      fontWeight:
        '800',
    },

  });