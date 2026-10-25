import { useEffect, useState } from 'react';
import { Alert, Linking } from 'react-native';
import { supabase } from './supabase';

/*
 * Files in private buckets cannot be opened with their stored public URL.
 * Storage policies decide who may read them (040_private_files.sql):
 *   posts         photos and videos of posts, for whoever can see the post
 *   lesson-files  lesson files for enrolled learners and the teacher;
 *                 podcasts and recordings once published
 * These helpers swap such a URL for a signed link that works for an hour.
 */

const PRIVATE_BUCKETS = ['posts', 'lesson-files'];
const LINK_SECONDS = 60 * 60;
const cache = new Map();

// { bucket, path } for a file in a private bucket, otherwise null.
export function privateStorageObject(url) {
  const match = /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/([^?#]+)/.exec(url || '');
  if (!match || !PRIVATE_BUCKETS.includes(match[1])) return null;
  return { bucket: match[1], path: decodeURIComponent(match[2]) };
}

function cached(url) {
  const hit = cache.get(url);
  return hit && hit.expires > Date.now() + 60 * 1000 ? hit.url : null;
}

// A link the current viewer can open, or null when they may not see the file.
export async function viewableUrl(url) {
  const file = privateStorageObject(url);
  if (!file) return url || null;

  const hit = cached(url);
  if (hit) return hit;

  const { data, error } = await supabase.storage.from(file.bucket).createSignedUrl(file.path, LINK_SECONDS);
  if (error || !data?.signedUrl) return null;

  cache.set(url, { url: data.signedUrl, expires: Date.now() + LINK_SECONDS * 1000 });
  return data.signedUrl;
}

export function useViewableUrl(url) {
  const [resolved, setResolved] = useState(() => (privateStorageObject(url) ? cached(url) : url || null));

  useEffect(() => {
    let active = true;
    if (!privateStorageObject(url)) {
      setResolved(url || null);
      return undefined;
    }
    viewableUrl(url).then((link) => {
      if (active) setResolved(link);
    });
    return () => {
      active = false;
    };
  }, [url]);

  return resolved;
}

export async function openStoredFile(url) {
  const link = await viewableUrl(url);
  if (!link) {
    Alert.alert('Not available', 'You do not have access to this file.');
    return;
  }
  await Linking.openURL(link);
}
