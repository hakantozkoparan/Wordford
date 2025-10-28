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
        const { status, canAskAgain } = await getTrackingPermissionsAsync();
        console.log('ATS izin durumu:', { status, canAskAgain });
        const normalizedStatus = status.toLowerCase?.() ?? status;

        if (normalizedStatus === 'not-determined' || normalizedStatus === 'undetermined') {
          const alreadyPrompted = await AsyncStorage.getItem(STORAGE_KEYS.trackingPromptShown);
          console.log('ATS zaten sorulmuş mu:', alreadyPrompted);
          if (alreadyPrompted === 'true' || !canAskAgain) {
            console.log('ATS izni sorulmayacak');
            return;
          }

          console.log('ATS izni isteniyor...');
          const result = await requestTrackingPermissionsAsync();
          console.log('ATS izin sonucu:', result);
          await AsyncStorage.setItem(STORAGE_KEYS.trackingPromptShown, 'true');
          return;
        }

        if (normalizedStatus === 'denied' && canAskAgain) {
          console.log('ATS izni reddedilmiş, tekrar soruluyor...');
          const result = await requestTrackingPermissionsAsync();
          console.log('ATS izin tekrar sonucu:', result);
          await AsyncStorage.setItem(STORAGE_KEYS.trackingPromptShown, 'true');
        }

        if (normalizedStatus !== 'not-determined' && normalizedStatus !== 'undetermined') {
          console.log('ATS izni zaten belirlenmiş:', normalizedStatus);
          await AsyncStorage.setItem(STORAGE_KEYS.trackingPromptShown, 'true');
        }
      } catch (error) {
        console.warn('Takip izni istenirken hata oluştu:', error);
      }
    };

    // Bildirim izninden sonra ATS iznini iste
    const initializePermissions = async () => {
      // Önce bildirim iznini bekle
      console.log('Bildirim izni isteniyor...');
      await initializeNotifications().catch((error) => {
        console.warn('Bildirimler başlatılırken hata oluştu:', error);
      });
      console.log('Bildirim izni tamamlandı, ATS izni isteniyor...');
      
      // Bildirim izni tamamlandıktan hemen sonra ATS iznini iste
      requestTrackingPermission();
    };

    initializePermissions();
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
