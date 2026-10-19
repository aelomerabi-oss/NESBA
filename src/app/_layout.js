import '../lib/quiet-logs';
import '../lib/web-alert';
import { router, Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { colors, isDarkTheme } from '../constants/theme';
import { AuthProvider, useAuth } from '../context/AuthContext';

// Screens a signed-in user may be on before finishing onboarding.
const ONBOARDING_EXEMPT = ['onboarding', 'login', 'signup', 'auth', 'reset-password', 'organization-registration', 'privacy', 'terms'];

/*
 * Accounts start with onboarded = false. Send them to onboarding once
 * their profile has loaded; onboarding sets the flag and refreshes it.
 */
function OnboardingGate() {
  const { session, profile, loading } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (loading || !session || !profile || profile.onboarded !== false) {
      return;
    }

    if (!ONBOARDING_EXEMPT.includes(segments[0])) {
      router.replace('/onboarding');
    }
  }, [loading, session, profile, segments]);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <OnboardingGate />
      <StatusBar style={isDarkTheme ? 'light' : 'dark'} />

      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="feedback"
          options={{
            title: 'Feedback',
            presentation: 'modal',
          }}
        />

        <Stack.Screen
          name="login"
          options={{
            title: 'Log In',
            presentation: 'modal',
          }}
        />

        <Stack.Screen
          name="premium"
          options={{
            title: 'Go Premium',
            presentation: 'modal',
          }}
        />

        <Stack.Screen
          name="onboarding"
          options={{
            title: 'Get Started',
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="live-test"
          options={{
            title: 'Live Audio',
          }}
        />

        <Stack.Screen
          name="story/[id]"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="live/[roomId]"
          options={{
            title: 'Live Session',
          }}
        />

        {/* headerShown: false where the screen draws its own back bar. */}
        <Stack.Screen name="course/[id]" options={{ title: 'Course' }} />
        <Stack.Screen name="lesson/[id]" options={{ title: 'Lesson' }} />
        <Stack.Screen name="post/[id]" options={{ title: 'Post', headerShown: false }} />
        <Stack.Screen name="profile/[id]" options={{ title: 'Profile' }} />
        <Stack.Screen name="profile/edit" options={{ title: 'Edit Profile', headerShown: false }} />
        <Stack.Screen name="user/[id]" options={{ title: 'Profile', headerShown: false }} />
        <Stack.Screen name="organization/[id]" options={{ title: 'Organization', headerShown: false }} />
        <Stack.Screen name="certificate/[id]" options={{ title: 'Certificate' }} />
        <Stack.Screen name="messages/index" options={{ title: 'Messages' }} />
        <Stack.Screen name="messages/[userId]" options={{ title: 'Messages' }} />
        <Stack.Screen name="signup/index" options={{ title: 'Sign Up' }} />
        <Stack.Screen name="signup/student" options={{ title: 'Student Sign Up' }} />
        <Stack.Screen name="signup/teacher" options={{ title: 'Teacher Sign Up' }} />
        <Stack.Screen name="signup/organization" options={{ title: 'Organization Sign Up' }} />
        <Stack.Screen name="creator/index" options={{ title: 'Creator Studio' }} />
        <Stack.Screen name="creator/analytics/index" options={{ title: 'Analytics' }} />
        <Stack.Screen name="creator/courses/index" options={{ title: 'My Courses' }} />
        <Stack.Screen name="creator/courses/create" options={{ title: 'Create Course' }} />
        <Stack.Screen name="creator/payouts" options={{ title: 'Payouts' }} />
        <Stack.Screen name="creator/tutoring" options={{ title: 'Private Teaching' }} />
        <Stack.Screen name="tutoring/index" options={{ title: 'Private Sessions' }} />
        <Stack.Screen name="tutoring/[id]" options={{ title: 'Book a Session' }} />
        <Stack.Screen name="bookings" options={{ title: 'My Sessions' }} />
        <Stack.Screen name="creator/events/index" options={{ title: 'Events', headerShown: false }} />
        <Stack.Screen name="creator/media/index" options={{ title: 'Media', headerShown: false }} />
        <Stack.Screen name="creator/organizations/create" options={{ title: 'Create Organization', headerShown: false }} />
        <Stack.Screen name="auth/callback" options={{ title: 'Signing In' }} />
        <Stack.Screen name="edit-profile" options={{ title: 'Edit Profile' }} />
        <Stack.Screen name="organizations" options={{ title: 'Organizations' }} />
        <Stack.Screen name="projects/index" options={{ title: 'Practical Projects' }} />
        <Stack.Screen name="projects/create" options={{ title: 'Start a Project' }} />
        <Stack.Screen name="projects/[id]" options={{ title: 'Project' }} />
        <Stack.Screen name="organization-registration" options={{ title: 'Register Organization', headerShown: false }} />
        <Stack.Screen name="certificates" options={{ title: 'Certificates' }} />
        <Stack.Screen name="media" options={{ title: 'Media' }} />
        <Stack.Screen name="search" options={{ title: 'Search', headerShown: false }} />
        <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
        <Stack.Screen name="admin" options={{ title: 'Admin' }} />
        <Stack.Screen name="reset-password" options={{ title: 'Reset Password' }} />
        <Stack.Screen name="privacy" options={{ title: 'Privacy Policy' }} />
        <Stack.Screen name="terms" options={{ title: 'Terms of Use' }} />
      </Stack>
    </AuthProvider>
  );
}