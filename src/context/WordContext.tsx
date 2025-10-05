import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { LevelCode, WordEntry, WordProgress } from '@/types/models';
import { fetchWordsByLevel } from '@/services/wordService';
import {
  markWordAsKnown,
  recordAnswerResult,
  recordHintUsage,
  subscribeToProgress,
  toggleFavorite,
  updateUserExampleSentence,
} from '@/services/progressService';
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
      if (!firebaseUser) {
        // Demo modu için local state
        setProgressMap((prev) => ({
          ...prev,
          [word.id]: {
            ...(prev[word.id] ?? {
              wordId: word.id,
              level: word.level,
              status: 'unknown',
              attempts: 0,
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
    [firebaseUser],
  );

  const markHintUsed = useCallback(
    async (word: WordEntry) => {
      if (!firebaseUser) {
        // Demo modu için local state
        setProgressMap((prev) => ({
          ...prev,
          [word.id]: {
            ...(prev[word.id] ?? {
              wordId: word.id,
              level: word.level,
              status: 'unknown',
              attempts: 0,
              isFavorite: false,
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
    [firebaseUser],
  );

  const recordAnswer = useCallback(
    async (word: WordEntry, isCorrect: boolean) => {
      if (!firebaseUser) {
        // Giriş yapılmadığında local state'te takip et (demo modu)
        setProgressMap((prev) => ({
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
            createdAt: null,
            updatedAt: null,
          },
        }));
        return;
      }
      await recordAnswerResult(firebaseUser.uid, word, isCorrect);
    },
    [firebaseUser],
  );

  const saveExampleSentence = useCallback(
    async (word: WordEntry, example: string) => {
      if (!firebaseUser) {
        setProgressMap((prev) => ({
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
