import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '@/theme';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  size?: 'default' | 'compact';
  style?: StyleProp<ViewStyle>;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
}

export const PrimaryButton: React.FC<Props> = ({
  label,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  size = 'default',
  style,
  icon,
  iconColor,
}) => {
  const variantStyles = (() => {
    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: 'rgba(59, 226, 176, 0.12)',
          borderColor: colors.accent,
          textColor: colors.accent,
        } as const;
      case 'danger':
        return {
          backgroundColor: colors.danger,
          borderColor: colors.danger,
          textColor: colors.textPrimary,
        } as const;
      case 'ghost':
        return {
          backgroundColor: 'rgba(16, 22, 45, 0.4)',
          borderColor: 'rgba(154, 140, 255, 0.35)',
          textColor: colors.textSecondary,
        } as const;
      case 'success':
        return {
          backgroundColor: 'rgba(59, 226, 176, 0.18)',
          borderColor: 'rgba(59, 226, 176, 0.65)',
          textColor: colors.accent,
        } as const;
      default:
        return {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
          textColor: colors.textPrimary,
        } as const;
    }
  })();

  const sizeStyle = size === 'compact' ? styles.buttonCompact : styles.buttonDefault;
  const labelStyle = size === 'compact' ? styles.labelCompact : styles.label;

  return (
    <Animated.View
      entering={FadeIn}
  style={[styles.wrapper, size === 'compact' && styles.wrapperCompact, { opacity: disabled ? 0.6 : 1 }, style]}
    >
      <Pressable
        accessibilityRole="button"
        style={[
          styles.button,
          sizeStyle,
          {
            backgroundColor: variantStyles.backgroundColor,
            borderColor: variantStyles.borderColor,
          },
        ]}
        onPress={onPress}
        disabled={disabled || loading}
      >
        {loading ? (
          <ActivityIndicator color={variantStyles.textColor} />
        ) : (
          <View style={styles.buttonContent}>
            {icon ? (
              <Ionicons
                name={icon}
                size={size === 'compact' ? 18 : 22}
                color={iconColor ?? variantStyles.textColor}
              />
            ) : null}
            <Text style={[labelStyle, { color: variantStyles.textColor }]}>{label}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  wrapperCompact: {
    alignSelf: 'stretch',
  },
  button: {
    borderRadius: radius.lg,
    alignItems: 'center',
    borderWidth: 1,
  },
  buttonDefault: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  buttonCompact: {
    paddingVertical: spacing.sm + spacing.xs,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
  },
  label: {
    ...typography.title,
    color: colors.textPrimary,
  },
  labelCompact: {
    ...typography.subtitle,
    fontWeight: '700',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
