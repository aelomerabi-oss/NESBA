import { useState } from 'react';

import {
    Alert,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import {
    colors,
    radius,
    spacing,
} from '../constants/theme';

import {
    signInWithApple,
    signInWithGoogle,
} from '../lib/social-auth';

export default function SocialAuthButtons({
  onSuccess,
}) {
  const [loading, setLoading] =
    useState(null);

  async function handleGoogle() {
    try {
      setLoading('google');

      await signInWithGoogle();

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error(
        'Google authentication error:',
        error
      );

      if (
        !error?.message
          ?.toLowerCase()
          .includes('cancel')
      ) {
        Alert.alert(
          'Google Sign In',
          error?.message ||
            'Google sign in could not be completed.'
        );
      }
    } finally {
      setLoading(null);
    }
  }

  async function handleApple() {
    try {
      setLoading('apple');

      await signInWithApple();

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error(
        'Apple authentication error:',
        error
      );

      if (
        !error?.message
          ?.toLowerCase()
          .includes('cancel')
      ) {
        Alert.alert(
          'Apple Sign In',
          error?.message ||
            'Apple sign in could not be completed.'
        );
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.dividerRow}>
        <View style={styles.line} />

        <Text style={styles.orText}>
          OR
        </Text>

        <View style={styles.line} />
      </View>

      {/* GOOGLE */}

      <Pressable
        onPress={handleGoogle}
        disabled={loading !== null}
        style={({ pressed }) => [
          styles.googleButton,
          pressed && styles.pressed,
          loading !== null &&
            styles.disabled,
        ]}
      >
        <View style={styles.googleIcon}>
          <Text style={styles.googleG}>
            G
          </Text>
        </View>

        <Text style={styles.googleText}>
          {loading === 'google'
            ? 'Connecting to Google...'
            : 'Continue with Google'}
        </Text>
      </Pressable>

      {/* APPLE */}

      <Pressable
        onPress={handleApple}
        disabled={loading !== null}
        style={({ pressed }) => [
          styles.appleButton,
          pressed && styles.pressed,
          loading !== null &&
            styles.disabled,
        ]}
      >
        <Ionicons
          name="logo-apple"
          size={22}
          color="#fff"
        />

        <Text style={styles.appleText}>
          {loading === 'apple'
            ? 'Connecting to Apple...'
            : 'Continue with Apple'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },

  orText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    marginHorizontal: spacing.sm,
  },

  googleButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#ddd',
    gap: 10,
  },

  googleIcon: {
    width: 25,
    height: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },

  googleG: {
    fontSize: 20,
    fontWeight: '900',
    color: '#4285F4',
  },

  googleText: {
    color: '#202124',
    fontSize: 14,
    fontWeight: '800',
  },

  appleButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    borderRadius: radius.md,
    marginTop: spacing.sm,
    gap: 10,
  },

  appleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },

  pressed: {
    opacity: 0.7,
  },

  disabled: {
    opacity: 0.55,
  },
});