import { Timestamp } from 'firebase/firestore';
import { differenceInMinutes, isSameDay, startOfDay } from 'date-fns';

export const toDate = (value?: Timestamp | Date | null): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  return value.toDate();
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
