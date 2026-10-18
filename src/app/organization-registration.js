import { useState } from 'react';

import {
    Alert,
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
} from '../constants/theme';

import { supabase } from '../lib/supabase';
import { applyForOrganization } from '../lib/nesba';

const ORGANIZATION_TYPES = [
  {
    id: 'educational_institution',
    title: 'Educational Institution',
    description:
      'University, school, college or academy.',
    icon: 'school-outline',
  },
  {
    id: 'training_provider',
    title: 'Training Provider',
    description:
      'Professional training or learning provider.',
    icon: 'briefcase-outline',
  },
  {
    id: 'nonprofit',
    title: 'Nonprofit Organization',
    description:
      'Nonprofit, charity or educational foundation.',
    icon: 'heart-outline',
  },
  {
    id: 'company',
    title: 'Company',
    description:
      'Company providing educational or professional services.',
    icon: 'business-outline',
  },
  {
    id: 'community',
    title: 'Community',
    description:
      'Professional, academic or educational community.',
    icon: 'people-outline',
  },
  {
    id: 'other',
    title: 'Other',
    description:
      'Another type of educational organization.',
    icon: 'ellipsis-horizontal-circle-outline',
  },
];

export default function OrganizationRegistration() {
  const [organizationName, setOrganizationName] =
    useState('');

  const [organizationType, setOrganizationType] =
    useState('educational_institution');

  const [description, setDescription] =
    useState('');

  const [website, setWebsite] =
    useState('');

  const [location, setLocation] =
    useState('');

  const [contactEmail, setContactEmail] =
    useState('');

  const [reason, setReason] =
    useState('');

  const [submitting, setSubmitting] =
    useState(false);

  async function submitApplication() {
    if (!organizationName.trim()) {
      Alert.alert(
        'Required field',
        'Organization name is required.'
      );
      return;
    }

    if (!organizationType) {
      Alert.alert(
        'Required field',
        'Please select an organization type.'
      );
      return;
    }

    if (!description.trim()) {
      Alert.alert(
        'Required field',
        'Please provide a description of the organization.'
      );
      return;
    }

    if (!contactEmail.trim()) {
      Alert.alert(
        'Required field',
        'Contact email is required.'
      );
      return;
    }

    if (!reason.trim()) {
      Alert.alert(
        'Required field',
        'Please explain why the organization wants to join NESBA.'
      );
      return;
    }

    try {
      setSubmitting(true);

      const {
        data: {
          user,
        },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        Alert.alert(
          'Login required',
          'Please log in before submitting an organization application.',
          [
            {
              text: 'Log In',
              onPress: () =>
                router.push('/login'),
            },
            {
              text: 'Cancel',
              style: 'cancel',
            },
          ]
        );

        return;
      }

      /*
       * Submitting this form DOES NOT create an organization.
       *
       * The application appears in the Admin screen; the
       * organization is created when an admin approves it.
       */

      await applyForOrganization({
        name: organizationName,
        organizationType,
        description,
        website,
        location,
        contactEmail,
        reason,
      });

      Alert.alert(
        'Application Submitted',
        'Your organization application has been submitted to NESBA for review. The organization will only be created after approval.',
        [
          {
            text: 'Done',
            onPress: () =>
              router.replace('/'),
          },
        ]
      );
    } catch (error) {
      console.error(
        'Organization application error:',
        error
      );

      Alert.alert(
        'Submission failed',
        error?.message ||
          'We could not submit your application. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* HEADER */}

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={colors.text}
          />
        </Pressable>

        <View style={styles.headerText}>
          <Text style={styles.title}>
            Register an Organization
          </Text>

          <Text style={styles.subtitle}>
            Apply for your organization to become an
            official NESBA organization.
          </Text>
        </View>
      </View>

      {/* NOTICE */}

      <View style={styles.notice}>
        <Ionicons
          name="shield-checkmark-outline"
          size={25}
          color={colors.primary}
        />

        <View style={styles.noticeInfo}>
          <Text style={styles.noticeTitle}>
            NESBA approval required
          </Text>

          <Text style={styles.noticeText}>
            Submitting this form does not immediately
            create an organization. Every organization
            is reviewed by NESBA before it becomes
            publicly available.
          </Text>
        </View>
      </View>

      {/* ORGANIZATION INFORMATION */}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Organization Information
        </Text>

        <FieldLabel
          label="Organization Name"
          required
        />

        <TextInput
          value={organizationName}
          onChangeText={setOrganizationName}
          style={styles.input}
          placeholder="Example: University of Khartoum"
          placeholderTextColor={colors.textMuted}
        />

        <FieldLabel
          label="Description"
          required
        />

        <TextInput
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
          style={[
            styles.input,
            styles.textArea,
          ]}
          placeholder="Tell us about the organization..."
          placeholderTextColor={colors.textMuted}
        />

        <FieldLabel label="Website" />

        <TextInput
          value={website}
          onChangeText={setWebsite}
          style={styles.input}
          autoCapitalize="none"
          keyboardType="url"
          placeholder="https://example.com"
          placeholderTextColor={colors.textMuted}
        />

        <FieldLabel label="Location" />

        <TextInput
          value={location}
          onChangeText={setLocation}
          style={styles.input}
          placeholder="Example: Khartoum, Sudan"
          placeholderTextColor={colors.textMuted}
        />
      </View>

      {/* ORGANIZATION TYPE */}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Organization Type
          <Text style={styles.required}>
            {' '}*
          </Text>
        </Text>

        <View style={styles.typeList}>
          {ORGANIZATION_TYPES.map((type) => {
            const selected =
              organizationType === type.id;

            return (
              <Pressable
                key={type.id}
                onPress={() =>
                  setOrganizationType(type.id)
                }
                style={[
                  styles.typeCard,
                  selected &&
                    styles.typeCardSelected,
                ]}
              >
                <View
                  style={[
                    styles.typeIcon,
                    selected &&
                      styles.typeIconSelected,
                  ]}
                >
                  <Ionicons
                    name={type.icon}
                    size={25}
                    color={
                      selected
                        ? colors.primary
                        : colors.textMuted
                    }
                  />
                </View>

                <View style={styles.typeInfo}>
                  <Text style={styles.typeTitle}>
                    {type.title}
                  </Text>

                  <Text style={styles.typeDescription}>
                    {type.description}
                  </Text>
                </View>

                <View
                  style={[
                    styles.radio,
                    selected &&
                      styles.radioSelected,
                  ]}
                >
                  {selected ? (
                    <View style={styles.radioDot} />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* CONTACT */}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Organization Contact
        </Text>

        <FieldLabel
          label="Contact Email"
          required
        />

        <TextInput
          value={contactEmail}
          onChangeText={setContactEmail}
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="contact@organization.com"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.helperText}>
          This email may be used by NESBA to verify
          the organization and contact its representatives.
        </Text>
      </View>

      {/* APPLICATION REASON */}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Why NESBA?
        </Text>

        <Text style={styles.sectionDescription}>
          Tell us how your organization intends to use
          NESBA.
        </Text>

        <FieldLabel
          label="Reason for joining NESBA"
          required
        />

        <TextInput
          value={reason}
          onChangeText={setReason}
          multiline
          textAlignVertical="top"
          style={[
            styles.input,
            styles.reasonInput,
          ]}
          placeholder="Example: We want to provide online courses and live educational events to our students."
          placeholderTextColor={colors.textMuted}
        />
      </View>

      {/* PROCESS */}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          What happens next?
        </Text>

        <ProcessStep
          number="1"
          title="Submit application"
          text="NESBA receives your organization information."
        />

        <ProcessStep
          number="2"
          title="NESBA review"
          text="Our team reviews and verifies the organization."
        />

        <ProcessStep
          number="3"
          title="Organization approval"
          text="If approved, the official organization profile is created."
        />

        <ProcessStep
          number="4"
          title="Organization dashboard"
          text="Authorized organization administrators can manage courses, events, media and creators."
          last
        />
      </View>

      {/* SUBMIT */}

      <Pressable
        onPress={submitApplication}
        disabled={submitting}
        style={({ pressed }) => [
          styles.submitButton,
          pressed && styles.pressed,
          submitting && styles.disabled,
        ]}
      >
        <Ionicons
          name="send-outline"
          size={21}
          color="#fff"
        />

        <Text style={styles.submitButtonText}>
          {submitting
            ? 'Submitting Application...'
            : 'Submit Organization Application'}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.back()}
        style={styles.cancelButton}
      >
        <Text style={styles.cancelButtonText}>
          Cancel
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function FieldLabel({
  label,
  required = false,
}) {
  return (
    <Text style={styles.label}>
      {label}

      {required ? (
        <Text style={styles.required}>
          {' '}*
        </Text>
      ) : null}
    </Text>
  );
}

function ProcessStep({
  number,
  title,
  text,
  last = false,
}) {
  return (
    <View style={styles.processRow}>
      <View style={styles.processLeft}>
        <View style={styles.processNumber}>
          <Text style={styles.processNumberText}>
            {number}
          </Text>
        </View>

        {!last ? (
          <View style={styles.processLine} />
        ) : null}
      </View>

      <View style={styles.processInfo}>
        <Text style={styles.processTitle}>
          {title}
        </Text>

        <Text style={styles.processText}>
          {text}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 3,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  headerText: {
    flex: 1,
  },

  title: {
    ...typography.h1,
    color: colors.text,
    fontSize: 28,
  },

  subtitle: {
    color: colors.textMuted,
    lineHeight: 21,
    marginTop: 4,
  },

  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },

  noticeInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },

  noticeTitle: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 15,
  },

  noticeText: {
    color: colors.textMuted,
    lineHeight: 19,
    marginTop: 4,
  },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '900',
    marginBottom: spacing.xs,
  },

  sectionDescription: {
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },

  label: {
    color: colors.text,
    fontWeight: '800',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },

  required: {
    color: '#ff4d67',
  },

  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },

  textArea: {
    minHeight: 130,
  },

  reasonInput: {
    minHeight: 150,
  },

  helperText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.xs,
  },

  typeList: {
    gap: spacing.sm,
  },

  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    backgroundColor: colors.background,
  },

  typeCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },

  typeIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  typeIconSelected: {
    backgroundColor: colors.background,
  },

  typeInfo: {
    flex: 1,
  },

  typeTitle: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 15,
  },

  typeDescription: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },

  radio: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  radioSelected: {
    borderColor: colors.primary,
  },

  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },

  processRow: {
    flexDirection: 'row',
  },

  processLeft: {
    width: 34,
    alignItems: 'center',
  },

  processNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  processNumberText: {
    color: '#fff',
    fontWeight: '900',
  },

  processLine: {
    width: 1,
    flex: 1,
    minHeight: 30,
    backgroundColor: colors.border,
  },

  processInfo: {
    flex: 1,
    paddingLeft: spacing.sm,
    paddingBottom: spacing.md,
  },

  processTitle: {
    color: colors.text,
    fontWeight: '900',
  },

  processText: {
    color: colors.textMuted,
    lineHeight: 18,
    marginTop: 3,
  },

  submitButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    marginTop: spacing.xs,
  },

  submitButtonText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 15,
  },

  cancelButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelButtonText: {
    color: colors.textMuted,
    fontWeight: '800',
  },

  pressed: {
    opacity: 0.7,
  },

  disabled: {
    opacity: 0.6,
  },
});