import {
  Timestamp,
  doc,
  getDoc,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import { db } from '@/config/firebase';
import { LOGIN_LOCK_DURATION_MINUTES, MAX_FAILED_LOGIN_ATTEMPTS } from '@/config/appConfig';
import { DeviceSecurityState } from '@/types/models';
import { minutesUntil } from '@/utils/datetime';

const collection = 'devices';
const LOCK_DURATION_MS = LOGIN_LOCK_DURATION_MINUTES * 60 * 1000;

export const getDeviceDocRef = (deviceId: string) => doc(db, collection, deviceId);

export const ensureDeviceState = async (deviceId: string): Promise<DeviceSecurityState> => {
  const ref = getDeviceDocRef(deviceId);
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) {
    return snapshot.data() as DeviceSecurityState;
  }
  const defaultState: DeviceSecurityState = {
    registrationCount: 0,
    failedLoginAttempts: 0,
    lastFailedAt: null,
    lockUntil: null,
  };
  await setDoc(ref, { ...defaultState, createdAt: serverTimestamp() });
  return defaultState;
};

export const assertRegistrationQuota = async (_deviceId: string) => {
  // Kayıt kota kontrolü geçici olarak devre dışı.
};

export const incrementRegistrationCount = async (_deviceId: string) => {
  // Kayıt kota sayaç güncellemesi geçici olarak devre dışı.
};

export const recordFailedLogin = async (deviceId: string) => {
  const previous = await ensureDeviceState(deviceId);
  const ref = getDeviceDocRef(deviceId);
  const newFailedCount = previous.failedLoginAttempts + 1;
  const shouldLock = newFailedCount >= MAX_FAILED_LOGIN_ATTEMPTS;

  await updateDoc(ref, {
    failedLoginAttempts: shouldLock ? 0 : increment(1),
    lastFailedAt: serverTimestamp(),
    lockUntil: shouldLock ? Timestamp.fromMillis(Date.now() + LOCK_DURATION_MS) : previous.lockUntil ?? null,
    updatedAt: serverTimestamp(),
  });

  if (shouldLock) {
    throw new Error('Çok fazla hatalı giriş. Hesap 1 saatliğine kilitlendi.');
  }
};

export const resetFailedLogins = async (deviceId: string) => {
  await ensureDeviceState(deviceId);
  const ref = getDeviceDocRef(deviceId);
  await updateDoc(ref, {
    failedLoginAttempts: 0,
    lockUntil: null,
    updatedAt: serverTimestamp(),
  });
};

export const assertDeviceNotLocked = async (deviceId: string) => {
  const state = await ensureDeviceState(deviceId);
  if (!state.lockUntil) return;

  const now = new Date();
  const minutesLeft = minutesUntil(state.lockUntil, now);
  if (minutesLeft > 0) {
    throw new Error(`Çok fazla hatalı giriş. Lütfen ${minutesLeft} dakika sonra tekrar deneyin.`);
  }
};
