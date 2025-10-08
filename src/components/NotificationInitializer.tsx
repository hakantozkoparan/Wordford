import { useEffect } from 'react';

import { useAuth } from '@/context/AuthContext';
import { initializeNotifications, syncUserPushToken } from '@/services/notificationService';

export const NotificationInitializer: React.FC = () => {
  const { firebaseUser, profile } = useAuth();

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
