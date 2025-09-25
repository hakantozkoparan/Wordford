import { Platform } from 'react-native';

import { WORDS_PER_AD_BREAK } from '@/config/appConfig';

let attemptCounter = 0;

export const shouldShowInterstitial = () => {
  attemptCounter += 1;
  if (attemptCounter % WORDS_PER_AD_BREAK === 0) {
    return true;
  }
  return false;
};

export const resetAdCounter = () => {
  attemptCounter = 0;
};

export const showInterstitialAd = async () => {
  // Buraya AdMob veya tercih edilen reklam sağlayıcısının entegrasyonunu ekleyin.
  console.info('Reklam gösterimi tetiklendi (placeholder). Platform:', Platform.OS);
};
