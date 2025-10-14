import { Timestamp } from 'firebase/firestore';

import { PremiumSource, UserProfile } from '@/types/models';
import { GuestPremiumState, isGuestPremiumActive } from '@/services/guestPremiumService';

export interface PremiumStatus {
  isPremium: boolean;
  isTrial: boolean;
  trialEligible: boolean;
  expiresAt: Date | null;
  remainingDays: number;
  remainingHours: number;
  remainingMinutes: number;
  remainingLabel: string;
  source: PremiumSource | null;
}

const toDate = (value: unknown): Date | null => {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value;
  }
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (typeof (value as { toDate?: () => Date })?.toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
};

const buildRemainingLabel = (expiresAt: Date | null, now: Date) => {
  if (!expiresAt) {
    return '';
  }
  const diffMs = expiresAt.getTime() - now.getTime();
  if (diffMs <= 0) {
    return '';
  }
  const totalMinutes = Math.floor(diffMs / (60 * 1000));
  const totalHours = Math.floor(diffMs / (60 * 60 * 1000));
  const totalDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  const days = totalDays;
  const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));

  if (days > 0) {
    return `${days} gün ${hours} saat ${minutes} dakika`;
  }
  if (hours > 0) {
    return `${hours} saat ${minutes} dakika`;
  }
  return `${Math.max(minutes, 1)} dakika`;
};

const resolveFromProfile = (profile: UserProfile | null | undefined, now: Date) => {
  const expiresAt = toDate(profile?.premiumActiveUntil ?? null);
  const isPremium = Boolean(expiresAt && expiresAt.getTime() > now.getTime());
  const source = (profile?.premiumSource as PremiumSource | undefined) ?? null;
  const isTrial = isPremium && source === 'trial';
  const trialEligible = !profile || (profile.premiumTrialUsed !== true && !isPremium);

  return { expiresAt, isPremium, source, isTrial, trialEligible } as const;
};

const resolveFromGuest = (state: GuestPremiumState | null | undefined, now: Date) => {
  const expiresAt = state?.premiumActiveUntil ? toDate(state.premiumActiveUntil) : null;
  const active = isGuestPremiumActive(state ?? null, now);
  const source = (state?.premiumSource as PremiumSource | undefined) ?? null;
  const isTrial = active && source === 'trial';
  const trialEligible = state?.premiumTrialUsed !== true || !active;

  return { expiresAt, isPremium: active, source, isTrial, trialEligible } as const;
};

export const getPremiumStatus = (
  profile?: UserProfile | null,
  guestState?: GuestPremiumState | null,
  now = new Date(),
): PremiumStatus => {
  const resolved = profile
    ? resolveFromProfile(profile, now)
    : resolveFromGuest(guestState, now);

  const expiresAt = resolved.expiresAt ?? null;
  const isPremium = resolved.isPremium;
  const source = resolved.source ?? null;
  const isTrial = resolved.isTrial;
  const trialEligible = resolved.trialEligible;

  const diffMs = expiresAt ? Math.max(expiresAt.getTime() - now.getTime(), 0) : 0;
  const remainingMinutes = diffMs > 0 ? Math.ceil(diffMs / (60 * 1000)) : 0;
  const remainingHours = diffMs > 0 ? Math.ceil(diffMs / (60 * 60 * 1000)) : 0;
  const remainingDays = diffMs > 0 ? Math.ceil(diffMs / (24 * 60 * 60 * 1000)) : 0;

  return {
    isPremium,
    isTrial,
    trialEligible,
    expiresAt: expiresAt ?? null,
    remainingDays,
    remainingHours,
    remainingMinutes,
    remainingLabel: buildRemainingLabel(expiresAt, now),
    source,
  };
};

export const isPremiumActive = (
  profile?: UserProfile | null,
  guestState?: GuestPremiumState | null,
  now = new Date(),
) => getPremiumStatus(profile, guestState, now).isPremium;
