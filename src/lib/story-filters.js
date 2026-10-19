import { Platform } from 'react-native';

// Longest story video, and how much of a story's song is played.
export const STORY_MAX_SECONDS = 45;

/*
 * Instagram-style story filters.
 *
 * `css` is applied with the `filter` style, which react-native-web and
 * Android support. iOS ignores most filter functions, so every filter also
 * has a tint overlay that gives a similar look everywhere.
 */
export const STORY_FILTERS = [
  { id: 'normal', label: 'Normal', css: null, tint: null },
  { id: 'clarendon', label: 'Clarendon', css: 'contrast(1.2) saturate(1.35)', tint: 'rgba(127,187,227,0.15)' },
  { id: 'gingham', label: 'Gingham', css: 'brightness(1.05) hue-rotate(-10deg)', tint: 'rgba(230,230,250,0.18)' },
  { id: 'juno', label: 'Juno', css: 'contrast(1.15) saturate(1.4) sepia(0.15)', tint: 'rgba(255,200,120,0.12)' },
  { id: 'lark', label: 'Lark', css: 'contrast(0.9) brightness(1.1) saturate(1.1)', tint: 'rgba(240,240,255,0.14)' },
  { id: 'ludwig', label: 'Ludwig', css: 'contrast(1.05) saturate(1.2) brightness(1.05)', tint: 'rgba(255,230,200,0.12)' },
  { id: 'valencia', label: 'Valencia', css: 'contrast(1.08) brightness(1.08) sepia(0.08)', tint: 'rgba(250,180,120,0.18)' },
  { id: 'xpro', label: 'X-Pro II', css: 'contrast(1.3) brightness(0.9) sepia(0.3)', tint: 'rgba(255,140,0,0.14)' },
  { id: 'nashville', label: 'Nashville', css: 'sepia(0.2) contrast(1.2) brightness(1.05) saturate(1.2)', tint: 'rgba(247,176,153,0.25)' },
  { id: 'reyes', label: 'Reyes', css: 'sepia(0.22) brightness(1.1) contrast(0.85) saturate(0.75)', tint: 'rgba(239,205,173,0.25)' },
  { id: 'aden', label: 'Aden', css: 'hue-rotate(-20deg) contrast(0.9) saturate(0.85) brightness(1.2)', tint: 'rgba(255,190,200,0.14)' },
  { id: 'willow', label: 'Willow', css: 'grayscale(0.5) contrast(0.95) brightness(0.9)', tint: 'rgba(212,169,175,0.16)' },
  { id: 'moon', label: 'Moon', css: 'grayscale(1) contrast(1.1) brightness(1.1)', tint: 'rgba(160,160,160,0.30)' },
  { id: 'inkwell', label: 'Inkwell', css: 'sepia(0.3) contrast(1.1) brightness(1.1) grayscale(1)', tint: 'rgba(0,0,0,0.30)' },
  { id: 'warm', label: 'Warm', css: 'sepia(0.25) saturate(1.3)', tint: 'rgba(255,150,50,0.18)' },
  { id: 'cool', label: 'Cool', css: 'hue-rotate(15deg) saturate(1.1)', tint: 'rgba(0,130,255,0.18)' },
  { id: 'dream', label: 'Dream', css: 'brightness(1.1) saturate(1.2) contrast(0.9)', tint: 'rgba(255,150,210,0.20)' },
  { id: 'vivid', label: 'Vivid', css: 'saturate(1.8) contrast(1.1)', tint: 'rgba(100,255,140,0.10)' },
];

const BY_ID = Object.fromEntries(STORY_FILTERS.map((f) => [f.id, f]));

const SUPPORTS_CSS_FILTER = Platform.OS !== 'ios';

/** Style for the photo/video itself. */
export function filterMediaStyle(id) {
  const filter = BY_ID[id];

  if (!filter?.css || !SUPPORTS_CSS_FILTER) {
    return null;
  }

  return { filter: filter.css };
}

/** Style for a full-size overlay View placed on top of the media. */
export function filterTintStyle(id) {
  const filter = BY_ID[id];

  if (!filter?.tint) {
    return null;
  }

  return { backgroundColor: filter.tint };
}
