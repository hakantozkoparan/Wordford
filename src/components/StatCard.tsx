import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { colors, radius, spacing, typography } from '@/theme';

interface Props {
  label: string;
  value: string;
  caption?: string;
}

export const StatCard: React.FC<Props> = ({ label, value, caption }) => (
  <Animated.View entering={FadeIn} style={styles.card}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value}</Text>
    {caption ? <Text style={styles.caption}>{caption}</Text> : null}
  </Animated.View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    flex: 1,
  },
  label: {
    ...typography.caption,
    color: colors.muted,
  },
  value: {
    ...typography.headline,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  caption: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
});
