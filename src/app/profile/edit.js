import { useEffect, useState } from 'react';

import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';

import { Ionicons } from '@expo/vector-icons';

import { router } from 'expo-router';

import {
    colors,
    radius,
    spacing,
} from '../../constants/theme';

import { supabase } from '../../lib/supabase';

export default function EditProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] =
    useState(false);

  const [userId, setUserId] = useState(null);

  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');

  const [avatarUrl, setAvatarUrl] = useState(null);

  /*
  |--------------------------------------------------------------------------
  | LOAD PROFILE
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);

      const {
        data,
        error,
      } = await supabase.auth.getUser();

      if (error) {
        throw error;
      }

      const user = data?.user;

      if (!user) {
        router.replace('/login');
        return;
      }

      setUserId(user.id);

      const metadata =
        user.user_metadata || {};

      /*
       * Get the existing NESBA profile.
       */

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          avatar_url,
          bio,
          role
        `)
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.log(
          'Profile loading:',
          profileError.message
        );
      }

      setFullName(
        profile?.full_name ||
          metadata.full_name ||
          metadata.name ||
          user.email ||
          ''
      );

      setBio(
        profile?.bio ||
          metadata.bio ||
          ''
      );

      setLocation(
        metadata.location ||
          ''
      );

      setWebsite(
        metadata.website ||
          ''
      );

      setAvatarUrl(
        profile?.avatar_url ||
          metadata.avatar_url ||
          metadata.picture ||
          null
      );
    } catch (error) {
      console.error(
        'Load profile error:',
        error
      );

      Alert.alert(
        'Profile',
        error?.message ||
          'Could not load your profile.'
      );
    } finally {
      setLoading(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | SELECT PHOTO
  |--------------------------------------------------------------------------
  */

  async function pickProfilePhoto() {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (
        permission.status !==
        'granted'
      ) {
        Alert.alert(
          'Permission Required',
          'NESBA needs access to your photos to choose a profile picture.'
        );

        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes:
            ['images'],

          allowsEditing: true,

          aspect: [1, 1],

          quality: 0.85,
        });

      if (
        result.canceled
      ) {
        return;
      }

      if (
        !result.assets ||
        result.assets.length === 0
      ) {
        return;
      }

      const asset =
        result.assets[0];

      await uploadProfilePhoto(
        asset
      );
    } catch (error) {
      console.error(
        'Photo picker error:',
        error
      );

      Alert.alert(
        'Photo',
        error?.message ||
          'Could not select the photo.'
      );
    }
  }

  /*
  |--------------------------------------------------------------------------
  | UPLOAD PHOTO
  |--------------------------------------------------------------------------
  */

  async function uploadProfilePhoto(
    asset
  ) {
    if (!userId) {
      return;
    }

    try {
      setUploadingPhoto(true);

      /*
       * Convert selected image to ArrayBuffer.
       */

      const response =
        await fetch(asset.uri);

      const arrayBuffer =
        await response.arrayBuffer();

      /*
       * Determine extension.
       */

      const extension =
        getFileExtension(
          asset.fileName ||
            asset.uri
        );

      /*
       * One permanent avatar location
       * per NESBA user.
       */

      const filePath =
        `${userId}/avatar.${extension}`;

      /*
       * Upload to Supabase Storage.
       */

      const {
        error: uploadError,
      } = await supabase.storage
        .from('avatars')
        .upload(
          filePath,
          arrayBuffer,
          {
            contentType:
              asset.mimeType ||
              'image/jpeg',

            upsert: true,

            cacheControl:
              '3600',
          }
        );

      if (uploadError) {
        throw uploadError;
      }

      /*
       * Get public URL.
       */

      const {
        data: publicData,
      } = supabase.storage
        .from('avatars')
        .getPublicUrl(
          filePath
        );

      const publicUrl =
        publicData?.publicUrl;

      if (!publicUrl) {
        throw new Error(
          'Could not create the profile photo URL.'
        );
      }

      /*
       * Cache-busting URL.
       */

      const finalUrl =
        `${publicUrl}?v=${Date.now()}`;

      /*
       * Update NESBA profile.
       */

      const {
        error: profileError,
      } = await supabase
        .from('profiles')
        .update({
          avatar_url:
            finalUrl,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          'id',
          userId
        );

      if (profileError) {
        throw profileError;
      }

      /*
       * Keep Auth metadata synchronized.
       */

      const {
        error: authError,
      } = await supabase.auth.updateUser({
        data: {
          avatar_url:
            finalUrl,
        },
      });

      if (authError) {
        console.log(
          'Auth avatar update:',
          authError.message
        );
      }

      /*
       * Update screen immediately.
       */

      setAvatarUrl(
        finalUrl
      );

      Alert.alert(
        'Success',
        'Your profile picture has been updated.'
      );
    } catch (error) {
      console.error(
        'Upload profile photo error:',
        error
      );

      Alert.alert(
        'Upload Failed',
        error?.message ||
          'Could not upload your profile picture.'
      );
    } finally {
      setUploadingPhoto(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | REMOVE PHOTO
  |--------------------------------------------------------------------------
  */

  function confirmRemovePhoto() {
    if (!avatarUrl) {
      return;
    }

    Alert.alert(
      'Remove Profile Photo',
      'Are you sure you want to remove your profile picture?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress:
            removeProfilePhoto,
        },
      ]
    );
  }

  async function removeProfilePhoto() {
    if (!userId) {
      return;
    }

    try {
      setUploadingPhoto(true);

      /*
       * Remove common avatar formats.
       */

      await supabase.storage
        .from('avatars')
        .remove([
          `${userId}/avatar.jpg`,
          `${userId}/avatar.jpeg`,
          `${userId}/avatar.png`,
          `${userId}/avatar.webp`,
        ]);

      /*
       * Remove URL from profile.
       */

      const {
        error: profileError,
      } = await supabase
        .from('profiles')
        .update({
          avatar_url: null,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          'id',
          userId
        );

      if (profileError) {
        throw profileError;
      }

      /*
       * Remove Auth metadata URL.
       */

      await supabase.auth.updateUser({
        data: {
          avatar_url: null,
        },
      });

      setAvatarUrl(null);

      Alert.alert(
        'Success',
        'Your profile picture has been removed.'
      );
    } catch (error) {
      console.error(
        'Remove photo error:',
        error
      );

      Alert.alert(
        'Photo',
        error?.message ||
          'Could not remove your profile picture.'
      );
    } finally {
      setUploadingPhoto(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | SAVE PROFILE
  |--------------------------------------------------------------------------
  */

  async function saveProfile() {
    if (!userId) {
      return;
    }

    try {
      setSaving(true);

      /*
       * Update Auth metadata.
       */

      const {
        error: authError,
      } = await supabase.auth.updateUser({
        data: {
          full_name:
            fullName.trim(),

          bio:
            bio.trim(),

          location:
            location.trim(),

          website:
            website.trim(),

          avatar_url:
            avatarUrl,
        },
      });

      if (authError) {
        throw authError;
      }

      /*
       * Update profiles table.
       *
       * We use only columns confirmed
       * to exist in your database.
       */

      const {
        error: profileError,
      } = await supabase
        .from('profiles')
        .update({
          full_name:
            fullName.trim(),

          bio:
            bio.trim(),

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          'id',
          userId
        );

      if (profileError) {
        throw profileError;
      }

      Alert.alert(
        'Profile Saved',
        'Your profile has been updated.',
        [
          {
            text: 'OK',
            onPress: () =>
              router.back(),
          },
        ]
      );
    } catch (error) {
      console.error(
        'Save profile error:',
        error
      );

      Alert.alert(
        'Save Failed',
        error?.message ||
          'Could not save your profile.'
      );
    } finally {
      setSaving(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | PUBLIC PROFILE
  |--------------------------------------------------------------------------
  */

  function viewPublicProfile() {
    if (!userId) {
      return;
    }

    router.push(
      `/user/${userId}`
    );
  }

  /*
  |--------------------------------------------------------------------------
  | FILE EXTENSION
  |--------------------------------------------------------------------------
  */

  function getFileExtension(
    fileName
  ) {
    if (!fileName) {
      return 'jpg';
    }

    const cleanName =
      fileName.split('?')[0];

    const parts =
      cleanName.split('.');

    if (
      parts.length > 1
    ) {
      const extension =
        parts[
          parts.length - 1
        ].toLowerCase();

      if (
        [
          'jpg',
          'jpeg',
          'png',
          'webp',
        ].includes(
          extension
        )
      ) {
        return extension;
      }
    }

    return 'jpg';
  }

  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />

        <Text style={styles.loadingText}>
          Loading profile...
        </Text>
      </View>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | EDIT PROFILE SCREEN
  |--------------------------------------------------------------------------
  */

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >

      {/* HEADER */}

      <View style={styles.header}>

        <Pressable
          onPress={() =>
            router.back()
          }
          style={styles.iconButton}
        >
          <Ionicons
            name="arrow-back"
            size={21}
            color={colors.text}
          />
        </Pressable>

        <Text style={styles.headerTitle}>
          Edit Profile
        </Text>

        <View
          style={styles.headerSpacer}
        />

      </View>

      {/* ================================================================
          PROFILE PHOTO
          ================================================================ */}

      <View style={styles.photoCard}>

        <Text style={styles.sectionTitle}>
          Profile Picture
        </Text>

        <Pressable
          onPress={
            pickProfilePhoto
          }
          disabled={
            uploadingPhoto
          }
          style={({ pressed }) => [
            styles.avatarButton,

            pressed &&
              styles.pressed,

            uploadingPhoto &&
              styles.disabled,
          ]}
        >

          {avatarUrl ? (
            <Image
              source={{
                uri: avatarUrl,
              }}
              style={styles.avatarImage}
            />
          ) : (
            <View
              style={
                styles.avatarPlaceholder
              }
            >
              <Text
                style={
                  styles.avatarInitials
                }
              >
                {getInitials(
                  fullName
                )}
              </Text>
            </View>
          )}

          <View
            style={
              styles.cameraButton
            }
          >
            {uploadingPhoto ? (
              <ActivityIndicator
                size="small"
                color="#fff"
              />
            ) : (
              <Ionicons
                name="camera"
                size={18}
                color="#fff"
              />
            )}
          </View>

        </Pressable>

        <Text style={styles.photoDescription}>
          Your profile picture is shown on your
          NESBA profile, posts, comments and stories.
        </Text>

        <Pressable
          onPress={
            pickProfilePhoto
          }
          disabled={
            uploadingPhoto
          }
          style={({ pressed }) => [
            styles.changePhotoButton,

            pressed &&
              styles.pressed,

            uploadingPhoto &&
              styles.disabled,
          ]}
        >

          <Ionicons
            name="image-outline"
            size={19}
            color={colors.primary}
          />

          <Text
            style={
              styles.changePhotoText
            }
          >
            {avatarUrl
              ? 'Change Photo'
              : 'Upload Photo'}
          </Text>

        </Pressable>

        {avatarUrl ? (
          <Pressable
            onPress={
              confirmRemovePhoto
            }
            disabled={
              uploadingPhoto
            }
            style={({ pressed }) => [
              styles.removePhotoButton,

              pressed &&
                styles.pressed,

              uploadingPhoto &&
                styles.disabled,
            ]}
          >

            <Ionicons
              name="trash-outline"
              size={17}
              color="#d32f2f"
            />

            <Text
              style={
                styles.removePhotoText
              }
            >
              Remove Photo
            </Text>

          </Pressable>
        ) : null}

      </View>

      {/* ================================================================
          PROFILE INFORMATION
          ================================================================ */}

      <View style={styles.formCard}>

        <Text style={styles.sectionTitle}>
          Profile Information
        </Text>

        {/* FULL NAME */}

        <View style={styles.field}>

          <Text style={styles.label}>
            Full Name
          </Text>

          <TextInput
            value={fullName}
            onChangeText={
              setFullName
            }
            placeholder="Your full name"
            placeholderTextColor={
              colors.textMuted
            }
            style={styles.input}
          />

        </View>

        {/* BIO */}

        <View style={styles.field}>

          <Text style={styles.label}>
            Bio
          </Text>

          <TextInput
            value={bio}
            onChangeText={
              setBio
            }
            placeholder="Tell people about yourself"
            placeholderTextColor={
              colors.textMuted
            }
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={[
              styles.input,
              styles.bioInput,
            ]}
          />

        </View>

        {/* LOCATION */}

        <View style={styles.field}>

          <Text style={styles.label}>
            Location
          </Text>

          <TextInput
            value={location}
            onChangeText={
              setLocation
            }
            placeholder="Where are you based?"
            placeholderTextColor={
              colors.textMuted
            }
            style={styles.input}
          />

        </View>

        {/* WEBSITE */}

        <View style={styles.field}>

          <Text style={styles.label}>
            Website
          </Text>

          <TextInput
            value={website}
            onChangeText={
              setWebsite
            }
            placeholder="https://example.com"
            placeholderTextColor={
              colors.textMuted
            }
            autoCapitalize="none"
            keyboardType="url"
            style={styles.input}
          />

        </View>

      </View>

      {/* PUBLIC PROFILE */}

      <Pressable
        onPress={
          viewPublicProfile
        }
        style={({ pressed }) => [
          styles.publicProfileButton,

          pressed &&
            styles.pressed,
        ]}
      >

        <Ionicons
          name="eye-outline"
          size={20}
          color={colors.primary}
        />

        <Text
          style={
            styles.publicProfileText
          }
        >
          View Public Profile
        </Text>

        <Ionicons
          name="chevron-forward"
          size={18}
          color={colors.primary}
        />

      </Pressable>

      {/* SAVE */}

      <Pressable
        onPress={
          saveProfile
        }
        disabled={saving}
        style={({ pressed }) => [
          styles.saveButton,

          pressed &&
            styles.pressed,

          saving &&
            styles.disabled,
        ]}
      >

        {saving ? (
          <ActivityIndicator
            size="small"
            color="#fff"
          />
        ) : (
          <Ionicons
            name="checkmark-circle-outline"
            size={20}
            color="#fff"
          />
        )}

        <Text style={styles.saveText}>
          {saving
            ? 'Saving...'
            : 'Save Profile'}
        </Text>

      </Pressable>

      {/* SIGN OUT */}

      <Pressable
        onPress={async () => {
          await supabase.auth.signOut();

          router.replace(
            '/login'
          );
        }}
        style={styles.signOutButton}
      >

        <Ionicons
          name="log-out-outline"
          size={19}
          color="#d32f2f"
        />

        <Text
          style={
            styles.signOutText
          }
        >
          Sign Out
        </Text>

      </Pressable>

    </ScrollView>
  );
}

/*
|--------------------------------------------------------------------------
| INITIALS
|--------------------------------------------------------------------------
*/

function getInitials(name) {
  if (!name) {
    return 'A';
  }

  const parts =
    name.trim().split(/\s+/);

  if (parts.length >= 2) {
    return (
      parts[0].charAt(0) +
      parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  }

  return name
    .charAt(0)
    .toUpperCase();
}

/*
|--------------------------------------------------------------------------
| STYLES
|--------------------------------------------------------------------------
*/

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
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },

  loading: {
    flex: 1,
    backgroundColor:
      colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    color: colors.textMuted,
    marginTop: spacing.sm,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    marginBottom: spacing.lg,
  },

  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor:
      colors.surface,
    borderWidth: 1,
    borderColor:
      colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },

  headerSpacer: {
    width: 42,
  },

  photoCard: {
    backgroundColor:
      colors.surface,
    borderWidth: 1,
    borderColor:
      colors.border,
    borderRadius:
      radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  sectionTitle: {
    width: '100%',
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: spacing.md,
  },

  avatarButton: {
    width: 130,
    height: 130,
    borderRadius: 65,
    position: 'relative',
    marginBottom: spacing.md,
  },

  avatarImage: {
    width: 130,
    height: 130,
    borderRadius: 65,
  },

  avatarPlaceholder: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor:
      colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarInitials: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '900',
  },

  cameraButton: {
    position: 'absolute',
    right: 1,
    bottom: 1,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor:
      colors.primary,
    borderWidth: 3,
    borderColor:
      colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  photoDescription: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 480,
    marginBottom: spacing.md,
  },

  changePhotoButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor:
      colors.primary,
    borderRadius:
      radius.md,
    paddingHorizontal:
      spacing.lg,
  },

  changePhotoText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '900',
  },

  removePhotoButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal:
      spacing.md,
    marginTop: 4,
  },

  removePhotoText: {
    color: '#d32f2f',
    fontSize: 12,
    fontWeight: '800',
  },

  formCard: {
    backgroundColor:
      colors.surface,
    borderWidth: 1,
    borderColor:
      colors.border,
    borderRadius:
      radius.md,
    padding: spacing.lg,
  },

  field: {
    marginBottom: spacing.md,
  },

  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 7,
  },

  input: {
    minHeight: 50,
    backgroundColor:
      colors.background,
    borderWidth: 1,
    borderColor:
      colors.border,
    borderRadius:
      radius.md,
    paddingHorizontal:
      spacing.md,
    color: colors.text,
    fontSize: 14,
  },

  bioInput: {
    minHeight: 110,
    paddingTop: spacing.md,
  },

  publicProfileButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor:
      colors.surface,
    borderWidth: 1,
    borderColor:
      colors.primary,
    borderRadius:
      radius.md,
    paddingHorizontal:
      spacing.md,
    marginTop: spacing.md,
  },

  publicProfileText: {
    flex: 1,
    color: colors.primary,
    fontSize: 14,
    fontWeight: '900',
  },

  saveButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor:
      colors.primary,
    borderRadius:
      radius.md,
    marginTop: spacing.md,
  },

  saveText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },

  signOutButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },

  signOutText: {
    color: '#d32f2f',
    fontSize: 14,
    fontWeight: '900',
  },

  pressed: {
    opacity: 0.7,
  },

  disabled: {
    opacity: 0.55,
  },

});