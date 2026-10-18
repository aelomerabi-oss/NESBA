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
} from '../../../constants/theme';

import {
    createOrganization,
} from '../../../lib/nesba';

const ORGANIZATION_TYPES = [
  {
    id: 'educational_institution',
    title: 'Educational Institution',
    description: 'University, school, college or training institution.',
    icon: 'school-outline',
  },
  {
    id: 'training_provider',
    title: 'Training Provider',
    description: 'Professional training or learning provider.',
    icon: 'briefcase-outline',
  },
  {
    id: 'community',
    title: 'Community',
    description: 'Educational or professional community.',
    icon: 'people-outline',
  },
  {
    id: 'company',
    title: 'Company',
    description: 'Company offering educational content or training.',
    icon: 'business-outline',
  },
  {
    id: 'nonprofit',
    title: 'Nonprofit',
    description: 'Nonprofit or educational organization.',
    icon: 'heart-outline',
  },
  {
    id: 'other',
    title: 'Other',
    description: 'Another type of educational organization.',
    icon: 'ellipsis-horizontal-circle-outline',
  },
];

export default function CreateOrganization() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [location, setLocation] = useState('');
  const [organizationType, setOrganizationType] = useState(
    'educational_institution'
  );

  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!name.trim()) {
      Alert.alert(
        'Required field',
        'Organization name is required.'
      );
      return;
    }

    if (!description.trim()) {
      Alert.alert(
        'Required field',
        'Organization description is required.'
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

    try {
      setSaving(true);

      const organization =
        await createOrganization({
        name: name.trim(),
        description: description.trim(),
        organizationType,
        website: website.trim() || null,
        location: location.trim() || null,
      });

      Alert.alert(
        'Organization created',
        'Your organization has been created and is pending NESBA verification.',
        [
          {
            text: 'Continue',
            onPress: () => {
              router.replace(
                `/organization/${organization.id}`
              );
            },
          },
        ]
      );
    } catch (error) {
      console.error(
        'Create organization error:',
        error
      );

      Alert.alert(
        'Could not create organization',
        error?.message ||
          'Something went wrong. Please try again.'
      );
    } finally {
      setSaving(false);
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
            Create Organization
          </Text>

          <Text style={styles.subtitle}>
            Create an educational presence on NESBA and
            connect your courses, events, media and community.
          </Text>
        </View>
      </View>

      {/* BASIC INFORMATION */}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Organization Information
        </Text>

        <Text style={styles.sectionDescription}>
          Tell learners who your organization is and what
          you offer.
        </Text>

        <FieldLabel
          label="Organization Name"
          required
        />

        <TextInput
          value={name}
          onChangeText={setName}
          style={styles.input}
          placeholder="Example: NESBA Academy"
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
          placeholder="Describe your organization..."
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
          placeholder="Example: Amsterdam, Netherlands"
          placeholderTextColor={colors.textMuted}
        />
      </View>

      {/* ORGANIZATION TYPE */}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Organization Type
          <Text style={styles.required}> *</Text>
        </Text>

        <Text style={styles.sectionDescription}>
          Select the type that best describes your organization.
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

      {/* PREVIEW */}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Organization Preview
        </Text>

        <View style={styles.preview}>
          <View style={styles.previewLogo}>
            <Ionicons
              name="business-outline"
              size={30}
              color={colors.primary}
            />
          </View>

          <View style={styles.previewInfo}>
            <Text style={styles.previewName}>
              {name.trim() || 'Your Organization'}
            </Text>

            <Text style={styles.previewType}>
              {
                ORGANIZATION_TYPES.find(
                  (item) =>
                    item.id === organizationType
                )?.title
              }
            </Text>

            <Text style={styles.previewDescription}>
              {description.trim() ||
                'Your organization description will appear here.'}
            </Text>

            {location.trim() ? (
              <View style={styles.previewMeta}>
                <Ionicons
                  name="location-outline"
                  size={15}
                  color={colors.textMuted}
                />

                <Text style={styles.previewMetaText}>
                  {location}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {/* CREATE */}

      <Pressable
        onPress={handleCreate}
        disabled={saving}
        style={({ pressed }) => [
          styles.createButton,
          pressed && styles.pressed,
          saving && styles.disabled,
        ]}
      >
        <Ionicons
          name="business-outline"
          size={21}
          color="#fff"
        />

        <Text style={styles.createButtonText}>
          {saving
            ? 'Creating Organization...'
            : 'Create Organization'}
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

  preview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },

  previewLogo: {
    width: 58,
    height: 58,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  previewInfo: {
    flex: 1,
  },

  previewName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },

  previewType: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },

  previewDescription: {
    color: colors.textMuted,
    lineHeight: 19,
    marginTop: 7,
  },

  previewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: 4,
  },

  previewMetaText: {
    color: colors.textMuted,
    fontSize: 12,
  },

  createButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    marginTop: spacing.xs,
  },

  createButtonText: {
    color: '#fff',
    fontWeight: '900',
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