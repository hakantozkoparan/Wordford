import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import Animated, { FadeInUp } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

import { STORAGE_KEYS } from '@/config/appConfig';
import { colors, spacing, typography } from '@/theme';
import { PrimaryButton } from './PrimaryButton';
import { useAuth } from '@/context/AuthContext';
import { PremiumTrialModal } from './PremiumTrialModal';
import type { PremiumPlanId } from '@/types/premiumPlans';
import { PREMIUM_PLAN_LABELS } from '@/constants/premiumPlans';

const slides = [
  {
    key: 'discover',
    title: 'Kelime Evrenini Keşfet',
    description: 'Seviyelere göre düzenlenmiş binlerce kelimeyle hedef dilini hızla ileri taşı.',
    icon: 'planet',
    gradient: ['rgba(105, 89, 255, 0.85)', 'rgba(59, 226, 176, 0.6)'] as const,
  },
  {
    key: 'master',
    title: 'Ritmini Yakala',
    description: 'Enerji sistemi ve hatırlatma bildirimleri ile günlük hedeflerini kaçırma.',
    icon: 'speedometer',
    gradient: ['rgba(59, 226, 176, 0.78)', 'rgba(123, 97, 255, 0.65)'] as const,
  },
  {
    key: 'premium',
    title: 'Premium Ayrıcalıklarla Tanış',
    description: 'Planını seç ve 3 günlük deneme hediyesiyle reklamsız öğrenmeye başla.',
    icon: 'diamond',
    gradient: ['rgba(123, 97, 255, 0.85)', 'rgba(49, 206, 167, 0.65)'] as const,
  },
];

const { width } = Dimensions.get('window');

export const OnboardingExperience: React.FC = () => {
  const pagerRef = useRef<PagerView>(null);
  const { premiumStatus, startTrial, refreshPremiumStatus, refreshDailyResources } = useAuth();
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);
  const [premiumModalShown, setPremiumModalShown] = useState(false);
  const [trialLoading, setTrialLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const completed = await AsyncStorage.getItem(STORAGE_KEYS.onboardingCompleted);
        if (!completed) {
          setVisible(true);
        }
      } catch (error) {
        console.warn('Onboarding durumu okunamadı:', error);
      }
    })();
  }, []);

  useEffect(() => {
    if (visible && index === slides.length - 1 && !premiumModalShown) {
      setPremiumModalVisible(true);
      setPremiumModalShown(true);
    }
  }, [visible, index, premiumModalShown]);

  const handleComplete = async () => {
    setVisible(false);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.onboardingCompleted, 'true');
    } catch (error) {
      console.warn('Onboarding durumu kaydedilemedi:', error);
    }
  };

  const handleSkip = async () => {
    await handleComplete();
  };

  const handleNext = () => {
    const nextIndex = Math.min(index + 1, slides.length - 1);
    pagerRef.current?.setPage(nextIndex);
  };

  const handleConfirmPlan = useCallback(
    async (planId: PremiumPlanId) => {
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
        console.warn('Premium deneme başlatılamadı:', error);
      } finally {
        setTrialLoading(false);
      }
    },
    [premiumStatus.trialEligible, refreshDailyResources, refreshPremiumStatus, startTrial],
  );

  const premiumModal = useMemo(
    () => (
      <PremiumTrialModal
        visible={premiumModalVisible}
        status={premiumStatus}
        onClose={() => setPremiumModalVisible(false)}
        onConfirmPlan={handleConfirmPlan}
        loading={trialLoading}
        termsUrl="https://wordford.app/terms"
        privacyUrl="https://wordford.app/privacy"
      />
    ),
    [premiumModalVisible, premiumStatus, handleConfirmPlan, trialLoading],
  );

  if (!visible) {
    return premiumModal;
  }

  return (
    <>
      <View style={styles.overlay} pointerEvents="box-none">
        <LinearGradient
          colors={['rgba(6, 10, 32, 0.92)', 'rgba(6, 10, 32, 0.88)']}
          style={styles.linearBackdrop}
        />
        <Animated.View entering={FadeInUp.duration(320)} style={styles.container}>
          <View style={styles.headerRow}>
            <Pressable onPress={handleSkip} style={styles.skipButton} accessibilityRole="button">
              <Text style={styles.skipText}>Atla</Text>
            </Pressable>
          </View>
          <PagerView
            ref={pagerRef}
            style={styles.pager}
            initialPage={0}
            onPageSelected={(event) => setIndex(event.nativeEvent.position)}
          >
            {slides.map((slide) => (
              <View key={slide.key} style={styles.page}>
                <LinearGradient colors={slide.gradient} style={styles.card}>
                  <Animated.View entering={FadeInUp.duration(360)} style={styles.iconWrapper}>
                    <Ionicons name={slide.icon as keyof typeof Ionicons.glyphMap} size={70} color={colors.textPrimary} />
                  </Animated.View>
                  <Text style={styles.title}>{slide.title}</Text>
                  <Text style={styles.description}>{slide.description}</Text>
                </LinearGradient>
              </View>
            ))}
          </PagerView>
          <View style={styles.dotsRow}>
            {slides.map((slide, dotIndex) => (
              <View
                key={slide.key}
                style={[
                  styles.dot,
                  dotIndex === index ? styles.dotActive : null,
                ]}
              />
            ))}
          </View>
          <View style={styles.actionsRow}>
            {index < slides.length - 1 ? (
              <PrimaryButton label="Devam" onPress={handleNext} icon="arrow-forward" />
            ) : (
              <PrimaryButton label="Hadi Başlayalım" onPress={handleComplete} icon="rocket" />
            )}
          </View>
        </Animated.View>
      </View>
      {premiumModal}
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99,
  },
  linearBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    width: width - spacing.xl,
    maxWidth: 420,
    backgroundColor: 'rgba(12, 18, 41, 0.9)',
    borderRadius: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  skipButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  skipText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  pager: {
    height: 360,
  },
  page: {
    flex: 1,
  },
  card: {
    flex: 1,
    borderRadius: spacing.lg,
    padding: spacing.lg,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6, 10, 32, 0.4)',
    borderRadius: spacing.lg,
    padding: spacing.lg,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  description: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.78)',
    textAlign: 'center',
    lineHeight: 18,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotActive: {
    backgroundColor: colors.accent,
  },
  actionsRow: {
    alignItems: 'stretch',
  },
});
