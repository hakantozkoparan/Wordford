import { useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getTrackingPermissionsAsync,
  requestTrackingPermissionsAsync,
} from 'expo-tracking-transparency';

import { useAuth } from '@/context/AuthContext';
import { initializeNotifications, syncUserPushToken } from '@/services/notificationService';
import { STORAGE_KEYS } from '@/config/appConfig';

export const NotificationInitializer: React.FC = () => {
  const { firebaseUser, profile } = useAuth();

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      return;
    }

    const requestTrackingPermission = async () => {
      try {
        const trackingStatus = await getTrackingPermissionsAsync();
        if (trackingStatus.status !== 'undetermined') {
          await AsyncStorage.setItem(STORAGE_KEYS.trackingPromptShown, 'true');
          return;
        }

        const alreadyPrompted = await AsyncStorage.getItem(STORAGE_KEYS.trackingPromptShown);
        if (alreadyPrompted === 'true' || !trackingStatus.canAskAgain) {
          return;
        }

        await requestTrackingPermissionsAsync();
        await AsyncStorage.setItem(STORAGE_KEYS.trackingPromptShown, 'true');
      } catch (error) {
        console.warn('Takip izni istenirken hata oluştu:', error);
      }
    };

    requestTrackingPermission();
  }, []);

  useEffect(() => {
    initializeNotifications().catch((error) => {
      console.warn('Bildirimler başlatılırken hata oluştu:', error);
    });
  }, []);

  useEffect(() => {
    if (!firebaseUser?.uid) {
      return;
    }

    syncUserPushToken(firebaseUser.uid, profile?.pushToken ?? null).catch((error) => {
      console.warn('Push token senkronizasyonu başarısız:', error);
    });
  }, [firebaseUser?.uid, profile?.pushToken]);

  return null;
};
