import { Platform } from 'react-native';
import Constants from 'expo-constants';

const IOS_TEST_REWARDED_ID = 'ca-app-pub-3940256099942544/1712485313';
const ANDROID_TEST_REWARDED_ID = 'ca-app-pub-3940256099942544/5224354917';

type RewardedModule = typeof import('expo-ads-admob');

let rewardedModule: RewardedModule | null = null;

const getRewardedModule = async (): Promise<RewardedModule | null> => {
  if (rewardedModule) {
    return rewardedModule;
  }
  try {
    rewardedModule = await import('expo-ads-admob');
    return rewardedModule;
  } catch (error) {
    console.debug('Rewarded ad modülü yüklenemedi:', error);
    return null;
  }
};

const getAdUnitId = () =>
  Platform.OS === 'ios' ? IOS_TEST_REWARDED_ID : ANDROID_TEST_REWARDED_ID;

export interface ShowRewardedAdOptions {
  onStarted?: () => void;
}

export const showRewardedAd = async (options?: ShowRewardedAdOptions) => {
  if (Constants.appOwnership === 'expo') {
    throw new Error(
      'Ödüllü reklamlar Expo Go üzerinde desteklenmez. Lütfen bir development build kullanın.',
    );
  }

  const module = await getRewardedModule();
  if (!module) {
    throw new Error('Reklam modülü yüklenemedi.');
  }

  const { AdMobRewarded, setTestDeviceIDAsync } = module;

  if (!AdMobRewarded || typeof AdMobRewarded.requestAdAsync !== 'function') {
    throw new Error('Bu platformda ödüllü reklamlar desteklenmiyor.');
  }

  await setTestDeviceIDAsync?.('EMULATOR').catch(() => undefined);

  try {
    await AdMobRewarded.setAdUnitID(getAdUnitId());
  } catch (error) {
    throw new Error('Reklam birimi yapılandırılırken bir hata oluştu.');
  }

  await AdMobRewarded.removeAllListeners();

  return new Promise<void>((resolve, reject) => {
    let rewardEarned = false;

    const onReward = () => {
      rewardEarned = true;
    };

    const onClose = () => {
      cleanup();
      if (rewardEarned) {
        resolve();
      } else {
        reject(new Error('Reklam tamamlanmadı.'));
      }
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const cleanup = () => {
      try {
        AdMobRewarded.removeAllListeners();
      } catch (error) {
        // ignore
      }
    };

    AdMobRewarded.addEventListener('rewardedVideoUserDidEarnReward', onReward);
    AdMobRewarded.addEventListener('rewardedVideoDidFailToLoad', ({ message }) => {
      onError(new Error(message ?? 'Reklam yüklenemedi.'));
    });
    AdMobRewarded.addEventListener('rewardedVideoDidFailToPresent', ({ message }) => {
      onError(new Error(message ?? 'Reklam gösterilemedi.'));
    });
    AdMobRewarded.addEventListener('rewardedVideoDidDismiss', onClose);

    options?.onStarted?.();

    (async () => {
      try {
        await AdMobRewarded.requestAdAsync({ servePersonalizedAds: true });
        await AdMobRewarded.showAdAsync();
      } catch (error) {
        onError(error as Error);
      }
    })();
  });
};
