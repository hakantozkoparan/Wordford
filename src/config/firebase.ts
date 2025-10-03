import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, serverTimestamp } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyBsYDy1xbmA1kSw5JvKZGxYI3WmWpITCyw",
  authDomain: "wordford-8e550.firebaseapp.com",
  projectId: "wordford-8e550",
  storageBucket: "wordford-8e550.firebasestorage.app",
  messagingSenderId: "16850007310",
  appId: "1:16850007310:web:667da99e7d987b9cec935f",
  measurementId: "G-1MYQWSNE5Q"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const firebaseServerTimestamp = serverTimestamp;
