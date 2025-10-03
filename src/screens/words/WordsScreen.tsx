import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { GradientBackground } from '@/components/GradientBackground';
import { ScreenContainer } from '@/components/ScreenContainer';
import { colors, radius, spacing, typography } from '@/theme';
import { LevelCode } from '@/types/models';

type WordCardItem = {
  id: string;
  term: string;
  level: LevelCode;
  meanings: string[];
  example?: string;
  tags?: string[];
  lastReviewed?: string;
  isFavorite: boolean;
};

// Mock data: Tüm bilinen kelimeler
const ALL_KNOWN_WORDS_MOCK: WordCardItem[] = [
  {
    id: 'word-1',
    term: 'serendipity',
    level: 'C1',
    meanings: ['tesadüfen bulunan güzel şey', 'hoş sürpriz'],
    example: 'Finding the café was pure serendipity after getting lost in the city.',
    tags: ['duygu', 'günlük konuşma'],
    lastReviewed: '2 gün önce',
    isFavorite: true,
  },
  {
    id: 'word-2',
    term: 'eloquent',
    level: 'B2',
    meanings: ['etkileyici konuşan', 'düşüncelerini ifade eden'],
    example: 'She delivered an eloquent speech about environmental awareness.',
    tags: ['konuşma', 'sunum'],
    lastReviewed: '5 gün önce',
    isFavorite: true,
  },
  {
    id: 'word-3',
    term: 'humble',
    level: 'B1',
    meanings: ['alçakgönüllü'],
    example: 'Despite his success, he always remained humble.',
    tags: ['karakter'],
    lastReviewed: '1 hafta önce',
    isFavorite: false,
  },
  {
    id: 'word-4',
    term: 'wander',
    level: 'A2',
    meanings: ['dolaşmak', 'gezmek'],
    example: 'We wandered around the old town after dinner.',
    tags: ['seyahat'],
    lastReviewed: 'Bugün',
    isFavorite: false,
  },
  {
    id: 'word-5',
    term: 'compile',
    level: 'C1',
    meanings: ['derlemek', 'toplamak'],
    example: 'The researcher compiled the data from several sources.',
    tags: ['akademik', 'iş'],
    lastReviewed: '3 gün önce',
    isFavorite: true,
  },
  {
    id: 'word-6',
    term: 'vivid',
    level: 'B2',
    meanings: ['canlı', 'net'],
    example: 'She still has vivid memories of her childhood home.',
    tags: ['duygu'],
    lastReviewed: '1 hafta önce',
    isFavorite: false,
  },
  {
    id: 'word-7',
    term: 'approach',
    level: 'B1',
    meanings: ['yaklaşmak', 'ele almak'],
    example: 'We need a fresh approach to solve this challenge.',
    tags: ['iş'],
    lastReviewed: '2 hafta önce',
    isFavorite: false,
  },
];

export const WordsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'known' | 'favorites'>('known');
  const [searchQuery, setSearchQuery] = useState('');
  const [words, setWords] = useState<WordCardItem[]>(ALL_KNOWN_WORDS_MOCK);

  // Filter words based on active tab
  const filteredByTab = useMemo(() => {
    if (activeTab === 'favorites') {
      return words.filter((w) => w.isFavorite);
    }
    return words; // Bildiklerim shows all known words
  }, [activeTab, words]);

  // Filter by search query
  const data = useMemo(() => {
    if (!searchQuery.trim()) {
      return filteredByTab;
    }
    const query = searchQuery.toLowerCase();
    return filteredByTab.filter(
      (word) =>
        word.term.toLowerCase().includes(query) ||
        word.meanings.some((m) => m.toLowerCase().includes(query)),
    );
  }, [filteredByTab, searchQuery]);

  const handleTabChange = (key: string) => {
    setActiveTab(key as 'known' | 'favorites');
    setSearchQuery(''); // Clear search on tab change
  };

  const toggleFavorite = (id: string) => {
    setWords((prev) => prev.map((w) => (w.id === id ? { ...w, isFavorite: !w.isFavorite } : w)));
  };

  const favoriteCount = words.filter((w) => w.isFavorite).length;
  const knownCount = words.length;

  return (
    <GradientBackground>
      <ScreenContainer>
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
                    <View style={styles.levelPill}>
                      <Text style={styles.levelText}>{item.level}</Text>
                    </View>
                  </View>
                  <Text style={styles.meanings}>{item.meanings.join(', ')}</Text>
                  {item.example ? <Text style={styles.example}>{item.example}</Text> : null}
                </View>
                {/* Favorite Icon - tappable */}
                <TouchableOpacity onPress={() => toggleFavorite(item.id)} style={styles.favoriteButton}>
                  <Ionicons
                    name={item.isFavorite ? 'heart' : 'heart-outline'}
                    size={24}
                    color={item.isFavorite ? colors.accent : colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                {searchQuery.trim()
                  ? 'Aradığın kelime bulunamadı'
                  : activeTab === 'favorites'
                    ? 'Henüz favori eklemedin'
                    : 'Henüz kelime öğrenmedin'}
              </Text>
              <Text style={styles.emptyBody}>
                {searchQuery.trim()
                  ? 'Farklı bir kelime dene.'
                  : activeTab === 'favorites'
                    ? 'Bildiklerim sekmesinden kalp ikonuna basarak favorilere ekleyebilirsin.'
                    : 'Seviyeleri keşfet ve kelime öğrenmeye başla.'}
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
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
    paddingBottom: spacing.xl,
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
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 1.2,
  },
  levelText: {
    ...typography.caption,
    color: colors.textPrimary,
    letterSpacing: 0.6,
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
  favoriteButton: {
    padding: spacing.xs,
    alignSelf: 'flex-start',
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
