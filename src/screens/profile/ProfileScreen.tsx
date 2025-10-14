import { useMemo, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

const TERMS_URL = 'https://wordford.app/terms';
const PRIVACY_URL = 'https://wordford.app/privacy';

import { GradientBackground } from '@/components/GradientBackground';
import { ScreenContainer } from '@/components/ScreenContainer';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ResourcePill } from '@/components/ResourcePill';
import { PremiumTrialModal } from '@/components/PremiumTrialModal';
import { colors, spacing, typography } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { useWords } from '@/context/WordContext';
import { useRewards } from '@/context/RewardContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '@/navigation/types';
import { LinearGradient } from 'expo-linear-gradient';
import type { PremiumPlanId } from '@/types/premiumPlans';
import { PREMIUM_PLAN_LABELS } from '@/constants/premiumPlans';

export const ProfileScreen: React.FC = () => {
  const {
    profile,
    signOut,
    firebaseUser,
    guestResources,
    deleteAccount,
    loading,
    refreshDailyResources,
    premiumStatus,
    isPremium,
    startTrial,
    refreshPremiumStatus,
  } = useAuth();
  const { favorites, knownWords } = useWords();
  const { openRewardsModal } = useRewards();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const isAuthenticated = Boolean(firebaseUser);
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);
  const [trialLoading, setTrialLoading] = useState(false);

  const totalEnergy = firebaseUser
    ? (profile?.dailyEnergy ?? 0) + (profile?.bonusEnergy ?? 0)
    : (guestResources?.dailyEnergy ?? 0) + (guestResources?.bonusEnergy ?? 0);
  const totalReveal = firebaseUser
    ? (profile?.dailyRevealTokens ?? 0) + (profile?.bonusRevealTokens ?? 0)
    : (guestResources?.dailyRevealTokens ?? 0) + (guestResources?.bonusRevealTokens ?? 0);

  const stats = useMemo(
    () => [
      { label: 'Favori Kelimeler', value: favorites.length },
      { label: 'Bildiklerim', value: knownWords.length },
    ],
    [favorites.length, knownWords.length],
  );
  const displayName = useMemo(() => {
    const fullName = `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim();
    if (fullName.length > 0) {
      return fullName;
    }
    return profile?.email ?? firebaseUser?.email ?? 'Misafir Kullanıcı';
  }, [profile?.firstName, profile?.lastName, profile?.email, firebaseUser?.email]);

  const displayEmail = useMemo(
    () => profile?.email ?? firebaseUser?.email ?? 'Giriş yapmadın',
    [profile?.email, firebaseUser?.email],
  );

  const initials = useMemo(() => {
    const matches = displayName.match(/\b[\p{L}\p{N}]/gu);
    if (matches && matches.length > 0) {
      return matches.slice(0, 2).join('').toUpperCase();
    }
    if (displayEmail.length > 0) {
      return displayEmail.charAt(0).toUpperCase();
    }
    return 'K';
  }, [displayName, displayEmail]);

  const headerTagline = isAuthenticated
    ? 'Öğrenme yolculuğun burada devam ediyor.'
    : 'İlerlemeni kaydetmek için giriş yap.';

  const premiumDescription = isPremium
    ? 'Premium ayrıcalıkların açık.'
    : premiumStatus.trialEligible
    ? 'Planını seç; 3 günlük deneme hediyesiyle reklamsız öğrenmeye başla.'
    : 'Planını seçerek premiuma geç. Deneme hakkın kullanıldıysa paket hemen aktive olur.';

  const premiumBadgeIcon = isPremium ? ('diamond' as const) : ('sparkles' as const);
  const premiumCTAIcon = isPremium ? ('shield-checkmark' as const) : ('rocket' as const);
  const premiumCTALabel = isPremium ? 'Premium Detayları' : 'Premium Ol';
  const premiumCountdownLabel = isPremium
    ? premiumStatus.remainingLabel
      ? `Kalan süre: ${premiumStatus.remainingLabel}`
      : 'Premium deneyimin aktif'
    : premiumStatus.trialEligible
    ? '3 günlük deneme hediyesi seni bekliyor'
    : 'Plan seçerek premium avantajlarını aç';

  const onLogout = async () => {
    if (!isAuthenticated) return;
    await signOut();
  };

  const onAdminPress = () => {
    navigation.navigate('AdminWordManager');
  };

  const onLoginPress = () => {
    navigation.navigate('Login');
  };

  const onRegisterPress = () => {
    navigation.navigate('Register');
  };

  const onContactPress = () => {
    navigation.navigate('Contact');
  };

  const handleOpenTerms = () => {
    Linking.openURL(TERMS_URL).catch(() => {
      Alert.alert('Bağlantı açılamadı', 'Lütfen daha sonra tekrar dene.');
    });
  };

  const handleOpenPrivacy = () => {
    Linking.openURL(PRIVACY_URL).catch(() => {
      Alert.alert('Bağlantı açılamadı', 'Lütfen daha sonra tekrar dene.');
    });
  };

  const handleConfirmPlan = async (planId: PremiumPlanId) => {
    if (!premiumStatus.trialEligible) {
      setPremiumModalVisible(false);
      Alert.alert(
        'Plan seçimi yakında',
        `${PREMIUM_PLAN_LABELS[planId]} planı satın alma akışı aktif olduğunda doğrudan başlatılacak. Deneme hakkını daha önce kullandın.`,
      );
      return;
    }

    setTrialLoading(true);
    try {
      await startTrial();
      await refreshPremiumStatus();
      await refreshDailyResources();
      setPremiumModalVisible(false);
      Alert.alert(
        'Premium hazır',
        `${PREMIUM_PLAN_LABELS[planId]} planın 3 günlük deneme hediyesiyle başladı. Plan satın alma adımı yakında aktifleştirilecek.`,
      );
    } catch (error) {
      const message = (error as Error)?.message ?? 'Premium deneme başlatılamadı.';
      Alert.alert('İşlem başarısız', message);
    } finally {
      setTrialLoading(false);
    }
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Hesabı Sil',
      'Hesabınızı kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Evet, sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
            } catch {
              // Hata mesajı AuthContext tarafından gösteriliyor.
            }
          },
        },
      ],
    );
  };

  return (
    <GradientBackground paddingTop={spacing.xl}>
      <ScreenContainer style={styles.container} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <LinearGradient
            colors={['rgba(123, 97, 255, 0.35)', 'rgba(90, 227, 180, 0.18)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerCard}
          >
            <Text style={styles.headerTitle}>Profil</Text>
            <View style={styles.headerRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={styles.headerInfo}>
                <Text style={styles.headerName}>{displayName}</Text>
                <Text style={styles.headerEmail}>{displayEmail}</Text>
                <Text style={styles.headerTagline}>{headerTagline}</Text>
              </View>
            </View>
            <View style={styles.headerStatsRow}>
              {stats.map((item) => (
                <View style={styles.statCard} key={item.label}>
                  <Text style={styles.statValue}>{item.value}</Text>
                  <Text style={styles.statLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
            <View style={styles.resourceRow}>
              <ResourcePill label="Enerji" value={totalEnergy} />
              <ResourcePill label="Cevabı Göster" value={totalReveal} />
            </View>
            <PrimaryButton
              label="Kredi Kazan"
              onPress={() => openRewardsModal()}
              size="compact"
              style={styles.rewardButton}
              icon="gift"
            />
          </LinearGradient>

          <LinearGradient
            colors={['rgba(104, 90, 255, 0.28)', 'rgba(49, 206, 167, 0.18)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.premiumCard}
          >
            <View style={styles.premiumHeader}>
              <View style={styles.premiumBadge}>
                <Ionicons name={premiumBadgeIcon} size={26} color={colors.textPrimary} />
              </View>
              <View style={styles.premiumTexts}>
                <Text style={styles.premiumTitle}>{isPremium ? 'Premium Aktif' : 'Wordford Premium'}</Text>
                <Text style={styles.premiumDescription}>{premiumDescription}</Text>
              </View>
            </View>
            <View style={styles.premiumFooter}>
              <Text style={styles.premiumCountdown}>{premiumCountdownLabel}</Text>
              <PrimaryButton
                label={premiumCTALabel}
                onPress={() => setPremiumModalVisible(true)}
                size="compact"
                variant={isPremium ? 'success' : 'primary'}
                style={styles.premiumActionButton}
                icon={premiumCTAIcon}
              />
            </View>
          </LinearGradient>

          <View style={styles.legalLinks}>
            <PrimaryButton
              label="Kullanım Şartları"
              onPress={handleOpenTerms}
              variant="ghost"
              size="compact"
              icon="document-text-outline"
            />
            <PrimaryButton
              label="Gizlilik Politikası"
              onPress={handleOpenPrivacy}
              variant="ghost"
              size="compact"
              icon="shield-checkmark-outline"
            />
          </View>

          {isAuthenticated ? (
            <>
              <PrimaryButton
                label="İletişim"
                onPress={onContactPress}
                variant="secondary"
                size="compact"
                style={styles.compactButton}
                icon="mail-outline"
                iconColor={colors.accent}
              />
              <PrimaryButton
                label="Çıkış Yap"
                onPress={onLogout}
                variant="danger"
                size="compact"
                style={styles.compactButton}
              />

              {profile?.role === 'admin' ? (
                <PrimaryButton
                  label="Admin"
                  onPress={() => navigation.navigate('AdminPanel')}
                  variant="ghost"
                  size="compact"
                />
              ) : null}

              <View style={styles.deleteSection}>
                <Text style={styles.deleteTitle}>Hesabını Sil</Text>
                <Text style={styles.deleteDescription}>
                  Hesabını silersen tüm verilerin kalıcı olarak kaldırılır ve geri alınamaz.
                </Text>
                <PrimaryButton
                  label="Hesabımı Sil"
                  onPress={confirmDeleteAccount}
                  variant="danger"
                  style={styles.deleteButton}
                  loading={loading}
                />
              </View>
            </>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Misafir Modu</Text>
              <Text style={styles.sectionDescription}>
                Giriş yapmadan seviyeleri keşfedebilirsin. İlerlemeni kaydetmek ve cihazlar arasında senkronize etmek için giriş yap veya kayıt ol.
              </Text>
              <PrimaryButton
                label="İletişim"
                onPress={onContactPress}
                variant="ghost"
                icon="mail-outline"
                iconColor={colors.textSecondary}
              />
              <View style={styles.authButtonGroup}>
                <PrimaryButton label="Giriş Yap" onPress={onLoginPress} />
                <PrimaryButton label="Kayıt Ol" onPress={onRegisterPress} variant="secondary" />
              </View>
            </View>
          )}
        </ScrollView>
      </ScreenContainer>
      <PremiumTrialModal
        visible={premiumModalVisible}
        status={premiumStatus}
        onClose={() => setPremiumModalVisible(false)}
        onConfirmPlan={handleConfirmPlan}
        loading={trialLoading}
        termsUrl={TERMS_URL}
        privacyUrl={PRIVACY_URL}
      />
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 0,
  },
  scrollContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  headerCard: {
    borderRadius: spacing.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    gap: spacing.lg,
  },
  headerTitle: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(12, 18, 41, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.title,
    color: colors.textPrimary,
  },
  headerInfo: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  headerName: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  headerEmail: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  headerTagline: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.7)',
  },
  headerStatsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  resourceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  rewardButton: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  legalLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'flex-start',
  },
  premiumCard: {
    borderRadius: spacing.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    gap: spacing.md,
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  premiumBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(12, 18, 41, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumTexts: {
    flex: 1,
    gap: spacing.xs,
  },
  premiumTitle: {
    ...typography.title,
    color: colors.textPrimary,
  },
  premiumDescription: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.78)',
    lineHeight: 18,
  },
  premiumFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  premiumCountdown: {
    ...typography.caption,
    color: colors.accent,
    flexShrink: 1,
  },
  premiumActionButton: {
    minWidth: 160,
    flexGrow: 0,
  },
  statCard: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(12, 18, 41, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'rgba(12, 18, 41, 0.55)',
    borderRadius: spacing.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.title,
    color: colors.textPrimary,
  },
  sectionDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  value: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  statList: {
    gap: spacing.sm,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  compactButton: {
    marginTop: spacing.sm,
  },
  authButtonGroup: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  deleteSection: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.35)',
    backgroundColor: 'rgba(255, 107, 107, 0.08)',
  },
  deleteTitle: {
    ...typography.title,
    color: colors.danger,
  },
  deleteDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  deleteButton: {
    marginTop: spacing.xs,
  },
});
