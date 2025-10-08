import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '@/theme';

type StreakModalVariant = 'celebration' | 'reset';

interface Props {
  visible: boolean;
  streak: number;
  onContinue: () => void;
  variant?: StreakModalVariant;
}

const formatNumber = (value: number) =>
  new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(value);

export const StreakCelebrationModal: React.FC<Props> = ({ visible, streak, onContinue, variant = 'celebration' }) => {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnimValue = useRef(new Animated.Value(1)).current;
  const pulseAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          useNativeDriver: true,
        }),
      ]).start();

      pulseAnimation.current?.stop();
      pulseAnimation.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimValue, {
            toValue: 1.12,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimValue, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
      );
      pulseAnimation.current.start();
    } else {
      pulseAnimation.current?.stop();
      opacityAnim.setValue(0);
      scaleAnim.setValue(0.8);
      pulseAnimValue.setValue(1);
    }

    return () => {
      pulseAnimation.current?.stop();
    };
  }, [visible, opacityAnim, scaleAnim, pulseAnimValue]);

  const formattedStreak = useMemo(() => Math.max(1, Math.round(streak)), [streak]);
  const streakDisplay = useMemo(() => formatNumber(formattedStreak), [formattedStreak]);

  const config = useMemo(() => {
    if (variant === 'reset') {
      return {
        gradientColors: ['rgba(82, 119, 255, 0.85)', 'rgba(145, 196, 255, 0.65)'],
        pulseColor: 'rgba(255,255,255,0.1)',
        icon: {
          name: 'refresh-circle' as keyof typeof Ionicons.glyphMap,
          size: 46,
          color: '#C9DAFF',
          accentTopColor: '#E8F0FF',
          accentBottomColor: '#C5E4FF',
          backgroundColor: 'rgba(19, 28, 62, 0.55)',
          borderColor: 'rgba(255,255,255,0.28)',
        },
        title: 'Serin sıfırlandı 😌',
        description:
          'Kısa bir mola verdin ama sorun değil! Bugün yeniden başlayarak yeni serini oluşturabilirsin.',
        showValue: false,
        cta: {
          label: 'Yeniden Başla',
          gradient: ['#C8D5FF', '#8FABFF'],
          textColor: '#1A203E',
          iconName: 'play' as keyof typeof Ionicons.glyphMap,
          iconColor: '#1A203E',
          iconBg: '#FFFFFF',
          borderColor: 'rgba(26,32,62,0.10)',
        },
      } satisfies {
        gradientColors: [string, string];
        pulseColor: string;
        icon: {
          name: keyof typeof Ionicons.glyphMap;
          size: number;
          color: string;
          accentTopColor?: string;
          accentBottomColor?: string;
          backgroundColor: string;
          borderColor: string;
        };
        title: string;
        description: string;
        showValue: boolean;
        cta: {
          label: string;
          gradient: [string, string];
          textColor: string;
          iconName: keyof typeof Ionicons.glyphMap;
          iconColor: string;
          iconBg: string;
          borderColor: string;
        };
      };
    }

    return {
      gradientColors: ['rgba(123, 97, 255, 0.85)', 'rgba(90, 227, 194, 0.65)'],
      pulseColor: 'rgba(255,255,255,0.12)',
      icon: {
        name: 'flame' as keyof typeof Ionicons.glyphMap,
        size: 42,
        color: '#FFB199',
        accentTopColor: '#FFE3A3',
        accentBottomColor: '#CDEFFF',
        backgroundColor: 'rgba(12, 18, 41, 0.5)',
        borderColor: 'rgba(255,255,255,0.35)',
      },
      title: 'Serin Alev Alev! 🔥',
      description: `Günlük çalışmaların sayesinde ${streakDisplay} günlük öğrenme serisine ulaştın. Bu tempoyu koru, hedeflerine her gün biraz daha yaklaşıyorsun!`,
      showValue: true,
      cta: {
        label: 'Devam Et',
        gradient: ['#FFE8A8', '#FFB199'],
        textColor: '#1A203E',
        iconName: 'arrow-forward' as keyof typeof Ionicons.glyphMap,
        iconColor: '#1A203E',
        iconBg: '#FFFFFF',
        borderColor: 'rgba(26,32,62,0.15)',
      },
    } satisfies {
      gradientColors: [string, string];
      pulseColor: string;
      icon: {
        name: keyof typeof Ionicons.glyphMap;
        size: number;
        color: string;
        accentTopColor?: string;
        accentBottomColor?: string;
        backgroundColor: string;
        borderColor: string;
      };
      title: string;
      description: string;
      showValue: boolean;
      cta: {
        label: string;
        gradient: [string, string];
        textColor: string;
        iconName: keyof typeof Ionicons.glyphMap;
        iconColor: string;
        iconBg: string;
        borderColor: string;
      };
    };
  }, [streakDisplay, variant]);

  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.94,
      friction: 6,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.backdrop}>
        <Animated.View
          style={[styles.wrapper, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}
          testID="streak-celebration-modal"
        >
          <LinearGradient
            colors={config.gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            <Animated.View
              style={[styles.pulseCircle, { transform: [{ scale: pulseAnimValue }], backgroundColor: config.pulseColor }]}
            />
            <View
              style={[
                styles.iconBadge,
                { backgroundColor: config.icon.backgroundColor, borderColor: config.icon.borderColor },
              ]}
            >
              <Ionicons name={config.icon.name} size={config.icon.size} color={config.icon.color} />
              {config.icon.accentTopColor ? (
                <Ionicons
                  name="sparkles"
                  size={20}
                  color={config.icon.accentTopColor}
                  style={styles.sparkleTop}
                />
              ) : null}
              {config.icon.accentBottomColor ? (
                <Ionicons
                  name="sparkles"
                  size={18}
                  color={config.icon.accentBottomColor}
                  style={styles.sparkleBottom}
                />
              ) : null}
            </View>
            <Text style={styles.title}>{config.title}</Text>
            {config.showValue ? <Text style={styles.streakValue}>{streakDisplay} gün</Text> : null}
            <Text style={styles.description}>{config.description}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={onContinue}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
            >
              <Animated.View style={[styles.ctaButton, { transform: [{ scale: buttonScale }] }]}>
                <LinearGradient
                  colors={config.cta.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.ctaGradient}
                >
                  <Text style={[styles.ctaLabel, { color: config.cta.textColor }]}>{config.cta.label}</Text>
                  <View
                    style={[
                      styles.ctaIconBadge,
                      { backgroundColor: config.cta.iconBg, borderColor: config.cta.borderColor },
                    ]}
                  >
                    <Ionicons name={config.cta.iconName} size={18} color={config.cta.iconColor} />
                  </View>
                </LinearGradient>
              </Animated.View>
            </Pressable>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 10, 25, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  wrapper: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
  },
  gradient: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    position: 'relative',
  },
  pulseCircle: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.12)',
    top: spacing.md,
    alignSelf: 'center',
  },
  iconBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(12, 18, 41, 0.5)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  sparkleTop: {
    position: 'absolute',
    top: 18,
    right: 20,
  },
  sparkleBottom: {
    position: 'absolute',
    bottom: 18,
    left: 22,
  },
  title: {
    ...typography.headline,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  streakValue: {
    ...typography.headline,
    fontSize: 42,
    color: colors.textPrimary,
    textAlign: 'center',
    fontWeight: '700',
  },
  description: {
    ...typography.caption,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  ctaButton: {
    borderRadius: radius.pill,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    gap: spacing.sm,
  },
  ctaLabel: {
    ...typography.subtitle,
    fontWeight: '700',
    color: '#1A203E',
  },
  ctaIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(26,32,62,0.15)',
  },
});
