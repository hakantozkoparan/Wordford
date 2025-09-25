import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, radius, spacing, typography } from '@/theme';
import { LevelCode } from '@/types/models';
import { ProgressBar } from './ProgressBar';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface Props {
  level: LevelCode;
  title: string;
  progress: number; // 0 - 1
  onPress: () => void;
  gradient: [string, string];
  iconName?: IoniconName;
  totalWords: number;
}

export const LevelCard: React.FC<Props> = ({ level, title, progress, onPress, gradient, iconName = 'planet', totalWords }) => (
  <Animated.View entering={FadeInUp.delay(60)}>
  <Pressable style={({ pressed }) => [styles.cardWrapper, pressed && styles.cardPressed]} onPress={onPress}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.headerRow}>
          <View style={styles.leftColumn}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{level}</Text>
            </View>
            <Text style={styles.title}>{title}</Text>
          </View>
          <View style={styles.iconWrapper}>
            <Ionicons name={iconName} size={24} color="white" />
          </View>
        </View>
        <View style={styles.progressContainer}>
          <ProgressBar value={progress} totalWords={totalWords} />
        </View>
      </LinearGradient>
    </Pressable>
  </Animated.View>
);

const styles = StyleSheet.create({
  cardWrapper: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    shadowColor: '#000',
  shadowOpacity: 0.18,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
  },
  gradient: {
    paddingVertical: spacing.md,
  paddingHorizontal: spacing.lg,
  minHeight: 110,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftColumn: {
    flex: 1,
  },
  badge: {
  backgroundColor: 'rgba(255, 255, 255, 0.14)',
  paddingHorizontal: spacing.sm,
  paddingVertical: 6,
  borderRadius: spacing.md,
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
  },
  badgeText: {
    ...typography.caption,
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  title: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  progressContainer: {
    marginTop: spacing.sm,
  },
  iconWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: radius.pill,
    padding: spacing.xs,
  },
});
