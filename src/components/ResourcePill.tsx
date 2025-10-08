import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors, radius, spacing, typography } from '@/theme';

interface Props {
  label: string;
  value: number;
  icon?: keyof typeof Ionicons.glyphMap;
}

export const ResourcePill: React.FC<Props> = ({ label, value, icon }) => (
  <View style={styles.container}>
    {icon ? (
      <View style={styles.iconWrapper}>
        <Ionicons name={icon} size={14} color={colors.accent} />
      </View>
    ) : null}
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
    backgroundColor: 'rgba(69, 76, 128, 0.6)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  value: {
    ...typography.subtitle,
    color: colors.accent,
  },
  iconWrapper: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
});
