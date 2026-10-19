import {
    useCallback,
    useEffect,
    useState,
} from 'react';

import {
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';

import { router } from 'expo-router';

import { Ionicons } from '@expo/vector-icons';

import {
    colors,
    spacing
} from '../constants/theme';

import { useAuth } from '../context/AuthContext';

import {
    createStory,
    getStoryGroups,
} from '../lib/nesba';

import { supabase } from '../lib/supabase';


/*
|--------------------------------------------------------------------------
| STORIES BAR
|--------------------------------------------------------------------------
*/

export default function StoriesBar() {

  const {
    user,
    session,
  } = useAuth();


  const [groups, setGroups] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [uploading, setUploading] =
    useState(false);


  /*
  |--------------------------------------------------------------------------
  | LOAD STORIES
  |--------------------------------------------------------------------------
  */

  const loadStories =
    useCallback(
      async () => {

        if (
          !session?.user?.id
        ) {
          setGroups([]);
          setLoading(false);
          return;
        }

        try {

          const data =
            await getStoryGroups(
              session.user.id
            );

          setGroups(
            data || []
          );

        } catch (error) {

          console.error(
            'Stories load error:',
            error
          );

          setGroups([]);

        } finally {

          setLoading(false);

        }

      },

      [
        session?.user?.id,
      ]
    );


  useEffect(() => {

    loadStories();

  }, [loadStories]);


  /*
  |--------------------------------------------------------------------------
  | PICK STORY
  |--------------------------------------------------------------------------
  */

  async function pickStory() {

    if (
      !session?.user?.id
    ) {
      return;
    }

    try {

      setUploading(true);


      /*
      |--------------------------------------------------------------------------
      | REQUEST PERMISSION
      |--------------------------------------------------------------------------
      */

      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (
        permission.status !==
        'granted'
      ) {

        alert(
          'Please allow NESBA to access your photos.'
        );

        return;
      }


      /*
      |--------------------------------------------------------------------------
      | PICK IMAGE OR VIDEO
      |--------------------------------------------------------------------------
      */

      const result =
        await ImagePicker.launchImageLibraryAsync(
          {
            mediaTypes:
              ['images', 'videos'],

            allowsEditing:
              false,

            quality:
              0.9,

            videoMaxDuration:
              60,

            selectionLimit:
              1,
          }
        );


      if (
        result.canceled
      ) {
        return;
      }


      const asset =
        result.assets?.[0];


      if (!asset?.uri) {
        return;
      }


      /*
      |--------------------------------------------------------------------------
      | DETERMINE MEDIA TYPE
      |--------------------------------------------------------------------------
      */

      const mediaType =
        asset.type ===
        'video'
          ? 'video'
          : 'image';


      /*
      |--------------------------------------------------------------------------
      | FILE EXTENSION
      |--------------------------------------------------------------------------
      */

      let extension =
        mediaType === 'video'
          ? 'mp4'
          : 'jpg';


      if (
        asset.fileName
      ) {

        const parts =
          asset.fileName.split('.');

        if (
          parts.length > 1
        ) {

          extension =
            parts[
              parts.length - 1
            ].toLowerCase();

        }

      }


      /*
      |--------------------------------------------------------------------------
      | STORAGE PATH
      |--------------------------------------------------------------------------
      */

      const filePath =
        `${session.user.id}/${Date.now()}.${extension}`;


      /*
      |--------------------------------------------------------------------------
      | READ FILE
      |--------------------------------------------------------------------------
      */

      const response =
        await fetch(
          asset.uri
        );

      const blob =
        await response.blob();


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
          .from('stories')
          .upload(
            filePath,
            blob,
            {
              contentType:
                asset.mimeType ||
                (
                  mediaType ===
                  'video'
                    ? 'video/mp4'
                    : 'image/jpeg'
                ),

              upsert:
                false,
            }
          );


      if (
        uploadError
      ) {

        throw uploadError;

      }


      /*
      |--------------------------------------------------------------------------
      | GET PUBLIC URL
      |--------------------------------------------------------------------------
      */

      const {
        data:
          publicUrlData,
      } =
        supabase.storage
          .from('stories')
          .getPublicUrl(
            filePath
          );


      const mediaUrl =
        publicUrlData?.publicUrl;


      if (!mediaUrl) {

        throw new Error(
          'Could not create the story URL.'
        );

      }


      /*
      |--------------------------------------------------------------------------
      | CREATE STORY DATABASE RECORD
      |--------------------------------------------------------------------------
      */

      await createStory({
        userId:
          session.user.id,

        mediaUrl,

        mediaType,
      });


      /*
      |--------------------------------------------------------------------------
      | REFRESH
      |--------------------------------------------------------------------------
      */

      await loadStories();

    } catch (error) {

      console.error(
        'Story upload error:',
        error
      );

      alert(
        error?.message ||
        'Could not upload your story.'
      );

    } finally {

      setUploading(false);

    }

  }


  /*
  |--------------------------------------------------------------------------
  | OPEN STORY
  |--------------------------------------------------------------------------
  */

  function openStory(
    group
  ) {

    if (
      !group?.userId
    ) {
      return;
    }

    const storyId =
      group.latestStory?.id ||
      group.stories?.[0]?.id;

    if (!storyId) {
      return;
    }

    router.push(
      `/story/${storyId}`
    );

  }


  /*
  |--------------------------------------------------------------------------
  | NOT LOGGED IN
  |--------------------------------------------------------------------------
  */

  if (!session) {
    return null;
  }


  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (loading) {

    return (

      <View
        style={
          styles.container
        }
      >

        <View
          style={
            styles.header
          }
        >

          <Text
            style={
              styles.title
            }
          >
            Stories
          </Text>

        </View>

        <ActivityIndicator
          color={
            colors.primary
          }
        />

      </View>

    );

  }


  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (

    <View
      style={
        styles.container
      }
    >

      {/* ================================================================
          HEADER
          ================================================================ */}

      <View
        style={
          styles.header
        }
      >

        <Text
          style={
            styles.title
          }
        >
          Stories
        </Text>

      </View>


      {/* ================================================================
          STORY LIST
          ================================================================ */}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={
          false
        }

        contentContainerStyle={
          styles.storyList
        }
      >


        {/* ==============================================================
            YOUR STORY
            ============================================================== */}

        <Pressable
          style={
            styles.storyItem
          }

          onPress={
            pickStory
          }

          disabled={
            uploading
          }
        >

          <View
            style={
              styles.addStoryCircle
            }
          >

            {user?.user_metadata?.avatar_url ? (

              <Image accessibilityLabel="Profile photo"
                source={{
                  uri:
                    user
                      .user_metadata
                      .avatar_url,
                }}

                style={
                  styles.avatarImage
                }
              />

            ) : (

              <View
                style={
                  styles.avatarPlaceholder
                }
              >

                <Ionicons
                  name="person"
                  size={30}
                  color="#fff"
                />

              </View>

            )}


            <View
              style={
                styles.plusButton
              }
            >

              {uploading ? (

                <ActivityIndicator
                  size="small"
                  color="#fff"
                />

              ) : (

                <Ionicons
                  name="add"
                  size={18}
                  color="#fff"
                />

              )}

            </View>

          </View>


          <Text
            style={
              styles.storyName
            }

            numberOfLines={
              1
            }
          >
            Your Story
          </Text>

        </Pressable>


        {/* ==============================================================
            OTHER STORIES
            ============================================================== */}

        {groups.map(
          (group) => {

            const person =
              group.person ||
              {};

            const name =
              person.full_name ||
              'NESBA Member';

            const avatar =
              person.avatar_url ||
              null;

            const latest =
              group.latestStory;


            return (

              <Pressable
                key={
                  group.userId
                }

                style={
                  styles.storyItem
                }

                onPress={() =>
                  openStory(
                    group
                  )
                }
              >

                <View
                  style={[
                    styles.storyCircle,

                    group.hasUnseen
                      ? styles.storyCircleUnseen
                      : styles.storyCircleSeen,
                  ]}
                >

                  <View
                    style={
                      styles.storyInner
                    }
                  >

                    {avatar ? (

                      <Image accessibilityLabel="Profile photo"
                        source={{
                          uri:
                            avatar,
                        }}

                        style={
                          styles.storyImage
                        }
                      />

                    ) : (

                      <View
                        style={
                          styles.storyPlaceholder
                        }
                      >

                        <Text
                          style={
                            styles.initials
                          }
                        >
                          {getInitials(
                            name
                          )}
                        </Text>

                      </View>

                    )}

                  </View>

                </View>


                <Text
                  style={
                    styles.storyName
                  }

                  numberOfLines={
                    1
                  }
                >
                  {name}
                </Text>

              </Pressable>

            );

          }
        )}

      </ScrollView>

    </View>

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
    return 'N';
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

      backgroundColor:
        colors.background,

      paddingTop:
        spacing.sm,

      paddingBottom:
        spacing.sm,

    },


    header: {

      paddingHorizontal:
        spacing.md,

      marginBottom:
        spacing.sm,

    },


    title: {

      color:
        colors.text,

      fontSize: 18,

      fontWeight:
        '900',

    },


    storyList: {

      paddingHorizontal:
        spacing.md,

      gap:
        spacing.md,

    },


    storyItem: {

      width: 70,

      alignItems:
        'center',

    },


    addStoryCircle: {

      width: 64,

      height: 64,

      borderRadius: 32,

      borderWidth: 2,

      borderColor:
        colors.border,

      position:
        'relative',

      alignItems:
        'center',

      justifyContent:
        'center',

      overflow:
        'visible',

    },


    storyCircle: {

      width: 68,

      height: 68,

      borderRadius: 34,

      padding: 2,

      alignItems:
        'center',

      justifyContent:
        'center',

    },


    storyCircleUnseen: {

      borderWidth: 3,

      borderColor:
        colors.primary,

    },


    storyCircleSeen: {

      borderWidth: 2,

      borderColor:
        colors.border,

    },


    storyInner: {

      width: 60,

      height: 60,

      borderRadius: 30,

      overflow:
        'hidden',

      backgroundColor:
        colors.surface,

    },


    avatarImage: {

      width: 60,

      height: 60,

      borderRadius: 30,

    },


    storyImage: {

      width: 60,

      height: 60,

      borderRadius: 30,

    },


    avatarPlaceholder: {

      width: 60,

      height: 60,

      borderRadius: 30,

      backgroundColor:
        colors.primary,

      alignItems:
        'center',

      justifyContent:
        'center',

    },


    storyPlaceholder: {

      flex: 1,

      backgroundColor:
        colors.primary,

      alignItems:
        'center',

      justifyContent:
        'center',

    },


    initials: {

      color:
        '#fff',

      fontSize: 19,

      fontWeight:
        '900',

    },


    plusButton: {

      position:
        'absolute',

      right:
        -2,

      bottom:
        -2,

      width: 23,

      height: 23,

      borderRadius: 12,

      backgroundColor:
        colors.primary,

      borderWidth: 2,

      borderColor:
        colors.background,

      alignItems:
        'center',

      justifyContent:
        'center',

    },


    storyName: {

      color:
        colors.text,

      fontSize: 11,

      fontWeight:
        '700',

      marginTop:
        5,

      maxWidth:
        68,

      textAlign:
        'center',

    },

  });