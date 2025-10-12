import AsyncStorage from '@react-native-async-storage/async-storage';
import { differenceInCalendarDays, startOfDay } from 'date-fns';

import { DAILY_ENERGY_ALLOCATION, DAILY_REVEAL_TOKENS, STORAGE_KEYS } from '@/config/appConfig';

export interface GuestResources {
  dailyEnergy: number;
  dailyRevealTokens: number;
  lastEnergyRefresh: string | null;
  lastRevealRefresh: string | null;
  bonusEnergy: number;
  bonusRevealTokens: number;
}

const DEFAULT_RESOURCES: GuestResources = {
  dailyEnergy: DAILY_ENERGY_ALLOCATION,
  dailyRevealTokens: DAILY_REVEAL_TOKENS,
  lastEnergyRefresh: null,
  lastRevealRefresh: null,
  bonusEnergy: 0,
  bonusRevealTokens: 0,
};

const persistGuestResources = async (resources: GuestResources) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.guestResources, JSON.stringify(resources));
  } catch (error) {
    console.warn('Misafir kaynakları kaydedilemedi:', error);
  }
};

export const loadGuestResources = async (): Promise<GuestResources> => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.guestResources);
    if (!stored) {
      return { ...DEFAULT_RESOURCES };
    }
    const parsed = JSON.parse(stored) as Partial<GuestResources>;
    return {
      ...DEFAULT_RESOURCES,
      ...parsed,
    };
  } catch (error) {
    console.warn('Misafir kaynakları okunamadı:', error);
    return { ...DEFAULT_RESOURCES };
  }
};

const shouldRefresh = (lastIso: string | null, now: Date) => {
  if (!lastIso) {
    return true;
  }
  const lastDate = new Date(lastIso);
  return differenceInCalendarDays(startOfDay(now), startOfDay(lastDate)) > 0;
};

export const ensureGuestResources = async (): Promise<GuestResources> => {
  const resources = await loadGuestResources();
  const now = new Date();
  let updated = { ...resources };
  let changed = false;

  if (shouldRefresh(resources.lastEnergyRefresh, now)) {
    updated.dailyEnergy = DAILY_ENERGY_ALLOCATION;
    updated.lastEnergyRefresh = now.toISOString();
    changed = true;
  }

  if (shouldRefresh(resources.lastRevealRefresh, now)) {
    updated.dailyRevealTokens = DAILY_REVEAL_TOKENS;
    updated.lastRevealRefresh = now.toISOString();
    changed = true;
  }

  if (changed) {
    await persistGuestResources(updated);
  }

  return updated;
};

export const consumeGuestEnergy = async (amount = 1): Promise<GuestResources> => {
  if (amount <= 0) {
    return ensureGuestResources();
  }

  const resources = await ensureGuestResources();
  const totalAvailable = resources.dailyEnergy + resources.bonusEnergy;

  if (totalAvailable < amount) {
    throw new Error('Enerji hakkınız kalmadı.');
  }

  const updated: GuestResources = {
    ...resources,
    dailyEnergy: Math.max(0, resources.dailyEnergy - amount),
    bonusEnergy:
      resources.dailyEnergy >= amount
        ? resources.bonusEnergy
        : Math.max(0, resources.bonusEnergy - (amount - resources.dailyEnergy)),
  };

  await persistGuestResources(updated);
  return updated;
};

export const consumeGuestReveal = async (): Promise<GuestResources> => {
  const resources = await ensureGuestResources();
  const totalAvailable = resources.dailyRevealTokens + resources.bonusRevealTokens;

  if (totalAvailable <= 0) {
    throw new Error('Cevabı göster hakkınız kalmadı.');
  }

  const updated: GuestResources = {
    ...resources,
    dailyRevealTokens: Math.max(0, resources.dailyRevealTokens - 1),
    bonusRevealTokens:
      resources.dailyRevealTokens > 0
        ? resources.bonusRevealTokens
        : Math.max(0, resources.bonusRevealTokens - 1),
  };

  await persistGuestResources(updated);
  return updated;
};

export const setGuestResources = async (resources: GuestResources) => {
  await persistGuestResources(resources);
};

export const resetGuestResources = async () => {
  await persistGuestResources({
    ...DEFAULT_RESOURCES,
    lastEnergyRefresh: new Date().toISOString(),
    lastRevealRefresh: new Date().toISOString(),
  });
};

export const addGuestBonusResources = async (payload: {
  energyDelta?: number;
  revealDelta?: number;
}) => {
  const { energyDelta = 0, revealDelta = 0 } = payload;
  if (energyDelta === 0 && revealDelta === 0) {
    return ensureGuestResources();
  }

  const resources = await ensureGuestResources();
  const updated: GuestResources = {
    ...resources,
    bonusEnergy: Math.max(0, resources.bonusEnergy + energyDelta),
    bonusRevealTokens: Math.max(0, resources.bonusRevealTokens + revealDelta),
  };

  await persistGuestResources(updated);
  return updated;
};
