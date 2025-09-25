import { CaptchaChallenge } from '@/types/models';

const OPERATIONS = ['+', '-', '×', '÷'] as const;

type OperationSymbol = (typeof OPERATIONS)[number];

type Operation = {
  symbol: OperationSymbol;
  compute: (a: number, b: number) => number;
  validator?: (result: number) => boolean;
};

const operations: Operation[] = [
  { symbol: '+', compute: (a, b) => a + b },
  { symbol: '-', compute: (a, b) => a - b },
  {
    symbol: '×',
    compute: (a, b) => a * b,
  },
  {
    symbol: '÷',
    compute: (a, b) => a / b,
    validator: (result) => Number.isInteger(result),
  },
];

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export const generateCaptcha = (): CaptchaChallenge => {
  const selected = operations[Math.floor(Math.random() * operations.length)];

  let first = randomInt(2, 12);
  let second = randomInt(2, 12);

  if (selected.symbol === '-' && second > first) {
    [first, second] = [second, first];
  }

  if (selected.symbol === '÷') {
    const divisor = randomInt(2, 9);
    const result = randomInt(1, 9);
    first = divisor * result;
    second = divisor;
  }

  const solution = selected.compute(first, second);
  if (selected.validator && !selected.validator(solution)) {
    return generateCaptcha();
  }

  const prompt = `${first} ${selected.symbol} ${second} = ?`;

  return {
    prompt,
    solution,
  };
};

export const validateCaptcha = (challenge: CaptchaChallenge, answer: string) => {
  const parsed = Number(answer.replace(',', '.'));
  return !Number.isNaN(parsed) && parsed === challenge.solution;
};
