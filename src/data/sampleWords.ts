import { LevelCode, WordEntry } from '@/types/models';
import { LEVEL_CODES, WORDS_PER_LEVEL } from '@/constants/levels';
import { nanoid } from 'nanoid/non-secure';

type SampleWordMap = Record<LevelCode, WordEntry[]>;

const seedWords: Record<LevelCode, Array<Omit<WordEntry, 'id' | 'level'>>> = {
  A1: [
    { term: 'Apple', meanings: ['elma'], exampleSentence: 'I eat an apple every morning.' },
    { term: 'Book', meanings: ['kitap'], exampleSentence: 'This book is very interesting.' },
    { term: 'Cat', meanings: ['kedi'], exampleSentence: 'The cat sleeps on the sofa.' },
    { term: 'House', meanings: ['ev'], exampleSentence: 'Our house has a big garden.' },
    { term: 'Water', meanings: ['su'], exampleSentence: 'Drink water to stay healthy.' },
    { term: 'Set', meanings: ['ayarlamak', 'batmak'], exampleSentence: 'Set the alarm for seven.' },
  ],
  A2: [
    { term: 'Advice', meanings: ['öğüt', 'tavsiye'], exampleSentence: 'She gave me good advice.' },
    { term: 'Basket', meanings: ['sepet'], exampleSentence: 'Put the fruits in the basket.' },
  ],
  B1: [
    { term: 'Achieve', meanings: ['başarmak'], exampleSentence: 'You can achieve your goals.' },
    { term: 'Balance', meanings: ['dengelemek', 'denge'], exampleSentence: 'Work-life balance is important.' },
  ],
  B2: [
    { term: 'Comprehensive', meanings: ['kapsamlı'], exampleSentence: 'We need a comprehensive plan.' },
  ],
  C1: [
    { term: 'Articulate', meanings: ['düşüncelerini açıkça ifade etmek'], exampleSentence: 'He is an articulate speaker.' },
  ],
  C2: [
    { term: 'Disseminate', meanings: ['yaymak', 'dağıtmak'], exampleSentence: 'They disseminate information quickly.' },
  ],
};

const buildWordList = (): SampleWordMap => {
  const result = {} as SampleWordMap;

  LEVEL_CODES.forEach((level) => {
    const entries = seedWords[level] ?? [];
    const enriched: WordEntry[] = entries.map((item) => ({
      ...item,
      id: nanoid(10),
      level,
    }));

    // Ensure we have WORDS_PER_LEVEL placeholders to illustrate progress bars.
    while (enriched.length < WORDS_PER_LEVEL) {
      const fillerIndex = enriched.length + 1;
      enriched.push({
        id: nanoid(10),
        level,
        term: `${level} Word ${fillerIndex}`,
        meanings: ['(örnek anlam)'],
      });
    }

    result[level] = enriched;
  });

  return result;
};

export const SAMPLE_WORDS: SampleWordMap = buildWordList();
