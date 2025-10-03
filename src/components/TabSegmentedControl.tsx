import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

interface Option {
  key: string;
  label: string;
}

interface Props {
  options: Option[];
  activeKey: string;
  onChange: (key: string) => void;
}

export const TabSegmentedControl: React.FC<Props> = ({ options, activeKey, onChange }) => (
  <View style={styles.container}>
    {options.map((option) => {
      const isActive = option.key === activeKey;
      return (
        <TouchableOpacity
          key={option.key}
          style={[styles.tab, isActive && styles.tabActive]}
          onPress={() => onChange(option.key)}
        >
          <Text style={[styles.label, isActive && styles.labelActive]}>{option.label}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 20, 42, 0.75)',
    borderRadius: radius.pill,
    padding: 4,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  label: {
    ...typography.subtitle,
    color: colors.tabInactive,
  },
  labelActive: {
    color: colors.textPrimary,
  },
});
