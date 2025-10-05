import { collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';

import { FIREBASE_COLLECTIONS } from '@/config/appConfig';
import { db, firebaseServerTimestamp } from '@/config/firebase';
import { LevelCode, WordEntry } from '@/types/models';

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
    console.warn('Kelimeler alınırken hata oluştu:', error);
    return [];
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
