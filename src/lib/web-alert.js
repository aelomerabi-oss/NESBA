import { Alert, Platform } from 'react-native';

/*
 * react-native-web's Alert.alert does nothing, so on web every success
 * message, error and confirmation in the app was silent. Map it to the
 * browser's dialogs:
 *
 * - one button (or none): window.alert, then that button's onPress
 * - with a "cancel" button: window.confirm; OK runs the first other button
 * - two buttons without "cancel": OK runs the first, Cancel the last
 */
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  Alert.alert = (title, message, buttons) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    const list = Array.isArray(buttons) && buttons.length ? buttons : [{ text: 'OK' }];

    if (list.length === 1) {
      window.alert(text);
      list[0].onPress?.();
      return;
    }

    const cancel = list.find((button) => button.style === 'cancel');
    const actions = list.filter((button) => button !== cancel);
    const confirmed = window.confirm(text);

    if (confirmed) {
      actions[0]?.onPress?.();
    } else if (cancel) {
      cancel.onPress?.();
    } else if (actions.length > 1) {
      actions[actions.length - 1].onPress?.();
    }
  };
}
