import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import api from './api';

/**
 * Registers the device for push notifications and saves the Expo push token
 * to the backend. Requires a physical device and notification permissions.
 *
 * With `expo run:android/ios` (native build), a projectId from Expo/EAS is
 * required. Set it up with `npx eas init` or add it to app.json under
 * expo.extra.eas.projectId.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.warn('[Push] Permission denied by user');
    return null;
  }

  // Android notification channel (must be set before getting token)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#5DBF95',
    });
  }

  // Resolve projectId — required for native builds (expo run:android/ios)
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as any).easConfig?.projectId ??
    undefined;

  console.log('[Push] projectId resolved:', projectId ?? '(none — token may fail on native builds)');

  let token: string;
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    token = tokenData.data;
    console.log('[Push] Token obtained:', token);
  } catch (err: any) {
    console.error('[Push] getExpoPushTokenAsync failed:', err?.message);
    console.error(
      '[Push] Fix: run `npx eas init` to link this project and get a projectId, ' +
      'then add it to app.json under expo.extra.eas.projectId',
    );
    return null;
  }

  // Save to backend
  try {
    await api.patch('/users/me/push-token', { expoPushToken: token });
    console.log('[Push] Token saved to backend ✅');
  } catch (err: any) {
    console.warn('[Push] Failed to save token to backend:', err?.message);
  }

  return token;
}

export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}
