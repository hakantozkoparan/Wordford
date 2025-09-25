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
import { StatCard } from '@/components/StatCard';
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
  const totalProgress = TOTAL_WORD_COUNT === 0 ? 0 : masteredCount / TOTAL_WORD_COUNT;

  return (
    <GradientBackground>
  <ScreenContainer style={styles.container} edges={['top']}>
  <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <LinearGradient
            colors={[colors.primary, colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroTextGroup}>
              <Text style={styles.greeting}>Hoş geldin, {profile?.firstName ?? 'Gezgin'} 👋</Text>
              <Text style={styles.heroSubtitle}>Bugün hangi kelimeleri fethedeceksin?</Text>
            </View>
            <View style={styles.heroPills}>
              <CreditPill label="Krediler" value={profile?.dailyCredits ?? 0} />
              <CreditPill label="Yıldız" value={profile?.dailyHintTokens ?? 0} />
            </View>
          </LinearGradient>

          <View style={styles.progressCard}>
            <Text style={styles.sectionTitle}>Toplam İlerleme</Text>
            <ProgressBar value={totalProgress} />
            <View style={styles.progressRow}>
              <Text style={styles.progressHighlight}>{masteredCount}</Text>
              <Text style={styles.progressCaption}> / {TOTAL_WORD_COUNT} kelimeyi tamamladın</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <StatCard label="Bildiklerim" value={`${masteredCount}`} caption="Toplam doğru bildiğin kelimeler" />
            <StatCard
              label="Favoriler"
              value={`${Object.values(progressMap).filter((item) => item.isFavorite).length}`}
              caption="Yıldızladığın kelimeler"
            />
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
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
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
  progressCard: {
    backgroundColor: colors.card,
    padding: spacing.lg,
    borderRadius: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.md,
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
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
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
