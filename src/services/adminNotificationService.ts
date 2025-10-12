import { collection, getDocs, query, where } from 'firebase/firestore';

import { FIREBASE_COLLECTIONS } from '@/config/appConfig';
import { db } from '@/config/firebase';

const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send';
const MAX_MESSAGES_PER_BATCH = 100;
const BATCH_DELAY_MS = 250;

interface ExpoPushMessage {
  to: string;
  sound?: 'default' | null;
  title: string;
  body: string;
  data?: Record<string, string>;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: {
    error?: string;
  };
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const chunkArray = <T>(items: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
};

export interface BroadcastPayload {
  title: string;
  body: string;
  deeplink?: string;
  sampleTokensOverride?: string[];
}

export interface BroadcastSummary {
  targetedCount: number;
  successCount: number;
  failureCount: number;
  errors: Array<{ token: string; message: string }>;
}

const fetchPushTokens = async (): Promise<string[]> => {
  const enabledUsersQuery = query(
    collection(db, FIREBASE_COLLECTIONS.users),
    where('pushEnabled', '==', true)
  );

  const snapshot = await getDocs(enabledUsersQuery);
  const tokens = new Set<string>();

  snapshot.forEach((docSnap) => {
    const data = docSnap.data() as { pushToken?: unknown };
    const token = typeof data.pushToken === 'string' ? data.pushToken : null;
    if (token && token.startsWith('ExponentPushToken')) {
      tokens.add(token);
    }
  });

  return Array.from(tokens);
};

const postExpoPush = async (messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> => {
  const response = await fetch(EXPO_PUSH_API_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'accept-encoding': 'gzip, deflate',
      'content-type': 'application/json',
    },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Expo push API başarısız oldu (${response.status}): ${errorBody}`);
  }

  const payload = (await response.json()) as { data?: ExpoPushTicket[]; errors?: unknown };
  if (!payload.data) {
    throw new Error('Expo push API beklenen yanıtı döndürmedi.');
  }

  return payload.data;
};

export const sendAdminBroadcast = async ({ title, body, deeplink, sampleTokensOverride }: BroadcastPayload): Promise<BroadcastSummary> => {
  const targetTokens = sampleTokensOverride ?? (await fetchPushTokens());

  if (!targetTokens.length) {
    return {
      targetedCount: 0,
      successCount: 0,
      failureCount: 0,
      errors: [],
    };
  }

  const messagesData: Record<string, string> = {
    type: 'adminBroadcast',
    sentAt: new Date().toISOString(),
  };

  if (deeplink) {
    messagesData.deeplink = deeplink;
  }

  const chunks = chunkArray(targetTokens, MAX_MESSAGES_PER_BATCH);
  let successCount = 0;
  let failureCount = 0;
  const errors: Array<{ token: string; message: string }> = [];

  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];
    const messages: ExpoPushMessage[] = chunk.map((token) => ({
      to: token,
      sound: 'default',
      title,
      body,
      data: messagesData,
    }));

    try {
      const tickets = await postExpoPush(messages);
      tickets.forEach((ticket, index) => {
        if (ticket.status === 'ok') {
          successCount += 1;
        } else {
          failureCount += 1;
          const token = chunk[index];
          const detail = ticket.details?.error ?? ticket.message ?? 'Bilinmeyen hata';
          errors.push({ token, message: detail });
        }
      });
    } catch (error) {
      failureCount += chunk.length;
      chunk.forEach((token) => {
        errors.push({ token, message: (error as Error).message });
      });
    }

    if (i < chunks.length - 1) {
      await delay(BATCH_DELAY_MS);
    }
  }

  return {
    targetedCount: targetTokens.length,
    successCount,
    failureCount,
    errors,
  };
};
