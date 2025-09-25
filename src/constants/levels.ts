import { LevelCode } from '@/types/models';

export const LEVEL_CODES: LevelCode[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export const WORDS_PER_LEVEL = 100;

export const TOTAL_WORD_COUNT = WORDS_PER_LEVEL * LEVEL_CODES.length;

export const LEVEL_LABELS: Record<LevelCode, string> = {
  A1: 'Başlangıç',
  A2: 'Temel',
  B1: 'Orta',
  B2: 'Üst-Orta',
  C1: 'İleri',
  C2: 'Ustalık',
};
