import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import {
  DAILY_ENERGY_ALLOCATION,
  DAILY_REVEAL_TOKENS,
  FIREBASE_COLLECTIONS,
  PREMIUM_DAILY_ENERGY_ALLOCATION,
  PREMIUM_DAILY_REVEAL_TOKENS,
} from '@/config/appConfig';
import { db, firebaseServerTimestamp } from '@/config/firebase';
import {
  ResourceTransaction,
  ResourceTransactionReason,
  ResourceType,
  UserProfile,
} from '@/types/models';
import { hasOneDayPassed } from '@/utils/datetime';
import { nanoid } from 'nanoid/non-secure';
import { getServerNow } from './timeService';

const getUserRef = (userId: string) => doc(db, FIREBASE_COLLECTIONS.users, userId);

const logResourceTransaction = async (
  userId: string,
  resource: ResourceType,
  delta: number,
  reason: ResourceTransactionReason,
) => {
  const transactionRef = doc(
    collection(db, FIREBASE_COLLECTIONS.resourceTransactions),
    nanoid(12),
  );

  const entry: ResourceTransaction = {
    id: transactionRef.id,
    userId,
    resource,
    delta,
    reason,
    createdAt: null,
  };

  await setDoc(transactionRef, {
    ...entry,
    createdAt: serverTimestamp(),
  });
};

const toDateOrNull = (value: unknown): Date | null => {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  return null;
};

interface PremiumAllocationMeta {
  energyCap: number;
  revealCap: number;
  isPremium: boolean;
  premiumExpired: boolean;
  premiumActiveUntil: Date | null;
}

const resolvePremiumAllocations = (
  data: Record<string, unknown>,
  serverNow: Date,
): PremiumAllocationMeta => {
  const premiumActiveUntilDate = toDateOrNull(data.premiumActiveUntil);
  const isPremium = Boolean(
    premiumActiveUntilDate && premiumActiveUntilDate.getTime() > serverNow.getTime(),
  );
  const premiumExpired = Boolean(data.premiumActiveUntil) && !isPremium;

  return {
    energyCap: isPremium ? PREMIUM_DAILY_ENERGY_ALLOCATION : DAILY_ENERGY_ALLOCATION,
    revealCap: isPremium ? PREMIUM_DAILY_REVEAL_TOKENS : DAILY_REVEAL_TOKENS,
    isPremium,
    premiumExpired,
    premiumActiveUntil: premiumActiveUntilDate,
  };
};

const refreshDailyBucketsIfNeeded = (
  data: Record<string, unknown>,
  serverNow: Date,
  caps: { energyCap: number; revealCap: number },
) => {
  const lastEnergyRefresh = (data.lastEnergyRefresh as Timestamp | null) ?? null;
  const lastRevealRefresh = (data.lastRevealRefresh as Timestamp | null) ?? null;

  let dailyEnergy = (data.dailyEnergy as number | undefined) ?? caps.energyCap;
  let dailyRevealTokens =
    (data.dailyRevealTokens as number | undefined) ?? caps.revealCap;

  const updates: Record<string, unknown> = {};
  const flags = { energy: false, reveal: false };

  if (hasOneDayPassed(lastEnergyRefresh, serverNow)) {
    dailyEnergy = caps.energyCap;
    updates.dailyEnergy = dailyEnergy;
    updates.lastEnergyRefresh = firebaseServerTimestamp();
    flags.energy = true;
  }

  if (hasOneDayPassed(lastRevealRefresh, serverNow)) {
    dailyRevealTokens = caps.revealCap;
    updates.dailyRevealTokens = dailyRevealTokens;
    updates.lastRevealRefresh = firebaseServerTimestamp();
    flags.reveal = true;
  }

  return { dailyEnergy, dailyRevealTokens, updates, flags };
};

export const ensureDailyResources = async (userId: string) => {
  const userRef = getUserRef(userId);
  const serverNow = await getServerNow();
  const snapshot = await getDoc(userRef);
  if (!snapshot.exists()) {
    return;
  }

  const data = snapshot.data() as Record<string, unknown>;
  const premiumMeta = resolvePremiumAllocations(data, serverNow);
  const refreshResult = refreshDailyBucketsIfNeeded(data, serverNow, premiumMeta);
  let { dailyEnergy, dailyRevealTokens } = refreshResult;
  const { updates, flags } = refreshResult;

  if (premiumMeta.premiumExpired) {
    const currentEnergy = (data.dailyEnergy as number | undefined) ?? dailyEnergy;
    const currentReveal = (data.dailyRevealTokens as number | undefined) ?? dailyRevealTokens;

    const clampedEnergy = Math.min(currentEnergy, premiumMeta.energyCap);
    const clampedReveal = Math.min(currentReveal, premiumMeta.revealCap);

    if (clampedEnergy !== currentEnergy) {
      updates.dailyEnergy = clampedEnergy;
      dailyEnergy = clampedEnergy;
    }

    if (clampedReveal !== currentReveal) {
      updates.dailyRevealTokens = clampedReveal;
      dailyRevealTokens = clampedReveal;
    }

    if (data.premiumActiveUntil) {
      updates.premiumActiveUntil = null;
    }
    if (data.premiumStartedAt) {
      updates.premiumStartedAt = null;
    }
    if (data.premiumSource) {
      updates.premiumSource = null;
    }
    if (data.hasAdFree) {
      updates.hasAdFree = false;
    }
    if (data.subscriptionTier === 'creditsAndAdFree') {
      updates.subscriptionTier = 'none';
    }
  }

  if (Object.keys(updates).length > 0) {
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  }

  if (flags.energy) {
    await logResourceTransaction(userId, 'energy', premiumMeta.energyCap, 'dailyRefresh');
  }

  if (flags.reveal) {
    await logResourceTransaction(userId, 'reveal', premiumMeta.revealCap, 'dailyRefresh');
  }
};

export const consumeEnergy = async (userId: string, amount = 1) => {
  const userRef = getUserRef(userId);
  const serverNow = await getServerNow();

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(userRef);
    if (!snapshot.exists()) {
      throw new Error('Kullanıcı profili bulunamadı.');
    }

    const data = snapshot.data() as Record<string, unknown>;
    const bonusEnergy = (data.bonusEnergy as number | undefined) ?? 0;
    const premiumMeta = resolvePremiumAllocations(data, serverNow);
    const refreshResult = refreshDailyBucketsIfNeeded(data, serverNow, premiumMeta);
    let { dailyEnergy } = refreshResult;
    const { updates } = refreshResult;

    if (premiumMeta.premiumExpired) {
      if (dailyEnergy > premiumMeta.energyCap) {
        dailyEnergy = premiumMeta.energyCap;
        updates.dailyEnergy = premiumMeta.energyCap;
      }
      if (data.premiumActiveUntil) {
        updates.premiumActiveUntil = null;
      }
      if (data.premiumStartedAt) {
        updates.premiumStartedAt = null;
      }
      if (data.premiumSource) {
        updates.premiumSource = null;
      }
      if (data.hasAdFree) {
        updates.hasAdFree = false;
      }
      if (data.subscriptionTier === 'creditsAndAdFree') {
        updates.subscriptionTier = 'none';
      }
    }

    let dailyPool = dailyEnergy;
    let bonusPool = bonusEnergy;
    let remaining = amount;

    if (dailyPool >= remaining) {
      dailyPool -= remaining;
      remaining = 0;
    } else if (dailyPool > 0) {
      remaining -= dailyPool;
      dailyPool = 0;
    }

    if (remaining > 0) {
      if (bonusPool >= remaining) {
        bonusPool -= remaining;
        remaining = 0;
      }
    }

    if (remaining > 0) {
      throw new Error('Enerji hakkınız kalmadı.');
    }

    transaction.update(userRef, {
      ...updates,
      dailyEnergy: dailyPool,
      bonusEnergy: bonusPool,
      updatedAt: serverTimestamp(),
    });
  });

  await logResourceTransaction(userId, 'energy', -amount, 'consumption');
};

export const consumeRevealToken = async (userId: string) => {
  const userRef = getUserRef(userId);
  const serverNow = await getServerNow();

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(userRef);
    if (!snapshot.exists()) {
      throw new Error('Kullanıcı profili bulunamadı.');
    }

    const data = snapshot.data() as Record<string, unknown>;
    const bonusTokens = (data.bonusRevealTokens as number | undefined) ?? 0;
    const premiumMeta = resolvePremiumAllocations(data, serverNow);
    const refreshResult = refreshDailyBucketsIfNeeded(data, serverNow, premiumMeta);
    let { dailyRevealTokens } = refreshResult;
    const { updates } = refreshResult;

    if (premiumMeta.premiumExpired) {
      if (dailyRevealTokens > premiumMeta.revealCap) {
        dailyRevealTokens = premiumMeta.revealCap;
        updates.dailyRevealTokens = premiumMeta.revealCap;
      }
      if (data.premiumActiveUntil) {
        updates.premiumActiveUntil = null;
      }
      if (data.premiumStartedAt) {
        updates.premiumStartedAt = null;
      }
      if (data.premiumSource) {
        updates.premiumSource = null;
      }
      if (data.hasAdFree) {
        updates.hasAdFree = false;
      }
      if (data.subscriptionTier === 'creditsAndAdFree') {
        updates.subscriptionTier = 'none';
      }
    }

    let dailyPool = dailyRevealTokens;
    let bonusPool = bonusTokens;
    let remaining = 1;

    if (dailyPool > 0) {
      dailyPool -= 1;
      remaining = 0;
    }

    if (remaining > 0) {
      if (bonusPool > 0) {
        bonusPool -= 1;
        remaining = 0;
      }
    }

    if (remaining > 0) {
      throw new Error('Cevabı göster hakkınız kalmadı.');
    }

    transaction.update(userRef, {
      ...updates,
      dailyRevealTokens: dailyPool,
      bonusRevealTokens: bonusPool,
      updatedAt: serverTimestamp(),
    });
  });

  await logResourceTransaction(userId, 'reveal', -1, 'consumption');
};

export interface GrantBonusPayload {
  energyDelta?: number;
  revealDelta?: number;
  reason?: ResourceTransactionReason;
}

export const grantBonusResources = async (userId: string, payload: GrantBonusPayload) => {
  const { energyDelta = 0, revealDelta = 0, reason = 'adminGrant' } = payload;
  if (energyDelta === 0 && revealDelta === 0) {
    return;
  }

  const userRef = getUserRef(userId);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(userRef);
    if (!snapshot.exists()) {
      throw new Error('Kullanıcı profili bulunamadı.');
    }

    const data = snapshot.data() as Record<string, unknown>;
    const currentBonusEnergy = (data.bonusEnergy as number | undefined) ?? 0;
    const currentBonusReveal = (data.bonusRevealTokens as number | undefined) ?? 0;

    const nextBonusEnergy = Math.max(0, currentBonusEnergy + energyDelta);
    const nextBonusReveal = Math.max(0, currentBonusReveal + revealDelta);

    transaction.update(userRef, {
      bonusEnergy: nextBonusEnergy,
      bonusRevealTokens: nextBonusReveal,
      updatedAt: serverTimestamp(),
    });
  });

  if (energyDelta !== 0) {
    await logResourceTransaction(userId, 'energy', energyDelta, reason);
  }

  if (revealDelta !== 0) {
    await logResourceTransaction(userId, 'reveal', revealDelta, reason);
  }
};

const getUserByEmail = async (email: string) => {
  const trimmed = email.trim();
  if (!trimmed) {
    throw new Error('E-posta adresi gereklidir.');
  }

  const candidates = Array.from(new Set([trimmed, trimmed.toLowerCase()]));

  for (const attempt of candidates) {
    const queryRef = query(
      collection(db, FIREBASE_COLLECTIONS.users),
      where('email', '==', attempt),
    );

    const snapshot = await getDocs(queryRef);
    if (!snapshot.empty) {
      const docSnap = snapshot.docs[0];
      return {
        userId: docSnap.id,
        profile: docSnap.data() as UserProfile,
      };
    }
  }

  return null;
};

export const grantBonusResourcesByEmail = async (
  email: string,
  payload: GrantBonusPayload,
) => {
  const target = await getUserByEmail(email);
  if (!target) {
    throw new Error('Belirtilen e-posta adresiyle eşleşen bir kullanıcı bulunamadı.');
  }

  await grantBonusResources(target.userId, payload);

  const updatedSnapshot = await getDoc(doc(db, FIREBASE_COLLECTIONS.users, target.userId));
  const updatedProfile = updatedSnapshot.exists()
    ? (updatedSnapshot.data() as UserProfile)
    : target.profile;

  return {
    userId: target.userId,
    profile: updatedProfile,
  };
};

export const grantDailyResources = async (userId: string, energy: number, reveals: number) => {
  const userRef = getUserRef(userId);
  await updateDoc(userRef, {
    dailyEnergy: Math.max(0, energy),
    dailyRevealTokens: Math.max(0, reveals),
    updatedAt: serverTimestamp(),
    lastEnergyRefresh: firebaseServerTimestamp(),
    lastRevealRefresh: firebaseServerTimestamp(),
  });

  await logResourceTransaction(userId, 'energy', energy, 'manualAdjust');
  await logResourceTransaction(userId, 'reveal', reveals, 'manualAdjust');
};
