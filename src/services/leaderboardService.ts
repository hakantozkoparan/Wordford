import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  QuerySnapshot,
  CollectionReference,
  where,
} from 'firebase/firestore';

import { FIREBASE_COLLECTIONS } from '@/config/appConfig';
import { db } from '@/config/firebase';
import { UserProfile } from '@/types/models';
import { toDate } from '@/utils/datetime';

export interface LeaderboardEntry {
  id: string;
  firstName: string;
  lastName?: string;
  totalWords: number;
  updatedAt: Date | null;
}

const buildLeaderboardEntries = (snapshot: QuerySnapshot<UserProfile>): LeaderboardEntry[] =>
  snapshot.docs
    .map((docSnap) => {
      const data = docSnap.data();
      const totalWords = Math.max(data.totalWordsLearned ?? 0, 0);
      return {
        id: docSnap.id,
        firstName: data.firstName,
        lastName: data.lastName,
        totalWords,
        updatedAt: toDate(data.totalWordsUpdatedAt ?? null),
      } satisfies LeaderboardEntry;
    })
    .filter((entry) => entry.firstName?.trim().length > 0 || entry.totalWords > 0);

const createLeaderboardQuery = (maxResults = 100) => {
  const usersRef = collection(db, FIREBASE_COLLECTIONS.users) as CollectionReference<UserProfile>;

  return query(
    usersRef,
    where('role', '==', 'member'),
    orderBy('totalWordsLearned', 'desc'),
    orderBy('totalWordsUpdatedAt', 'asc'),
    limit(maxResults),
  );
};

export const subscribeLeaderboard = (
  onChange: (entries: LeaderboardEntry[]) => void,
  onError?: (error: Error) => void,
  maxResults = 100,
) => {
  const leaderboardQuery = createLeaderboardQuery(maxResults);

  return onSnapshot(
    leaderboardQuery,
    (snapshot) => {
      const entries = buildLeaderboardEntries(snapshot as QuerySnapshot<UserProfile>);
      onChange(entries);
    },
    (error) => {
      if (onError) {
        onError(error as Error);
      } else {
        console.warn('Leaderboard subscription failed', error);
      }
    },
  );
};

export const fetchLeaderboard = async (maxResults = 100): Promise<LeaderboardEntry[]> => {
  const leaderboardQuery = createLeaderboardQuery(maxResults);
  const { getDocs } = await import('firebase/firestore');
  const snapshot = await getDocs(leaderboardQuery);
  return buildLeaderboardEntries(snapshot as QuerySnapshot<UserProfile>);
};

export const getUserRank = async (userId: string): Promise<{ rank: number; totalWords: number } | null> => {
  try {
    const usersRef = collection(db, FIREBASE_COLLECTIONS.users) as CollectionReference<UserProfile>;
    
    // Get user's current score
    const { doc, getDoc, getDocs } = await import('firebase/firestore');
    const userDoc = await getDoc(doc(db, FIREBASE_COLLECTIONS.users, userId));
    
    if (!userDoc.exists()) {
      return null;
    }
    
    const userData = userDoc.data() as UserProfile;
    const userScore = userData.totalWordsLearned ?? 0;
    
    // Count users with higher scores
    const higherScoresQuery = query(
      usersRef,
      where('role', '==', 'member'),
      where('totalWordsLearned', '>', userScore),
    );
    
    const higherScoresSnapshot = await getDocs(higherScoresQuery);
    const rank = higherScoresSnapshot.size + 1;
    
    return {
      rank,
      totalWords: userScore,
    };
  } catch (error) {
    console.error('Error getting user rank:', error);
    return null;
  }
};
