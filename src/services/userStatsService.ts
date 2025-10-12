import { doc, runTransaction } from 'firebase/firestore';
import { differenceInCalendarDays, startOfDay } from 'date-fns';

import { FIREBASE_COLLECTIONS } from '@/config/appConfig';
import { db, firebaseServerTimestamp } from '@/config/firebase';
import { WordProgress } from '@/types/models';
import { toDate } from '@/utils/datetime';
import { getServerNow } from './timeService';
import { GuestStats } from './guestStatsService';

export const updateDailyStreak = async (userId: string): Promise<void> => {
  const userRef = doc(db, FIREBASE_COLLECTIONS.users, userId);
  const serverNow = await getServerNow();
  const todayStart = startOfDay(serverNow);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(userRef);
    if (!snapshot.exists()) {
      return;
    }

    const data = snapshot.data();
  const lastActivityDate = toDate(data.lastActivityDate ?? null);
  const todaysMasteredDate = toDate(data.todaysMasteredDate ?? null);
  const currentStreak = Math.max(data.currentStreak ?? 1, 1);
  const longestStreak = Math.max(data.longestStreak ?? currentStreak, currentStreak);

    const updates: Record<string, unknown> = {
      lastLoginAt: firebaseServerTimestamp(),
    };

    if (todaysMasteredDate) {
      const todaysTrackedStart = startOfDay(todaysMasteredDate);
      const diffToday = differenceInCalendarDays(todayStart, todaysTrackedStart);
      if (diffToday > 0) {
        updates.todaysMastered = 0;
        updates.todaysMasteredDate = null;
      }
    }

    if (!lastActivityDate) {
  updates.currentStreak = Math.max(1, currentStreak, 1);
  updates.longestStreak = Math.max(updates.currentStreak as number, longestStreak);
      updates.lastActivityDate = firebaseServerTimestamp();
      transaction.update(userRef, updates);
      return;
    }

    const lastActivityStart = startOfDay(lastActivityDate);
    const diff = differenceInCalendarDays(todayStart, lastActivityStart);

    if (diff === 0) {
      transaction.update(userRef, updates);
      return;
    }

    if (diff === 1) {
  const nextStreak = currentStreak + 1;
  updates.currentStreak = nextStreak;
  updates.longestStreak = Math.max(nextStreak, longestStreak);
      updates.lastActivityDate = firebaseServerTimestamp();
      if (updates.todaysMastered === undefined) {
        updates.todaysMastered = 0;
        updates.todaysMasteredDate = null;
      }
      transaction.update(userRef, updates);
      return;
    }

    if (diff > 1) {
  updates.currentStreak = 1;
  updates.lastActivityDate = firebaseServerTimestamp();
  updates.longestStreak = Math.max(1, longestStreak, currentStreak);
      if (updates.todaysMastered === undefined) {
        updates.todaysMastered = 0;
        updates.todaysMasteredDate = null;
      }
      transaction.update(userRef, updates);
      return;
    }

    // If diff < 0 (future timestamp stored), keep streak but update login time.
    transaction.update(userRef, updates);
  });
};

export const incrementDailyMastered = async (userId: string): Promise<void> => {
  const userRef = doc(db, FIREBASE_COLLECTIONS.users, userId);
  const serverNow = await getServerNow();
  const todayStart = startOfDay(serverNow);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(userRef);
    if (!snapshot.exists()) {
      return;
    }

    const data = snapshot.data();
    const lastTrackedDate = toDate(data.todaysMasteredDate ?? null);
    const lastTrackedStart = lastTrackedDate ? startOfDay(lastTrackedDate) : null;
    const sameDay = lastTrackedStart ? differenceInCalendarDays(todayStart, lastTrackedStart) === 0 : false;

    const nextCount = sameDay ? (data.todaysMastered ?? 0) + 1 : 1;

    transaction.update(userRef, {
      todaysMastered: nextCount,
      todaysMasteredDate: firebaseServerTimestamp(),
      lastActivityDate: firebaseServerTimestamp(),
    });
  });
};

export const applyGuestSessionToUser = async (
  userId: string,
  progressMap: Record<string, WordProgress>,
  guestStats?: GuestStats,
): Promise<void> => {
  const userRef = doc(db, FIREBASE_COLLECTIONS.users, userId);
  const now = new Date();

  const masteredSummary = Object.values(progressMap).reduce(
    (acc, item) => {
      if (item.status !== 'mastered') {
        return acc;
      }
      const lastAnswer = toDate(item.lastAnswerAt ?? null);
      if (lastAnswer && differenceInCalendarDays(startOfDay(now), startOfDay(lastAnswer)) === 0) {
        const latest = acc.latestMasteredAt && acc.latestMasteredAt > lastAnswer ? acc.latestMasteredAt : lastAnswer;
        return {
          count: acc.count + 1,
          latestMasteredAt: latest,
        };
      }
      return acc;
    },
    { count: 0, latestMasteredAt: null as Date | null },
  );

  const masteredCount = Object.values(progressMap).filter((item) => item.status === 'mastered').length;

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(userRef);
    if (!snapshot.exists()) {
      return;
    }

    const data = snapshot.data();
    const existingTotal = Math.max(data.totalWordsLearned ?? 0, 0);
    const nextTotal = Math.max(masteredCount, existingTotal);

    const updates: Record<string, unknown> = {
      totalWordsLearned: nextTotal,
      updatedAt: firebaseServerTimestamp(),
    };

    if (nextTotal > existingTotal) {
      updates.totalWordsUpdatedAt = firebaseServerTimestamp();
    }

    if (guestStats) {
      const guestCurrentStreak = guestStats.currentStreak ?? 0;
      const guestLongestStreak = guestStats.longestStreak ?? 0;

      if (guestCurrentStreak > 0) {
        updates.currentStreak = Math.max(guestCurrentStreak, data.currentStreak ?? 0);
      }

      if (guestLongestStreak > 0 || guestCurrentStreak > 0 || data.longestStreak) {
        updates.longestStreak = Math.max(
          guestLongestStreak,
          guestCurrentStreak,
          data.longestStreak ?? 0,
          data.currentStreak ?? 0,
        );
      }

      if (guestStats.lastActivityDate) {
        const guestActivity = new Date(guestStats.lastActivityDate);
        const existingActivity = toDate(data.lastActivityDate ?? null);
        if (!existingActivity || guestActivity > existingActivity) {
          updates.lastActivityDate = guestActivity;
        }
      }
    }

    const guestTodayDate = guestStats?.todaysMasteredDate ? new Date(guestStats.todaysMasteredDate) : null;
    const guestTodaySameDay = guestTodayDate
      ? differenceInCalendarDays(startOfDay(now), startOfDay(guestTodayDate)) === 0
      : false;

    const todaysMasteredCount = guestTodaySameDay
      ? Math.max(guestStats?.todaysMastered ?? 0, masteredSummary.count)
      : masteredSummary.count;

    if (todaysMasteredCount > 0) {
      const latestDate = guestTodaySameDay
        ? guestTodayDate ?? masteredSummary.latestMasteredAt
        : masteredSummary.latestMasteredAt;
      updates.todaysMastered = todaysMasteredCount;
      updates.todaysMasteredDate = latestDate ?? firebaseServerTimestamp();
    } else {
      updates.todaysMastered = 0;
      updates.todaysMasteredDate = null;
    }

    transaction.update(userRef, updates);
  });
};

export const incrementTotalWordsLearned = async (userId: string): Promise<void> => {
  const userRef = doc(db, FIREBASE_COLLECTIONS.users, userId);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(userRef);
    if (!snapshot.exists()) {
      return;
    }

    const data = snapshot.data();
    const currentTotal = Math.max(data.totalWordsLearned ?? 0, 0);

    transaction.update(userRef, {
      totalWordsLearned: currentTotal + 1,
      totalWordsUpdatedAt: firebaseServerTimestamp(),
      updatedAt: firebaseServerTimestamp(),
    });
  });
};
