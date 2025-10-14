import {
  AuthError,
  User,
  createUserWithEmailAndPassword,
  deleteUser,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';

import { DAILY_ENERGY_ALLOCATION, DAILY_REVEAL_TOKENS, FIREBASE_COLLECTIONS } from '@/config/appConfig';
import { auth, db } from '@/config/firebase';
import { DeviceMetadata, UserProfile } from '@/types/models';
import {
  assertDeviceNotLocked,
  assertRegistrationQuota,
  incrementRegistrationCount,
  recordFailedLogin,
  resetFailedLogins,
} from './deviceSecurityService';

export interface RegistrationPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  captchaResultValid: boolean;
  device: DeviceMetadata;
}

export interface LoginPayload {
  email: string;
  password: string;
  device: DeviceMetadata;
}

export const registerUser = async (payload: RegistrationPayload) => {
  const { email, password, firstName, lastName, captchaResultValid, device } = payload;

  if (!captchaResultValid) {
    throw new Error('Captcha doğrulanamadı.');
  }

  await assertRegistrationQuota(device.deviceId);

  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(credential.user, {
    displayName: `${firstName} ${lastName}`.trim(),
  });

  const userDoc = doc(db, FIREBASE_COLLECTIONS.users, credential.user.uid);
  const profile: UserProfile = {
    uid: credential.user.uid,
    email: credential.user.email ?? email,
    firstName,
    lastName,
    role: 'member',
    deviceId: device.deviceId,
    createdAt: null,
    updatedAt: null,
    dailyEnergy: DAILY_ENERGY_ALLOCATION,
    dailyRevealTokens: DAILY_REVEAL_TOKENS,
    bonusEnergy: 0,
    bonusRevealTokens: 0,
    lastEnergyRefresh: null,
    lastRevealRefresh: null,
    premiumActiveUntil: null,
    premiumStartedAt: null,
    premiumSource: null,
    premiumTrialUsed: false,
    subscriptionTier: 'none',
    hasAdFree: false,
    lastLoginAt: null,
    // Push notification ayarları
    pushToken: device.pushToken ?? null,
    pushEnabled: false,
    notificationPreferences: {
      dailyReminder: true,
      weeklyProgress: true,
      achievements: true,
      marketing: false,
    },
    // İstatistikler
    totalWordsLearned: 0,
    totalWordsUpdatedAt: null,
    currentStreak: 0,
    longestStreak: 0,
    lastActivityDate: null,
    todaysMastered: 0,
    todaysMasteredDate: null,
    // Cihaz geçmişi
    deviceHistory: [device],
  };

  await setDoc(userDoc, {
    ...profile,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastEnergyRefresh: serverTimestamp(),
    lastRevealRefresh: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
    totalWordsUpdatedAt: serverTimestamp(),
    deviceSnapshot: device,
  });

  await incrementRegistrationCount(device.deviceId);

  return profile;
};

export const loginUser = async (payload: LoginPayload) => {
  const { email, password, device } = payload;
  await assertDeviceNotLocked(device.deviceId);

  try {
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    await resetFailedLogins(device.deviceId);
    return credential.user;
  } catch (error) {
    await recordFailedLogin(device.deviceId);
    throw error;
  }
};

export const logoutUser = async () => {
  await signOut(auth);
};

export const deleteUserAccount = async (user: User) => {
  const userId = user.uid;
  const userRef = doc(db, FIREBASE_COLLECTIONS.users, userId);

  const progressCollectionRef = collection(userRef, FIREBASE_COLLECTIONS.progress);
  const progressSnapshot = await getDocs(progressCollectionRef);
  await Promise.all(progressSnapshot.docs.map((docSnap) => deleteDoc(docSnap.ref)));

  const creditQuery = query(
    collection(db, FIREBASE_COLLECTIONS.resourceTransactions),
    where('userId', '==', userId),
  );
  const creditSnapshot = await getDocs(creditQuery);
  await Promise.all(creditSnapshot.docs.map((docSnap) => deleteDoc(docSnap.ref)));

  await deleteDoc(userRef);

  const userToDelete = auth.currentUser && auth.currentUser.uid === userId ? auth.currentUser : user;
  await deleteUser(userToDelete);
};

export const parseAuthError = (error: unknown): string => {
  const authError = error as AuthError;
  switch (authError?.code) {
    case 'auth/email-already-in-use':
      return 'Bu e-posta adresi zaten kullanımda.';
    case 'auth/invalid-email':
      return 'Lütfen geçerli bir e-posta adresi girin.';
    case 'auth/weak-password':
      return 'Şifre en az 6 karakter olmalıdır.';
    case 'auth/user-not-found':
      return 'Kullanıcı bulunamadı.';
    case 'auth/wrong-password':
      return 'E-posta veya şifre hatalı.';
    case 'auth/requires-recent-login':
      return 'Güvenlik nedeniyle lütfen hesabınıza tekrar giriş yapın ve işlemi yeniden deneyin.';
    default:
      return 'Bir hata oluştu. Lütfen tekrar deneyin.';
  }
};
