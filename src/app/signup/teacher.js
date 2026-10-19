import { useState } from 'react';

import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import {
  colors,
  radius,
  spacing,
  typography,
} from '../../constants/theme';

import { supabase } from '../../lib/supabase';
import { signInWithProvider } from '../../lib/social-auth';

import LegalLinks from '../../components/LegalLinks';
export default function TeacherSignup() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] =
    useState(null);

  const [errorMessage, setErrorMessage] =
    useState('');

  const [successMessage, setSuccessMessage] =
    useState('');

  function clearMessages() {
    setErrorMessage('');
    setSuccessMessage('');
  }

  async function handleSignup() {
    clearMessages();

    if (!fullName.trim()) {
      setErrorMessage(
        'Please enter your full name.'
      );
      return;
    }

    if (!email.trim()) {
      setErrorMessage(
        'Please enter your email address.'
      );
      return;
    }

    if (!password) {
      setErrorMessage(
        'Please create a password.'
      );
      return;
    }

    if (!confirmPassword) {
      setErrorMessage(
        'Please confirm your password.'
      );
      return;
    }

    if (password.length < 6) {
      setErrorMessage(
        'Your password must contain at least 6 characters.'
      );
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage(
        'Passwords do not match. Please make sure both passwords are the same.'
      );
      return;
    }

    try {
      setLoading(true);

      const normalizedEmail =
        email.trim().toLowerCase();

      /*
       * CREATE TEACHER ACCOUNT
       */

      const {
        data,
        error,
      } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,

        options: {
          data: {
            full_name:
              fullName.trim(),

            account_type:
              'teacher',

            role:
              'teacher',
          },
        },
      });

      if (error) {
        throw error;
      }

      if (!data?.user) {
        throw new Error(
          'The teacher account could not be created.'
        );
      }

      /*
       * With email confirmation on, signing up an existing address does not
       * fail: Supabase returns a user with no identities and sends
       * no email.
       */
      if (data.user.identities?.length === 0) {
        setErrorMessage(
          'An account with this email already exists. Please log in instead.'
        );

        return;
      }

      /*
       * When email confirmation is enabled, signUp returns no session:
       * the user must confirm their email before logging in.
       */
      if (!data.session) {
        setSuccessMessage(
          'Account created. Check your email and tap the confirmation link, then log in.'
        );

        setTimeout(() => {
          router.replace('/login');
        }, 2500);

        return;
      }

      setSuccessMessage(
        'Your account is ready. A NESBA admin will review your teacher request; until it is approved your account works as a student account.'
      );

      setTimeout(() => {
        router.replace('/creator');
      }, 2500);

    } catch (error) {
      console.error(
        'Teacher signup error:',
        error
      );

      const message =
        error?.message ||
        'We could not create your teacher account. Please try again.';

      const lowerMessage =
        message.toLowerCase();

      if (
        lowerMessage.includes(
          'already registered'
        ) ||
        lowerMessage.includes(
          'already exists'
        ) ||
        lowerMessage.includes(
          'user already registered'
        )
      ) {
        setErrorMessage(
          'An account with this email already exists. Please log in instead.'
        );
      } else {
        setErrorMessage(message);
      }

    } finally {
      setLoading(false);
    }
  }

  /*
   * GOOGLE / APPLE
   *
   * Facebook and LinkedIn are disabled in Supabase.
   */

  async function handleSocialSignup(provider) {
    clearMessages();

    try {
      setSocialLoading(provider);

      await signInWithProvider(provider);

      /*
       * Accounts created through Google / Apple carry no sign-up form
       * data, so file the teacher request now that the user is signed in.
       */
      const {
        error: requestError,
      } = await supabase.rpc(
        'request_creator_role',
        {
          p_role: 'teacher',
        }
      );

      if (
        requestError &&
        !requestError.message?.includes('already have')
      ) {
        throw requestError;
      }

      setSuccessMessage(
        'Signed in. A NESBA admin will review your teacher request.'
      );

      setTimeout(() => {
        router.replace('/creator');
      }, 2000);

    } catch (error) {
      console.error(
        `${provider} teacher signup error:`,
        error
      );

      setErrorMessage(
        error?.message ||
        `Could not continue with ${getProviderName(
          provider
        )}.`
      );

    } finally {
      setSocialLoading(null);
    }
  }

  function getProviderName(provider) {
    const names = {
      google: 'Google',
      apple: 'Apple',
    };

    return names[provider] || provider;
  }

  const busy =
    loading ||
    socialLoading !== null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >

      {/* HEADER */}

      <View style={styles.header}>

        <View style={styles.iconCircle}>
          <Ionicons
            name="person-outline"
            size={30}
            color={colors.primary}
          />
        </View>

        <Text style={styles.title}>
          Teacher Sign Up
        </Text>

        <Text style={styles.subtitle}>
          Create your NESBA teacher account and start
          teaching.
        </Text>

      </View>


      {/* TEACHER INFORMATION */}

      <View style={styles.infoCard}>

        <View style={styles.infoIcon}>
          <Ionicons
            name="school-outline"
            size={22}
            color={colors.primary}
          />
        </View>

        <View style={styles.infoContent}>

          <Text style={styles.infoTitle}>
            Become a NESBA Teacher
          </Text>

          <Text style={styles.infoText}>
            Create courses, build lessons, schedule live
            classes, publish recordings and share
            educational content.
          </Text>

        </View>

      </View>


      {/* ERROR */}

      {errorMessage ? (
        <View style={styles.errorBox}>

          <Ionicons
            name="alert-circle"
            size={22}
            color="#ff4d67"
          />

          <View style={styles.messageContent}>

            <Text style={styles.errorTitle}>
              Sign up error
            </Text>

            <Text style={styles.errorText}>
              {errorMessage}
            </Text>

          </View>

        </View>
      ) : null}


      {/* SUCCESS */}

      {successMessage ? (
        <View style={styles.successBox}>

          <Ionicons
            name="checkmark-circle"
            size={22}
            color={colors.success}
          />

          <Text style={styles.successText}>
            {successMessage}
          </Text>

        </View>
      ) : null}


      {/* ACCOUNT FORM */}

      <View style={styles.card}>

        <Text style={styles.sectionTitle}>
          Account Information
        </Text>

        <Field
          label="Full Name"
          value={fullName}
          onChangeText={(value) => {
            setFullName(value);
            clearMessages();
          }}
          placeholder="Your full name"
        />

        <Field
          label="Email Address"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            clearMessages();
          }}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Field
          label="Password"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            clearMessages();
          }}
          placeholder="Create a password"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.passwordHint}>
          Minimum 6 characters.
        </Text>

        <Field
          label="Confirm Password"
          value={confirmPassword}
          onChangeText={(value) => {
            setConfirmPassword(value);
            clearMessages();
          }}
          placeholder="Enter your password again"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />

        {confirmPassword.length > 0 &&
        password !== confirmPassword ? (
          <View style={styles.inlineError}>

            <Ionicons
              name="close-circle"
              size={18}
              color="#ff4d67"
            />

            <Text style={styles.inlineErrorText}>
              Passwords do not match.
            </Text>

          </View>
        ) : null}

      </View>


      {/* ACCOUNT TYPE */}

      <View style={styles.accountTypeCard}>

        <View style={styles.accountTypeIcon}>
          <Ionicons
            name="person-circle-outline"
            size={25}
            color={colors.primary}
          />
        </View>

        <View style={styles.accountTypeInfo}>

          <Text style={styles.accountTypeLabel}>
            Account Type
          </Text>

          <Text style={styles.accountTypeValue}>
            Teacher
          </Text>

          <Text style={styles.accountTypeDescription}>
            Your account will have access to NESBA Creator
            Studio.
          </Text>

        </View>

        <Ionicons
          name="checkmark-circle"
          size={24}
          color={colors.primary}
        />

      </View>


      {/* CREATE ACCOUNT */}

      <Pressable
        onPress={handleSignup}
        disabled={busy}
        style={({ pressed }) => [
          styles.signupButton,
          pressed && styles.pressed,
          busy && styles.disabled,
        ]}
      >

        <Ionicons
          name="person-add-outline"
          size={21}
          color="#fff"
        />

        <Text style={styles.signupButtonText}>
          {loading
            ? 'Checking Account...'
            : 'Create Teacher Account'}
        </Text>

      </Pressable>


      <LegalLinks action="creating an account" />


      {/* SOCIAL DIVIDER */}

      <View style={styles.divider}>

        <View style={styles.dividerLine} />

        <Text style={styles.orText}>
          OR
        </Text>

        <View style={styles.dividerLine} />

      </View>


      {/* GOOGLE */}

      <Pressable
        onPress={() =>
          handleSocialSignup('google')
        }
        disabled={busy}
        style={({ pressed }) => [
          styles.socialButton,
          styles.googleButton,
          pressed && styles.pressed,
          busy && styles.disabled,
        ]}
      >

        <View style={styles.googleIcon}>

          <Text style={styles.googleG}>
            G
          </Text>

        </View>

        <Text style={styles.googleText}>
          {socialLoading === 'google'
            ? 'Connecting to Google...'
            : 'Continue with Google'}
        </Text>

      </Pressable>


      {/* APPLE */}

      <Pressable
        onPress={() =>
          handleSocialSignup('apple')
        }
        disabled={busy}
        style={({ pressed }) => [
          styles.socialButton,
          styles.appleButton,
          pressed && styles.pressed,
          busy && styles.disabled,
        ]}
      >

        <Ionicons
          name="logo-apple"
          size={23}
          color="#fff"
        />

        <Text style={styles.socialText}>
          {socialLoading === 'apple'
            ? 'Connecting to Apple...'
            : 'Continue with Apple'}
        </Text>

      </Pressable>


      {/* LOGIN */}

      <View style={styles.loginRow}>

        <Text style={styles.loginText}>
          Already have a NESBA account?
        </Text>

        <Pressable
          onPress={() =>
            router.push('/login')
          }
          disabled={busy}
        >

          <Text style={styles.loginLink}>
            Log In
          </Text>

        </Pressable>

      </View>


      {/* FOOTER */}

      <Text style={styles.footerText}>
        By creating a teacher account, you agree to use
        NESBA responsibly and provide educational content
        that follows our platform rules.
      </Text>

    </ScrollView>
  );
}


function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoCorrect = true,
}) {
  return (
    <View style={styles.field}>

      <Text style={styles.label}>

        {label}

        <Text style={styles.required}>
          {' '}*
        </Text>

      </Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={
          colors.textMuted
        }
        secureTextEntry={
          secureTextEntry
        }
        keyboardType={
          keyboardType
        }
        autoCapitalize={
          autoCapitalize
        }
        autoCorrect={
          autoCorrect
        }
        style={styles.input}
      />

    </View>
  );
}


const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor:
      colors.background,
  },

  content: {
    padding: spacing.md,
    paddingBottom:
      spacing.xl * 3,
    maxWidth: 700,
    width: '100%',
    alignSelf: 'center',
  },

  header: {
    alignItems: 'center',
    marginBottom:
      spacing.lg,
  },

  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor:
      colors.surface,
    borderWidth: 1,
    borderColor:
      colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom:
      spacing.sm,
  },

  title: {
    ...typography.h1,
    color:
      colors.text,
    fontSize: 30,
    textAlign:
      'center',
  },

  subtitle: {
    color:
      colors.textMuted,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 5,
    textAlign:
      'center',
  },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor:
      colors.surface,
    borderWidth: 1,
    borderColor:
      colors.primary,
    borderRadius:
      radius.md,
    padding:
      spacing.md,
    marginBottom:
      spacing.md,
  },

  infoIcon: {
    width: 42,
    height: 42,
    borderRadius:
      radius.md,
    backgroundColor:
      colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight:
      spacing.sm,
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    color:
      colors.text,
    fontWeight: '900',
    fontSize: 16,
  },

  infoText: {
    color:
      colors.textMuted,
    lineHeight: 19,
    marginTop: 4,
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
      spacing.md,
    gap:
      spacing.sm,
  },

  messageContent: {
    flex: 1,
  },

  errorTitle: {
    color:
      '#ff4d67',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 3,
  },

  errorText: {
    color:
      colors.text,
    fontSize: 13,
    lineHeight: 19,
  },

  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
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
      spacing.md,
    gap:
      spacing.sm,
  },

  successText: {
    flex: 1,
    color:
      colors.success,
    fontSize: 13,
    fontWeight: '700',
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
      spacing.md,
  },

  sectionTitle: {
    color:
      colors.text,
    fontSize: 19,
    fontWeight: '900',
    marginBottom:
      spacing.sm,
  },

  field: {
    marginTop:
      spacing.sm,
  },

  label: {
    color:
      colors.text,
    fontWeight: '800',
    marginBottom:
      spacing.xs,
  },

  required: {
    color:
      '#ff4d67',
  },

  input: {
    minHeight: 51,
    borderWidth: 1,
    borderColor:
      colors.border,
    borderRadius:
      radius.md,
    backgroundColor:
      colors.background,
    color:
      colors.text,
    paddingHorizontal:
      spacing.md,
    paddingVertical:
      spacing.sm,
  },

  passwordHint: {
    color:
      colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },

  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 7,
  },

  inlineErrorText: {
    color:
      '#ff4d67',
    fontSize: 12,
    fontWeight: '700',
  },

  accountTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
      spacing.md,
  },

  accountTypeIcon: {
    width: 46,
    height: 46,
    borderRadius:
      radius.md,
    backgroundColor:
      colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight:
      spacing.sm,
  },

  accountTypeInfo: {
    flex: 1,
  },

  accountTypeLabel: {
    color:
      colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },

  accountTypeValue: {
    color:
      colors.text,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 1,
  },

  accountTypeDescription: {
    color:
      colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },

  signupButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor:
      colors.primary,
    borderRadius:
      radius.md,
  },

  signupButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical:
      spacing.lg,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor:
      colors.border,
  },

  orText: {
    color:
      colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
    marginHorizontal:
      spacing.sm,
  },

  socialButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius:
      radius.md,
    marginBottom:
      spacing.sm,
  },

  googleButton: {
    backgroundColor:
      '#fff',
    borderWidth: 1,
    borderColor:
      '#ddd',
  },

  googleIcon: {
    width: 25,
    height: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },

  googleG: {
    color:
      '#4285F4',
    fontSize: 21,
    fontWeight: '900',
  },

  googleText: {
    color:
      '#202124',
    fontSize: 14,
    fontWeight: '900',
  },

  appleButton: {
    backgroundColor:
      '#000',
  },

  socialText: {
    color:
      '#fff',
    fontSize: 14,
    fontWeight: '900',
  },

  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop:
      spacing.lg,
  },

  loginText: {
    color:
      colors.textMuted,
  },

  loginLink: {
    color:
      colors.primary,
    fontWeight: '900',
  },

  footerText: {
    color:
      colors.textMuted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop:
      spacing.lg,
    paddingHorizontal:
      spacing.md,
  },

  pressed: {
    opacity: 0.7,
  },

  disabled: {
    opacity: 0.55,
  },

});