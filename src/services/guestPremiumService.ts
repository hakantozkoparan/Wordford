import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  PREMIUM_TRIAL_DURATION_DAYS,
  STORAGE_KEYS,
} from '@/config/appConfig';
import { PremiumSource } from '@/types/models';

export interface GuestPremiumState {
  premiumActiveUntil: string | null;
  premiumStartedAt: string | null;
  premiumSource: PremiumSource | null;
  premiumTrialUsed: boolean;
}

const DEFAULT_GUEST_PREMIUM_STATE: GuestPremiumState = {
  premiumActiveUntil: null,
  premiumStartedAt: null,
  premiumSource: null,
  premiumTrialUsed: false,
};

const persistGuestPremiumState = async (state: GuestPremiumState) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.guestPremium, JSON.stringify(state));
  } catch (error) {
    console.warn('Misafir premium durumu kaydedilemedi:', error);
  }
};

export const loadGuestPremiumState = async (): Promise<GuestPremiumState> => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.guestPremium);
    if (!stored) {
      return { ...DEFAULT_GUEST_PREMIUM_STATE };
    }
    const parsed = JSON.parse(stored) as Partial<GuestPremiumState>;
    return {
      ...DEFAULT_GUEST_PREMIUM_STATE,
      ...parsed,
    };
  } catch (error) {
    console.warn('Misafir premium durumu okunamadı:', error);
    return { ...DEFAULT_GUEST_PREMIUM_STATE };
  }
};

export const ensureGuestPremiumState = async (): Promise<GuestPremiumState> => {
  const state = await loadGuestPremiumState();
  if (!state.premiumActiveUntil) {
    return state;
  }

  const expiresAt = new Date(state.premiumActiveUntil);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    const resetState: GuestPremiumState = {
      ...state,
      premiumActiveUntil: null,
      premiumStartedAt: null,
      premiumSource: null,
    };
    await persistGuestPremiumState(resetState);
    return resetState;
  }

  return state;
};

export const isGuestPremiumActive = (
  state: GuestPremiumState | null | undefined,
  now = new Date(),
) => {
  if (!state?.premiumActiveUntil) {
    return false;
  }
  const expiresAt = new Date(state.premiumActiveUntil);
  return !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() > now.getTime();
};

export const setGuestPremiumState = async (state: GuestPremiumState) => {
  await persistGuestPremiumState(state);
};

export const clearGuestPremiumState = async () => {
  await persistGuestPremiumState({ ...DEFAULT_GUEST_PREMIUM_STATE });
};

export const startGuestPremiumTrial = async (): Promise<GuestPremiumState> => {
  const now = new Date();
  const current = await ensureGuestPremiumState();

  if (isGuestPremiumActive(current, now)) {
    throw new Error('Premium üyeliğin zaten aktif.');
  }

  if (current.premiumTrialUsed) {
    throw new Error('Ücretsiz deneme hakkı daha önce kullanıldı.');
  }

  const expiresAt = new Date(
    now.getTime() + PREMIUM_TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000,
  );

  const updated: GuestPremiumState = {
    premiumActiveUntil: expiresAt.toISOString(),
    premiumStartedAt: now.toISOString(),
    premiumSource: 'trial',
    premiumTrialUsed: true,
  };

  await persistGuestPremiumState(updated);
  return updated;
};

export const activateGuestPremium = async (
  durationDays: number,
  source: PremiumSource = 'subscription',
): Promise<GuestPremiumState> => {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  const updated: GuestPremiumState = {
    premiumActiveUntil: expiresAt.toISOString(),
    premiumStartedAt: now.toISOString(),
    premiumSource: source,
    premiumTrialUsed: true,
  };

  await persistGuestPremiumState(updated);
  return updated;
};
