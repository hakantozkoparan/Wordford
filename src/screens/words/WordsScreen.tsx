import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { GradientBackground } from '@/components/GradientBackground';
import { ScreenContainer } from '@/components/ScreenContainer';
import { TabSegmentedControl } from '@/components/TabSegmentedControl';
import { colors, spacing, typography } from '@/theme';
import { useWords } from '@/context/WordContext';

const TABS = [
  { key: 'favorites', label: 'Favorilerim' },
  { key: 'known', label: 'Bildiklerim' },
];

export const WordsScreen: React.FC = () => {
  const { favorites, knownWords, wordsByLevel } = useWords();
  const [activeTab, setActiveTab] = useState('favorites');

  const data = useMemo(() => (activeTab === 'favorites' ? favorites : knownWords), [activeTab, favorites, knownWords]);
  const allWords = useMemo(
    () => Object.values(wordsByLevel).flatMap((list) => list ?? []),
    [wordsByLevel],
  );

  return (
    <GradientBackground>
      <ScreenContainer>
        <View style={styles.header}>
          <Text style={styles.title}>Kelime Arşivin</Text>
          <Text style={styles.subtitle}>Favorilerine dön veya bildiklerini tekrar et.</Text>
        </View>
        <TabSegmentedControl options={TABS} activeKey={activeTab} onChange={setActiveTab} />
        {data.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Henüz kayıt yok</Text>
            <Text style={styles.emptyBody}>
              Favorilere kelime eklemek veya cevaplayarak bildiğin kelimeleri görmek için seviyeleri keşfet.
            </Text>
          </View>
        ) : (
          <FlatList
            data={data}
            keyExtractor={(item) => item.wordId}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const word = allWords.find((entry) => entry.id === item.wordId);
              if (!word) return null;
              return (
                <View style={styles.card}>
                  <Text style={styles.word}>{word.term}</Text>
                  <Text style={styles.level}>{word.level}</Text>
                  <Text style={styles.meanings}>{word.meanings.join(', ')}</Text>
                </View>
              );
            }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </ScreenContainer>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  emptyState: {
    padding: spacing.lg,
    borderRadius: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  emptyTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyBody: {
    ...typography.body,
    color: colors.textSecondary,
  },
  list: {
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: spacing.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  word: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  level: {
    ...typography.subtitle,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  meanings: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
});
