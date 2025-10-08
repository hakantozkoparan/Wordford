import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { isSameDay } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { GradientBackground } from '@/components/GradientBackground';
import { ScreenContainer } from '@/components/ScreenContainer';
import { LevelCard } from '@/components/LevelCard';
import { ResourcePill } from '@/components/ResourcePill';
import { ProgressBar } from '@/components/ProgressBar';
import { StreakCelebrationModal } from '@/components/StreakCelebrationModal';
import { colors, radius, spacing, typography } from '@/theme';
import { LEVEL_CODES, LEVEL_LABELS, TOTAL_WORD_COUNT, WORDS_PER_LEVEL } from '@/constants/levels';
import { LEVEL_GRADIENTS, LEVEL_ICONS } from '@/constants/levelThemes';
import { useAuth } from '@/context/AuthContext';
import { useWords } from '@/context/WordContext';
import { LevelCode, WordProgress } from '@/types/models';
import { AppStackParamList } from '@/navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DAILY_WORD_GOAL, STORAGE_KEYS } from '@/config/appConfig';
import { toDate, toIsoDate } from '@/utils/datetime';

const formatCompactNumber = (value: number) => {
  if (value >= 1000) {
    return new Intl.NumberFormat('tr-TR', {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1,
    }).format(value);
  }
  return value.toLocaleString('tr-TR');
};

const calculateLevelProgress = (
  level: LevelCode,
  progressMap: Record<string, WordProgress>,
  totalWords: number,
) => {
  const mastered = Object.values(progressMap).filter((p) => p.level === level && p.status === 'mastered').length;
  if (totalWords === 0) return 0;
  return mastered / totalWords;
};

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { profile } = useAuth();
  const { wordsByLevel, progressMap, loadLevelWords } = useWords();
  const [streakModalVisible, setStreakModalVisible] = useState(false);
  const [streakModalVariant, setStreakModalVariant] = useState<'celebration' | 'reset' | null>(null);
  const streak = profile?.currentStreak ?? 1; // Varsayılan olarak 1
  const normalizedStreak = Math.max(streak, 1);

  useEffect(() => {
    LEVEL_CODES.forEach((level) => {
      loadLevelWords(level).catch(() => undefined);
    });
  }, [loadLevelWords]);

  useEffect(() => {
    if (!profile?.uid) {
      setStreakModalVisible(false);
      setStreakModalVariant(null);
      return;
    }

    let cancelled = false;

    const evaluateStreak = async () => {
      try {
        const snapshotRaw = await AsyncStorage.getItem(STORAGE_KEYS.streakSnapshot);
        const todayIso = toIsoDate(new Date());
        const userId = profile.uid;
        const currentValue = normalizedStreak;

        let previousValue = 0;
        let lastCelebrationDate: string | null = null;
        let lastResetDate: string | null = null;
        let storedUserId: string | null = null;

        if (snapshotRaw) {
          try {
            const parsed = JSON.parse(snapshotRaw) as {
              userId?: string | null;
              streak?: number;
              lastCelebrationDate?: string | null;
              lastResetDate?: string | null;
            };

            storedUserId = parsed?.userId ?? null;
            if (storedUserId === userId) {
              previousValue = parsed?.streak ?? 0;
              lastCelebrationDate = parsed?.lastCelebrationDate ?? null;
              lastResetDate = parsed?.lastResetDate ?? null;
            }
          } catch (error) {
            console.warn('Seri snapshot verisi çözümlenemedi:', error);
          }
        }

        let variantToShow: 'celebration' | 'reset' | null = null;

        if (storedUserId === userId) {
          if (currentValue < previousValue && currentValue <= 1 && previousValue > 1) {
            if (lastResetDate !== todayIso) {
              variantToShow = 'reset';
            }
          } else if (currentValue > previousValue) {
            if (lastCelebrationDate !== todayIso) {
              variantToShow = 'celebration';
            }
          }
        }

        if (!cancelled) {
          if (variantToShow) {
            setStreakModalVariant(variantToShow);
            setStreakModalVisible(true);
          } else {
            setStreakModalVisible(false);
            setStreakModalVariant(null);
          }
        }

        const payload = {
          userId,
          streak: currentValue,
          updatedAt: new Date().toISOString(),
          lastCelebrationDate: variantToShow === 'celebration' ? todayIso : lastCelebrationDate,
          lastResetDate: variantToShow === 'reset' ? todayIso : lastResetDate,
        };

        await AsyncStorage.setItem(STORAGE_KEYS.streakSnapshot, JSON.stringify(payload));
      } catch (error) {
        console.warn('Seri durumu değerlendirilirken hata oluştu:', error);
      }
    };

    evaluateStreak();

    return () => {
      cancelled = true;
    };
  }, [normalizedStreak, profile?.uid]);

  const masteredCount = Object.values(progressMap).filter((item) => item.status === 'mastered').length;
  const favoriteCount = Object.values(progressMap).filter((item) => item.isFavorite).length;
  const totalWordsAcrossLevels = LEVEL_CODES.reduce((sum, level) => {
    const levelWords = wordsByLevel[level]?.length ?? 0;
    return sum + levelWords;
  }, 0);
  const totalWords = totalWordsAcrossLevels > 0 ? totalWordsAcrossLevels : TOTAL_WORD_COUNT;
  const totalProgress = totalWords === 0 ? 0 : masteredCount / totalWords;

  const availableEnergy = (profile?.dailyEnergy ?? 0) + (profile?.bonusEnergy ?? 0);
  const availableRevealTokens =
    (profile?.dailyRevealTokens ?? 0) + (profile?.bonusRevealTokens ?? 0);

  const todaysMasteredFromProgress = useMemo(() => {
    const today = new Date();
    return Object.values(progressMap).reduce((count, item) => {
      if (item.status !== 'mastered') {
        return count;
      }
      const lastAnswerDate = toDate(item.lastAnswerAt ?? null);
      if (!lastAnswerDate) {
        return count;
      }
      return isSameDay(lastAnswerDate, today) ? count + 1 : count;
    }, 0);
  }, [progressMap]);

  const todaysMasteredFromProfile = useMemo(() => {
    if (!profile) {
      return null;
    }
    const trackedDate = toDate(profile.todaysMasteredDate ?? null);
    if (!trackedDate) {
      return profile.todaysMastered ?? 0;
    }
    return isSameDay(trackedDate, new Date()) ? profile.todaysMastered ?? 0 : 0;
  }, [profile]);

  const dailyGoal = DAILY_WORD_GOAL;
  const todaysMastered = todaysMasteredFromProfile ?? todaysMasteredFromProgress;
  const formattedStreak = `${formatCompactNumber(normalizedStreak)} gün`; // En az 1 gün göster
  const formattedDailyProgress = `${formatCompactNumber(todaysMastered)}/${formatCompactNumber(dailyGoal)}`;
  const formattedFavorites = formatCompactNumber(favoriteCount);

  return (
    <GradientBackground paddingTop={spacing.md}>
      <ScreenContainer style={styles.container} edges={['top']}>
  <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Modern Hero Card */}
          <View style={styles.hero}>
            <LinearGradient
              colors={['rgba(123, 97, 255, 0.15)', 'rgba(80, 227, 194, 0.15)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroGradient}
            >
              <View style={styles.heroContent}>
                <View style={styles.heroTextGroup}>
                  <Text style={styles.greeting}>Hoş geldin, {profile?.firstName ?? 'Misafir'} 👋</Text>
                  <Text style={styles.heroSubtitle}>Bugün hangi kelimeleri öğreneceksin?</Text>
                </View>

                <View style={styles.heroStatsRow}>
                  <View style={styles.heroStat}>
                    <View style={styles.heroStatHeader}>
                      <View style={[styles.heroStatIconBg, styles.heroStatIconFlame]}>
                        <Ionicons name="flame" size={16} color="#FFB199" />
                      </View>
                      <Text style={styles.heroStatLabel}>Seri</Text>
                    </View>
                    <Text style={styles.heroStatValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                      {formattedStreak}
                    </Text>
                  </View>
                  <View style={styles.heroStat}>
                    <View style={styles.heroStatHeader}>
                      <View style={[styles.heroStatIconBg, styles.heroStatIconCheck]}>
                        <Ionicons name="checkmark-circle" size={16} color="#5AE3B4" />
                      </View>
                      <Text style={styles.heroStatLabel}>Bugün</Text>
                    </View>
                    <Text style={styles.heroStatValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                      {formattedDailyProgress}
                    </Text>
                  </View>
                  <View style={styles.heroStat}>
                    <View style={styles.heroStatHeader}>
                      <View style={[styles.heroStatIconBg, styles.heroStatIconHeart]}>
                        <Ionicons name="heart" size={16} color="#FF7A88" />
                      </View>
                      <Text style={styles.heroStatLabel}>Favoriler</Text>
                    </View>
                    <Text style={styles.heroStatValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                      {formattedFavorites}
                    </Text>
                  </View>
                </View>

                <View style={styles.heroResources}>
                  <ResourcePill label="Enerji" value={availableEnergy} icon="flash" />
                  <ResourcePill label="Cevabı Göster" value={availableRevealTokens} icon="eye" />
                </View>
              </View>
            </LinearGradient>
          </View>

          <View style={styles.progressCard}>
            <Text style={styles.sectionTitle}>Toplam İlerleme</Text>
            <ProgressBar value={totalProgress} />
            <View style={styles.progressRow}>
              <Text style={styles.progressHighlight}>{masteredCount}</Text>
              <Text style={styles.progressCaption}> / {totalWords} kelimeyi tamamladın</Text>
            </View>
          </View>

          <View style={styles.levelsSection}>
            <Text style={styles.sectionTitle}>Seviye Kartları</Text>
            <View style={styles.levelGrid}>
              {LEVEL_CODES.map((item, index) => {
                const words = wordsByLevel[item]?.length ?? WORDS_PER_LEVEL;
                const progress = calculateLevelProgress(item, progressMap, words);
                const gradient = LEVEL_GRADIENTS[item];
                const icon = LEVEL_ICONS[item];
                const containerStyle = [styles.levelItem];
                if (index === LEVEL_CODES.length - 1) {
                  containerStyle.push(styles.levelItemLast);
                }
                return (
                  <View style={containerStyle} key={item}>
                    <LevelCard
                      level={item}
                      title={LEVEL_LABELS[item]}
                      progress={progress}
                      gradient={gradient}
                      iconName={icon}
                      totalWords={words}
                      onPress={() => navigation.navigate('LevelDetail', { level: item })}
                    />
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </ScreenContainer>
      <StreakCelebrationModal
        visible={streakModalVisible}
        streak={normalizedStreak}
        variant={streakModalVariant ?? 'celebration'}
        onContinue={() => {
          setStreakModalVisible(false);
          setStreakModalVariant(null);
        }}
      />
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 0,
  },
  scrollContent: {
    paddingBottom: spacing.sm,
  },
  hero: {
    borderRadius: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: spacing.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(26, 32, 62, 0.6)',
  },
  heroGradient: {
    padding: spacing.lg,
  },
  heroContent: {
    gap: spacing.md,
  },
  heroTextGroup: {
    gap: spacing.xs,
    alignItems: 'flex-start',
  },
  greeting: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  heroStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  heroStat: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    alignItems: 'center',
    minWidth: 0,
  },
  heroStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    width: '100%',
    justifyContent: 'center',
  },
  heroStatIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignSelf: 'center',
  },
  heroStatIconFlame: {
    backgroundColor: 'rgba(255, 123, 136, 0.18)',
  },
  heroStatIconCheck: {
    backgroundColor: 'rgba(90, 227, 180, 0.18)',
  },
  heroStatIconHeart: {
    backgroundColor: 'rgba(123, 97, 255, 0.18)',
  },
  heroStatLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  heroStatValue: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontWeight: '700',
    minWidth: 0,
    textAlign: 'center',
  },
  heroResources: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
    alignSelf: 'center',
    marginTop: spacing.xs,
  },
  progressCard: {
    backgroundColor: colors.card,
    padding: spacing.lg,
    borderRadius: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  progressCaption: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  progressHighlight: {
    ...typography.headline,
    color: colors.accent,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  levelsSection: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  levelGrid: {
    flexDirection: 'column',
  },
  levelItem: {
    width: '100%',
    marginBottom: spacing.sm,
  },
  levelItemLast: {
    width: '100%',
    marginBottom: 0,
  },
});
