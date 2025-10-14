import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import Constants from 'expo-constants';

import { useAuth } from '@/context/AuthContext';
import { showRewardedAd } from '@/services/rewardAdService';
import { grantBonusResources } from '@/services/creditService';
import { addGuestBonusResources } from '@/services/guestResourceService';
import { CreditRewardsModal } from '@/components/CreditRewardsModal';
import { SESSION_REWARDED_INTERVAL_MS } from '@/config/appConfig';

interface RewardContextValue {
  isModalVisible: boolean;
  openRewardsModal: (initialTab?: RewardTab) => void;
  closeRewardsModal: () => void;
  watchEnergyAd: () => Promise<void>;
  watchRevealAd: () => Promise<void>;
  playRewardedAd: (type: RewardTab) => Promise<void>;
  isProcessing: boolean;
  initialTab: RewardTab;
  processingType: RewardTab | null;
}

export type RewardTab = 'energy' | 'reveal';

const RewardContext = createContext<RewardContextValue | undefined>(undefined);

export const RewardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { firebaseUser, refreshDailyResources, refreshGuestStats, isPremium } = useAuth();
  const [isModalVisible, setModalVisible] = useState(false);
  const [isProcessing, setProcessing] = useState(false);
  const [initialTab, setInitialTab] = useState<RewardTab>('energy');
  const [processingType, setProcessingType] = useState<RewardTab | null>(null);
  const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isProcessingRef = useRef(isProcessing);
  const closeRewardsModal = useCallback(() => {
    if (isProcessing) return;
    setModalVisible(false);
  }, [isProcessing]);

  const openRewardsModal = useCallback((tab: RewardTab = 'energy') => {
    setInitialTab(tab);
    setModalVisible(true);
  }, []);

  const applyReward = useCallback(
    async (payload: { energy?: number; reveal?: number }) => {
      if (firebaseUser) {
        await grantBonusResources(firebaseUser.uid, {
          energyDelta: payload.energy ?? 0,
          revealDelta: payload.reveal ?? 0,
        });
        await refreshDailyResources();
      } else {
        await addGuestBonusResources({
          energyDelta: payload.energy ?? 0,
          revealDelta: payload.reveal ?? 0,
        });
        await refreshDailyResources();
        await refreshGuestStats();
      }
    },
    [firebaseUser, refreshDailyResources, refreshGuestStats],
  );

  const watchAd = useCallback(
    async (type: RewardTab) => {
      setProcessing(true);
      setProcessingType(type);
      try {
        await showRewardedAd();
        if (type === 'energy') {
          await applyReward({ energy: 3 });
          Alert.alert('Enerji Kazanıldı', '3 bonus enerji hesabına eklendi.');
        } else {
          await applyReward({ reveal: 1 });
          Alert.alert('Cevabı Göster Hakki Kazanıldı', '1 bonus "cevabı göster" hakkı eklendi.');
        }
        setModalVisible(false);
      } catch (error) {
        const message = (error as Error)?.message ?? 'Reklam izlenemedi.';
        Alert.alert('Reklam İzlenemedi', message);
      } finally {
        setProcessing(false);
        setProcessingType(null);
      }
    },
    [applyReward],
  );

  const watchEnergyAd = useCallback(async () => watchAd('energy'), [watchAd]);
  const watchRevealAd = useCallback(async () => watchAd('reveal'), [watchAd]);
  const playRewardedAd = useCallback(async (type: RewardTab) => {
    if (Constants.appOwnership === 'expo') {
      console.info('Expo Go ortamında ödüllü reklam tetiklenmedi.');
      return;
    }
    setInitialTab(type);
    await watchAd(type);
  }, [watchAd]);

  const clearSessionTimer = useCallback(() => {
    if (sessionTimerRef.current) {
      clearTimeout(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
  }, []);

  const scheduleSessionTimer = useCallback(() => {
    if (Constants.appOwnership === 'expo') {
      clearSessionTimer();
      return;
    }
    clearSessionTimer();
    if (isPremium) {
      return;
    }
    if (AppState.currentState !== 'active') {
      return;
    }
    sessionTimerRef.current = setTimeout(() => {
      clearSessionTimer();
      if (isProcessingRef.current) {
        scheduleSessionTimer();
        return;
      }
      (async () => {
        try {
          console.info('5 dakikalık oturum reklamı tetiklendi.');
          await playRewardedAd('energy');
        } catch (error) {
          console.warn('Session rewarded ad başarısız oldu:', error);
        } finally {
          scheduleSessionTimer();
        }
      })();
    }, SESSION_REWARDED_INTERVAL_MS);
  }, [clearSessionTimer, playRewardedAd, isPremium]);

  useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing]);

  useEffect(() => {
    scheduleSessionTimer();

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        scheduleSessionTimer();
      } else {
        clearSessionTimer();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      clearSessionTimer();
      subscription.remove();
    };
  }, [scheduleSessionTimer, clearSessionTimer, isPremium]);

  const value = useMemo(
    () => ({
      isModalVisible,
      openRewardsModal,
      closeRewardsModal,
      watchEnergyAd,
      watchRevealAd,
      playRewardedAd,
      isProcessing,
      initialTab,
      processingType,
    }),
    [
      isModalVisible,
      openRewardsModal,
      closeRewardsModal,
      watchEnergyAd,
      watchRevealAd,
      playRewardedAd,
      isProcessing,
      initialTab,
      processingType,
    ],
  );

  return (
    <RewardContext.Provider value={value}>
      {children}
      <CreditRewardsModal />
    </RewardContext.Provider>
  );
};

export const useRewards = () => {
  const context = useContext(RewardContext);
  if (!context) {
    throw new Error('useRewards yalnızca RewardProvider içinde kullanılabilir.');
  }
  return context;
};
