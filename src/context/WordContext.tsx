import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { LevelCode, WordEntry, WordProgress } from '@/types/models';
import { fetchWordsByLevel } from '@/services/wordService';
import {
  markWordAsKnown,
  recordAnswerResult,
  recordHintUsage,
  subscribeToProgress,
  toggleFavorite,
} from '@/services/progressService';
import { SAMPLE_WORDS } from '@/data/sampleWords';
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
}

const WordContext = createContext<WordContextValue | undefined>(undefined);

export const WordProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { firebaseUser } = useAuth();
  const [wordsByLevel, setWordsByLevel] = useState<Partial<Record<LevelCode, WordEntry[]>>>(
    SAMPLE_WORDS,
  );
  const [progressMap, setProgressMap] = useState<Record<string, WordProgress>>({});
  const [levelLoading, setLevelLoading] = useState<Record<LevelCode, boolean>>({
    A1: false,
    A2: false,
    B1: false,
    B2: false,
    C1: false,
    C2: false,
  });

  useEffect(() => {
    if (!firebaseUser) {
      setProgressMap({});
      return;
    }

    const unsubscribe = subscribeToProgress(firebaseUser.uid, setProgressMap);
    return unsubscribe;
  }, [firebaseUser]);

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
      if (!firebaseUser) return;
      await toggleFavorite(firebaseUser.uid, word, value);
    },
    [firebaseUser],
  );

  const markHintUsed = useCallback(
    async (word: WordEntry) => {
      if (!firebaseUser) return;
      await recordHintUsage(firebaseUser.uid, word);
    },
    [firebaseUser],
  );

  const recordAnswer = useCallback(
    async (word: WordEntry, isCorrect: boolean) => {
      if (!firebaseUser) return;
      await recordAnswerResult(firebaseUser.uid, word, isCorrect);
    },
    [firebaseUser],
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
