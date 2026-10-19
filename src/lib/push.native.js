import { useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { supabase } from './supabase';

// Show notifications as banners even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let currentToken = null;

/**
 * Ask for permission and register this phone for the signed-in user.
 * Needs a real device and an EAS project id (run `npx eas init` once).
 */
export async function registerForPush() {
  if (!Device.isDevice) return;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

  if (!projectId) {
    console.warn('Push notifications need an EAS project id: run `npx eas init`.');
    return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'NESBA',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  let { status } = await Notifications.getPermissionsAsync();

  if (status !== 'granted') {
    ({ status } = await Notifications.requestPermissionsAsync());
  }

  if (status !== 'granted') return;

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

  const { error } = await supabase.rpc('register_push_token', {
    p_token: token,
    p_platform: Platform.OS,
  });

  if (!error) currentToken = token;
}

// Call before signing out, while the session can still prove who we are.
export async function unregisterPush() {
  if (!currentToken) return;
  await supabase.rpc('unregister_push_token', { p_token: currentToken });
  currentToken = null;
}

// Open the right screen when a notification is tapped.
export function usePushNavigation() {
  useEffect(() => {
    const open = (response) => {
      const url = response?.notification?.request?.content?.data?.url;
      if (typeof url === 'string' && url.startsWith('/')) router.push(url);
    };

    Notifications.getLastNotificationResponseAsync().then(open);
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, []);
}
