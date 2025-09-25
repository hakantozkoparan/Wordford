import type { Timestamp } from 'firebase/firestore';

export type LevelCode = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type UserRole = 'member' | 'admin';

export type SubscriptionTier = 'none' | 'credits' | 'adFree' | 'creditsAndAdFree';

export interface DeviceMetadata {
  deviceId: string;
  brand: string | null;
  modelName: string | null;
  osName: string | null;
  osVersion: string | null;
  totalMemory?: number | null;
  isEmulator?: boolean | null;
}

export interface DeviceSecurityState {
  registrationCount: number;
  failedLoginAttempts: number;
  lastFailedAt?: Timestamp | null;
  lockUntil?: Timestamp | null;
}

export interface UserProfile {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  role: UserRole;
  deviceId: string;
  createdAt: Timestamp | null;
  updatedAt?: Timestamp | null;
  dailyCredits: number;
  dailyHintTokens: number;
  lastCreditRefresh?: Timestamp | null;
  lastHintRefresh?: Timestamp | null;
  subscriptionTier: SubscriptionTier;
  hasAdFree: boolean;
  lastLoginAt?: Timestamp | null;
}

export interface WordEntry {
  id: string;
  level: LevelCode;
  term: string;
  meanings: string[];
  exampleSentence?: string;
  synonyms?: string[];
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export type WordAnswerStatus = 'unknown' | 'inProgress' | 'mastered';

export interface WordProgress {
  wordId: string;
  level: LevelCode;
  status: WordAnswerStatus;
  attempts: number;
  isFavorite: boolean;
  lastAnswerAt?: Timestamp | null;
  usedHint: boolean;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface CaptchaChallenge {
  prompt: string;
  solution: number;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  delta: number;
  reason:
    | 'dailyRefresh'
    | 'hintReveal'
    | 'purchase'
    | 'adminGrant'
    | 'manualAdjust';
  createdAt: Timestamp | null;
}

export interface PurchasePackageIds {
  creditsProductId: string;
  adFreeProductId: string;
}
