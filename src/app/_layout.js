import '../lib/web-alert';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../constants/theme';
import { AuthProvider } from '../context/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />

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
      </Stack>
    </AuthProvider>
  );
}