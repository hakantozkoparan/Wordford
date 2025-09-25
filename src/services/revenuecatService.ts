import Purchases, { CustomerInfo } from 'react-native-purchases';

import { configureRevenueCat, findPackageByIdentifier, fetchOfferings } from '@/config/revenuecat';
import { PurchasePackageIds } from '@/types/models';

export const configurePurchases = async () => {
  await configureRevenueCat();
};

export const purchasePackage = async (packageIds: PurchasePackageIds) => {
  await configurePurchases();
  const offerings = await fetchOfferings();
  if (!offerings) {
    throw new Error('Satın alma paketleri mevcut değil.');
  }

  const pack = findPackageByIdentifier(offerings, packageIds.creditsProductId);
  if (!pack) {
    throw new Error('Kredi paketi bulunamadı.');
  }

  const response = await Purchases.purchasePackage(pack);
  return response.customerInfo;
};

export const purchaseAdFree = async (packageIds: PurchasePackageIds) => {
  await configurePurchases();
  const offerings = await fetchOfferings();
  if (!offerings) {
    throw new Error('Satın alma paketleri mevcut değil.');
  }

  const pack = findPackageByIdentifier(offerings, packageIds.adFreeProductId);
  if (!pack) {
    throw new Error('Reklamsız paket bulunamadı.');
  }

  const response = await Purchases.purchasePackage(pack);
  return response.customerInfo;
};

export const restorePurchases = async (): Promise<CustomerInfo> => {
  await configurePurchases();
  return Purchases.restorePurchases();
};
