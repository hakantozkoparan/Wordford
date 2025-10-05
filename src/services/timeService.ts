import { Timestamp, doc, getDoc, setDoc } from 'firebase/firestore';

import { db, firebaseServerTimestamp } from '@/config/firebase';

export const getServerNow = async (): Promise<Date> => {
  const ref = doc(db, 'meta', 'server-time');
  await setDoc(ref, { now: firebaseServerTimestamp() }, { merge: true });
  const snapshot = await getDoc(ref);
  const serverNow = snapshot.data()?.now as Timestamp | undefined;
  return serverNow?.toDate() ?? new Date();
};
