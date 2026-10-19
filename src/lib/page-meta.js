import { useEffect } from 'react';
import { Platform } from 'react-native';

/*
 * Browser tab title and search/share description on the website.
 * Phones ignore it. The defaults live in public/index.html.
 */

export const DEFAULT_TITLE = 'NESBA · Learn to build your business';
export const DEFAULT_DESCRIPTION =
  "Practical business courses, live classes in a 3D lecture hall, 1-to-1 mentoring and workshops for entrepreneurs, starters and zzp'ers. Join free.";

function setMeta(selector, attribute, value) {
  const tag = document.head.querySelector(selector);
  if (tag) tag.setAttribute(attribute, value);
}

export function setPageMeta({ title, description } = {}) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;

  const fullTitle = title ? `${title} · NESBA` : DEFAULT_TITLE;
  const text = (description || DEFAULT_DESCRIPTION).replace(/\s+/g, ' ').trim().slice(0, 160);

  document.title = fullTitle;
  setMeta('meta[name="description"]', 'content', text);
  setMeta('meta[property="og:title"]', 'content', fullTitle);
  setMeta('meta[property="og:description"]', 'content', text);
}

// For pages whose title comes from data (a course, a workshop).
export function usePageMeta(title, description) {
  useEffect(() => {
    if (title) setPageMeta({ title, description });
  }, [title, description]);
}
