import { Platform } from 'react-native';
import { supabase, supabaseAnonKey, supabaseUrl } from './supabase';

// Supabase's free plan rejects any single file over 50 MB.
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export function formatBytes(bytes) {
  if (!bytes) return '0 MB';
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Upload a picked file (image picker / document picker asset) to Supabase
 * Storage and report progress from 0 to 1.
 *
 * supabase-js has no progress events, so this talks to the Storage REST
 * endpoint directly with XMLHttpRequest, which works on web and native.
 */
export async function uploadWithProgress({
  bucket,
  path,
  file,
  onProgress,
}) {
  if (file?.size && file.size > MAX_UPLOAD_BYTES) {
    throw new Error(
      `This file is ${formatBytes(file.size)}. The maximum is ${formatBytes(MAX_UPLOAD_BYTES)}.`
    );
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Please log in to upload.');
  }

  const contentType = file.mimeType || 'application/octet-stream';

  let body;

  if (Platform.OS === 'web') {
    // On web the picker gives a blob: URL; send the Blob itself.
    body = file.file || (await (await fetch(file.uri)).blob());

    if (body.size > MAX_UPLOAD_BYTES) {
      throw new Error(
        `This file is ${formatBytes(body.size)}. The maximum is ${formatBytes(MAX_UPLOAD_BYTES)}.`
      );
    }
  } else {
    body = new FormData();
    body.append('file', {
      uri: file.uri,
      name: file.name || path.split('/').pop(),
      type: contentType,
    });
  }

  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open(
      'POST',
      `${supabaseUrl}/storage/v1/object/${bucket}/${path}`
    );
    xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
    xhr.setRequestHeader('apikey', supabaseAnonKey);
    xhr.setRequestHeader('x-upsert', 'false');

    if (Platform.OS === 'web') {
      xhr.setRequestHeader('Content-Type', contentType);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(event.loaded / event.total);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(1);
        resolve();
        return;
      }

      let message = `Upload failed (${xhr.status}).`;

      try {
        const parsed = JSON.parse(xhr.responseText);
        message = parsed.message || parsed.error || message;
      } catch {
        // Keep the generic message.
      }

      if (xhr.status === 413) {
        message = `This file is too large. The maximum is ${formatBytes(MAX_UPLOAD_BYTES)}.`;
      }

      reject(new Error(message));
    };

    xhr.onerror = () =>
      reject(new Error('Upload failed. Check your connection and try again.'));

    xhr.send(body);
  });

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);

  return {
    path,
    publicUrl: data?.publicUrl || null,
  };
}
