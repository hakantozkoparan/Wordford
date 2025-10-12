export const DAILY_ENERGY_ALLOCATION = 20;
export const DAILY_REVEAL_TOKENS = 5;
export const DAILY_WORD_GOAL = 10;
export const WORDS_PER_AD_BREAK = 5;
export const SESSION_REWARDED_INTERVAL_MS = 5 * 60 * 1000;
export const MAX_REGISTRATIONS_PER_DEVICE = 3;
export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOGIN_LOCK_DURATION_MINUTES = 60;

export const FIREBASE_COLLECTIONS = {
  users: 'users',
  devices: 'devices',
  resourceTransactions: 'resourceTransactions',
  wordLevels: 'levels',
  words: 'words',
  progress: 'progress',
  contactRequests: 'contactRequests',
};

export const STORAGE_KEYS = {
  deviceId: 'wordford_device_id',
  guestProgress: 'wordford_guest_progress',
  guestStats: 'wordford_guest_stats',
  guestResources: 'wordford_guest_resources',
  streakSnapshot: 'wordford_streak_snapshot',
  notificationReminders: 'wordford_notification_reminders',
  expoPushToken: 'wordford_expo_push_token',
  trackingPromptShown: 'wordford_tracking_prompt_shown',
};

export const REVENUECAT_KEYS = {
  apiKey: 'REPLACE_WITH_REVENUECAT_API_KEY',
  entitlementAdFree: 'ad_free',
  entitlementCredits: 'credits_pack',
};
