import { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, spacing, typography } from '@/theme';
import { PremiumStatus } from '@/utils/subscription';
import { PrimaryButton } from './PrimaryButton';
import { PREMIUM_PLAN_OPTIONS } from '@/constants/premiumPlans';
import type { PremiumPlanId } from '@/types/premiumPlans';

export type { PremiumPlanId } from '@/types/premiumPlans';

interface PremiumTrialModalProps {
  visible: boolean;
  status: PremiumStatus;
  onClose: () => void;
  onConfirmPlan: (planId: PremiumPlanId) => void;
  loading?: boolean;
  termsUrl?: string;
  privacyUrl?: string;
}

const featureList = [
  { icon: 'flash', text: 'Günlük 40 enerji yenilemesi' },
  { icon: 'eye', text: 'Günlük 10 "Cevabı Göster" hakkı' },
  { icon: 'sparkles', text: 'Tüm banner ve otomatik reklamlara veda' },
  { icon: 'gift', text: 'İsteğe bağlı kredi görevleriyle ekstra ödül' },
  { icon: 'stats-chart', text: 'İlerleme istatistiklerinde premium rozet' },
  { icon: 'shield-checkmark', text: 'Öncelikli destek ve yeni özelliklere erken erişim' },
];

export const PremiumTrialModal: React.FC<PremiumTrialModalProps> = ({
  visible,
  status,
  onClose,
  onConfirmPlan,
  loading,
  termsUrl,
  privacyUrl,
}) => {
  const rotation = useSharedValue(0);
  const pulse = useSharedValue(1);
  const cardProgress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 16000, easing: Easing.linear }),
        -1,
      );
      pulse.value = withRepeat(
        withTiming(1.08, { duration: 4200, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
      cardProgress.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) });
    } else {
      rotation.value = 0;
      pulse.value = 1;
      cardProgress.value = 0;
    }
  }, [visible, rotation, pulse, cardProgress]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardProgress.value,
    transform: [
      {
        translateY: (1 - cardProgress.value) * 24,
      },
    ],
  }));

  const defaultPlanId = PREMIUM_PLAN_OPTIONS[0].id;
  const [selectedPlan, setSelectedPlan] = useState<PremiumPlanId>(defaultPlanId);

  useEffect(() => {
    if (visible) {
      setSelectedPlan(defaultPlanId);
    }
  }, [visible, defaultPlanId]);

  const windowMetrics = Dimensions.get('window');
  const cardWidth = Math.min(Math.max(windowMetrics.width - spacing.lg * 2, 280), 420);
  const cardMaxHeight = Math.min(Math.max(windowMetrics.height - spacing.xl * 2, 460), 720);
  const scrollMaxHeight = Math.max(cardMaxHeight - spacing.xl * 2, 320);

  const title = status.isPremium
    ? status.isTrial
      ? 'Premium Denemen Aktif'
      : 'Premium Üyelik Aktif'
    : 'Wordford Premium';

  const subtitle = status.isPremium
    ? status.remainingLabel
      ? `Kalan süre: ${status.remainingLabel}`
      : 'Premium ayrıcalıkların açık.'
    : status.trialEligible
    ? '1, 3 veya 6 aylık planını seç; 3 günlük deneme hediyesiyle başlayıp ardından seçtiğin pakete devam et.'
    : 'Planını seçerek premiuma geç. Deneme hakkın kullanıldıysa paket satın alma adımından sonra hemen aktive olur.';

  const planSubheaderText = status.trialEligible
    ? 'Tüm planlar 3 günlük deneme ile başlar.'
    : 'Deneme hakkın kullanıldı; planı seçtiğinde doğrudan aktive olacak.';

  const planBenefitText = status.trialEligible
    ? '3 gün ücretsiz deneme hediyesi'
    : 'Deneme hakkın dolu, plan hemen aktive olur';

  const planFootnoteText = status.trialEligible
    ? 'Deneme süresi içinde iptal edersen ücret yansıtılmaz. Devam edersen seçtiğin süre boyunca premium kalırsın.'
    : 'Deneme hakkın dolu. Satın alma adımı aktif olduğunda planın hemen başlatılacak.';

  const handlePlanCardPress = (planId: PremiumPlanId) => {
    setSelectedPlan(planId);
  };

  const handleConfirm = () => {
    if (!selectedPlan) {
      Alert.alert('Plan seç', 'Premiuma geçmek için lütfen bir plan seç.');
      return;
    }
    onConfirmPlan(selectedPlan);
  };

  const openExternal = async (url?: string) => {
    if (!url) {
      return;
    }
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Bağlantı açılamadı', 'Lütfen internet bağlantını kontrol et ve tekrar dene.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" />
        <Animated.View
          style={[styles.cardContainer, cardStyle, { width: cardWidth, maxHeight: cardMaxHeight }]}
        >
          <LinearGradient
            colors={['rgba(105, 89, 255, 0.95)', 'rgba(59, 226, 176, 0.9)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.gradient, { maxHeight: cardMaxHeight }]}
          >
            <Pressable style={styles.closeButton} onPress={onClose} accessibilityRole="button">
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </Pressable>
            <View style={styles.decorLayer} pointerEvents="none">
              <Animated.View style={[styles.glowOrb, glowStyle]}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.25)', 'rgba(123,97,255,0.05)']}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
              <Animated.View style={[styles.pulseRing, pulseStyle]} />
            </View>
            <ScrollView
              style={[styles.scrollContainer, { maxHeight: scrollMaxHeight }]}
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.iconBadge}>
                <Ionicons name="diamond" size={30} color={colors.textPrimary} />
              </View>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
              <View style={styles.splitRow}>
                <View style={styles.perkCard}>
                  <Ionicons name="trophy" size={26} color={colors.accent} />
                  <Text style={styles.perkTitle}>Öğrenme Hızını Katla</Text>
                  <Text style={styles.perkBody}>
                    Çift enerji ve daha fazla "Cevabı Göster" hakkı ile seviye atlamak çok daha kolay.
                  </Text>
                </View>
                <View style={styles.perkCard}>
                  <Ionicons name="sparkles" size={26} color={colors.warning} />
                  <Text style={styles.perkTitle}>Reklamsız Deneyim</Text>
                  <Text style={styles.perkBody}>
                    Banner, otomatik reklam ve bölünmeler olmadan, tamamen kelimelerine odaklan.
                  </Text>
                </View>
              </View>
              <View style={styles.featureList}>
                {featureList.map((feature) => (
                  <View key={feature.icon} style={styles.featureItem}>
                    <Ionicons name={feature.icon as keyof typeof Ionicons.glyphMap} size={20} color={colors.textPrimary} />
                    <Text style={styles.featureText}>{feature.text}</Text>
                  </View>
                ))}
              </View>
              {!status.isPremium ? (
                <>
                  <View style={styles.planHeaderRow}>
                    <Text style={styles.planHeader}>Planını Seç</Text>
                    <Text style={styles.planSubheader}>{planSubheaderText}</Text>
                  </View>
                  <View style={styles.planList}>
                    {PREMIUM_PLAN_OPTIONS.map((plan) => {
                      const isSelected = selectedPlan === plan.id;
                      return (
                        <Pressable
                          key={plan.id}
                          onPress={() => handlePlanCardPress(plan.id)}
                          style={[styles.planCard, isSelected && styles.planCardSelected]}
                          accessibilityRole="button"
                        >
                          <View style={styles.planCardHeader}>
                            <Text style={styles.planTitle}>{plan.title}</Text>
                            <Text style={styles.planPrice}>{plan.price}</Text>
                          </View>
                          <Text style={styles.planDescription}>{plan.description}</Text>
                          <View style={styles.planMetaRow}>
                            <Ionicons
                              name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                              size={18}
                              color={isSelected ? colors.accent : 'rgba(255,255,255,0.65)'}
                            />
                            <Text style={styles.planMetaText}>{planBenefitText}</Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Text style={styles.planFootnote}>{planFootnoteText}</Text>
                </>
              ) : (
                <View style={styles.premiumBanner}>
                  <Ionicons name="ribbon" size={22} color={colors.accent} />
                  <Text style={styles.premiumBannerText}>
                    Premium aboneliğin aktif. Süren dolduğunda yeniden paket seçebilirsin.
                  </Text>
                </View>
              )}
              <View style={styles.actions}>
                {status.isPremium ? (
                  <PrimaryButton
                    label="Premium aktif"
                    onPress={onClose}
                    variant="success"
                    icon="shield-checkmark"
                  />
                ) : (
                  <>
                    <PrimaryButton
                      label="Premium Ol"
                      onPress={handleConfirm}
                      loading={loading}
                      icon="rocket"
                      disabled={loading}
                      style={styles.primaryAction}
                    />
                    <PrimaryButton
                      label="Daha sonra"
                      onPress={onClose}
                      variant="ghost"
                      size="compact"
                      style={styles.secondaryAction}
                    />
                  </>
                )}
              </View>
              <View style={styles.linksRow}>
                <Pressable onPress={() => openExternal(termsUrl)}>
                  <Text style={styles.linkText}>Kullanım Şartları</Text>
                </Pressable>
                <View style={styles.separator} />
                <Pressable onPress={() => openExternal(privacyUrl)}>
                  <Text style={styles.linkText}>Gizlilik Politikası</Text>
                </Pressable>
              </View>
            </ScrollView>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(4, 6, 18, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  cardContainer: {
    borderRadius: spacing.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
    alignSelf: 'center',
  },
  gradient: {
    padding: spacing.xl,
    borderRadius: spacing.xl,
    overflow: 'hidden',
    width: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(6, 10, 32, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  decorLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    flexGrow: 0,
  },
  glowOrb: {
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.35,
  },
  pulseRing: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    opacity: 0.5,
  },
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  iconBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(6, 10, 32, 0.55)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  title: {
    ...typography.headline,
    fontSize: 32,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 20,
  },
  splitRow: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  perkCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: 'rgba(6, 10, 32, 0.4)',
    borderRadius: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    padding: spacing.md,
    gap: spacing.sm,
  },
  perkTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  perkBody: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 18,
  },
  featureList: {
    gap: spacing.sm,
    backgroundColor: 'rgba(6, 10, 32, 0.35)',
    borderRadius: spacing.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureText: {
    ...typography.subtitle,
    color: colors.textPrimary,
    flex: 1,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  secondaryAction: {
    alignSelf: 'flex-start',
  },
  primaryAction: {
    alignSelf: 'stretch',
  },
  planHeaderRow: {
    gap: spacing.xs,
  },
  planHeader: {
    ...typography.title,
    color: colors.textPrimary,
  },
  planSubheader: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.75)',
  },
  planList: {
    gap: spacing.md,
    width: '100%',
  },
  planCard: {
    padding: spacing.md,
    borderRadius: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(6, 10, 32, 0.45)',
    gap: spacing.sm,
  },
  planCardSelected: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(59, 226, 176, 0.12)',
  },
  planCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  planPrice: {
    ...typography.title,
    color: colors.accent,
  },
  planDescription: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.78)',
    lineHeight: 18,
  },
  planMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  planMetaText: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.78)',
    flex: 1,
  },
  planFootnote: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.68)',
    lineHeight: 17,
    marginTop: spacing.xs,
  },
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: spacing.lg,
    backgroundColor: 'rgba(6, 10, 32, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  premiumBannerText: {
    ...typography.caption,
    color: colors.textPrimary,
    flex: 1,
    lineHeight: 18,
  },
  linksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  linkText: {
    ...typography.caption,
    color: colors.textPrimary,
    textDecorationLine: 'underline',
  },
  separator: {
    width: 1,
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
});
