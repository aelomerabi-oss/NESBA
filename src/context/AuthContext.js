import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { router } from 'expo-router';

import { supabase } from '../lib/supabase';
import { unregisterPush } from '../lib/push';

import {
  colors,
  radius,
  spacing,
  typography,
} from '../constants/theme';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // ============================================
  // NOTIFICATIONS
  // ============================================

  const [notificationPopup, setNotificationPopup] =
    useState(null);

  const [unreadNotificationCount, setUnreadNotificationCount] =
    useState(0);

  const notificationPopupTimer = useRef(null);

  // ============================================
  // MESSAGES
  // ============================================

  const [messagePopup, setMessagePopup] =
    useState(null);

  const [unreadMessageCount, setUnreadMessageCount] =
    useState(0);

  const messagePopupTimer = useRef(null);

  // The user whose conversation is open, so their messages don't pop up.
  const activeConversationRef = useRef(null);

  const setActiveConversation = (userId) => {
    activeConversationRef.current = userId || null;
  };

  // ============================================
  // AUTH INITIALIZATION
  // ============================================

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      setSession(session);

      if (session?.user) {
        await fetchProfile(session.user.id);

        await refreshUnreadNotificationCount(
          session.user.id
        );

        await refreshUnreadMessageCount(
          session.user.id
        );
      } else {
        setLoading(false);
      }
    };

    initializeAuth();

    const {
      data: listener,
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;

        setSession(session);

        if (session?.user) {
          /*
           * Supabase holds its auth lock while this callback runs, so
           * querying from inside it can deadlock. Run the queries after.
           */
          setTimeout(async () => {
            if (!mounted) return;

            await fetchProfile(session.user.id);

            await refreshUnreadNotificationCount(
              session.user.id
            );

            await refreshUnreadMessageCount(
              session.user.id
            );
          }, 0);
        } else {
          setProfile(null);

          setUnreadNotificationCount(0);
          setUnreadMessageCount(0);

          setNotificationPopup(null);
          setMessagePopup(null);

          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;

      listener.subscription.unsubscribe();

      if (notificationPopupTimer.current) {
        clearTimeout(
          notificationPopupTimer.current
        );
      }

      if (messagePopupTimer.current) {
        clearTimeout(
          messagePopupTimer.current
        );
      }
    };
  }, []);

  // ============================================
  // FETCH PROFILE
  // ============================================

  const fetchProfile = async (userId) => {
    const {
      data,
      error,
    } = await supabase
      .from('profiles')
      // Every column except email, which is private (see 039_idor_fixes.sql).
      .select('id,full_name,avatar_url,bio,role,is_premium,created_at,updated_at,onboarded,goals,verification_status,requested_role,expertise,experience')
      .eq('id', userId)
      .single();

    if (!error) {
      setProfile(data);
    }

    setLoading(false);
  };

  // ============================================
  // NOTIFICATION COUNT
  // ============================================

  const refreshUnreadNotificationCount = async (
    userId = session?.user?.id
  ) => {
    if (!userId) {
      setUnreadNotificationCount(0);
      return;
    }

    const {
      count,
      error,
    } = await supabase
      .from('notifications')
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq('user_id', userId)
      .is('read_at', null);

    if (error) {
      console.error(
        'Unread notification count error:',
        error
      );

      return;
    }

    setUnreadNotificationCount(count || 0);
  };

  // ============================================
  // MESSAGE COUNT
  // ============================================

  const refreshUnreadMessageCount = async (
    userId = session?.user?.id
  ) => {
    if (!userId) {
      setUnreadMessageCount(0);
      return;
    }

    const {
      count,
      error,
    } = await supabase
      .from('direct_messages')
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq('recipient_id', userId)
      .is('read_at', null);

    if (error) {
      console.error(
        'Unread message count error:',
        error
      );

      return;
    }

    setUnreadMessageCount(count || 0);
  };

  // ============================================
  // GLOBAL REALTIME NOTIFICATIONS
  // ============================================

  useEffect(() => {
    if (!session?.user?.id) {
      return;
    }

    const userId = session.user.id;

    console.log(
      'Starting GLOBAL notification listener for:',
      userId
    );

    const channel = supabase
      .channel(
        `global-notifications-${userId}`
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log(
            'GLOBAL NEW NOTIFICATION:',
            payload.new
          );

          const newNotification =
            payload.new;

          setUnreadNotificationCount(
            (current) => current + 1
          );

          setNotificationPopup(
            newNotification
          );

          if (
            notificationPopupTimer.current
          ) {
            clearTimeout(
              notificationPopupTimer.current
            );
          }

          notificationPopupTimer.current =
            setTimeout(() => {
              setNotificationPopup(
                (current) => {
                  if (
                    current?.id ===
                    newNotification.id
                  ) {
                    return null;
                  }

                  return current;
                }
              );
            }, 7000);
        }
      )
      .subscribe((status) => {
        console.log(
          'GLOBAL notification realtime status:',
          status
        );
      });

    return () => {
      console.log(
        'Stopping GLOBAL notification listener'
      );

      if (
        notificationPopupTimer.current
      ) {
        clearTimeout(
          notificationPopupTimer.current
        );
      }

      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  // ============================================
  // GLOBAL REALTIME MESSAGES
  // ============================================

  useEffect(() => {
    if (!session?.user?.id) {
      return;
    }

    const userId = session.user.id;

    console.log(
      'Starting GLOBAL message listener for:',
      userId
    );

    const channel = supabase
      .channel(
        `global-messages-${userId}`
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `recipient_id=eq.${userId}`,
        },
        async (payload) => {
          console.log(
            'GLOBAL NEW MESSAGE:',
            payload.new
          );

          const newMessage =
            payload.new;

          /*
           * The open conversation screen already shows and reads it.
           */
          if (
            activeConversationRef.current ===
            newMessage.sender_id
          ) {
            return;
          }

          /*
           * Get sender profile so the popup
           * can show the sender's name.
           */
          let senderName =
            'NESBA Member';

          let senderAvatar = null;

          const {
            data: sender,
          } = await supabase
            .from('profiles')
            .select(
              'id,full_name,avatar_url'
            )
            .eq(
              'id',
              newMessage.sender_id
            )
            .single();

          if (sender) {
            senderName =
              sender.full_name ||
              'NESBA Member';

            senderAvatar =
              sender.avatar_url ||
              null;
          }

          const popupMessage = {
            ...newMessage,
            senderName,
            senderAvatar,
          };

          /*
           * Increase unread message count.
           */
          setUnreadMessageCount(
            (current) => current + 1
          );

          /*
           * Show message popup.
           */
          setMessagePopup(
            popupMessage
          );

          /*
           * Reset popup timer.
           */
          if (
            messagePopupTimer.current
          ) {
            clearTimeout(
              messagePopupTimer.current
            );
          }

          /*
           * Keep message popup visible
           * for 7 seconds.
           */
          messagePopupTimer.current =
            setTimeout(() => {
              setMessagePopup(
                (current) => {
                  if (
                    current?.id ===
                    newMessage.id
                  ) {
                    return null;
                  }

                  return current;
                }
              );
            }, 7000);
        }
      )
      .subscribe((status) => {
        console.log(
          'GLOBAL message realtime status:',
          status
        );
      });

    return () => {
      console.log(
        'Stopping GLOBAL message listener'
      );

      if (
        messagePopupTimer.current
      ) {
        clearTimeout(
          messagePopupTimer.current
        );
      }

      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  // ============================================
  // DISMISS NOTIFICATION
  // ============================================

  const dismissNotification =
    async () => {
      const notification =
        notificationPopup;

      setNotificationPopup(null);

      if (
        notificationPopupTimer.current
      ) {
        clearTimeout(
          notificationPopupTimer.current
        );
      }

      if (
        notification?.id &&
        !notification.read_at
      ) {
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
            notification.id
          );

        if (!error) {
          setUnreadNotificationCount(
            (current) =>
              Math.max(
                0,
                current - 1
              )
          );
        }
      }
    };

  // ============================================
  // DISMISS MESSAGE POPUP
  // ============================================

  const dismissMessage =
    async () => {
      const message =
        messagePopup;

      setMessagePopup(null);

      if (
        messagePopupTimer.current
      ) {
        clearTimeout(
          messagePopupTimer.current
        );
      }

      /*
       * Don't mark the message read merely
       * because the popup disappeared.
       *
       * The actual conversation screen
       * is responsible for marking messages
       * as read.
       */
    };

  // ============================================
  // OPEN MESSAGE
  // ============================================

  const openMessagePopup =
    () => {
      if (!messagePopup) {
        return;
      }

      const senderId =
        messagePopup.sender_id;

      setMessagePopup(null);

      if (
        messagePopupTimer.current
      ) {
        clearTimeout(
          messagePopupTimer.current
        );
      }

      if (senderId) {
        router.push(
          `/messages/${senderId}`
        );
      }
    };

  // ============================================
  // SIGN UP
  // ============================================

  const signUp = async (
    email,
    password,
    fullName
  ) => {
    const {
      data,
      error,
    } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    return {
      data,
      error,
    };
  };

  // ============================================
  // SIGN IN
  // ============================================

  const signIn = async (
    email,
    password
  ) => {
    const {
      data,
      error,
    } =
      await supabase.auth.signInWithPassword(
        {
          email,
          password,
        }
      );

    return {
      data,
      error,
    };
  };

  // ============================================
  // REFRESH PROFILE
  // ============================================

  const refreshProfile =
    async () => {
      if (session?.user?.id) {
        await fetchProfile(
          session.user.id
        );

        await refreshUnreadNotificationCount(
          session.user.id
        );

        await refreshUnreadMessageCount(
          session.user.id
        );
      }
    };

  // ============================================
  // SIGN OUT
  // ============================================

  const signOut = async () => {
    // Stop pushes to this phone while we can still prove who we are.
    await unregisterPush().catch(() => {});
    await supabase.auth.signOut();

    setNotificationPopup(null);
    setMessagePopup(null);

    setUnreadNotificationCount(0);
    setUnreadMessageCount(0);

    if (
      notificationPopupTimer.current
    ) {
      clearTimeout(
        notificationPopupTimer.current
      );
    }

    if (
      messagePopupTimer.current
    ) {
      clearTimeout(
        messagePopupTimer.current
      );
    }
  };

  // ============================================
  // PREMIUM
  // ============================================

  const upgradeToPremium =
    async () => {
      if (!session?.user) return;

      const {
        error,
      } = await supabase
        .from('profiles')
        .update({
          is_premium: true,
        })
        .eq(
          'id',
          session.user.id
        );

      if (!error) {
        setProfile(
          (prev) => ({
            ...prev,
            is_premium: true,
          })
        );
      }
    };

  const cancelPremium =
    async () => {
      if (!session?.user) return;

      const {
        error,
      } = await supabase
        .from('profiles')
        .update({
          is_premium: false,
        })
        .eq(
          'id',
          session.user.id
        );

      if (!error) {
        setProfile(
          (prev) => ({
            ...prev,
            is_premium: false,
          })
        );
      }
    };

  // ============================================
  // USER OBJECT
  // ============================================

  const user = {
    id:
      session?.user?.id ||
      null,

    name:
      profile?.full_name ||
      'Guest Student',

    email:
      session?.user?.email ||
      'guest@nesba.app',

    avatarUrl:
      profile?.avatar_url ||
      null,

    isPremium:
      profile?.is_premium ||
      false,

    loggedIn:
      !!session,

    role:
      profile?.role ||
      'student',

    verificationStatus:
      profile?.verification_status ||
      'unverified',

    requestedRole:
      profile?.requested_role ||
      null,
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,

        signUp,
        signIn,
        signOut,

        refreshProfile,

        upgradeToPremium,
        cancelPremium,

        // =====================================
        // NOTIFICATIONS
        // =====================================

        unreadNotificationCount,

        refreshUnreadNotificationCount,

        // =====================================
        // MESSAGES
        // =====================================

        unreadMessageCount,

        refreshUnreadMessageCount,

        messagePopup,

        dismissMessage,

        openMessagePopup,

        setActiveConversation,
      }}
    >
      {children}

      {/* ======================================
          GLOBAL MESSAGE POPUP

          An overlay rather than a Modal: a Modal
          blocks every tap on the screen while the
          popup is visible.
         ====================================== */}

      {!!messagePopup && (
        <View
          style={
            styles.popupLayer
          }
          pointerEvents="box-none"
        >
          {messagePopup && (
            <Pressable
              style={
                styles.messagePopup
              }
              onPress={
                openMessagePopup
              }
            >
              <View
                style={
                  styles.messageIcon
                }
              >
                <Text
                  style={
                    styles.messageIconText
                  }
                >
                  💬
                </Text>
              </View>

              <View
                style={
                  styles.popupContent
                }
              >
                <Text
                  style={
                    styles.messagePopupLabel
                  }
                >
                  New Message
                </Text>

                <Text
                  style={
                    styles.popupTitle
                  }
                  numberOfLines={1}
                >
                  {messagePopup.senderName}
                </Text>

                <Text
                  style={
                    styles.popupBody
                  }
                  numberOfLines={2}
                >
                  {messagePopup.content}
                </Text>
              </View>

              <Pressable
                style={
                  styles.closeButton
                }
                onPress={
                  dismissMessage
                }
              >
                <Text
                  style={
                    styles.closeText
                  }
                >
                  ×
                </Text>
              </Pressable>
            </Pressable>
          )}
        </View>
      )}

      {/* ======================================
          GLOBAL RED NOTIFICATION POPUP
         ====================================== */}

      {!!notificationPopup && (
        <View
          style={
            styles.popupLayer
          }
          pointerEvents="box-none"
        >
          {notificationPopup && (
            <Pressable
              style={
                styles.notificationPopup
              }
              onPress={
                dismissNotification
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
                  🔔
                </Text>
              </View>

              <View
                style={
                  styles.popupContent
                }
              >
                <Text
                  style={
                    styles.notificationPopupLabel
                  }
                >
                  NESBA Notification
                </Text>

                <Text
                  style={
                    styles.popupTitle
                  }
                  numberOfLines={2}
                >
                  {
                    notificationPopup.title
                  }
                </Text>

                <Text
                  style={
                    styles.popupBody
                  }
                  numberOfLines={3}
                >
                  {
                    notificationPopup.body
                  }
                </Text>
              </View>

              <Pressable
                style={
                  styles.closeButton
                }
                onPress={
                  dismissNotification
                }
              >
                <Text
                  style={
                    styles.closeText
                  }
                >
                  ×
                </Text>
              </Pressable>
            </Pressable>
          )}
        </View>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx =
    useContext(AuthContext);

  if (!ctx) {
    throw new Error(
      'useAuth must be used within AuthProvider'
    );
  }

  return ctx;
}

const styles =
  StyleSheet.create({
    popupLayer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      elevation: 1000,
      alignItems: 'center',
      paddingTop: 20,
      paddingHorizontal: 16,
    },

    messagePopup: {
      width: '100%',
      maxWidth: 560,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        colors.surface,
      borderWidth: 2,
      borderColor:
        colors.primary,
      borderRadius:
        radius.md,
      padding:
        spacing.md,

      boxShadow:
        '0px 8px 28px rgba(0,0,0,0.45)',
    },

    notificationPopup: {
      width: '100%',
      maxWidth: 560,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        colors.surface,
      borderWidth: 2,
      borderColor:
        '#ff3b30',
      borderRadius:
        radius.md,
      padding:
        spacing.md,

      boxShadow:
        '0px 8px 28px rgba(0,0,0,0.45)',
    },

    messageIcon: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor:
        colors.primary,
      alignItems:
        'center',
      justifyContent:
        'center',
      marginRight:
        spacing.sm,
    },

    messageIconText: {
      fontSize: 21,
    },

    notificationIcon: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor:
        '#ff3b30',
      alignItems:
        'center',
      justifyContent:
        'center',
      marginRight:
        spacing.sm,
    },

    notificationIconText: {
      fontSize: 21,
    },

    popupContent: {
      flex: 1,
    },

    messagePopupLabel: {
      ...typography.caption,
      color:
        colors.primary,
      fontWeight:
        '800',
      marginBottom: 3,
    },

    notificationPopupLabel: {
      ...typography.caption,
      color:
        '#ff3b30',
      fontWeight:
        '800',
      marginBottom: 3,
    },

    popupTitle: {
      ...typography.body,
      fontWeight:
        '800',
    },

    popupBody: {
      ...typography.caption,
      color:
        colors.textMuted,
      marginTop: 3,
      lineHeight: 18,
    },

    closeButton: {
      width: 36,
      height: 36,
      alignItems:
        'center',
      justifyContent:
        'center',
      marginLeft:
        spacing.xs,
    },

    closeText: {
      fontSize: 28,
      color:
        colors.textMuted,
      lineHeight: 30,
    },
  });