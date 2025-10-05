import { FirebaseError } from 'firebase/app';
import { collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';

import { FIREBASE_COLLECTIONS } from '@/config/appConfig';
import { auth, db, firebaseServerTimestamp } from '@/config/firebase';
import { LevelCode, WordEntry } from '@/types/models';
import { SAMPLE_WORDS } from '@/data/sampleWords';

export const levelCollectionRef = collection(db, FIREBASE_COLLECTIONS.wordLevels);

export const getWordCollectionRef = (level: LevelCode) =>
  collection(db, FIREBASE_COLLECTIONS.wordLevels, level, FIREBASE_COLLECTIONS.words);

export const fetchWordsByLevel = async (level: LevelCode): Promise<WordEntry[]> => {
  try {
    const q = query(getWordCollectionRef(level), orderBy('createdAt', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data() as WordEntry;
      return { ...data, id: docSnap.id };
    });
  } catch (error) {
    const isPermissionDenied =
      error instanceof FirebaseError && error.code === 'permission-denied';

    if (isPermissionDenied && !auth.currentUser) {
      return SAMPLE_WORDS[level] ?? [];
    }

    console.warn('Kelimeler alınırken hata oluştu:', error);
    return SAMPLE_WORDS[level] ?? [];
  }
};

export const seedWordIfMissing = async (word: WordEntry) => {
  const wordRef = doc(getWordCollectionRef(word.level), word.id);
  const snapshot = await getDoc(wordRef);
  if (!snapshot.exists()) {
    await setDoc(wordRef, {
      ...word,
      createdAt: firebaseServerTimestamp(),
      updatedAt: firebaseServerTimestamp(),
    });
  }
};

export const subscribeToWords = (
  level: LevelCode,
  callback: (words: WordEntry[]) => void,
): (() => void) => {
  const q = query(getWordCollectionRef(level), orderBy('createdAt', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      callback(
        snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as WordEntry;
          return { ...data, id: docSnap.id };
        }),
      );
    },
    (error) => {
      console.warn('Kelime akışı başarısız:', error);
      callback([]);
    },
  );
};
