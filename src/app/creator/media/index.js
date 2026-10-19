import {
  useState,
} from 'react';

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
  pickLessonFile,
  uploadMediaFile,
} from '../../../lib/lesson-file-upload';

import { createMediaItem } from '../../../lib/nesba';
import { useAuth } from '../../../context/AuthContext';

// Creator Studio media types -> media_items.media_type
const MEDIA_ITEM_TYPES = {
  podcast_series: 'podcast_episode',
  audio_series: 'audio_lesson',
  live_audio: 'recording',
  video_recording: 'recording',
};


export default function CreatorMedia() {
  const { session } = useAuth();

  const [publishing, setPublishing] =
    useState(false);

  const [mediaType, setMediaType] =
    useState('podcast_series');

  const [title, setTitle] =
    useState('');

  const [description, setDescription] =
    useState('');

  const [seriesTitle, setSeriesTitle] =
    useState('');

  const [episodeTitle, setEpisodeTitle] =
    useState('');

  const [selectedFile, setSelectedFile] =
    useState(null);

  const [pickingFile, setPickingFile] =
    useState(false);

  const mediaTypes = [
    {
      id: 'podcast_series',
      title: 'Podcast Series',
      description:
        'Create a podcast series with multiple episodes.',
      icon: 'mic-outline',
    },

    {
      id: 'audio_series',
      title: 'Audio Series',
      description:
        'Create a structured series of audio lessons or sessions.',
      icon: 'musical-notes-outline',
    },

    {
      id: 'live_audio',
      title: 'Live Audio Recording',
      description:
        'Publish a recorded live audio class, discussion or session.',
      icon: 'radio-outline',
    },

    {
      id: 'video_recording',
      title: 'Video Recording',
      description:
        'Publish a recorded live class, workshop or event.',
      icon: 'videocam-outline',
    },
  ];

  const isSeries =
    mediaType ===
      'podcast_series' ||
    mediaType ===
      'audio_series';

  async function browseMedia() {
    try {
      setPickingFile(true);

      const type =
        mediaType ===
        'video_recording'
          ? 'video'
          : 'audio';

      const file =
        await pickLessonFile(type);

      if (file) {
        setSelectedFile(file);
      }
    } catch (error) {
      console.error(
        'Media picker error:',
        error
      );

      Alert.alert(
        'Upload failed',
        error?.message ||
          'Could not select the media file.'
      );
    } finally {
      setPickingFile(false);
    }
  }

  async function publishMedia() {
    if (!title.trim()) {
      Alert.alert(
        'Required',
        'Media title is required.'
      );
      return;
    }

    if (!description.trim()) {
      Alert.alert(
        'Required',
        'Description is required.'
      );
      return;
    }

    if (
      isSeries &&
      !seriesTitle.trim()
    ) {
      Alert.alert(
        'Required',
        'Series title is required.'
      );
      return;
    }

    if (!selectedFile) {
      Alert.alert(
        'Required',
        isSeries
          ? 'Please select the audio file for this episode.'
          : 'Please select an audio or video file.'
      );
      return;
    }

    if (!session?.user?.id) {
      Alert.alert(
        'Login required',
        'Please log in to publish media.'
      );
      return;
    }

    try {
      setPublishing(true);

      const uploaded =
        await uploadMediaFile({
          userId:
            session.user.id,

          file:
            selectedFile,
        });

      const itemTitle =
        isSeries
          ? `${seriesTitle.trim()} · ${
              episodeTitle.trim() ||
              title.trim()
            }`
          : title.trim();

      await createMediaItem({
        title:
          itemTitle,

        description,

        mediaType:
          MEDIA_ITEM_TYPES[mediaType] ||
          'recording',

        mediaUrl:
          uploaded.publicUrl,
      });

      setSelectedFile(null);
      setEpisodeTitle('');

      Alert.alert(
        'Published',
        'Your media is now in the NESBA Media Library.',
        [
          {
            text: 'Open library',
            onPress: () =>
              router.push('/media'),
          },
          {
            text: 'OK',
          },
        ]
      );
    } catch (error) {
      console.error(
        'Publish media error:',
        error
      );

      Alert.alert(
        'Could not publish',
        error?.message ||
          'Something went wrong.'
      );
    } finally {
      setPublishing(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back"
          onPress={() =>
            router.back()
          }
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
            Media Library
          </Text>

          <Text style={styles.subtitle}>
            Create podcast and audio series,
            publish recordings and build your
            NESBA media library.
          </Text>
        </View>
      </View>

      {/* MEDIA TYPE */}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          What are you publishing?
        </Text>

        <View style={styles.typeList}>
          {mediaTypes.map(
            (type) => {
              const selected =
                mediaType ===
                type.id;

              return (
                <Pressable
                  key={type.id}
                  onPress={() => {
                    setMediaType(
                      type.id
                    );

                    setSelectedFile(
                      null
                    );
                  }}
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

                  <View
                    style={
                      styles.typeInfo
                    }
                  >
                    <Text
                      style={
                        styles.typeTitle
                      }
                    >
                      {type.title}
                    </Text>

                    <Text
                      style={
                        styles.typeDescription
                      }
                    >
                      {
                        type.description
                      }
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
                      <View
                        style={
                          styles.radioDot
                        }
                      />
                    ) : null}
                  </View>
                </Pressable>
              );
            }
          )}
        </View>
      </View>

      {/* SERIES */}

      {isSeries ? (
        <View style={styles.card}>
          <Text
            style={
              styles.sectionTitle
            }
          >
            Series
          </Text>

          <Text
            style={
              styles.sectionDescription
            }
          >
            A series can contain
            multiple episodes. Students
            will see the series as one
            organized media collection.
          </Text>

          <FieldLabel
            label="Series Title"
            required
          />

          <TextInput
            value={
              seriesTitle
            }
            onChangeText={
              setSeriesTitle
            }
            style={
              styles.input
            }
            placeholder={
              mediaType ===
              'podcast_series'
                ? 'Example: NESBA Business Podcast'
                : 'Example: Engineering Fundamentals'
            }
            placeholderTextColor={
              colors.textMuted
            }
          />

          <View
            style={
              styles.seriesPreview
            }
          >
            <Ionicons
              name={
                mediaType ===
                'podcast_series'
                  ? 'mic-outline'
                  : 'musical-notes-outline'
              }
              size={30}
              color={
                colors.primary
              }
            />

            <View
              style={
                styles.seriesPreviewInfo
              }
            >
              <Text
                style={
                  styles.seriesPreviewTitle
                }
              >
                {seriesTitle ||
                  'Your series'}
              </Text>

              <Text
                style={
                  styles.seriesPreviewText
                }
              >
                Episodes will appear
                here as you publish them.
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      {/* MEDIA DETAILS */}

      <View style={styles.card}>
        <Text
          style={
            styles.sectionTitle
          }
        >
          {isSeries
            ? 'Episode Details'
            : 'Media Details'}
        </Text>

        {isSeries ? (
          <>
            <FieldLabel
              label="Episode Title"
              required
            />

            <TextInput
              value={
                episodeTitle
              }
              onChangeText={
                setEpisodeTitle
              }
              style={
                styles.input
              }
              placeholder="Example: Episode 1 — Getting Started"
              placeholderTextColor={
                colors.textMuted
              }
            />
          </>
        ) : null}

        <FieldLabel
          label={
            isSeries
              ? 'Episode Description'
              : 'Title'
          }
          required
        />

        <TextInput
          value={title}
          onChangeText={
            setTitle
          }
          style={
            styles.input
          }
          placeholder={
            isSeries
              ? 'Episode description'
              : 'Media title'
          }
          placeholderTextColor={
            colors.textMuted
          }
        />

        <FieldLabel
          label="Description"
          required
        />

        <TextInput
          value={
            description
          }
          onChangeText={
            setDescription
          }
          multiline
          textAlignVertical="top"
          style={[
            styles.input,
            styles.textArea,
          ]}
          placeholder="Describe this content..."
          placeholderTextColor={
            colors.textMuted
          }
        />
      </View>

      {/* UPLOAD */}

      <View style={styles.card}>
        <Text
          style={
            styles.sectionTitle
          }
        >
          Media File
        </Text>

        <Text
          style={
            styles.sectionDescription
          }
        >
          Upload the audio or video
          recording that students will
          listen to or watch.
        </Text>

        <Pressable
          onPress={
            browseMedia
          }
          disabled={
            pickingFile
          }
          style={
            styles.uploadBox
          }
        >
          {pickingFile ? (
            <Text
              style={
                styles.uploadTitle
              }
            >
              Selecting file...
            </Text>
          ) : (
            <>
              <Ionicons
                name={
                  mediaType ===
                  'video_recording'
                    ? 'videocam-outline'
                    : 'cloud-upload-outline'
                }
                size={38}
                color={
                  colors.primary
                }
              />

              <Text
                style={
                  styles.uploadTitle
                }
              >
                Browse / Upload
              </Text>

              <Text
                style={
                  styles.uploadDescription
                }
              >
                {mediaType ===
                'video_recording'
                  ? 'Select a video recording'
                  : 'Select an audio recording'}
              </Text>
            </>
          )}
        </Pressable>

        {selectedFile ? (
          <View
            style={
              styles.selectedFile
            }
          >
            <Ionicons
              name="checkmark-circle"
              size={25}
              color={
                colors.success
              }
            />

            <View
              style={
                styles.selectedFileInfo
              }
            >
              <Text
                style={
                  styles.selectedFileName
                }
              >
                {selectedFile.name}
              </Text>

              <Text
                style={
                  styles.selectedFileStatus
                }
              >
                Ready to publish
              </Text>
            </View>

            <Pressable accessibilityRole="button" accessibilityLabel="Remove"
              onPress={() =>
                setSelectedFile(
                  null
                )
              }
            >
              <Ionicons
                name="close-circle-outline"
                size={22}
                color={
                  colors.textMuted
                }
              />
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* SERIES STRUCTURE */}

      {isSeries ? (
        <View style={styles.card}>
          <Text
            style={
              styles.sectionTitle
            }
          >
            Series Structure
          </Text>

          <View
            style={
              styles.structureItem
            }
          >
            <View
              style={
                styles.structureNumber
              }
            >
              <Text
                style={
                  styles.structureNumberText
                }
              >
                1
              </Text>
            </View>

            <View
              style={
                styles.structureInfo
              }
            >
              <Text
                style={
                  styles.structureTitle
                }
              >
                First Episode
              </Text>

              <Text
                style={
                  styles.structureText
                }
              >
                This episode will
                appear inside your
                series.
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() =>
              Alert.alert(
                'Add Episode',
                'Episode management will allow you to add additional episodes to this series.'
              )
            }
            style={
              styles.addEpisodeButton
            }
          >
            <Ionicons
              name="add-circle-outline"
              size={20}
              color={
                colors.primary
              }
            />

            <Text
              style={
                styles.addEpisodeText
              }
            >
              Add Another Episode
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* PUBLISH */}

      <Pressable
        onPress={
          publishMedia
        }
        disabled={publishing}
        style={({ pressed }) => [
          styles.publishButton,
          (pressed || publishing) &&
            styles.pressed,
        ]}
      >
        <Ionicons
          name="cloud-upload-outline"
          size={21}
          color="#fff"
        />

        <Text
          style={
            styles.publishButtonText
          }
        >
          {publishing
            ? 'Publishing…'
            : 'Publish Media'}
        </Text>
      </Pressable>

      <Pressable
        onPress={() =>
          router.push(
            '/creator'
          )
        }
        style={
          styles.backToStudio
        }
      >
        <Text
          style={
            styles.backToStudioText
          }
        >
          Back to Creator Studio
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
      {label}{' '}
      {required ? (
        <Text
          style={
            styles.required
          }
        >
          *
        </Text>
      ) : null}
    </Text>
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
  },

  header: {
    flexDirection:
      'row',
    alignItems:
      'flex-start',
    marginBottom:
      spacing.lg,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor:
      colors.surface,
    borderWidth: 1,
    borderColor:
      colors.border,
    alignItems:
      'center',
    justifyContent:
      'center',
    marginRight:
      spacing.sm,
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
    color:
      colors.textMuted,
    lineHeight: 21,
    marginTop: 4,
  },

  card: {
    backgroundColor:
      colors.surface,
    borderWidth: 1,
    borderColor:
      colors.border,
    borderRadius:
      radius.md,
    padding: spacing.md,
    marginBottom:
      spacing.md,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight:
      '900',
    marginBottom:
      spacing.sm,
  },

  sectionDescription: {
    color:
      colors.textMuted,
    lineHeight: 20,
    marginBottom:
      spacing.sm,
  },

  typeList: {
    gap: spacing.sm,
  },

  typeCard: {
    flexDirection:
      'row',
    alignItems:
      'center',
    borderWidth: 1,
    borderColor:
      colors.border,
    borderRadius:
      radius.md,
    padding:
      spacing.sm,
    backgroundColor:
      colors.background,
  },

  typeCardSelected: {
    borderColor:
      colors.primary,
    borderWidth: 2,
  },

  typeIcon: {
    width: 46,
    height: 46,
    borderRadius:
      radius.md,
    alignItems:
      'center',
    justifyContent:
      'center',
    backgroundColor:
      colors.surface,
    marginRight:
      spacing.sm,
  },

  typeIconSelected: {
    backgroundColor:
      colors.background,
  },

  typeInfo: {
    flex: 1,
  },

  typeTitle: {
    color:
      colors.text,
    fontWeight:
      '900',
    fontSize: 15,
  },

  typeDescription: {
    color:
      colors.textMuted,
    fontSize: 12,
    marginTop: 3,
    lineHeight: 18,
  },

  radio: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 2,
    borderColor:
      colors.border,
    alignItems:
      'center',
    justifyContent:
      'center',
  },

  radioSelected: {
    borderColor:
      colors.primary,
  },

  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor:
      colors.primary,
  },

  label: {
    color:
      colors.text,
    fontWeight:
      '800',
    marginTop:
      spacing.md,
    marginBottom:
      spacing.xs,
  },

  required: {
    color:
      '#ff4d67',
  },

  input: {
    minHeight: 50,
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

  textArea: {
    minHeight: 120,
  },

  seriesPreview: {
    flexDirection:
      'row',
    alignItems:
      'center',
    marginTop:
      spacing.md,
    padding:
      spacing.md,
    borderWidth: 1,
    borderColor:
      colors.border,
    borderRadius:
      radius.md,
    backgroundColor:
      colors.background,
  },

  seriesPreviewInfo: {
    flex: 1,
    marginLeft:
      spacing.sm,
  },

  seriesPreviewTitle: {
    color:
      colors.text,
    fontWeight:
      '900',
  },

  seriesPreviewText: {
    color:
      colors.textMuted,
    fontSize: 12,
    marginTop: 3,
  },

  uploadBox: {
    minHeight: 150,
    borderWidth: 1.5,
    borderStyle:
      'dashed',
    borderColor:
      colors.primary,
    borderRadius:
      radius.md,
    alignItems:
      'center',
    justifyContent:
      'center',
    backgroundColor:
      colors.background,
  },

  uploadTitle: {
    color:
      colors.primary,
    fontWeight:
      '900',
    fontSize: 16,
    marginTop:
      spacing.xs,
  },

  uploadDescription: {
    color:
      colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },

  selectedFile: {
    flexDirection:
      'row',
    alignItems:
      'center',
    gap:
      spacing.sm,
    marginTop:
      spacing.sm,
    padding:
      spacing.sm,
    borderWidth: 1,
    borderColor:
      colors.success,
    borderRadius:
      radius.md,
    backgroundColor:
      colors.background,
  },

  selectedFileInfo: {
    flex: 1,
  },

  selectedFileName: {
    color:
      colors.text,
    fontWeight:
      '800',
  },

  selectedFileStatus: {
    color:
      colors.success,
    fontSize: 12,
    marginTop: 2,
  },

  structureItem: {
    flexDirection:
      'row',
    alignItems:
      'center',
    padding:
      spacing.sm,
    borderWidth: 1,
    borderColor:
      colors.border,
    borderRadius:
      radius.md,
    backgroundColor:
      colors.background,
  },

  structureNumber: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor:
      colors.primary,
    alignItems:
      'center',
    justifyContent:
      'center',
  },

  structureNumberText: {
    color:
      '#fff',
    fontWeight:
      '900',
  },

  structureInfo: {
    flex: 1,
    marginLeft:
      spacing.sm,
  },

  structureTitle: {
    color:
      colors.text,
    fontWeight:
      '900',
  },

  structureText: {
    color:
      colors.textMuted,
    fontSize: 12,
    marginTop: 3,
  },

  addEpisodeButton: {
    minHeight: 46,
    flexDirection:
      'row',
    alignItems:
      'center',
    justifyContent:
      'center',
    gap: 7,
    borderWidth: 1,
    borderColor:
      colors.primary,
    borderRadius:
      radius.md,
    marginTop:
      spacing.sm,
  },

  addEpisodeText: {
    color:
      colors.primary,
    fontWeight:
      '900',
  },

  publishButton: {
    minHeight: 52,
    flexDirection:
      'row',
    alignItems:
      'center',
    justifyContent:
      'center',
    gap: 8,
    backgroundColor:
      colors.primary,
    borderRadius:
      radius.md,
    marginTop: spacing.xs,
  },

  publishButtonText: {
    color:
      '#fff',
    fontWeight:
      '900',
  },

  backToStudio: {
    minHeight: 48,
    alignItems:
      'center',
    justifyContent:
      'center',
    marginTop:
      spacing.sm,
  },

  backToStudioText: {
    color:
      colors.textMuted,
    fontWeight:
      '800',
  },

  pressed: {
    opacity: 0.7,
  },
});