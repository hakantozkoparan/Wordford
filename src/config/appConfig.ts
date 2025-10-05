export const DAILY_FREE_CREDITS = 10;
export const DAILY_HINT_TOKENS = 5;
export const WORDS_PER_AD_BREAK = 5;
export const MAX_REGISTRATIONS_PER_DEVICE = 3;
export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOGIN_LOCK_DURATION_MINUTES = 60;

export const FIREBASE_COLLECTIONS = {
  users: 'users',
  devices: 'devices',
  creditTransactions: 'creditTransactions',
  wordLevels: 'levels',
  words: 'words',
  progress: 'progress',
};

export const STORAGE_KEYS = {
  deviceId: 'wordford_device_id',
  guestProgress: 'wordford_guest_progress',
};

export const REVENUECAT_KEYS = {
  apiKey: 'REPLACE_WITH_REVENUECAT_API_KEY',
  entitlementAdFree: 'ad_free',
  entitlementCredits: 'credits_pack',
};
