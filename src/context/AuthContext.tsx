import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';

import { DAILY_FREE_CREDITS, DAILY_HINT_TOKENS, FIREBASE_COLLECTIONS } from '@/config/appConfig';
import { auth, db } from '@/config/firebase';
import { loginUser, logoutUser, parseAuthError, registerUser } from '@/services/authService';
import { consumeCredit, consumeHintToken, ensureDailyCredits } from '@/services/creditService';
import { getDeviceMetadata } from '@/utils/device';
import { UserProfile } from '@/types/models';

interface RegisterForm {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  captchaValid: boolean;
}

interface LoginForm {
  email: string;
  password: string;
}

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserProfile | null;
  initializing: boolean;
  loading: boolean;
  error: string | null;
  register: (form: RegisterForm) => Promise<void>;
  login: (form: LoginForm) => Promise<void>;
  signOut: () => Promise<void>;
  refreshDailyCredits: () => Promise<void>;
  spendCredit: (amount?: number) => Promise<void>;
  spendHintToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!firebaseUser) {
      setProfile(null);
      return;
    }

    const userDoc = doc(db, FIREBASE_COLLECTIONS.users, firebaseUser.uid);
    const unsubscribe = onSnapshot(userDoc, async (snapshot) => {
      if (!snapshot.exists()) {
        return;
      }
      const data = snapshot.data() as UserProfile;
      setProfile(data);
      await ensureDailyCredits(firebaseUser.uid);
    });

    return unsubscribe;
  }, [firebaseUser]);

  const register = useCallback(async (form: RegisterForm) => {
    setLoading(true);
    setError(null);
    try {
      const device = await getDeviceMetadata();
      await registerUser({
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        birthDate: form.birthDate,
        captchaResultValid: form.captchaValid,
        device,
      });
    } catch (err) {
      const message = parseAuthError(err);
      setError(message);
      Alert.alert('Kayıt başarısız', message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (form: LoginForm) => {
    setLoading(true);
    setError(null);
    try {
      const device = await getDeviceMetadata();
      await loginUser({
        email: form.email,
        password: form.password,
        device,
      });
      if (auth.currentUser) {
        const ref = doc(db, FIREBASE_COLLECTIONS.users, auth.currentUser.uid);
        await updateDoc(ref, {
          lastLoginAt: serverTimestamp(),
        });
      }
    } catch (err) {
      const message = parseAuthError(err);
      setError(message);
      Alert.alert('Giriş başarısız', message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await logoutUser();
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshDailyCredits = useCallback(async () => {
    if (!firebaseUser) return;
    await ensureDailyCredits(firebaseUser.uid);
  }, [firebaseUser]);

  const spendCredit = useCallback(
    async (amount = 1) => {
      if (!firebaseUser) return;
      await consumeCredit(firebaseUser.uid, amount);
    },
    [firebaseUser],
  );

  const spendHintToken = useCallback(async () => {
    if (!firebaseUser) return;
    await consumeHintToken(firebaseUser.uid);
  }, [firebaseUser]);

  const value = useMemo(
    () => ({
      firebaseUser,
      profile,
      initializing,
      loading,
      error,
      register,
      login,
      signOut,
      refreshDailyCredits,
      spendCredit,
      spendHintToken,
    }),
    [firebaseUser, profile, initializing, loading, error, register, login, signOut, refreshDailyCredits, spendCredit, spendHintToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth yalnızca AuthProvider içinde kullanılabilir.');
  }
  return context;
};
