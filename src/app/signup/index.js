
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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

const ACCOUNT_TYPES = [
  {
    id: 'student',
    title: 'Student',
    description:
      'Learn courses, attend events, discover educational content and connect with communities.',
    icon: 'school-outline',
    route: '/signup/student',
  },
  {
    id: 'teacher',
    title: 'Teacher',
    description:
      'Create courses, teach students, publish lessons and share educational content.',
    icon: 'person-outline',
    route: '/signup/teacher',
  },
  {
    id: 'organization',
    title: 'Organisation',
    description:
      'Create an official NESBA organisation account and manage courses, events, media and creators.',
    icon: 'business-outline',
    route: '/signup/organization',
  },
];

export default function Signup() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >

      {/* HEADER */}

      <View style={styles.header}>

        <Image accessibilityLabel="NESBA logo"
          source={require('../../assets/images/nesba-logo.png')}
          style={styles.logo}
        />

        <Text style={styles.title}>
          NESBA Sign Up
        </Text>

        <Text style={styles.subtitle}>
          Choose how you want to join NESBA.
        </Text>

      </View>


      {/* ACCOUNT TYPES */}

      <View style={styles.options}>

        {ACCOUNT_TYPES.map((account) => (
          <Pressable
            key={account.id}
            onPress={() =>
              router.push(account.route)
            }
            style={({ pressed }) => [
              styles.accountCard,
              pressed && styles.pressed,
            ]}
          >

            <View style={styles.iconContainer}>

              <Ionicons
                name={account.icon}
                size={30}
                color={colors.primary}
              />

            </View>


            <View style={styles.accountInfo}>

              <View style={styles.titleRow}>

                <Text style={styles.accountTitle}>
                  {account.title}
                </Text>

                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.textMuted}
                />

              </View>


              <Text style={styles.description}>
                {account.description}
              </Text>


              <Text style={styles.continueText}>
                Continue →
              </Text>

            </View>

          </Pressable>
        ))}

      </View>


      {/* LOGIN */}

      <View style={styles.loginSection}>

        <Text style={styles.loginText}>
          Already have a NESBA account?
        </Text>

        <Pressable
          onPress={() =>
            router.push('/login')
          }
          style={({ pressed }) => [
            styles.loginButton,
            pressed && styles.pressed,
          ]}
        >

          <Text style={styles.loginLink}>
            Log In
          </Text>

        </Pressable>

      </View>


      {/* FOOTER */}

      <Text style={styles.footer}>
        Choose Student, Teacher or Organisation to
        create the account that matches how you
        will use NESBA.
      </Text>

    </ScrollView>
  );
}


const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor:
      colors.background,
  },

  content: {
    padding:
      spacing.md,
    paddingTop:
      spacing.xl * 1.5,
    paddingBottom:
      spacing.xl * 3,
    maxWidth: 720,
    width: '100%',
    alignSelf:
      'center',
  },

  header: {
    alignItems:
      'center',
    marginBottom:
      spacing.xl,
  },

  logo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom:
      spacing.md,
  },

  title: {
    ...typography.h1,
    color:
      colors.text,
    fontSize: 32,
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

  options: {
    gap:
      spacing.md,
  },

  accountCard: {
    flexDirection:
      'row',
    alignItems:
      'flex-start',
    backgroundColor:
      colors.surface,
    borderWidth: 1,
    borderColor:
      colors.border,
    borderRadius:
      radius.md,
    padding:
      spacing.md,
  },

  iconContainer: {
    width: 58,
    height: 58,
    borderRadius:
      radius.md,
    backgroundColor:
      colors.background,
    borderWidth: 1,
    borderColor:
      colors.border,
    alignItems:
      'center',
    justifyContent:
      'center',
    marginRight:
      spacing.md,
  },

  accountInfo: {
    flex: 1,
  },

  titleRow: {
    flexDirection:
      'row',
    alignItems:
      'center',
    justifyContent:
      'space-between',
  },

  accountTitle: {
    color:
      colors.text,
    fontSize: 21,
    fontWeight:
      '900',
  },

  description: {
    color:
      colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 5,
  },

  continueText: {
    color:
      colors.primary,
    fontWeight:
      '900',
    marginTop:
      spacing.sm,
  },

  loginSection: {
    alignItems:
      'center',
    marginTop:
      spacing.xl,
  },

  loginText: {
    color:
      colors.textMuted,
    fontSize: 14,
  },

  loginButton: {
    paddingHorizontal:
      spacing.md,
    paddingVertical:
      spacing.xs,
    marginTop: 2,
  },

  loginLink: {
    color:
      colors.primary,
    fontSize: 15,
    fontWeight:
      '900',
  },

  footer: {
    color:
      colors.textMuted,
    fontSize: 11,
    lineHeight: 17,
    textAlign:
      'center',
    marginTop:
      spacing.lg,
    paddingHorizontal:
      spacing.lg,
  },

  pressed: {
    opacity:
      0.7,
  },

});