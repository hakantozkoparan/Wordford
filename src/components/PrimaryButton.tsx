import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { colors, radius, spacing, typography } from '@/theme';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: StyleProp<ViewStyle>;
}

export const PrimaryButton: React.FC<Props> = ({ label, onPress, loading, disabled, variant, style }) => {
  const backgroundColor = variant === 'secondary' ? colors.accent : variant === 'danger' ? colors.danger : colors.primary;

  return (
    <Animated.View entering={FadeIn} style={[styles.wrapper, { opacity: disabled ? 0.6 : 1 }, style]}> 
      <Pressable
        accessibilityRole="button"
        style={[styles.button, { backgroundColor }]}
        onPress={onPress}
        disabled={disabled || loading}
      >
        {loading ? <ActivityIndicator color={colors.textPrimary} /> : <Text style={styles.label}>{label}</Text>}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  button: {
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  label: {
    ...typography.title,
    color: colors.textPrimary,
  },
});
