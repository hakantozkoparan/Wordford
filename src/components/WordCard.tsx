import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors, radius, spacing, typography } from '@/theme';
import { LevelCode } from '@/types/models';

type Props = {
  term: string;
  level: LevelCode;
  meanings: string[];
  example?: string;
  tags?: string[];
  lastReviewed?: string;
  isFavorite?: boolean;
};

const LEVEL_GRADIENTS: Record<LevelCode, [string, string]> = {
  A1: ['#4D66FF', '#6B8BFF'],
  A2: ['#FF7D67', '#FF9C73'],
  B1: ['#43C6AC', '#191654'],
  B2: ['#7F00FF', '#E100FF'],
  C1: ['#F7971E', '#FFD200'],
  C2: ['#11998E', '#38EF7D'],
};

export const WordCard: React.FC<Props> = memo(({ term, level, meanings, example, tags, lastReviewed, isFavorite }) => (
  <LinearGradient
    colors={LEVEL_GRADIENTS[level] ?? ['#434343', '#000000']}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.card}
  >
    <View style={styles.headerRow}>
      <View style={styles.levelBadge}>
        <Text style={styles.levelText}>{level}</Text>
      </View>
      {lastReviewed ? <Text style={styles.lastReviewed}>{lastReviewed}</Text> : null}
      {isFavorite ? (
        <View style={styles.favoriteIconWrapper}>
          <Ionicons name="heart" size={16} color={colors.textPrimary} />
        </View>
      ) : null}
    </View>
    <Text style={styles.term}>{term}</Text>
    <Text style={styles.meanings}>{meanings.join(', ')}</Text>
    {example ? <Text style={styles.example}>{example}</Text> : null}
    {tags?.length ? (
      <View style={styles.tagsRow}>
        {tags.map((tag) => (
          <View style={styles.tagPill} key={tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>
    ) : null}
  </LinearGradient>
));

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  levelBadge: {
    backgroundColor: 'rgba(12, 18, 41, 0.25)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  levelText: {
    ...typography.caption,
    color: colors.textPrimary,
    letterSpacing: 0.8,
  },
  lastReviewed: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.75)',
    flex: 1,
    textAlign: 'right',
  },
  favoriteIconWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: radius.md,
    padding: spacing.xs,
  },
  term: {
    ...typography.title,
    color: colors.textPrimary,
  },
  meanings: {
    ...typography.body,
    color: 'rgba(255,255,255,0.85)',
  },
  example: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.75)',
    fontStyle: 'italic',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  tagPill: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(12, 18, 41, 0.35)',
  },
  tagText: {
    ...typography.caption,
    color: colors.textPrimary,
  },
});
