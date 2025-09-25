import {
  AuthError,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

import { DAILY_FREE_CREDITS, DAILY_HINT_TOKENS, FIREBASE_COLLECTIONS } from '@/config/appConfig';
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
  birthDate: string;
  captchaResultValid: boolean;
  device: DeviceMetadata;
}

export interface LoginPayload {
  email: string;
  password: string;
  device: DeviceMetadata;
}

export const registerUser = async (payload: RegistrationPayload) => {
  const { email, password, firstName, lastName, birthDate, captchaResultValid, device } = payload;

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
    birthDate,
    role: 'member',
    deviceId: device.deviceId,
    createdAt: null,
    updatedAt: null,
    dailyCredits: DAILY_FREE_CREDITS,
    dailyHintTokens: DAILY_HINT_TOKENS,
    lastCreditRefresh: null,
    lastHintRefresh: null,
    subscriptionTier: 'none',
    hasAdFree: false,
    lastLoginAt: null,
  };

  await setDoc(userDoc, {
    ...profile,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastCreditRefresh: serverTimestamp(),
    lastHintRefresh: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
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
    default:
      return 'Bir hata oluştu. Lütfen tekrar deneyin.';
  }
};
