import { ReactNode } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

import { colors } from '@/theme';

interface Props {
  children: ReactNode;
}

export const GradientBackground: React.FC<Props> = ({ children }) => (
  <LinearGradient colors={[colors.background, '#131943', '#1D245A']} style={styles.gradient}>
    {children}
  </LinearGradient>
);

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
  },
});
