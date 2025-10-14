import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { AuthError, User, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';

import { FIREBASE_COLLECTIONS } from '@/config/appConfig';
import { auth, db } from '@/config/firebase';
import { deleteUserAccount, loginUser, logoutUser, parseAuthError, registerUser } from '@/services/authService';
import { consumeEnergy, consumeRevealToken, ensureDailyResources } from '@/services/creditService';
import {
  consumeGuestEnergy,
  consumeGuestReveal,
  ensureGuestResources,
  type GuestResources,
} from '@/services/guestResourceService';
import { ensureGuestStats, type GuestStats } from '@/services/guestStatsService';
import { updateDailyStreak } from '@/services/userStatsService';
import { getDeviceMetadata } from '@/utils/device';
import { UserProfile } from '@/types/models';
import {
  GuestPremiumState,
  ensureGuestPremiumState,
  startGuestPremiumTrial,
} from '@/services/guestPremiumService';
import { PremiumStatus, getPremiumStatus } from '@/utils/subscription';
import { startPremiumTrial } from '@/services/premiumService';

interface RegisterForm {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
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
  deleteAccount: () => Promise<void>;
  refreshDailyResources: () => Promise<void>;
  spendEnergy: (amount?: number) => Promise<void>;
  spendRevealToken: () => Promise<void>;
  guestResources: GuestResources | null;
  guestStats: GuestStats | null;
  refreshGuestStats: () => Promise<void>;
  guestPremium: GuestPremiumState | null;
  refreshPremiumStatus: () => Promise<void>;
  premiumStatus: PremiumStatus;
  isPremium: boolean;
  startTrial: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestResources, setGuestResourcesState] = useState<GuestResources | null>(null);
  const [guestStats, setGuestStatsState] = useState<GuestStats | null>(null);
  const [guestPremium, setGuestPremiumState] = useState<GuestPremiumState | null>(null);

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
      (async () => {
        try {
          const premiumState = await ensureGuestPremiumState();
          setGuestPremiumState(premiumState);
          const [resources, stats] = await Promise.all([
            ensureGuestResources(premiumState),
            ensureGuestStats(),
          ]);
          setGuestResourcesState(resources);
          setGuestStatsState(stats);
        } catch (err) {
          console.warn('Misafir verileri yüklenemedi:', err);
          setGuestResourcesState(null);
          setGuestStatsState(null);
          setGuestPremiumState(null);
        }
      })();
      return;
    }

    setGuestResourcesState(null);
    setGuestStatsState(null);
    setGuestPremiumState(null);
    const userDoc = doc(db, FIREBASE_COLLECTIONS.users, firebaseUser.uid);
    const unsubscribe = onSnapshot(userDoc, async (snapshot) => {
      if (!snapshot.exists()) {
        return;
      }
      const data = snapshot.data() as UserProfile;
      setProfile(data);
      await ensureDailyResources(firebaseUser.uid);
    });

    return unsubscribe;
  }, [firebaseUser]);

  useEffect(() => {
    if (!firebaseUser) {
      return;
    }

    updateDailyStreak(firebaseUser.uid).catch((error) => {
      console.warn('Günlük seri güncellenemedi:', error);
    });
  }, [firebaseUser?.uid]);

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
        captchaResultValid: form.captchaValid,
        device,
      });
    } catch (err) {
      console.error('Kayıt hatası:', err);
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

  const deleteAccount = useCallback(async () => {
    if (!firebaseUser) {
      return;
    }

    const lastSignInTime = firebaseUser.metadata?.lastSignInTime
      ? new Date(firebaseUser.metadata.lastSignInTime).getTime()
      : null;
    const requiresRecentLogin = !lastSignInTime || Date.now() - lastSignInTime > 5 * 60 * 1000;

    if (requiresRecentLogin) {
      const message =
        'Güvenlik nedeniyle hesap silme işlemini tamamlayabilmek için lütfen hesabınıza tekrar giriş yapın.';
      setError(message);
      Alert.alert(
        'Tekrar giriş yapmanız gerekiyor',
        `${message}\n\nProfil ekranından "Giriş Yap" seçeneğini kullanarak yeniden oturum açtıktan sonra hesabınızı silebilirsiniz.`,
      );
      await logoutUser();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await deleteUserAccount(firebaseUser);
      Alert.alert('Hesap Silindi', 'Hesabınız kalıcı olarak silindi.');
    } catch (err) {
      const authError = err as AuthError;
      if (authError?.code === 'auth/requires-recent-login') {
        console.warn('Hesap silme işlemi için yeniden oturum açılması gerekiyor.');
        const message =
          'Güvenlik nedeniyle hesap silme işlemini tamamlayabilmek için lütfen hesabınıza tekrar giriş yapın.';
        await logoutUser();
        setError(message);
        Alert.alert(
          'Tekrar giriş yapmanız gerekiyor',
          `${message}\n\nProfil ekranından "Giriş Yap" seçeneğini kullanarak yeniden oturum açtıktan sonra hesabınızı silebilirsiniz.`,
        );
        return;
      }
      console.error('Hesap silme hatası:', err);
      const message = parseAuthError(err);
      setError(message);
      Alert.alert('Hesap silinemedi', message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [firebaseUser]);

  const refreshDailyResources = useCallback(async () => {
    if (!firebaseUser) {
      const premiumState = await ensureGuestPremiumState();
      setGuestPremiumState(premiumState);
      const refreshed = await ensureGuestResources(premiumState);
      setGuestResourcesState(refreshed);
      return;
    }
    await ensureDailyResources(firebaseUser.uid);
  }, [firebaseUser]);

  const refreshGuestStats = useCallback(async () => {
    if (firebaseUser) {
      return;
    }
    const stats = await ensureGuestStats();
    setGuestStatsState(stats);
  }, [firebaseUser]);

  const refreshPremiumStatus = useCallback(async () => {
    if (firebaseUser) {
      return;
    }
    const premium = await ensureGuestPremiumState();
    setGuestPremiumState(premium);
  }, [firebaseUser]);

  const startTrial = useCallback(async () => {
    if (firebaseUser) {
      await startPremiumTrial(firebaseUser.uid);
    } else {
      const updated = await startGuestPremiumTrial();
      setGuestPremiumState(updated);
    }
    await refreshDailyResources();
    if (!firebaseUser) {
      const ensured = await ensureGuestPremiumState();
      setGuestPremiumState(ensured);
    }
  }, [firebaseUser, refreshDailyResources]);

  const premiumStatus = useMemo(
    () => getPremiumStatus(profile, guestPremium),
    [profile, guestPremium],
  );

  const isPremium = premiumStatus.isPremium;

  const spendEnergy = useCallback(
    async (amount = 1) => {
      if (!firebaseUser) {
        const updated = await consumeGuestEnergy(amount ?? 1);
        setGuestResourcesState(updated);
        return;
      }
      await consumeEnergy(firebaseUser.uid, amount);
    },
    [firebaseUser],
  );

  const spendRevealToken = useCallback(async () => {
    if (!firebaseUser) {
      const updated = await consumeGuestReveal();
      setGuestResourcesState(updated);
      return;
    }
    await consumeRevealToken(firebaseUser.uid);
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
      deleteAccount,
      refreshDailyResources,
      spendEnergy,
      spendRevealToken,
      guestResources,
      guestStats,
      refreshGuestStats,
      guestPremium,
      refreshPremiumStatus,
      premiumStatus,
      isPremium,
      startTrial,
    }),
    [
      firebaseUser,
      profile,
      initializing,
      loading,
      error,
      register,
      login,
      signOut,
      deleteAccount,
      refreshDailyResources,
      spendEnergy,
      spendRevealToken,
      guestResources,
      guestStats,
      refreshGuestStats,
      guestPremium,
      refreshPremiumStatus,
      premiumStatus,
      isPremium,
      startTrial,
    ],
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
