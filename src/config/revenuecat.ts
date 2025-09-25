import Purchases, { LOG_LEVEL, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { Platform } from 'react-native';

import { REVENUECAT_KEYS } from './appConfig';

let isConfigured = false;

export const configureRevenueCat = async () => {
  if (isConfigured) {
    return;
  }

  if (!REVENUECAT_KEYS.apiKey.startsWith('REPLACE')) {
    await Purchases.configure({
      apiKey: REVENUECAT_KEYS.apiKey,
      appUserID: undefined,
    });
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    isConfigured = true;
  } else {
    console.warn('RevenueCat API anahtarı henüz yapılandırılmadı.');
  }
};

export const fetchOfferings = async (): Promise<PurchasesOffering | null> => {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? null;
  } catch (error) {
    console.warn('RevenueCat teklifler alınamadı', error);
    return null;
  }
};

export const findPackageByIdentifier = (
  offering: PurchasesOffering | null,
  identifier: string,
): PurchasesPackage | null => {
  if (!offering) return null;
  const spotlightPackages = [
    offering.lifetime,
    offering.annual,
    offering.sixMonth,
    offering.threeMonth,
    offering.twoMonth,
    offering.monthly,
    offering.weekly,
  ].filter(Boolean) as PurchasesPackage[];

  const allPackages = [...offering.availablePackages, ...spotlightPackages];
  return allPackages.find((pack) => pack.identifier === identifier) ?? null;
};

export const platformProductSuffix = Platform.select({ ios: 'ios', android: 'android', default: 'default' });
