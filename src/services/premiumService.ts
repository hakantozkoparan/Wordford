import { Timestamp, doc, runTransaction, serverTimestamp } from 'firebase/firestore';

import {
  FIREBASE_COLLECTIONS,
  PREMIUM_DAILY_ENERGY_ALLOCATION,
  PREMIUM_DAILY_REVEAL_TOKENS,
  PREMIUM_TRIAL_DURATION_DAYS,
} from '@/config/appConfig';
import { db, firebaseServerTimestamp } from '@/config/firebase';
import { getServerNow } from './timeService';

export const startPremiumTrial = async (userId: string) => {
  const userRef = doc(db, FIREBASE_COLLECTIONS.users, userId);
  const serverNow = await getServerNow();

  const expiresAtDate = new Date(
    serverNow.getTime() + PREMIUM_TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000,
  );
  const trialExpiresAt = Timestamp.fromDate(expiresAtDate);
  const trialStartedAt = Timestamp.fromDate(serverNow);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(userRef);
    if (!snapshot.exists()) {
      throw new Error('Kullanıcı profili bulunamadı.');
    }

    const data = snapshot.data() as Record<string, unknown>;
    const trialUsed = (data.premiumTrialUsed as boolean | undefined) ?? false;
    const premiumActiveUntil = data.premiumActiveUntil as Timestamp | null;

    if (premiumActiveUntil && premiumActiveUntil.toDate().getTime() > serverNow.getTime()) {
      throw new Error('Premium üyeliğin zaten aktif.');
    }

    if (trialUsed) {
      throw new Error('Ücretsiz deneme hakkı daha önce kullanıldı.');
    }

    const updates: Record<string, unknown> = {
      premiumActiveUntil: trialExpiresAt,
      premiumStartedAt: trialStartedAt,
      premiumSource: 'trial',
      premiumTrialUsed: true,
      hasAdFree: true,
      subscriptionTier: 'creditsAndAdFree',
      dailyEnergy: PREMIUM_DAILY_ENERGY_ALLOCATION,
      dailyRevealTokens: PREMIUM_DAILY_REVEAL_TOKENS,
      lastEnergyRefresh: firebaseServerTimestamp(),
      lastRevealRefresh: firebaseServerTimestamp(),
      updatedAt: serverTimestamp(),
    };

    transaction.update(userRef, updates);
  });
};
