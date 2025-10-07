import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { GradientBackground } from '@/components/GradientBackground';
import { ScreenContainer } from '@/components/ScreenContainer';
import { colors, radius, spacing, typography } from '@/theme';
import { useWords } from '@/context/WordContext';
import { LevelCode, WordEntry, WordProgress } from '@/types/models';
import { toDate } from '@/utils/datetime';
import { LEVEL_GRADIENTS } from '@/constants/levelThemes';
import { AppStackParamList } from '@/navigation/types';

type WordCardItem = {
  id: string;
  term: string;
  level: LevelCode;
  meanings: string[];
  example?: string;
  isFavorite: boolean;
  wordEntry: WordEntry;
  progress: WordProgress;
};

const compareByLastReview = (a: WordCardItem, b: WordCardItem) => {
  const timeA = toDate(a.progress.lastAnswerAt ?? null)?.getTime() ?? 0;
  const timeB = toDate(b.progress.lastAnswerAt ?? null)?.getTime() ?? 0;
  return timeB - timeA;
};

export const WordsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'known' | 'favorites'>('known');
  const [searchQuery, setSearchQuery] = useState('');
  const { knownWords, favorites, wordsByLevel, loadLevelWords, toggleFavoriteWord } = useWords();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const requestedLevelsRef = useRef<Set<LevelCode>>(new Set());

  useEffect(() => {
    const levelsToRequest = new Set<LevelCode>();
    knownWords.forEach((item) => levelsToRequest.add(item.level));
    favorites.forEach((item) => levelsToRequest.add(item.level));

    levelsToRequest.forEach((level) => {
      if (requestedLevelsRef.current.has(level)) {
        return;
      }
      requestedLevelsRef.current.add(level);
      loadLevelWords(level).catch(() => undefined);
    });
  }, [knownWords, favorites, loadLevelWords]);

  const buildWordCardItem = useCallback(
    (progress: WordProgress): WordCardItem | null => {
      const levelWords = wordsByLevel[progress.level] ?? [];
      const entry = levelWords.find((w) => w.id === progress.wordId);
      if (!entry) {
        return null;
      }

      const example =
        (progress.userExampleSentence && progress.userExampleSentence.trim().length > 0
          ? progress.userExampleSentence
          : entry.exampleSentence) ?? undefined;

      return {
        id: entry.id,
        term: entry.term,
        level: entry.level,
        meanings: entry.meanings,
        example,
        isFavorite: Boolean(progress.isFavorite),
        wordEntry: entry,
        progress,
      };
    },
    [wordsByLevel],
  );

  const knownItems = useMemo(() => {
    const items = knownWords.map(buildWordCardItem).filter(Boolean) as WordCardItem[];
    return items.sort(compareByLastReview);
  }, [knownWords, buildWordCardItem]);

  const favoriteItems = useMemo(() => {
    const items = favorites.map(buildWordCardItem).filter(Boolean) as WordCardItem[];
    return items.sort(compareByLastReview);
  }, [favorites, buildWordCardItem]);

  const baseItems = activeTab === 'favorites' ? favoriteItems : knownItems;
  const progressSource = activeTab === 'favorites' ? favorites : knownWords;

  // Filter words based on active tab
  const data = useMemo(() => {
    if (!searchQuery.trim()) {
      return baseItems;
    }
    const query = searchQuery.toLocaleLowerCase('tr-TR');
    return baseItems.filter(
      (word) =>
        word.term.toLocaleLowerCase('tr-TR').includes(query) ||
        word.meanings.some((m) => m.toLocaleLowerCase('tr-TR').includes(query)),
    );
  }, [baseItems, searchQuery]);

  const handleTabChange = (key: string) => {
    setActiveTab(key as 'known' | 'favorites');
    setSearchQuery(''); // Clear search on tab change
  };

  const handleToggleFavorite = useCallback(
    async (item: WordCardItem) => {
      try {
        await toggleFavoriteWord(item.wordEntry, !item.isFavorite);
      } catch (error) {
        console.warn('Favori güncellenemedi:', error);
      }
    },
    [toggleFavoriteWord],
  );

  const handleEditExample = useCallback(
    (item: WordCardItem) => {
      navigation.navigate('WordExampleEdit', {
        level: item.level,
        wordId: item.id,
      });
    },
    [navigation],
  );

  const favoriteCount = favorites.length;
  const knownCount = knownWords.length;
  const unresolvedCount = Math.max(progressSource.length - baseItems.length, 0);
  const isLoadingWords = progressSource.length > 0 && unresolvedCount > 0;
  const isSearching = Boolean(searchQuery.trim());

  return (
    <GradientBackground>
      <ScreenContainer style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Text style={styles.title}>Kelimelerim</Text>
          <Text style={styles.subtitle}>
            {activeTab === 'known'
              ? 'Bugüne kadar öğrendiğin tüm kelimeler.'
              : 'Favorilere eklediğin kelimeleri hızlıca tekrarla.'}
          </Text>
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Kelime ara..."
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Summary Cards - Tıklanabilir */}
        <View style={styles.summaryRow}>
          <TouchableOpacity
            style={[styles.summaryChip, activeTab === 'known' && styles.summaryChipActive]}
            onPress={() => handleTabChange('known')}
            activeOpacity={0.7}
          >
            <Text style={styles.summaryValue}>{knownCount}</Text>
            <Text style={styles.summaryLabel}>Bildiklerim</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.summaryChip, activeTab === 'favorites' && styles.summaryChipActive]}
            onPress={() => handleTabChange('favorites')}
            activeOpacity={0.7}
          >
            <Text style={styles.summaryValue}>{favoriteCount}</Text>
            <Text style={styles.summaryLabel}>Favorilerim</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <View style={styles.listRow}>
              <View style={styles.leadRow}>
                <View style={styles.accent} />
                <View style={styles.textColumn}>
                  <View style={styles.rowHeader}>
                    <Text style={styles.word}>{item.term}</Text>
                    <LinearGradient
                      colors={LEVEL_GRADIENTS[item.level]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.levelPill}
                    >
                      <Text style={styles.levelText}>{item.level}</Text>
                    </LinearGradient>
                  </View>
                  <Text style={styles.meanings}>{item.meanings.join(', ')}</Text>
                  {item.example ? <Text style={styles.example}>{item.example}</Text> : null}
                </View>
                <View style={styles.actionColumn}>
                  <TouchableOpacity
                    onPress={() => handleToggleFavorite(item)}
                    style={styles.actionButton}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={item.isFavorite ? 'heart' : 'heart-outline'}
                      size={24}
                      color={item.isFavorite ? colors.accent : colors.textSecondary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleEditExample(item)}
                    style={styles.actionButton}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="create-outline"
                      size={22}
                      color={item.progress.userExampleSentence?.trim()
                        ? colors.accent
                        : colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                {isLoadingWords
                  ? 'Kelimeler yükleniyor...'
                  : isSearching
                    ? 'Aradığın kelime bulunamadı'
                    : activeTab === 'favorites'
                      ? 'Henüz favori eklemedin'
                      : 'Henüz kelime öğrenmedin'}
              </Text>
              {!isLoadingWords ? (
                <Text style={styles.emptyBody}>
                  {isSearching
                    ? 'Farklı bir kelime dene.'
                    : activeTab === 'favorites'
                      ? 'Bildiklerim sekmesinden kalp ikonuna basarak favorilere ekleyebilirsin.'
                      : 'Seviyeleri keşfet ve kelime öğrenmeye başla.'}
                </Text>
              ) : null}
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      </ScreenContainer>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 0,
  },
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26,32,62,0.7)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    ...typography.body,
  },
  clearButton: {
    padding: spacing.xs / 2,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryChip: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  summaryChipActive: {
    backgroundColor: 'rgba(123, 97, 255, 0.25)',
  },
  summaryValue: {
    ...typography.title,
    color: colors.textPrimary,
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
  },
  list: {
    paddingBottom: spacing.lg,
    paddingTop: spacing.md,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  listRow: {
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  leadRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  accent: {
    width: 4,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    height: '100%',
  },
  textColumn: {
    flex: 1,
    gap: spacing.xs,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  word: {
    ...typography.subtitle,
    color: colors.textPrimary,
    flex: 1,
  },
  levelPill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 1.2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelText: {
    ...typography.caption,
    color: colors.textPrimary,
    letterSpacing: 0.6,
    fontWeight: '600',
  },
  meanings: {
    ...typography.body,
    color: colors.textSecondary,
  },
  example: {
    ...typography.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  actionColumn: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  actionButton: {
    padding: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    padding: spacing.lg,
    borderRadius: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    marginTop: spacing.xl,
  },
  emptyTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
