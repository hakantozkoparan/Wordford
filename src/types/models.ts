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
  // Push notification için
  pushToken?: string | null;
  pushEnabled?: boolean;
  // Cihaz detayları
  deviceName?: string | null;
  deviceYearClass?: number | null;
  manufacturer?: string | null;
  // Platform bilgisi
  platformVersion?: string | null;
  // Uygulama bilgisi
  appVersion?: string | null;
  buildNumber?: string | null;
  // Dil ve bölge
  locale?: string | null;
  timezone?: string | null;
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
  // Push notification ayarları
  pushToken?: string | null;
  pushEnabled?: boolean;
  notificationPreferences?: {
    dailyReminder?: boolean;
    weeklyProgress?: boolean;
    achievements?: boolean;
    marketing?: boolean;
  };
  // İstatistikler
  totalWordsLearned?: number;
  currentStreak?: number;
  longestStreak?: number;
  lastActivityDate?: Timestamp | null;
  // Cihaz geçmişi (son kullanılan cihazlar)
  deviceHistory?: DeviceMetadata[];
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
  userExampleSentence?: string; // Kullanıcının kendi eklediği örnek cümle
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
