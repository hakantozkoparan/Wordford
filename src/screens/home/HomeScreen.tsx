import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

import { GradientBackground } from '@/components/GradientBackground';
import { ScreenContainer } from '@/components/ScreenContainer';
import { LevelCard } from '@/components/LevelCard';
import { CreditPill } from '@/components/CreditPill';
import { ProgressBar } from '@/components/ProgressBar';
import { colors, spacing, typography } from '@/theme';
import { LEVEL_CODES, LEVEL_LABELS, TOTAL_WORD_COUNT, WORDS_PER_LEVEL } from '@/constants/levels';
import { useAuth } from '@/context/AuthContext';
import { useWords } from '@/context/WordContext';
import { LevelCode, WordProgress } from '@/types/models';
import { AppStackParamList } from '@/navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

const calculateLevelProgress = (
  level: LevelCode,
  progressMap: Record<string, WordProgress>,
  totalWords: number,
) => {
  const mastered = Object.values(progressMap).filter((p) => p.level === level && p.status === 'mastered').length;
  if (totalWords === 0) return 0;
  return mastered / totalWords;
};

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const LEVEL_THEMES: Record<LevelCode, { gradient: [string, string]; icon: IoniconName }> = {
  A1: { gradient: ['#5667FF', '#7A8CFF'], icon: 'rocket' },
  A2: { gradient: ['#FF7A88', '#FFB199'], icon: 'flame' },
  B1: { gradient: ['#3BC8D9', '#5AE3B4'], icon: 'planet' },
  B2: { gradient: ['#8A5DFF', '#B38CFF'], icon: 'sparkles' },
  C1: { gradient: ['#F8A937', '#FDC26F'], icon: 'star' },
  C2: { gradient: ['#36C1FF', '#6ADFEE'], icon: 'trophy' },
};

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { profile } = useAuth();
  const { wordsByLevel, progressMap, loadLevelWords } = useWords();

  useEffect(() => {
    LEVEL_CODES.forEach((level) => {
      loadLevelWords(level).catch(() => undefined);
    });
  }, [loadLevelWords]);

  const masteredCount = Object.values(progressMap).filter((item) => item.status === 'mastered').length;
  const favoriteCount = Object.values(progressMap).filter((item) => item.isFavorite).length;
  const totalWordsAcrossLevels = LEVEL_CODES.reduce((sum, level) => {
    const levelWords = wordsByLevel[level]?.length ?? 0;
    return sum + levelWords;
  }, 0);
  const totalWords = totalWordsAcrossLevels > 0 ? totalWordsAcrossLevels : TOTAL_WORD_COUNT;
  const totalProgress = totalWords === 0 ? 0 : masteredCount / totalWords;
  
  // Bugünün öğrenme hedefi (örnek: günde 10 kelime)
  const dailyGoal = 10;
  const todaysMastered = 7; // Bu gerçek veriden gelecek (şimdilik mock)
  const streak = 5; // Günlük seri (şimdilik mock)

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
                <View style={styles.heroHeader}>
                  <View style={styles.heroTextGroup}>
                    <Text style={styles.greeting}>Hoş geldin, {profile?.firstName ?? 'Misafir'} 👋</Text>
                    <Text style={styles.heroSubtitle}>Bugün hangi kelimeleri öğreneceksin?</Text>
                  </View>
                  <View style={styles.heroPills}>
                    <CreditPill label="Krediler" value={profile?.dailyCredits ?? 0} />
                    <CreditPill label="Yıldız" value={profile?.dailyHintTokens ?? 0} />
                  </View>
                </View>

                {/* Mini Stats Row */}
                <View style={styles.miniStatsRow}>
                  <View style={styles.miniStatItem}>
                    <View style={styles.miniStatIconBg}>
                      <Ionicons name="flame" size={18} color="#FFB199" />
                    </View>
                    <View style={styles.miniStatText}>
                      <Text style={styles.miniStatValue}>{streak} gün</Text>
                      <Text style={styles.miniStatLabel}>Seri</Text>
                    </View>
                  </View>
                  
                  <View style={styles.miniStatDivider} />
                  
                  <View style={styles.miniStatItem}>
                    <View style={styles.miniStatIconBg}>
                      <Ionicons name="checkmark-circle" size={18} color="#5AE3B4" />
                    </View>
                    <View style={styles.miniStatText}>
                      <Text style={styles.miniStatValue}>{todaysMastered}/{dailyGoal}</Text>
                      <Text style={styles.miniStatLabel}>Bugün</Text>
                    </View>
                  </View>
                  
                  <View style={styles.miniStatDivider} />
                  
                  <View style={styles.miniStatItem}>
                    <View style={styles.miniStatIconBg}>
                      <Ionicons name="heart" size={18} color="#FF7A88" />
                    </View>
                    <View style={styles.miniStatText}>
                      <Text style={styles.miniStatValue}>{favoriteCount}</Text>
                      <Text style={styles.miniStatLabel}>Favoriler</Text>
                    </View>
                  </View>
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
                const { gradient, icon } = LEVEL_THEMES[item];
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
    gap: spacing.sm,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroTextGroup: {
    flex: 1,
    paddingRight: spacing.lg,
    gap: spacing.xs,
  },
  greeting: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  heroPills: {
    gap: spacing.sm,
  },
  miniStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  miniStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  miniStatIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniStatText: {
    gap: 2,
  },
  miniStatValue: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  miniStatLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  miniStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
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
