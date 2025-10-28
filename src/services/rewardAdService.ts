import { Platform } from 'react-native';
import Constants from 'expo-constants';

const IOS_TEST_REWARDED_ID = 'ca-app-pub-3940256099942544/1712485313';
const ANDROID_TEST_REWARDED_ID = 'ca-app-pub-3940256099942544/5224354917';

let googleMobileAdsModule: any = null;

const loadGoogleMobileAdsModule = () => {
  if (googleMobileAdsModule) {
    return googleMobileAdsModule;
  }

  try {
    // Static import yerine require kullan
    const module = require('react-native-google-mobile-ads');
    const mobileAdsInstance = module.default();

    mobileAdsInstance
      .setRequestConfiguration({ testDeviceIdentifiers: ['EMULATOR'] })
      .catch(() => undefined);
    mobileAdsInstance.initialize().catch(() => undefined);

    googleMobileAdsModule = module;
    return module;
  } catch (error) {
    console.debug('Google Mobile Ads modülü yüklenemedi:', error);
    return null;
  }
};

const getAdUnitId = (module: any) => {
  if (__DEV__) {
    return module.TestIds.REWARDED;
  }

  return Platform.OS === 'ios' ? IOS_TEST_REWARDED_ID : ANDROID_TEST_REWARDED_ID;
};

export interface ShowRewardedAdOptions {
  onStarted?: () => void;
}

export const showRewardedAd = async (options?: ShowRewardedAdOptions) => {
  if (Constants.appOwnership === 'expo') {
    throw new Error(
      'Ödüllü reklamlar Expo Go üzerinde desteklenmez. Lütfen bir development build kullanın.',
    );
  }

  const module = loadGoogleMobileAdsModule();
  if (!module) {
    throw new Error('Reklam modülü yüklenemedi.');
  }

  const adUnitId = getAdUnitId(module);
  const rewardedAd = module.RewardedAd.createForAdRequest(adUnitId, {
    requestNonPersonalizedAdsOnly: false,
  });

  return new Promise<void>((resolve, reject) => {
    let rewardEarned = false;

    const cleanupCallbacks: Array<() => void> = [];

    const cleanup = () => {
      while (cleanupCallbacks.length) {
        const unsubscribe = cleanupCallbacks.pop();
        try {
          unsubscribe?.();
        } catch {
          // ignore
        }
      }
    };

    const fail = (error: unknown) => {
      cleanup();
      reject(error instanceof Error ? error : new Error('Reklam yüklenemedi.'));
    };

    cleanupCallbacks.push(
      rewardedAd.addAdEventListener(module.RewardedAdEventType.LOADED, () => {
        options?.onStarted?.();
        rewardedAd.show().catch(fail);
      }),
    );

    cleanupCallbacks.push(
      rewardedAd.addAdEventListener(module.RewardedAdEventType.EARNED_REWARD, () => {
        rewardEarned = true;
      }),
    );

    cleanupCallbacks.push(
      rewardedAd.addAdEventListener(module.AdEventType.ERROR, (event: any) => {
        const message = (event as Error | { message?: string })?.message ?? 'Reklam yüklenemedi.';
        fail(new Error(message));
      }),
    );

    cleanupCallbacks.push(
      rewardedAd.addAdEventListener(module.AdEventType.CLOSED, () => {
        cleanup();
        if (rewardEarned) {
          resolve();
        } else {
          reject(new Error('Reklam tamamlanmadı.'));
        }
      }),
    );

    try {
      rewardedAd.load();
    } catch (error) {
      fail(error);
    }
  });
};
