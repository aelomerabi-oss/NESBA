const KEY = 'nesba-theme';

export function getStoredThemeName() {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function saveThemeNameAndReload(name) {
  try {
    window.localStorage.setItem(KEY, name);
  } catch {
    // Storage blocked (private mode): the theme applies for this visit only.
  }

  window.location.reload();
}
