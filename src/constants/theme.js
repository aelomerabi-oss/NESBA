import { getStoredThemeName } from '../lib/theme-preference';

// Text colors meet WCAG AA contrast (4.5:1) on the light backgrounds.
const light = {
  background: '#F7F8FA',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F3F8',
  primary: '#5F4FDC',
  primaryLight: '#6C5CE7',
  primarySoft: '#EEEBFD',
  accent: '#00B8A3',
  premium: '#F5B942',
  text: '#111827',
  textSecondary: '#475467',
  textMuted: '#5F6879',
  border: '#E4E7EC',
  danger: '#D92D20',
  success: '#12B76A',
  warning: '#F79009',
};

const dark = {
  background: '#0F1220',
  surface: '#181C2E',
  surfaceAlt: '#222741',
  primary: '#6C5CE7',
  primaryLight: '#8A7CF0',
  primarySoft: '#2A2550',
  accent: '#00D9C0',
  premium: '#F5B942',
  text: '#F5F6FA',
  textSecondary: '#C3C7D6',
  textMuted: '#9AA0B4',
  border: '#2C3150',
  danger: '#FF6B6B',
  success: '#3DDC97',
  warning: '#F79009',
};

// Light is the default. The choice is read once at startup because styles are
// created when each screen is imported; switching saves and reloads the app.
export const themeName =
  getStoredThemeName() === 'dark' ? 'dark' : 'light';

export const isDarkTheme = themeName === 'dark';

export const colors = isDarkTheme ? dark : light;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: '700', color: colors.text },
  h2: { fontSize: 20, fontWeight: '700', color: colors.text },
  body: { fontSize: 15, fontWeight: '400', color: colors.text },
  caption: { fontSize: 13, fontWeight: '400', color: colors.textMuted },
};
