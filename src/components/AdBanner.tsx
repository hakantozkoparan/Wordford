import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';

import { colors, spacing } from '@/theme';

const IOS_TEST_BANNER_ID = 'ca-app-pub-3940256099942544/9214589741';

type AdMobModule = typeof import('expo-ads-admob');

export const AdBanner: React.FC = () => {
  const isAdMobAvailable = Platform.OS === 'ios' && Constants.appOwnership !== 'expo';
  const [adMobModule, setAdMobModule] = useState<AdMobModule | null>(null);

  useEffect(() => {
    if (!isAdMobAvailable) {
      setAdMobModule(null);
      return;
    }
    let isMounted = true;
    import('expo-ads-admob')
      .then((module) => {
        if (!isMounted) {
          return;
        }
        module.setTestDeviceIDAsync('EMULATOR').catch(() => undefined);
        setAdMobModule(module);
      })
      .catch((error) => {
        console.debug('AdMob modülü yüklenemedi:', error);
      });

    return () => {
      isMounted = false;
    };
  }, [isAdMobAvailable]);

  const BannerComponent = adMobModule?.AdMobBanner;

  if (!isAdMobAvailable || !BannerComponent) {
    return (
      <View style={[styles.container, styles.placeholder]}>
        <Text style={styles.placeholderText}>Reklam alanı (yalnızca iOS buildlerinde görünür)</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BannerComponent
        bannerSize="smartBannerPortrait"
        adUnitID={IOS_TEST_BANNER_ID}
        servePersonalizedAds
        onDidFailToReceiveAdWithError={(error) => {
          console.debug('AdMob banner yüklenemedi:', error);
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
