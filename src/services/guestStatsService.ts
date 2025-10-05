import AsyncStorage from '@react-native-async-storage/async-storage';
import { differenceInCalendarDays, startOfDay } from 'date-fns';

import { STORAGE_KEYS } from '@/config/appConfig';

export interface GuestStats {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  todaysMastered: number;
  todaysMasteredDate: string | null;
}

const DEFAULT_STATS: GuestStats = {
  currentStreak: 0,
  longestStreak: 0,
  lastActivityDate: null,
  todaysMastered: 0,
  todaysMasteredDate: null,
};

const persistGuestStats = async (stats: GuestStats) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.guestStats, JSON.stringify(stats));
  } catch (error) {
    console.warn('Misafir istatistikleri kaydedilemedi:', error);
  }
};

export const loadGuestStats = async (): Promise<GuestStats> => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.guestStats);
    if (!stored) {
      return { ...DEFAULT_STATS };
    }
    const parsed = JSON.parse(stored) as Partial<GuestStats>;
    return {
      ...DEFAULT_STATS,
      ...parsed,
    };
  } catch (error) {
    console.warn('Misafir istatistikleri okunamadı:', error);
    return { ...DEFAULT_STATS };
  }
};

export const clearGuestStats = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.guestStats);
  } catch (error) {
    console.warn('Misafir istatistikleri temizlenemedi:', error);
  }
};

const normalizeStreak = (stats: GuestStats, activityDate: Date): GuestStats => {
  const todayStart = startOfDay(activityDate);
  const lastActivity = stats.lastActivityDate ? new Date(stats.lastActivityDate) : null;

  let currentStreak = stats.currentStreak ?? 0;
  let longestStreak = stats.longestStreak ?? 0;

  if (!lastActivity) {
    currentStreak = Math.max(1, currentStreak);
  } else {
    const lastStart = startOfDay(lastActivity);
    const diff = differenceInCalendarDays(todayStart, lastStart);

    if (diff === 0) {
      currentStreak = Math.max(currentStreak, 1);
    } else if (diff === 1) {
      currentStreak = Math.max(currentStreak + 1, 1);
    } else if (diff > 1) {
      currentStreak = 1;
    }
    // diff < 0 olduğunda (gelecekteki kayıt) mevcut seri değerini koruyoruz.
  }

  longestStreak = Math.max(longestStreak, currentStreak, 1);

  return {
    ...stats,
    currentStreak,
    longestStreak,
    lastActivityDate: activityDate.toISOString(),
  };
};

export const recordGuestActivity = async (activityDate: Date): Promise<GuestStats> => {
  const stats = await loadGuestStats();
  const updated = normalizeStreak(stats, activityDate);

  // Gün değiştiyse ve yeni kelime bilinmediyse bugünkü sayaç sıfırlansın.
  if (updated.todaysMasteredDate) {
    const lastTracked = new Date(updated.todaysMasteredDate);
    const diff = differenceInCalendarDays(startOfDay(activityDate), startOfDay(lastTracked));
    if (diff > 0) {
      updated.todaysMastered = 0;
      updated.todaysMasteredDate = null;
    }
  }

  await persistGuestStats(updated);
  return updated;
};

export const incrementGuestMastered = async (activityDate: Date): Promise<GuestStats> => {
  const stats = await recordGuestActivity(activityDate);
  const todayStart = startOfDay(activityDate);
  const lastTracked = stats.todaysMasteredDate ? new Date(stats.todaysMasteredDate) : null;
  const sameDay = lastTracked
    ? differenceInCalendarDays(todayStart, startOfDay(lastTracked)) === 0
    : false;

  const updated: GuestStats = {
    ...stats,
    todaysMastered: sameDay ? stats.todaysMastered + 1 : 1,
    todaysMasteredDate: activityDate.toISOString(),
  };

  await persistGuestStats(updated);
  return updated;
};

export const ensureGuestStats = async (): Promise<GuestStats> => {
  const stats = await loadGuestStats();
  if (!stats.lastActivityDate) {
    await persistGuestStats(stats);
  }
  return stats;
};
