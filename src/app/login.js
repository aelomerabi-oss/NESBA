import { useState } from 'react';

import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { router } from 'expo-router';

import {
  colors,
  radius,
  spacing,
  typography,
} from '../constants/theme';

import { supabase } from '../lib/supabase';

import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [submitting, setSubmitting] =
    useState(false);

  const [resetting, setResetting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState('');

  function clearError() {
    setErrorMessage('');
  }

  const handleLogin = async () => {
    clearError();

    const cleanEmail =
      email.trim().toLowerCase();

    /*
     * REQUIRED EMAIL
     */

    if (!cleanEmail) {
      setErrorMessage(
        'Please enter your email address.'
      );
      return;
    }

    /*
     * BASIC EMAIL FORMAT CHECK
     */

    if (
      !cleanEmail.includes('@') ||
      !cleanEmail.includes('.')
    ) {
      setErrorMessage(
        'Please enter a valid email address.'
      );
      return;
    }

    /*
     * REQUIRED PASSWORD
     */

    if (!password) {
      setErrorMessage(
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

      const {
        data,
        error,
      } = await signIn(
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
                  message:
                    error.message,
                  status:
                    error.status,
                  code:
                    error.code,
                  name:
                    error.name,
                }
              : null,
          },
          null,
          2
        )
      );

      /*
       * LOGIN ERROR
       */

      if (error) {
        console.error(
          'LOGIN ERROR:',
          error
        );

        const message =
          error?.message ||
          '';

        const lowerMessage =
          message.toLowerCase();

        /*
         * SUPABASE COMMON LOGIN ERRORS
         */

        if (
          lowerMessage.includes(
            'invalid login credentials'
          ) ||
          lowerMessage.includes(
            'invalid credentials'
          ) ||
          lowerMessage.includes(
            'invalid email or password'
          )
        ) {
          setErrorMessage(
            'Incorrect email or password. Please check your details and try again.'
          );
        } else if (
          lowerMessage.includes(
            'email not confirmed'
          )
        ) {
          setErrorMessage(
            'Please confirm your email address before logging in.'
          );
        } else {
          setErrorMessage(
            message ||
            'Could not log in. Please try again.'
          );
        }

        return;
      }

      /*
       * NO SESSION
       */

      if (!data?.session) {
        setErrorMessage(
          'Login failed because no active session was created.'
        );

        return;
      }

      console.log(
        'LOGIN SUCCESS'
      );

      router.replace('/(tabs)');

    } catch (error) {
      console.error(
        'LOGIN EXCEPTION:',
        error
      );

      setErrorMessage(
        error?.message ||
        'Something went wrong while logging in. Please try again.'
      );

    } finally {
      setSubmitting(false);
    }
  };


  /*
   * FORGOT PASSWORD
   */

  const handleForgotPassword =
    async () => {
      clearError();

      const cleanEmail =
        email.trim().toLowerCase();

      if (!cleanEmail) {
        setErrorMessage(
          'Enter your email address first so we can send you a password reset link.'
        );
        return;
      }

      if (
        !cleanEmail.includes('@') ||
        !cleanEmail.includes('.')
      ) {
        setErrorMessage(
          'Please enter a valid email address.'
        );
        return;
      }

      setResetting(true);

      try {
        console.log(
          'Sending password reset to:',
          cleanEmail
        );

        const {
          error,
        } =
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

          setErrorMessage(
            error.message ||
            'Could not send the password reset email.'
          );

          return;
        }

        setErrorMessage('');

        /*
         * Use a normal message instead
         * of Alert for consistency.
         */

        setResetSuccess(
          `A password reset link was sent to ${cleanEmail}.`
        );

      } catch (error) {
        console.error(
          'PASSWORD RESET EXCEPTION:',
          error
        );

        setErrorMessage(
          error?.message ||
          'Could not send the password reset email.'
        );

      } finally {
        setResetting(false);
      }
    };


  /*
   * PASSWORD RESET SUCCESS MESSAGE
   */

  const [
    resetSuccess,
    setResetSuccess,
  ] = useState('');


  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >

      {/* BRAND */}

      <View style={styles.brand}>

        <Image
          source={require(
            '../assets/images/nesba-logo.png'
          )}
          style={styles.logo}
        />

        <Text style={styles.brandName}>
          NESBA
        </Text>

        <Text style={styles.tagline}>
          National Entrepreneurship & Small Business Academy
        </Text>

      </View>


      {/* LOGIN TITLE */}

      <View style={styles.loginHeader}>

        <Text style={styles.loginTitle}>
          Log In
        </Text>

        <Text style={styles.loginSubtitle}>
          Welcome back to NESBA.
        </Text>

      </View>


      {/* FORM */}

      <View style={styles.form}>

        {/* ERROR */}

        {errorMessage ? (
          <View style={styles.errorBox}>

            <Text style={styles.errorIcon}>
              !
            </Text>

            <View style={styles.errorContent}>

              <Text style={styles.errorTitle}>
                Login error
              </Text>

              <Text style={styles.errorText}>
                {errorMessage}
              </Text>

            </View>

          </View>
        ) : null}


        {/* RESET SUCCESS */}

        {resetSuccess ? (
          <View style={styles.successBox}>

            <Text style={styles.successIcon}>
              ✓
            </Text>

            <Text style={styles.successText}>
              {resetSuccess}
            </Text>

          </View>
        ) : null}


        {/* EMAIL */}

        <Text style={styles.label}>

          Email

          <Text style={styles.required}>
            {' '}*
          </Text>

        </Text>

        <TextInput
          style={[
            styles.input,
            errorMessage &&
            !email.trim() &&
            styles.inputError,
          ]}
          placeholder="you@example.com"
          placeholderTextColor={
            colors.textMuted
          }
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            clearError();
            setResetSuccess('');
          }}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          editable={!submitting}
        />


        {/* PASSWORD */}

        <Text style={styles.label}>

          Password

          <Text style={styles.required}>
            {' '}*
          </Text>

        </Text>

        <TextInput
          style={[
            styles.input,
            errorMessage &&
            !password &&
            styles.inputError,
          ]}
          placeholder="Password"
          placeholderTextColor={
            colors.textMuted
          }
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            clearError();
          }}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!submitting}
        />


        {/* FORGOT PASSWORD */}

        <Pressable
          style={styles.forgotButton}
          onPress={
            handleForgotPassword
          }
          disabled={
            resetting ||
            submitting
          }
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


        {/* LOGIN BUTTON */}

        <Pressable
          style={[
            styles.loginBtn,
            submitting &&
              styles.disabledBtn,
          ]}
          onPress={
            handleLogin
          }
          disabled={
            submitting
          }
        >

          {submitting ? (
            <ActivityIndicator
              color="#fff"
            />
          ) : (
            <Text
              style={
                styles.loginBtnText
              }
            >
              Log In
            </Text>
          )}

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
    padding:
      spacing.lg,
    justifyContent:
      'center',
  },

  brand: {
    alignItems:
      'center',
    marginBottom:
      spacing.lg,
  },

  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom:
      spacing.sm,
  },

  brandName: {
    ...typography.h1,
    letterSpacing: 1,
  },

  tagline: {
    ...typography.caption,
    textAlign:
      'center',
    marginTop: 4,
    paddingHorizontal:
      spacing.lg,
  },

  loginHeader: {
    alignItems:
      'center',
    marginBottom:
      spacing.md,
  },

  loginTitle: {
    color:
      colors.text,
    fontSize: 28,
    fontWeight: '900',
  },

  loginSubtitle: {
    color:
      colors.textMuted,
    fontSize: 14,
    marginTop: 4,
  },

  form: {
    gap:
      spacing.xs,
  },

  label: {
    ...typography.caption,
    marginTop:
      spacing.sm,
    marginBottom: 4,
    color:
      colors.text,
    fontWeight: '700',
  },

  required: {
    color:
      '#ff4d67',
    fontWeight: '900',
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
    color:
      colors.text,
    fontSize: 15,
    minHeight: 50,
  },

  inputError: {
    borderColor:
      '#ff4d67',
  },

  errorBox: {
    flexDirection:
      'row',
    alignItems:
      'flex-start',
    backgroundColor:
      'rgba(255, 77, 103, 0.10)',
    borderWidth: 1,
    borderColor:
      '#ff4d67',
    borderRadius:
      radius.md,
    padding:
      spacing.md,
    marginBottom:
      spacing.sm,
  },

  errorIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor:
      '#ff4d67',
    color: '#fff',
    textAlign:
      'center',
    lineHeight: 24,
    fontWeight:
      '900',
    marginRight:
      spacing.sm,
  },

  errorContent: {
    flex: 1,
  },

  errorTitle: {
    color:
      '#ff4d67',
    fontSize: 14,
    fontWeight:
      '900',
    marginBottom: 2,
  },

  errorText: {
    color:
      colors.text,
    fontSize: 13,
    lineHeight: 19,
  },

  successBox: {
    flexDirection:
      'row',
    alignItems:
      'center',
    backgroundColor:
      'rgba(40, 200, 120, 0.10)',
    borderWidth: 1,
    borderColor:
      colors.success,
    borderRadius:
      radius.md,
    padding:
      spacing.md,
    marginBottom:
      spacing.sm,
  },

  successIcon: {
    color:
      colors.success,
    fontSize: 20,
    fontWeight:
      '900',
    marginRight:
      spacing.sm,
  },

  successText: {
    flex: 1,
    color:
      colors.success,
    fontSize: 13,
    fontWeight:
      '700',
    lineHeight: 18,
  },

  forgotButton: {
    alignSelf:
      'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },

  forgotText: {
    color:
      colors.primary,
    fontWeight:
      '600',
    fontSize: 13,
  },

  loginBtn: {
    backgroundColor:
      colors.primary,
    padding:
      spacing.md,
    borderRadius:
      radius.md,
    alignItems:
      'center',
    marginTop:
      spacing.sm,
    minHeight: 50,
    justifyContent:
      'center',
  },

  disabledBtn: {
    opacity:
      0.6,
  },

  loginBtnText: {
    color:
      '#fff',
    fontWeight:
      '700',
    fontSize: 16,
  },

});