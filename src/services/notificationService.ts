import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';

import { FIREBASE_COLLECTIONS, STORAGE_KEYS } from '@/config/appConfig';
import { db, firebaseServerTimestamp } from '@/config/firebase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const REMINDER_CHANNEL_ID = 'daily-reminders';
const REMINDER_MESSAGES = [
  {
    hour: 11,
    minute: 0,
    title: 'Kelime molası ✨',
    body: 'Bugün kelime öğrenmeyecek miyiz? Hadi birkaç kelime tekrar edelim!',
  },
  {
    hour: 19,
    minute: 0,
    title: 'Akşam tekrar zamanı 🔁',
    body: 'Günün sonuna gelmeden birkaç kelime çalışmaya ne dersin?',
  },
];

const getProjectId = (): string | null => {
  const easProjectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (easProjectId) {
    return easProjectId;
  }

  const legacyProjectId = Constants.easConfig?.projectId;
  if (legacyProjectId) {
    return legacyProjectId;
  }

  return null;
};

const getStoredReminderIds = async (): Promise<string[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.notificationReminders);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed.filter((item) => typeof item === 'string') as string[]) : [];
  } catch (error) {
    console.warn('Bildirim kimlikleri okunamadı:', error);
    return [];
  }
};

const persistReminderIds = async (ids: string[]) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.notificationReminders, JSON.stringify(ids));
  } catch (error) {
    console.warn('Bildirim kimlikleri kaydedilemedi:', error);
  }
};

const cancelStoredReminders = async () => {
  const existingIds = await getStoredReminderIds();
  if (!existingIds.length) {
    return;
  }

  await Promise.all(
    existingIds.map(async (id) => {
      try {
        await Notifications.cancelScheduledNotificationAsync(id);
      } catch (error) {
        console.warn(`Bildirim iptal edilemedi (${id}):`, error);
      }
    }),
  );

  await persistReminderIds([]);
};

const ensureNotificationChannel = async () => {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: 'Günlük Hatırlatmalar',
    importance: Notifications.AndroidImportance.DEFAULT,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    sound: 'default',
  });
};

const requestPermissions = async (): Promise<boolean> => {
  try {
    const existingStatus = await Notifications.getPermissionsAsync();
    if (existingStatus.status === 'granted') {
      return true;
    }

    if (!existingStatus.canAskAgain) {
      return false;
    }

    const response = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    return response.status === 'granted';
  } catch (error) {
    console.warn('Bildirim izinleri alınamadı:', error);
    return false;
  }
};

const scheduleReminders = async () => {
  await ensureNotificationChannel();
  await cancelStoredReminders();

  const ids: string[] = [];
  for (const reminder of REMINDER_MESSAGES) {
    try {
      const trigger =
        Platform.OS === 'android'
          ? {
              type: 'daily' as const,
              hour: reminder.hour,
              minute: reminder.minute,
              channelId: REMINDER_CHANNEL_ID,
            }
          : {
              type: 'calendar' as const,
              repeats: true,
              hour: reminder.hour,
              minute: reminder.minute,
            };

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: reminder.title,
          body: reminder.body,
          sound: 'default',
          data: {
            type: 'dailyReminder',
            targetHour: reminder.hour,
          },
        },
        trigger: trigger as Notifications.NotificationTriggerInput,
      });
      ids.push(id);
    } catch (error) {
      console.warn('Bildirim planlanamadı:', error);
    }
  }

  if (ids.length) {
    await persistReminderIds(ids);
  }
};

const fetchExpoPushToken = async (): Promise<string | null> => {
  if (!Device.isDevice) {
    console.warn('Fiziksel cihaz olmadan push token alınamıyor.');
    return null;
  }

  const projectId = getProjectId();
  if (!projectId) {
    console.warn('Expo projectId bulunamadı. app.json içine EAS projectId ekleyin.');
    return null;
  }

  try {
    const response = await Notifications.getExpoPushTokenAsync({ projectId });
    return response.data;
  } catch (error) {
    console.warn('Expo push token alınamadı:', error);
    return null;
  }
};

export const initializeNotifications = async () => {
  const granted = await requestPermissions();
  if (!granted) {
    await cancelStoredReminders();
    return {
      granted: false,
    } as const;
  }

  await scheduleReminders();
  return {
    granted: true,
  } as const;
};

export const syncUserPushToken = async (userId: string, existingToken?: string | null) => {
  const granted = await requestPermissions();
  if (!granted) {
    await AsyncStorage.removeItem(STORAGE_KEYS.expoPushToken);
    try {
      const userRef = doc(db, FIREBASE_COLLECTIONS.users, userId);
      await updateDoc(userRef, {
        pushEnabled: false,
        updatedAt: firebaseServerTimestamp(),
      });
    } catch (error) {
      console.warn('Push izin güncellemesi başarısız oldu:', error);
    }
    return null;
  }

  const pushToken = await fetchExpoPushToken();
  if (!pushToken) {
    return null;
  }

  try {
    const cachedToken = await AsyncStorage.getItem(STORAGE_KEYS.expoPushToken);
    if (cachedToken !== pushToken) {
      await AsyncStorage.setItem(STORAGE_KEYS.expoPushToken, pushToken);
    }
  } catch (error) {
    console.warn('Push token önbelleğe alınamadı:', error);
  }

  if (existingToken === pushToken) {
    return pushToken;
  }

  try {
    const userRef = doc(db, FIREBASE_COLLECTIONS.users, userId);
    await updateDoc(userRef, {
      pushToken,
      pushEnabled: true,
      updatedAt: firebaseServerTimestamp(),
    });
  } catch (error) {
    console.warn('Push token Firestore ile senkronize edilemedi:', error);
  }

  return pushToken;
};
