import { Alert, DevSettings } from 'react-native';
import Storage from 'expo-sqlite/kv-store';

const KEY = 'nesba-theme';

// Read synchronously: every screen builds its styles from the palette as soon
// as it is imported, so the choice has to be known before the first render.
export function getStoredThemeName() {
  try {
    return Storage.getItemSync(KEY);
  } catch {
    return null;
  }
}

export function saveThemeNameAndReload(name) {
  Storage.setItemSync(KEY, name);

  if (__DEV__) {
    DevSettings.reload();
    return;
  }

  Alert.alert(
    'Theme saved',
    'Close and reopen NESBA to see the new theme.'
  );
}
