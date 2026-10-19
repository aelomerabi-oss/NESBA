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

import { router } from 'expo-router';

import {
  colors,
  radius,
  spacing,
  typography,
} from '../constants/theme';

import { useAuth } from '../context/AuthContext';

import { supabase } from '../lib/supabase';

export default function EditProfileScreen() {
  const { session } = useAuth();

  const [fullName, setFullName] =
    useState('');

  const [bio, setBio] =
    useState('');

  const [avatarUrl, setAvatarUrl] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [uploadingPhoto, setUploadingPhoto] =
    useState(false);

  /*
  |--------------------------------------------------------------------------
  | LOAD PROFILE
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadProfile();
  }, [session]);

  async function loadProfile() {
    if (!session?.user) {
      setLoading(false);
      return;
    }

    try {
      const {
        data,
        error,
      } = await supabase
        .from('profiles')
        .select(
          'full_name, bio, avatar_url'
        )
        .eq(
          'id',
          session.user.id
        )
        .single();

      if (error) {
        console.log(
          'PROFILE LOAD ERROR:',
          error.message
        );
      }

      if (data) {
        setFullName(
          data.full_name || ''
        );

        setBio(
          data.bio || ''
        );

        setAvatarUrl(
          data.avatar_url || null
        );
      }
    } catch (error) {
      console.log(
        'PROFILE LOAD ERROR:',
        error
      );
    } finally {
      setLoading(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | OPEN PHOTO PICKER
  |--------------------------------------------------------------------------
  */

  async function handlePickPhoto() {
    if (!session?.user) {
      Alert.alert(
        'Not Signed In',
        'Please sign in again.'
      );

      return;
    }

    try {
      setUploadingPhoto(true);

      /*
      |--------------------------------------------------------------------------
      | REQUEST PHOTO PERMISSION
      |--------------------------------------------------------------------------
      */

      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (
        permission.status !==
        'granted'
      ) {
        setUploadingPhoto(false);

        Alert.alert(
          'Photo Permission Required',
          'Please allow NESBA to access your photos.'
        );

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | OPEN PHOTO LIBRARY
      |--------------------------------------------------------------------------
      */

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes:
            ['images'],

          allowsEditing:
            true,

          aspect:
            [1, 1],

          quality:
            0.85,
        });

      /*
      |--------------------------------------------------------------------------
      | USER CANCELLED
      |--------------------------------------------------------------------------
      */

      if (
        result.canceled
      ) {
        setUploadingPhoto(false);
        return;
      }

      /*
      |--------------------------------------------------------------------------
      | CHECK IMAGE
      |--------------------------------------------------------------------------
      */

      if (
        !result.assets ||
        result.assets.length === 0
      ) {
        setUploadingPhoto(false);

        Alert.alert(
          'Photo',
          'No photo was selected.'
        );

        return;
      }

      const asset =
        result.assets[0];

      /*
      |--------------------------------------------------------------------------
      | UPLOAD
      |--------------------------------------------------------------------------
      */

      await uploadProfilePhoto(
        asset
      );

    } catch (error) {
      console.error(
        'PHOTO PICKER ERROR:',
        error
      );

      setUploadingPhoto(false);

      Alert.alert(
        'Photo Error',
        error?.message ||
          'Could not select the photo.'
      );
    }
  }

  /*
  |--------------------------------------------------------------------------
  | UPLOAD PROFILE PHOTO
  |--------------------------------------------------------------------------
  */

  async function uploadProfilePhoto(
    asset
  ) {
    try {
      /*
      |--------------------------------------------------------------------------
      | GET IMAGE DATA
      |--------------------------------------------------------------------------
      */

      const response =
        await fetch(
          asset.uri
        );

      const arrayBuffer =
        await response.arrayBuffer();

      /*
      |--------------------------------------------------------------------------
      | FILE EXTENSION
      |--------------------------------------------------------------------------
      */

      let extension =
        'jpg';

      const fileName =
        asset.fileName ||
        asset.uri ||
        '';

      const cleanName =
        fileName.split('?')[0];

      const parts =
        cleanName.split('.');

      if (
        parts.length > 1
      ) {
        const possibleExtension =
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
            possibleExtension
          )
        ) {
          extension =
            possibleExtension;
        }
      }

      /*
      |--------------------------------------------------------------------------
      | STORAGE PATH
      |--------------------------------------------------------------------------
      */

      const filePath =
        `${session.user.id}/avatar.${extension}`;

      /*
      |--------------------------------------------------------------------------
      | UPLOAD TO SUPABASE STORAGE
      |--------------------------------------------------------------------------
      */

      const {
        error:
          uploadError,
      } =
        await supabase.storage
          .from('avatars')
          .upload(
            filePath,
            arrayBuffer,
            {
              contentType:
                asset.mimeType ||
                'image/jpeg',

              upsert:
                true,

              cacheControl:
                '3600',
            }
          );

      if (uploadError) {
        throw uploadError;
      }

      /*
      |--------------------------------------------------------------------------
      | GET PUBLIC URL
      |--------------------------------------------------------------------------
      */

      const {
        data:
          publicData,
      } =
        supabase.storage
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
      |--------------------------------------------------------------------------
      | CACHE BUST
      |--------------------------------------------------------------------------
      */

      const finalUrl =
        `${publicUrl}?v=${Date.now()}`;

      /*
      |--------------------------------------------------------------------------
      | SAVE URL TO PROFILES
      |--------------------------------------------------------------------------
      */

      const {
        error:
          profileError,
      } =
        await supabase
          .from('profiles')
          .update({
            avatar_url:
              finalUrl,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            'id',
            session.user.id
          );

      if (profileError) {
        throw profileError;
      }

      /*
      |--------------------------------------------------------------------------
      | UPDATE AUTH USER METADATA
      |--------------------------------------------------------------------------
      */

      const {
        error:
          authError,
      } =
        await supabase.auth
          .updateUser({
            data: {
              avatar_url:
                finalUrl,
            },
          });

      if (authError) {
        console.log(
          'AUTH AVATAR WARNING:',
          authError.message
        );
      }

      /*
      |--------------------------------------------------------------------------
      | UPDATE SCREEN
      |--------------------------------------------------------------------------
      */

      setAvatarUrl(
        finalUrl
      );

      setUploadingPhoto(false);

      Alert.alert(
        'Photo Updated',
        'Your profile picture has been uploaded successfully.'
      );

    } catch (error) {
      console.error(
        'PHOTO UPLOAD ERROR:',
        error
      );

      setUploadingPhoto(false);

      Alert.alert(
        'Upload Failed',
        error?.message ||
          'Could not upload your profile picture.'
      );
    }
  }

  /*
  |--------------------------------------------------------------------------
  | REMOVE PHOTO
  |--------------------------------------------------------------------------
  */

  function handleRemovePhoto() {
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
    if (!session?.user) {
      return;
    }

    try {
      setUploadingPhoto(true);

      /*
      |--------------------------------------------------------------------------
      | REMOVE POSSIBLE FILE TYPES
      |--------------------------------------------------------------------------
      */

      await supabase.storage
        .from('avatars')
        .remove([
          `${session.user.id}/avatar.jpg`,
          `${session.user.id}/avatar.jpeg`,
          `${session.user.id}/avatar.png`,
          `${session.user.id}/avatar.webp`,
        ]);

      /*
      |--------------------------------------------------------------------------
      | CLEAR DATABASE URL
      |--------------------------------------------------------------------------
      */

      const {
        error,
      } =
        await supabase
          .from('profiles')
          .update({
            avatar_url:
              null,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            'id',
            session.user.id
          );

      if (error) {
        throw error;
      }

      /*
      |--------------------------------------------------------------------------
      | CLEAR AUTH METADATA
      |--------------------------------------------------------------------------
      */

      await supabase.auth
        .updateUser({
          data: {
            avatar_url:
              null,
          },
        });

      setAvatarUrl(null);

      Alert.alert(
        'Photo Removed',
        'Your profile picture has been removed.'
      );

    } catch (error) {
      console.error(
        'REMOVE PHOTO ERROR:',
        error
      );

      Alert.alert(
        'Remove Failed',
        error?.message ||
          'Could not remove your profile picture.'
      );
    } finally {
      setUploadingPhoto(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | SAVE CHANGES
  |--------------------------------------------------------------------------
  */

  async function handleSave() {
    if (!session?.user) {
      return;
    }

    setSaving(true);

    const {
      error,
    } =
      await supabase
        .from('profiles')
        .update({
          full_name:
            fullName.trim(),

          bio:
            bio.trim(),

          avatar_url:
            avatarUrl,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          'id',
          session.user.id
        );

    setSaving(false);

    if (error) {
      Alert.alert(
        'Could not save',
        error.message
      );

      return;
    }

    router.back();
  }

  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          styles.loadingContainer,
        ]}
      >
        <ActivityIndicator
          size="large"
          color={
            colors.primary
          }
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Loading profile...
        </Text>
      </View>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | SCREEN
  |--------------------------------------------------------------------------
  */

  return (
    <ScrollView
      style={
        styles.container
      }
      contentContainerStyle={
        styles.content
      }
      showsVerticalScrollIndicator={
        false
      }
    >

      {/* PAGE TITLE */}

      <Text
        style={
          styles.pageTitle
        }
      >
        Edit Profile
      </Text>

      {/* ================================================================
          PROFILE PHOTO
          ================================================================ */}

      <View
        style={
          styles.photoCard
        }
      >

        <Text
          style={
            styles.sectionTitle
          }
        >
          Profile Picture
        </Text>

        <Text
          style={
            styles.sectionDescription
          }
        >
          Your profile picture appears on
          your NESBA profile, posts,
          comments and stories.
        </Text>

        {/* ============================================================
            PHOTO PREVIEW — NOT CLICKABLE
            ============================================================ */}

        <View
          style={
            styles.avatarContainer
          }
        >

          {avatarUrl ? (
            <Image accessibilityLabel="Profile photo"
              source={{
                uri:
                  avatarUrl,
              }}
              style={
                styles.avatar
              }
              resizeMode="cover"
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

        </View>

        {/* ============================================================
            THE ONLY UPLOAD BUTTON
            ============================================================ */}

        <Pressable
          onPress={
            handlePickPhoto
          }
          disabled={
            uploadingPhoto
          }
          style={({ pressed }) => [
            styles.uploadButton,

            pressed &&
              styles.pressed,

            uploadingPhoto &&
              styles.disabled,
          ]}
        >

          {uploadingPhoto ? (
            <View
              style={
                styles.loadingButtonContent
              }
            >
              <ActivityIndicator
                size="small"
                color={
                  colors.primary
                }
              />

              <Text
                style={
                  styles.uploadButtonText
                }
              >
                Uploading...
              </Text>
            </View>
          ) : (
            <Text
              style={
                styles.uploadButtonText
              }
            >
              {avatarUrl
                ? 'Change Photo'
                : 'Upload Photo'}
            </Text>
          )}

        </Pressable>

        {/* REMOVE PHOTO */}

        {avatarUrl ? (
          <Pressable
            onPress={
              handleRemovePhoto
            }
            disabled={
              uploadingPhoto
            }
            style={
              styles.removeButton
            }
          >
            <Text
              style={
                styles.removeButtonText
              }
            >
              Remove Photo
            </Text>
          </Pressable>
        ) : null}

      </View>

      {/* ================================================================
          FULL NAME
          ================================================================ */}

      <Text
        style={
          styles.label
        }
      >
        Full Name
      </Text>

      <TextInput
        style={
          styles.input
        }
        value={
          fullName
        }
        onChangeText={
          setFullName
        }
        placeholder="Your name"
        placeholderTextColor={
          colors.textMuted
        }
      />

      {/* ================================================================
          BIO
          ================================================================ */}

      <Text
        style={
          styles.label
        }
      >
        Bio
      </Text>

      <TextInput
        style={[
          styles.input,
          styles.textArea,
        ]}
        value={
          bio
        }
        onChangeText={
          setBio
        }
        placeholder="Tell people a bit about yourself..."
        placeholderTextColor={
          colors.textMuted
        }
        multiline
        numberOfLines={4}
      />

      {/* ================================================================
          SAVE CHANGES
          ================================================================ */}

      <Pressable
        style={({ pressed }) => [
          styles.saveBtn,

          pressed &&
            styles.pressed,

          (saving ||
            uploadingPhoto) &&
            styles.disabled,
        ]}
        onPress={
          handleSave
        }
        disabled={
          saving ||
          uploadingPhoto
        }
      >

        {saving ? (
          <ActivityIndicator
            color="#fff"
          />
        ) : (
          <Text
            style={
              styles.saveBtnText
            }
          >
            Save Changes
          </Text>
        )}

      </Pressable>

    </ScrollView>
  );
}

/*
|--------------------------------------------------------------------------
| INITIALS
|--------------------------------------------------------------------------
*/

function getInitials(
  name
) {
  if (!name) {
    return 'A';
  }

  const parts =
    name
      .trim()
      .split(/\s+/);

  if (
    parts.length >= 2
  ) {
    return (
      parts[0].charAt(0) +
      parts[
        parts.length - 1
      ].charAt(0)
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

const styles =
  StyleSheet.create({

    container: {
      flex: 1,
      backgroundColor:
        colors.background,
    },

    content: {
      padding:
        spacing.md,

      paddingBottom:
        spacing.xl * 2,
    },

    loadingContainer: {
      justifyContent:
        'center',

      alignItems:
        'center',
    },

    loadingText: {
      color:
        colors.textMuted,

      marginTop:
        spacing.sm,
    },

    pageTitle: {
      color:
        colors.text,

      fontSize: 24,

      fontWeight:
        '900',

      marginBottom:
        spacing.lg,
    },

    /*
    |--------------------------------------------------------------------------
    | PHOTO CARD
    |--------------------------------------------------------------------------
    */

    photoCard: {
      backgroundColor:
        colors.surface,

      borderWidth: 1,

      borderColor:
        colors.border,

      borderRadius:
        radius.md,

      padding:
        spacing.lg,

      alignItems:
        'center',

      marginBottom:
        spacing.md,
    },

    sectionTitle: {
      color:
        colors.text,

      fontSize: 18,

      fontWeight:
        '900',

      marginBottom:
        spacing.xs,
    },

    sectionDescription: {
      color:
        colors.textMuted,

      fontSize: 12,

      lineHeight: 18,

      textAlign:
        'center',

      maxWidth: 500,

      marginBottom:
        spacing.lg,
    },

    /*
    |--------------------------------------------------------------------------
    | PHOTO PREVIEW
    |--------------------------------------------------------------------------
    */

    avatarContainer: {
      width: 130,

      height: 130,

      borderRadius: 65,

      marginBottom:
        spacing.lg,

      overflow:
        'hidden',
    },

    avatar: {
      width: 130,

      height: 130,

      borderRadius: 65,

      backgroundColor:
        colors.surface,
    },

    avatarPlaceholder: {
      width: 130,

      height: 130,

      borderRadius: 65,

      backgroundColor:
        colors.primary,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    avatarInitials: {
      color:
        '#fff',

      fontSize: 40,

      fontWeight:
        '900',
    },

    /*
    |--------------------------------------------------------------------------
    | UPLOAD BUTTON
    |--------------------------------------------------------------------------
    */

    uploadButton: {
      minHeight: 50,

      minWidth: 170,

      paddingHorizontal:
        spacing.lg,

      borderRadius:
        radius.md,

      borderWidth: 1,

      borderColor:
        colors.primary,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    loadingButtonContent: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap: 8,
    },

    uploadButtonText: {
      color:
        colors.primary,

      fontSize: 15,

      fontWeight:
        '900',
    },

    removeButton: {
      marginTop:
        spacing.sm,

      padding:
        spacing.sm,
    },

    removeButtonText: {
      color:
        '#d32f2f',

      fontSize: 13,

      fontWeight:
        '800',
    },

    /*
    |--------------------------------------------------------------------------
    | FORM
    |--------------------------------------------------------------------------
    */

    label: {
      ...typography.caption,

      marginTop:
        spacing.md,

      marginBottom:
        4,
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
    },

    textArea: {
      height: 100,

      textAlignVertical:
        'top',
    },

    /*
    |--------------------------------------------------------------------------
    | SAVE
    |--------------------------------------------------------------------------
    */

    saveBtn: {
      marginTop:
        spacing.xl,

      backgroundColor:
        colors.primary,

      padding:
        spacing.md,

      borderRadius:
        radius.md,

      alignItems:
        'center',

      minHeight: 50,

      justifyContent:
        'center',
    },

    saveBtnText: {
      color:
        '#fff',

      fontWeight:
        '700',

      fontSize: 16,
    },

    /*
    |--------------------------------------------------------------------------
    | STATES
    |--------------------------------------------------------------------------
    */

    pressed: {
      opacity:
        0.65,
    },

    disabled: {
      opacity:
        0.5,
    },

  });