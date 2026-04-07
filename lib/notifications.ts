import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

const isExpoGo = Constants.appOwnership === 'expo';

// Safely set notification handler — will silently fail in Expo Go
try {
  if (!isExpoGo) {
    const Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }
} catch (e) {
  console.log('[Notifications] expo-notifications handler setup failed. Skipping.');
}

export async function registerForPushNotificationsAsync(studentId: string) {
  if (isExpoGo) {
    console.log('[Notifications] Running in Expo Go. Push notifications are disabled in SDK 53+ for Expo Go. Skipping registration.');
    return;
  }

  try {
    const Notifications = require('expo-notifications');

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }
      try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        if (!projectId) {
            console.log('[Notifications] No EAS projectId found. Skipping push token registration.');
            return;
        }
        
        const pushTokenObject = await Notifications.getExpoPushTokenAsync({ projectId });
        const token = pushTokenObject.data;

        if (token && studentId) {
          await supabase
            .from('students')
            // @ts-ignore
            .update({ push_token: token })
            .eq('id', studentId);
        }
        return token;
      } catch (e: any) {
        // Use console.log to avoid triggering the redbox in development for push token fetching failures
        console.log('[Notifications] Error fetching push token:', e.message || e);
      }
    } else {
      console.log('Must use physical device for Push Notifications');
    }
  } catch (e) {
    console.log('[Notifications] Not available in this environment. Skipping registration.');
  }
}
