import { collection, doc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore';

import { FIREBASE_COLLECTIONS } from '@/config/appConfig';
import { db } from '@/config/firebase';
import { WordEntry, WordProgress } from '@/types/models';

const getProgressCollectionRef = (userId: string) =>
  collection(db, FIREBASE_COLLECTIONS.users, userId, FIREBASE_COLLECTIONS.progress);

const getProgressDocRef = (userId: string, wordId: string) =>
  doc(getProgressCollectionRef(userId), wordId);

const buildBaseProgress = (word: WordEntry): WordProgress => ({
  wordId: word.id,
  level: word.level,
  status: 'unknown',
  attempts: 0,
  isFavorite: false,
  usedHint: false,
  lastAnswerAt: null,
  createdAt: null,
  updatedAt: null,
});

export const subscribeToProgress = (
  userId: string,
  onChange: (progress: Record<string, WordProgress>) => void,
): (() => void) =>
  onSnapshot(
    getProgressCollectionRef(userId),
    (snapshot) => {
      const map: Record<string, WordProgress> = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as WordProgress;
        map[docSnap.id] = { ...data, wordId: docSnap.id };
      });
      onChange(map);
    },
    (error) => console.warn('Progress subscription failed', error),
  );

export const recordAnswerResult = async (userId: string, word: WordEntry, isCorrect: boolean) => {
  const ref = getProgressDocRef(userId, word.id);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    const existing = snapshot.exists() ? (snapshot.data() as WordProgress) : undefined;
    const attempts = (existing?.attempts ?? 0) + 1;

    const basePayload = existing
      ? { wordId: word.id, level: word.level }
      : { ...buildBaseProgress(word), createdAt: serverTimestamp() };

    transaction.set(
      ref,
      {
        ...basePayload,
        attempts,
        status: isCorrect ? 'mastered' : 'inProgress',
        lastAnswerAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  });
};

export const toggleFavorite = async (userId: string, word: WordEntry, isFavorite: boolean) => {
  const ref = getProgressDocRef(userId, word.id);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    const existing = snapshot.exists() ? (snapshot.data() as WordProgress) : undefined;

    const basePayload = existing
      ? { wordId: word.id, level: word.level }
      : { ...buildBaseProgress(word), createdAt: serverTimestamp() };

    transaction.set(
      ref,
      {
        ...basePayload,
        isFavorite,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  });
};

export const markWordAsKnown = async (userId: string, word: WordEntry) => {
  await recordAnswerResult(userId, word, true);
};

export const recordHintUsage = async (userId: string, word: WordEntry) => {
  const ref = getProgressDocRef(userId, word.id);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    const existing = snapshot.exists() ? (snapshot.data() as WordProgress) : undefined;

    const basePayload = existing
      ? { wordId: word.id, level: word.level }
      : { ...buildBaseProgress(word), createdAt: serverTimestamp() };

    transaction.set(
      ref,
      {
        ...basePayload,
        usedHint: true,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  });
};

export const updateUserExampleSentence = async (
  userId: string,
  word: WordEntry,
  exampleSentence: string,
) => {
  const ref = getProgressDocRef(userId, word.id);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    const existing = snapshot.exists() ? (snapshot.data() as WordProgress) : undefined;

    const basePayload = existing
      ? { wordId: word.id, level: word.level }
      : { ...buildBaseProgress(word), createdAt: serverTimestamp() };

    transaction.set(
      ref,
      {
        ...basePayload,
        userExampleSentence: exampleSentence.trim() || null,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  });
};
