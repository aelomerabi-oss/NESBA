import * as DocumentPicker from 'expo-document-picker';
import { supabase } from './supabase';

/**
 * Opens the file picker for lesson content.
 *
 * Supported:
 * - video
 * - audio
 * - recording
 * - document
 */
export async function pickLessonFile(lessonType) {
  const typeMap = {
    video: ['video/*'],

    audio: ['audio/*'],

    recording: [
      'video/*',
      'audio/*',
    ],

    document: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ],
  };

  const allowedTypes =
    typeMap[lessonType] || ['*/*'];

  const result =
    await DocumentPicker.getDocumentAsync({
      type: allowedTypes,
      copyToCacheDirectory: true,
      multiple: false,
    });

  /*
   * User cancelled the file picker.
   */
  if (result.canceled) {
    return null;
  }

  const asset =
    result.assets?.[0];

  if (!asset) {
    return null;
  }

  return {
    uri: asset.uri,

    name:
      asset.name ||
      `lesson-${Date.now()}`,

    mimeType:
      asset.mimeType ||
      'application/octet-stream',

    size:
      asset.size || null,
  };
}


/**
 * Upload a lesson file to Supabase Storage.
 *
 * Storage bucket:
 *
 * lesson-files
 *
 * Storage path:
 *
 * userId/courseId/lessonId/filename
 */
export async function uploadLessonFile({
  userId,
  courseId,
  lessonId,
  file,
}) {
  if (!userId) {
    throw new Error(
      'User is not authenticated.'
    );
  }

  if (!courseId) {
    throw new Error(
      'Course ID is required.'
    );
  }

  if (!lessonId) {
    throw new Error(
      'Lesson ID is required.'
    );
  }

  if (!file?.uri) {
    throw new Error(
      'No file was selected.'
    );
  }

  /*
   * Make the filename safe for
   * Supabase Storage.
   */
  const safeName =
    file.name
      .replace(
        /[^a-zA-Z0-9._-]/g,
        '_'
      );

  const storagePath =
    `${userId}/${courseId}/${lessonId}/${Date.now()}-${safeName}`;

  /*
   * Read the selected local/web file.
   */
  const response =
    await fetch(file.uri);

  if (!response.ok) {
    throw new Error(
      `Could not read selected file (${response.status}).`
    );
  }

  const blob =
    await response.blob();

  /*
   * Upload to Supabase Storage.
   */
  const { error } =
    await supabase.storage
      .from('lesson-files')
      .upload(
        storagePath,
        blob,
        {
          contentType:
            file.mimeType ||
            'application/octet-stream',

          upsert: false,
        }
      );

  if (error) {
    throw error;
  }

  /*
   * Get the public URL.
   *
   * This works when the
   * lesson-files bucket is public.
   */
  const {
    data: publicUrlData,
  } =
    supabase.storage
      .from('lesson-files')
      .getPublicUrl(
        storagePath
      );

  return {
    storagePath,

    publicUrl:
      publicUrlData?.publicUrl ||
      null,

    name:
      file.name,

    mimeType:
      file.mimeType,

    size:
      file.size,
  };
}
/**
 * Upload a creator media recording (podcast episode, audio lesson,
 * recorded class) to the lesson-files bucket.
 *
 * Storage path:
 *
 * userId/media/timestamp-filename
 */
export async function uploadMediaFile({
  userId,
  file,
}) {
  if (!userId) {
    throw new Error(
      'User is not authenticated.'
    );
  }

  if (!file?.uri) {
    throw new Error(
      'No file was selected.'
    );
  }

  const safeName =
    file.name
      .replace(
        /[^a-zA-Z0-9._-]/g,
        '_'
      );

  const storagePath =
    `${userId}/media/${Date.now()}-${safeName}`;

  const response =
    await fetch(file.uri);

  if (!response.ok) {
    throw new Error(
      `Could not read selected file (${response.status}).`
    );
  }

  const blob =
    await response.blob();

  const { error } =
    await supabase.storage
      .from('lesson-files')
      .upload(
        storagePath,
        blob,
        {
          contentType:
            file.mimeType ||
            'application/octet-stream',
          upsert: false,
        }
      );

  if (error) {
    throw error;
  }

  const {
    data: publicUrlData,
  } =
    supabase.storage
      .from('lesson-files')
      .getPublicUrl(
        storagePath
      );

  return {
    storagePath,
    publicUrl:
      publicUrlData?.publicUrl ||
      null,
  };
}
