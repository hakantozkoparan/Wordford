import { ReactNode } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';

import { colors } from '@/theme';

interface Props {
  children: ReactNode;
  paddingTop?: number;
  paddingHorizontal?: number;
  style?: StyleProp<ViewStyle>;
}

export const GradientBackground: React.FC<Props> = ({
  children,
  paddingTop = 48,
  paddingHorizontal = 24,
  style,
}) => (
  <LinearGradient
    colors={[colors.background, '#131943', '#1D245A']}
    style={[styles.gradient, { paddingTop, paddingHorizontal }, style]}
  >
    {children}
  </LinearGradient>
);

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
});
