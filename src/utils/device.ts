import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { nanoid } from 'nanoid/non-secure';

import { STORAGE_KEYS } from '@/config/appConfig';
import { DeviceMetadata } from '@/types/models';

export const getDeviceMetadata = async (): Promise<DeviceMetadata> => {
  const deviceId = await getOrCreateDeviceId();

  return {
    deviceId,
    brand: Device.brand ?? null,
    modelName: Device.modelName ?? null,
    osName: Device.osName ?? null,
    osVersion: Device.osVersion ?? null,
    totalMemory: Device.totalMemory,
    isEmulator: Device.isDevice === false,
  };
};

export const getOrCreateDeviceId = async (): Promise<string> => {
  const existing = await SecureStore.getItemAsync(STORAGE_KEYS.deviceId);
  if (existing) {
    return existing;
  }
  const generated = `device_${nanoid(16)}`;
  await SecureStore.setItemAsync(STORAGE_KEYS.deviceId, generated);
  return generated;
};
