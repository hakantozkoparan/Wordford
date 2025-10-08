import {
  DocumentData,
  QueryDocumentSnapshot,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { nanoid } from 'nanoid/non-secure';

import { FIREBASE_COLLECTIONS } from '@/config/appConfig';
import { db } from '@/config/firebase';
import { ContactRequest, ContactRequestStatus } from '@/types/models';

const CONTACT_COLLECTION = FIREBASE_COLLECTIONS.contactRequests;

export interface SubmitContactPayload {
  email: string;
  subject: string;
  message: string;
  fullName?: string | null;
  userId?: string | null;
  appVersion?: string | null;
  deviceId?: string | null;
}

export interface FetchContactRequestOptions {
  status?: ContactRequestStatus | 'all';
  take?: number;
}

const sanitize = (value: string) => value.trim();

const buildContactDoc = (id: string, payload: SubmitContactPayload): ContactRequest => ({
  id,
  email: sanitize(payload.email),
  subject: sanitize(payload.subject),
  message: payload.message.trim(),
  status: 'open',
  createdAt: null,
  updatedAt: null,
  userId: payload.userId ?? null,
  fullName: payload.fullName?.trim() ?? null,
  appVersion: payload.appVersion ?? null,
  deviceId: payload.deviceId ?? null,
});

export const submitContactRequest = async (rawPayload: SubmitContactPayload) => {
  const trimmedEmail = sanitize(rawPayload.email);
  const trimmedSubject = sanitize(rawPayload.subject);
  const trimmedMessage = rawPayload.message.trim();

  if (!trimmedEmail) {
    throw new Error('E-posta adresi zorunludur.');
  }

  if (!trimmedSubject) {
    throw new Error('Konu başlığı zorunludur.');
  }

  if (trimmedMessage.length < 20) {
    throw new Error('Mesajınız en az 20 karakter olmalıdır.');
  }

  const contactRef = doc(collection(db, CONTACT_COLLECTION), nanoid(16));
  const entry = buildContactDoc(contactRef.id, {
    ...rawPayload,
    email: trimmedEmail,
    subject: trimmedSubject,
    message: trimmedMessage,
  });

  const { id: _entryId, createdAt: _createdAt, updatedAt: _updatedAt, ...persistable } = entry;

  await setDoc(contactRef, {
    ...persistable,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return entry.id;
};

const mapContactSnapshot = (docSnap: QueryDocumentSnapshot<DocumentData>): ContactRequest => {
  const data = docSnap.data() as Record<string, unknown>;
  return {
    id: docSnap.id,
    email: (data.email as string) ?? '',
    subject: (data.subject as string) ?? '',
    message: (data.message as string) ?? '',
    status: (data.status as ContactRequestStatus) ?? 'open',
    createdAt: (data.createdAt as ContactRequest['createdAt']) ?? null,
    updatedAt: data.updatedAt as ContactRequest['updatedAt'],
    resolvedAt: data.resolvedAt as ContactRequest['resolvedAt'],
    userId: (data.userId as string | null | undefined) ?? null,
    fullName: (data.fullName as string | null | undefined) ?? null,
    appVersion: (data.appVersion as string | null | undefined) ?? null,
    deviceId: (data.deviceId as string | null | undefined) ?? null,
  };
};

export const fetchContactRequests = async ({ status = 'all', take = 50 }: FetchContactRequestOptions = {}) => {
  const clampedTake = Math.max(1, Math.min(take ?? 50, 500));
  const baseQuery = query(
    collection(db, CONTACT_COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(clampedTake),
  );

  const snapshot = await getDocs(baseQuery);
  const items = snapshot.docs
    .map((docSnap) => mapContactSnapshot(docSnap))
    .filter((item) => (status === 'all' ? true : item.status === status));

  return items;
};

export const updateContactRequestStatus = async (id: string, status: ContactRequestStatus) => {
  const docRef = doc(db, CONTACT_COLLECTION, id);
  await updateDoc(docRef, {
    status,
    resolvedAt: status === 'resolved' ? serverTimestamp() : null,
    updatedAt: serverTimestamp(),
  });
};
