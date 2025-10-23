import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';

import { colors, spacing } from '@/theme';
import { useAuth } from '@/context/AuthContext';

const IOS_TEST_BANNER_ID = 'ca-app-pub-3940256099942544/9214589741';
const ANDROID_TEST_BANNER_ID = 'ca-app-pub-3940256099942544/6300978111';

type GoogleMobileAdsModule = typeof import('react-native-google-mobile-ads');

const isGoogleMobileAdsAvailable = () =>
  Platform.OS !== 'web' && Constants.appOwnership !== 'expo';

export const AdBanner: React.FC = () => {
  const { isPremium } = useAuth();
  const [adsModule, setAdsModule] = useState<GoogleMobileAdsModule | null>(null);
  const adsSupported = isGoogleMobileAdsAvailable();

  useEffect(() => {
    if (!adsSupported || isPremium) {
      setAdsModule(null);
      return;
    }

    let isMounted = true;

    import('react-native-google-mobile-ads')
      .then((module) => {
        if (!isMounted) {
          return;
        }

        const mobileAdsInstance = module.default();
        mobileAdsInstance
          .setRequestConfiguration({ testDeviceIdentifiers: ['EMULATOR'] })
          .catch(() => undefined);
        mobileAdsInstance.initialize().catch(() => undefined);

        setAdsModule(module);
      })
      .catch((error) => {
        console.debug('Google Mobile Ads modülü yüklenemedi:', error);
      });

    return () => {
      isMounted = false;
    };
  }, [adsSupported, isPremium]);

  if (isPremium) {
    return null;
  }

  if (!adsSupported || !adsModule) {
    return (
      <View style={[styles.container, styles.placeholder]}>
        <Text style={styles.placeholderText}>Reklam alanı (yalnızca cihaz buildlerinde görünür)</Text>
      </View>
    );
  }

  const BannerAd = adsModule.BannerAd;
  const BannerAdSize = adsModule.BannerAdSize;
  const TestIds = adsModule.TestIds;

  const adUnitId = __DEV__
    ? TestIds.BANNER
    : Platform.select({
        ios: IOS_TEST_BANNER_ID,
        android: ANDROID_TEST_BANNER_ID,
      }) ?? IOS_TEST_BANNER_ID;

  // BannerAd bileşenini React bileşeni olarak kullanabilmek için
  const BannerAdComponent = BannerAd as React.ComponentType<any>;

  return (
    <View style={styles.container}>
      <BannerAdComponent
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
        onAdFailedToLoad={(error: any) => {
          console.debug('Banner reklamı yüklenemedi:', error);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  placeholder: {
    minHeight: 60,
  },
  placeholderText: {
    color: colors.textSecondary,
    fontSize: 12,
    opacity: 0.6,
  },
});
