import { Timestamp } from 'firebase/firestore';
import { differenceInMinutes, isSameDay, startOfDay } from 'date-fns';

type PossibleDate = Timestamp | Date | string | number | null | undefined;

export const toDate = (value?: PossibleDate): Date | null => {
  if (!value && value !== 0) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (value && typeof (value as Timestamp).toDate === 'function') {
    return (value as Timestamp).toDate();
  }
  return null;
};

export const hasOneDayPassed = (last: Timestamp | Date | null, current: Date) => {
  const lastDate = toDate(last);
  if (!lastDate) return true;
  return !isSameDay(lastDate, current);
};

export const minutesUntil = (target: Timestamp | Date | null, base: Date) => {
  const targetDate = toDate(target);
  if (!targetDate) return 0;
  return differenceInMinutes(targetDate, base);
};

export const toIsoDate = (date: Date) => startOfDay(date).toISOString();
