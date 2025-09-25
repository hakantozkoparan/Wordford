import {
  Timestamp,
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import {
  DAILY_FREE_CREDITS,
  DAILY_HINT_TOKENS,
  FIREBASE_COLLECTIONS,
} from '@/config/appConfig';
import { db, firebaseServerTimestamp } from '@/config/firebase';
import { CreditTransaction } from '@/types/models';
import { hasOneDayPassed } from '@/utils/datetime';
import { nanoid } from 'nanoid/non-secure';

export const getUserRef = (userId: string) => doc(db, FIREBASE_COLLECTIONS.users, userId);

const getServerNow = async (): Promise<Date> => {
  const ref = doc(db, 'meta', 'server-time');
  await setDoc(ref, { now: firebaseServerTimestamp() }, { merge: true });
  const snapshot = await getDoc(ref);
  const serverNow = snapshot.data()?.now as Timestamp | undefined;
  return serverNow?.toDate() ?? new Date();
};

export const ensureDailyCredits = async (userId: string) => {
  const userRef = getUserRef(userId);
  const serverNow = await getServerNow();

  let shouldLogDailyRefresh = false;

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(userRef);
    if (!snapshot.exists()) return;

    const data = snapshot.data();
    const lastRefresh = data.lastCreditRefresh as Timestamp | undefined;
    const lastHintRefresh = data.lastHintRefresh as Timestamp | undefined;

    let credits = data.dailyCredits ?? DAILY_FREE_CREDITS;
    let hints = data.dailyHintTokens ?? DAILY_HINT_TOKENS;
    let shouldUpdate = false;

    if (hasOneDayPassed(lastRefresh ?? null, serverNow)) {
      credits = DAILY_FREE_CREDITS;
      shouldUpdate = true;
      shouldLogDailyRefresh = true;
    }

    if (hasOneDayPassed(lastHintRefresh ?? null, serverNow)) {
      hints = DAILY_HINT_TOKENS;
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      transaction.update(userRef, {
        dailyCredits: credits,
        dailyHintTokens: hints,
        lastCreditRefresh: firebaseServerTimestamp(),
        lastHintRefresh: firebaseServerTimestamp(),
      });
    }
  });

  if (shouldLogDailyRefresh) {
    await logCreditTransaction(userId, DAILY_FREE_CREDITS, 'dailyRefresh');
  }
};

export const consumeCredit = async (userId: string, amount: number) => {
  const userRef = getUserRef(userId);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(userRef);
    if (!snapshot.exists()) {
      throw new Error('Kullanıcı profili bulunamadı.');
    }

    const currentCredits = snapshot.data().dailyCredits ?? 0;
    if (currentCredits < amount) {
      throw new Error('Yeterli krediniz bulunmuyor.');
    }

    transaction.update(userRef, {
      dailyCredits: currentCredits - amount,
      updatedAt: serverTimestamp(),
    });
  });
};

export const consumeHintToken = async (userId: string) => {
  const userRef = getUserRef(userId);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(userRef);
    if (!snapshot.exists()) {
      throw new Error('Kullanıcı profili bulunamadı.');
    }

    const currentHints = snapshot.data().dailyHintTokens ?? 0;
    if (currentHints <= 0) {
      throw new Error('Günlük yıldız hakkınız kalmadı.');
    }

    transaction.update(userRef, {
      dailyHintTokens: currentHints - 1,
      updatedAt: serverTimestamp(),
    });
  });
};

export const grantCredits = async (userId: string, amount: number, reason: CreditTransaction['reason']) => {
  const userRef = getUserRef(userId);
  await updateDoc(userRef, {
    dailyCredits: amount,
    updatedAt: serverTimestamp(),
  });
  await logCreditTransaction(userId, amount, reason);
};

export const logCreditTransaction = async (
  userId: string,
  delta: number,
  reason: CreditTransaction['reason'],
) => {
  const transactionRef = doc(
    collection(db, FIREBASE_COLLECTIONS.creditTransactions),
    nanoid(12),
  );

  const entry: CreditTransaction = {
    id: transactionRef.id,
    userId,
    delta,
    reason,
    createdAt: null,
  };

  await setDoc(transactionRef, {
    ...entry,
    createdAt: serverTimestamp(),
  });
};
