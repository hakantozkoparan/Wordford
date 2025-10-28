import { useEffect } from 'react';
import { Alert, Platform } from 'react-native';
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
        
        if (__DEV__) {
          Alert.alert('ATS Debug', `İzin durumu: ${status}, canAskAgain: ${canAskAgain}`);
        }

        // Sadece undetermined ise sor (ilk kez)
        if (status === 'undetermined' && canAskAgain) {
          if (__DEV__) {
            Alert.alert('ATS Debug', 'ATS izni isteniyor...');
          }
          
          const result = await requestTrackingPermissionsAsync();
          
          if (__DEV__) {
            Alert.alert('ATS Debug', `ATS izin sonucu: ${JSON.stringify(result)}`);
          }
          
          // Storage'a kaydet (bir daha sorma)
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
      console.log('Bildirim izni tamamlandı');
      
      // Uygulama tamamen yüklenince ATS iznini iste (2 saniye bekle)
      setTimeout(() => {
        console.log('ATS izni için bekleme tamamlandı, şimdi isteniyor...');
        requestTrackingPermission();
      }, 2000);
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
