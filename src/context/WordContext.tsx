import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { LevelCode, WordEntry, WordProgress } from '@/types/models';
import { fetchWordsByLevel } from '@/services/wordService';
import {
  markWordAsKnown,
  recordAnswerResult,
  recordHintUsage,
  syncOfflineProgress,
  subscribeToProgress,
  toggleFavorite,
  updateUserExampleSentence,
} from '@/services/progressService';
import { STORAGE_KEYS } from '@/config/appConfig';
import { useAuth } from './AuthContext';

interface WordContextValue {
  wordsByLevel: Partial<Record<LevelCode, WordEntry[]>>;
  progressMap: Record<string, WordProgress>;
  favorites: WordProgress[];
  knownWords: WordProgress[];
  levelLoading: Record<LevelCode, boolean>;
  loadLevelWords: (level: LevelCode) => Promise<void>;
  markAsKnown: (word: WordEntry) => Promise<void>;
  toggleFavoriteWord: (word: WordEntry, value: boolean) => Promise<void>;
  markHintUsed: (word: WordEntry) => Promise<void>;
  recordAnswer: (word: WordEntry, isCorrect: boolean) => Promise<void>;
  saveExampleSentence: (word: WordEntry, example: string) => Promise<void>;
}

const WordContext = createContext<WordContextValue | undefined>(undefined);

export const WordProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { firebaseUser } = useAuth();
  const [wordsByLevel, setWordsByLevel] = useState<Partial<Record<LevelCode, WordEntry[]>>>({});
  const [progressMap, setProgressMap] = useState<Record<string, WordProgress>>({});
  const [levelLoading, setLevelLoading] = useState<Record<LevelCode, boolean>>({
    A1: false,
    A2: false,
    B1: false,
    B2: false,
    C1: false,
    C2: false,
  });

  const guestProgressStorageKey = STORAGE_KEYS.guestProgress;

  const loadGuestProgress = useCallback(async (): Promise<Record<string, WordProgress>> => {
    try {
      const stored = await AsyncStorage.getItem(guestProgressStorageKey);
      if (!stored) {
        return {};
      }
      const parsed = JSON.parse(stored) as Record<string, WordProgress>;
      return parsed ?? {};
    } catch (error) {
      console.warn('Misafir ilerlemesi okunamadı:', error);
      return {};
    }
  }, [guestProgressStorageKey]);

  const persistGuestProgress = useCallback(
    async (payload: Record<string, WordProgress>) => {
      try {
        if (Object.keys(payload).length === 0) {
          await AsyncStorage.removeItem(guestProgressStorageKey);
        } else {
          await AsyncStorage.setItem(guestProgressStorageKey, JSON.stringify(payload));
        }
      } catch (error) {
        console.warn('Misafir ilerlemesi kaydedilemedi:', error);
      }
    },
    [guestProgressStorageKey],
  );

  const clearGuestProgress = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(guestProgressStorageKey);
    } catch (error) {
      console.warn('Misafir ilerlemesi temizlenemedi:', error);
    }
  }, [guestProgressStorageKey]);

  const updateGuestProgress = useCallback(
    (updater: (prev: Record<string, WordProgress>) => Record<string, WordProgress>) => {
      setProgressMap((prev) => {
        const updated = updater(prev);
        persistGuestProgress(updated);
        return updated;
      });
    },
    [persistGuestProgress],
  );

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let isMounted = true;

    const hydrate = async () => {
      if (!firebaseUser) {
        const guestProgress = await loadGuestProgress();
        if (isMounted) {
          setProgressMap(guestProgress);
        }
        return;
      }

      const guestProgress = await loadGuestProgress();
      if (Object.keys(guestProgress).length > 0) {
        if (isMounted) {
          setProgressMap(guestProgress);
        }
        await syncOfflineProgress(firebaseUser.uid, guestProgress);
        await clearGuestProgress();
      }

      if (!isMounted) {
        return;
      }

      unsubscribe = subscribeToProgress(firebaseUser.uid, setProgressMap);
    };

    hydrate();

    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [firebaseUser, loadGuestProgress, clearGuestProgress, syncOfflineProgress]);

  const loadLevelWords = useCallback(async (level: LevelCode) => {
    setLevelLoading((prev) => ({ ...prev, [level]: true }));
    try {
      const words = await fetchWordsByLevel(level);
      setWordsByLevel((prev) => ({ ...prev, [level]: words }));
    } finally {
      setLevelLoading((prev) => ({ ...prev, [level]: false }));
    }
  }, []);

  const markAsKnown = useCallback(
    async (word: WordEntry) => {
      if (!firebaseUser) return;
      await markWordAsKnown(firebaseUser.uid, word);
    },
    [firebaseUser],
  );

  const toggleFavoriteWord = useCallback(
    async (word: WordEntry, value: boolean) => {
      if (!firebaseUser) {
        updateGuestProgress((prev) => ({
          ...prev,
          [word.id]: {
            ...(prev[word.id] ?? {
              wordId: word.id,
              level: word.level,
              status: 'unknown',
              attempts: 0,
              isFavorite: false,
              usedHint: false,
              lastAnswerAt: null,
              createdAt: null,
              updatedAt: null,
            }),
            isFavorite: value,
          },
        }));
        return;
      }
      await toggleFavorite(firebaseUser.uid, word, value);
    },
    [firebaseUser, updateGuestProgress],
  );

  const markHintUsed = useCallback(
    async (word: WordEntry) => {
      if (!firebaseUser) {
        updateGuestProgress((prev) => ({
          ...prev,
          [word.id]: {
            ...(prev[word.id] ?? {
              wordId: word.id,
              level: word.level,
              status: 'unknown',
              attempts: 0,
              isFavorite: false,
              usedHint: false,
              lastAnswerAt: null,
              createdAt: null,
              updatedAt: null,
            }),
            usedHint: true,
          },
        }));
        return;
      }
      await recordHintUsage(firebaseUser.uid, word);
    },
    [firebaseUser, updateGuestProgress],
  );

  const recordAnswer = useCallback(
    async (word: WordEntry, isCorrect: boolean) => {
      if (!firebaseUser) {
        updateGuestProgress((prev) => ({
          ...prev,
          [word.id]: {
            wordId: word.id,
            level: word.level,
            status: isCorrect ? 'mastered' : 'inProgress',
            attempts: (prev[word.id]?.attempts ?? 0) + 1,
            isFavorite: prev[word.id]?.isFavorite ?? false,
            usedHint: prev[word.id]?.usedHint ?? false,
            userExampleSentence: prev[word.id]?.userExampleSentence,
            lastAnswerAt: null,
            createdAt: prev[word.id]?.createdAt ?? null,
            updatedAt: null,
          },
        }));
        return;
      }
      await recordAnswerResult(firebaseUser.uid, word, isCorrect);
    },
    [firebaseUser, updateGuestProgress],
  );

  const saveExampleSentence = useCallback(
    async (word: WordEntry, example: string) => {
      if (!firebaseUser) {
        updateGuestProgress((prev) => ({
          ...prev,
          [word.id]: {
            ...(prev[word.id] ?? {
              wordId: word.id,
              level: word.level,
              status: 'unknown',
              attempts: 0,
              isFavorite: false,
              usedHint: false,
              lastAnswerAt: null,
              createdAt: null,
              updatedAt: null,
            }),
            userExampleSentence: example.trim() || undefined,
          },
        }));
        return;
      }
      await updateUserExampleSentence(firebaseUser.uid, word, example);
    },
    [firebaseUser, updateGuestProgress],
  );

  const favorites = useMemo(
    () => Object.values(progressMap).filter((item) => item.isFavorite),
    [progressMap],
  );

  const knownWords = useMemo(
    () => Object.values(progressMap).filter((item) => item.status === 'mastered'),
    [progressMap],
  );

  const value = useMemo(
    () => ({
      wordsByLevel,
      progressMap,
      favorites,
      knownWords,
      levelLoading,
      loadLevelWords,
      markAsKnown,
      toggleFavoriteWord,
      markHintUsed,
      recordAnswer,
      saveExampleSentence,
    }),
    [
      wordsByLevel,
      progressMap,
      favorites,
      knownWords,
      levelLoading,
      loadLevelWords,
      markAsKnown,
      toggleFavoriteWord,
      markHintUsed,
      recordAnswer,
      saveExampleSentence,
    ],
  );

  return <WordContext.Provider value={value}>{children}</WordContext.Provider>;
};

export const useWords = () => {
  const context = useContext(WordContext);
  if (!context) {
    throw new Error('useWords yalnızca WordProvider içinde kullanılabilir.');
  }
  return context;
};
