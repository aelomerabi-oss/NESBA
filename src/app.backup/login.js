import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import {
  colors,
  spacing,
  typography,
  radius,
} from '../constants/theme';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleLogin = async () => {
    console.log('LOGIN BUTTON PRESSED');

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      Alert.alert(
        'Missing email',
        'Please enter your email address.'
      );
      return;
    }

    if (!password) {
      Alert.alert(
        'Missing password',
        'Please enter your password.'
      );
      return;
    }

    setSubmitting(true);

    try {
      console.log(
        'Attempting login:',
        cleanEmail
      );

      const { data, error } = await signIn(
        cleanEmail,
        password
      );

      console.log(
        'LOGIN RESULT:',
        JSON.stringify(
          {
            data,
            error: error
              ? {
                  message: error.message,
                  status: error.status,
                  code: error.code,
                  name: error.name,
                }
              : null,
          },
          null,
          2
        )
      );

      if (error) {
        Alert.alert(
          'Login failed',
          error.message ||
            'Could not log in.'
        );
        return;
      }

      if (!data?.session) {
        Alert.alert(
          'Login failed',
          'No active session was created.'
        );
        return;
      }

      console.log('LOGIN SUCCESS');

      router.replace('/(tabs)');
    } catch (error) {
      console.error(
        'LOGIN EXCEPTION:',
        error
      );

      Alert.alert(
        'Login failed',
        error?.message ||
          'Something went wrong.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = async () => {
    console.log(
      'CREATE ACCOUNT BUTTON PRESSED'
    );

    const cleanEmail =
      email.trim().toLowerCase();

    const cleanName =
      name.trim();

    if (!cleanName) {
      Alert.alert(
        'Missing name',
        'Please enter your full name.'
      );
      return;
    }

    if (!cleanEmail) {
      Alert.alert(
        'Missing email',
        'Please enter your email address.'
      );
      return;
    }

    if (!password) {
      Alert.alert(
        'Missing password',
        'Please enter a password.'
      );
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        'Password too short',
        'Your password must contain at least 6 characters.'
      );
      return;
    }

    setSubmitting(true);

    try {
      console.log(
        'Creating account:',
        cleanEmail
      );

      const { data, error } =
        await signUp(
          cleanEmail,
          password,
          cleanName
        );

      console.log(
        'SIGNUP RESULT:',
        JSON.stringify(
          {
            data,
            error: error
              ? {
                  message: error.message,
                  status: error.status,
                  code: error.code,
                  name: error.name,
                }
              : null,
          },
          null,
          2
        )
      );

      if (error) {
        console.error(
          'SIGNUP ERROR:',
          error
        );

        Alert.alert(
          'Sign up failed',
          error.message ||
            'Could not create your account.'
        );

        return;
      }

      if (!data?.user) {
        Alert.alert(
          'Sign up failed',
          'Supabase did not create the account.'
        );

        return;
      }

      if (data.session) {
        Alert.alert(
          'Account created',
          'Your NESBA account has been created and you are logged in.'
        );

        router.replace('/(tabs)');
      } else {
        Alert.alert(
          'Account created',
          'Your account was created, but email confirmation may be required before you can log in.'
        );

        setMode('login');
        setPassword('');
      }
    } catch (error) {
      console.error(
        'SIGNUP EXCEPTION:',
        error
      );

      Alert.alert(
        'Sign up failed',
        error?.message ||
          'Something went wrong.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword =
    async () => {
      console.log(
        'FORGOT PASSWORD PRESSED'
      );

      const cleanEmail =
        email.trim().toLowerCase();

      if (!cleanEmail) {
        Alert.alert(
          'Enter your email',
          'Enter your NESBA email address first.'
        );
        return;
      }

      setResetting(true);

      try {
        console.log(
          'Sending password reset to:',
          cleanEmail
        );

        const { error } =
          await supabase.auth.resetPasswordForEmail(
            cleanEmail,
            {
              redirectTo:
                'http://localhost:8081/reset-password',
            }
          );

        if (error) {
          console.error(
            'PASSWORD RESET ERROR:',
            error
          );

          Alert.alert(
            'Reset failed',
            error.message ||
              'Could not send the reset email.'
          );

          return;
        }

        Alert.alert(
          'Check your email',
          `A password reset link was sent to ${cleanEmail}.`
        );
      } catch (error) {
        console.error(
          'PASSWORD RESET EXCEPTION:',
          error
        );

        Alert.alert(
          'Reset failed',
          error?.message ||
            'Could not send the reset email.'
        );
      } finally {
        setResetting(false);
      }
    };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <View style={styles.brand}>
        <Image
          source={require('../assets/images/nesba-logo.png')}
          style={styles.logo}
        />

        <Text style={styles.brandName}>
          NESBA
        </Text>

        <Text style={styles.tagline}>
          National Entrepreneurship & Small Business Academy
        </Text>
      </View>

      <View style={styles.toggleRow}>
        <Pressable
          style={[
            styles.toggleBtn,
            mode === 'login' &&
              styles.toggleBtnActive,
          ]}
          onPress={() => {
            console.log(
              'LOGIN TAB PRESSED'
            );

            setMode('login');
          }}
        >
          <Text
            style={[
              styles.toggleText,
              mode === 'login' &&
                styles.toggleTextActive,
            ]}
          >
            Log In
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.toggleBtn,
            mode === 'signup' &&
              styles.toggleBtnActive,
          ]}
          onPress={() => {
            console.log(
              'SIGN UP TAB PRESSED'
            );

            setMode('signup');
          }}
        >
          <Text
            style={[
              styles.toggleText,
              mode === 'signup' &&
                styles.toggleTextActive,
            ]}
          >
            Sign Up
          </Text>
        </Pressable>
      </View>

      <View style={styles.form}>
        {mode === 'signup' && (
          <>
            <Text style={styles.label}>
              Full Name
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Jane Doe"
              placeholderTextColor={
                colors.textMuted
              }
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </>
        )}

        <Text style={styles.label}>
          Email
        </Text>

        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor={
            colors.textMuted
          }
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />

        <Text style={styles.label}>
          Password
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={
            colors.textMuted
          }
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />

        {mode === 'login' && (
          <Pressable
            style={styles.forgotButton}
            onPress={
              handleForgotPassword
            }
            disabled={resetting}
          >
            {resetting ? (
              <ActivityIndicator
                size="small"
                color={colors.primary}
              />
            ) : (
              <Text
                style={styles.forgotText}
              >
                Forgot Password?
              </Text>
            )}
          </Pressable>
        )}

        <Pressable
          style={[
            styles.loginBtn,
            submitting &&
              styles.disabledBtn,
          ]}
          onPress={() => {
            console.log(
              'MAIN AUTH BUTTON PRESSED'
            );

            if (mode === 'login') {
              handleLogin();
            } else {
              handleSignUp();
            }
          }}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text
              style={styles.loginBtnText}
            >
              {mode === 'signup'
                ? 'Create Account'
                : 'Log In'}
            </Text>
          )}
        </Pressable>

        <Pressable
          style={styles.skipBtn}
          onPress={() => {
            console.log(
              'CONTINUE AS GUEST PRESSED'
            );

            router.back();
          }}
        >
          <Text
            style={styles.skipBtnText}
          >
            Continue as Guest
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:
      colors.background,
    padding: spacing.lg,
    justifyContent: 'center',
  },

  brand: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },

  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: spacing.sm,
  },

  brandName: {
    ...typography.h1,
    letterSpacing: 1,
  },

  tagline: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: spacing.lg,
  },

  toggleRow: {
    flexDirection: 'row',
    backgroundColor:
      colors.surface,
    borderRadius:
      radius.pill,
    padding: 4,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor:
      colors.border,
  },

  toggleBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius:
      radius.pill,
  },

  toggleBtnActive: {
    backgroundColor:
      colors.primary,
  },

  toggleText: {
    color:
      colors.textMuted,
    fontWeight: '600',
    fontSize: 13,
  },

  toggleTextActive: {
    color: '#fff',
  },

  form: {
    gap: spacing.xs,
  },

  label: {
    ...typography.caption,
    marginTop: spacing.sm,
    marginBottom: 4,
  },

  input: {
    backgroundColor:
      colors.surface,
    borderWidth: 1,
    borderColor:
      colors.border,
    borderRadius:
      radius.md,
    padding:
      spacing.sm,
    color: colors.text,
    fontSize: 15,
  },

  forgotButton: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },

  forgotText: {
    color:
      colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },

  loginBtn: {
    backgroundColor:
      colors.primary,
    padding:
      spacing.md,
    borderRadius:
      radius.md,
    alignItems: 'center',
    marginTop:
      spacing.sm,
    minHeight: 50,
    justifyContent:
      'center',
  },

  disabledBtn: {
    opacity: 0.6,
  },

  loginBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },

  skipBtn: {
    alignItems: 'center',
    padding:
      spacing.sm,
    marginTop:
      spacing.xs,
  },

  skipBtnText: {
    color:
      colors.textMuted,
    fontSize: 13,
  },
});