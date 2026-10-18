import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import {
  colors,
} from '../../constants/theme';


export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarActiveTintColor:
          colors.primary,

        tabBarInactiveTintColor:
          colors.textMuted,

        tabBarStyle: {
          backgroundColor:
            colors.surface,

          borderTopColor:
            colors.border,

          borderTopWidth: 1,

          height: 70,

          paddingBottom: 8,

          paddingTop: 6,
        },

        tabBarLabelStyle: {
          fontSize: 11,

          fontWeight:
            '700',
        },
      }}
    >

      {/* ================================================================
          HOME
          ================================================================ */}

      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',

          tabBarIcon: ({
            color,
            size,
          }) => (
            <Ionicons
              name="home-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />


      {/* ================================================================
          COURSES
          ================================================================ */}

      <Tabs.Screen
        name="courses"
        options={{
          title: 'Courses',

          tabBarIcon: ({
            color,
            size,
          }) => (
            <Ionicons
              name="book-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />


      {/* ================================================================
          LEARN
          ================================================================ */}

      <Tabs.Screen
        name="learn"
        options={{
          title: 'Learn',

          tabBarIcon: ({
            color,
            size,
          }) => (
            <Ionicons
              name="school-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />


      {/* ================================================================
          LIVE
          ================================================================ */}

      <Tabs.Screen
        name="live"
        options={{
          title: 'Live',

          tabBarIcon: ({
            color,
            size,
          }) => (
            <Ionicons
              name="radio-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />


      {/* ================================================================
          PROFILE
          ================================================================ */}

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',

          tabBarIcon: ({
            color,
            size,
          }) => (
            <Ionicons
              name="person-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

    </Tabs>
  );
}