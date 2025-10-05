import { forwardRef } from 'react';
import { StyleSheet, StyleProp, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

interface Props extends TextInputProps {
  label?: string;
  errorMessage?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export const TextField = forwardRef<TextInput, Props>(({ label, errorMessage, style, containerStyle, ...rest }, ref) => (
  <View style={[styles.wrapper, containerStyle]}>
    {label ? <Text style={styles.label}>{label}</Text> : null}
    <TextInput
      ref={ref}
      placeholderTextColor={colors.muted}
      style={[styles.input, style]}
      {...rest}
    />
    {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
  </View>
));

TextField.displayName = 'TextField';

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.subtitle,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: 'rgba(26,32,62,0.9)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    marginTop: spacing.xs,
  },
});
