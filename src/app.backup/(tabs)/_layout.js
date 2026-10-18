import { Ionicons } from '@expo/vector-icons';
import { Tabs, router } from 'expo-router';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

export default function TabsLayout() {
  const {
    user,
    session,
    unreadNotificationCount,
    unreadMessageCount,
  } = useAuth();

  const notificationCount =
    unreadNotificationCount || 0;

  const messageCount =
    unreadMessageCount || 0;

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor:
            colors.background,
        },

        headerTintColor:
          colors.text,

        headerShadowVisible:
          false,

        headerRight: () => {
          if (!session) {
            return null;
          }

          return (
            <View
              style={
                styles.headerActions
              }
            >
              {/* PROFILE */}

              <Pressable
                style={
                  styles.headerButton
                }
                onPress={() =>
                  router.push(
                    '/profile'
                  )
                }
              >
                <View
                  style={
                    styles.profileCircle
                  }
                >
                  <Text
                    style={
                      styles.profileInitial
                    }
                  >
                    {(
                      user?.name ||
                      'N'
                    )
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>
              </Pressable>

              {/* MESSAGES */}

              <Pressable
                style={
                  styles.headerButton
                }
                onPress={() =>
                  router.push(
                    '/messages'
                  )
                }
              >
                <Ionicons
                  name="chatbubble-outline"
                  size={25}
                  color={
                    colors.text
                  }
                />

                {messageCount > 0 && (
                  <View
                    style={
                      styles.messageBadge
                    }
                  >
                    <Text
                      style={
                        styles.badgeText
                      }
                    >
                      {messageCount > 9
                        ? '9+'
                        : messageCount}
                    </Text>
                  </View>
                )}
              </Pressable>

              {/* NOTIFICATIONS */}

              <Pressable
                style={
                  styles.headerButton
                }
                onPress={() =>
                  router.push(
                    '/notifications'
                  )
                }
              >
                <Ionicons
                  name="notifications-outline"
                  size={25}
                  color={
                    colors.text
                  }
                />

                {notificationCount >
                  0 && (
                  <View
                    style={
                      styles.notificationBadge
                    }
                  >
                    <Text
                      style={
                        styles.badgeText
                      }
                    >
                      {notificationCount >
                      9
                        ? '9+'
                        : notificationCount}
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>
          );
        },

        tabBarActiveTintColor:
          colors.primaryLight,

        tabBarInactiveTintColor:
          colors.textMuted,

        tabBarStyle: {
          height: 76,
          marginHorizontal: 20,
          marginBottom: 14,
          backgroundColor:
            'rgba(24, 28, 46, 0.96)',
          borderWidth: 1,
          borderColor:
            'rgba(255, 255, 255, 0.10)',
          borderRadius: 28,
          elevation: 0,
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 14,
          shadowOffset: {
            width: 0,
            height: 6,
          },
        },

        tabBarItemStyle: {
          paddingTop: 7,
          paddingBottom: 5,
          borderRadius: 20,
        },

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({
            color,
            size,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? 'home'
                  : 'home-outline'
              }
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="courses"
        options={{
          title: 'Courses',
          tabBarIcon: ({
            color,
            size,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? 'book'
                  : 'book-outline'
              }
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="learn"
        options={{
          title: 'Learn',
          tabBarIcon: ({
            color,
            size,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? 'school'
                  : 'school-outline'
              }
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="live"
        options={{
          title: 'Live',
          tabBarIcon: ({
            color,
            size,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? 'radio'
                  : 'radio-outline'
              }
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({
            color,
            size,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? 'person'
                  : 'person-outline'
              }
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles =
  StyleSheet.create({
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 12,
      gap: 8,
    },

    headerButton: {
      width: 42,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },

    profileCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor:
        colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },

    profileInitial: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '800',
    },

    messageBadge: {
      position: 'absolute',
      top: 1,
      right: 0,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      borderRadius: 9,
      backgroundColor:
        colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor:
        colors.background,
    },

    notificationBadge: {
      position: 'absolute',
      top: 1,
      right: 0,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      borderRadius: 9,
      backgroundColor:
        '#ff3b30',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor:
        colors.background,
    },

    badgeText: {
      color: '#fff',
      fontSize: 9,
      fontWeight: '900',
      lineHeight: 12,
    },
  });