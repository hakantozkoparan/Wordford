import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue } from 'react-native-reanimated';

import { colors, radius, typography } from '@/theme';

interface Props {
  value: number; // between 0 and 1
  label?: string;
  totalWords?: number;
}

export const ProgressBar: React.FC<Props> = ({ value, label, totalWords }) => {
  const clampedValue = Math.min(Math.max(value, 0), 1);
  const progress = useDerivedValue(() => clampedValue, [clampedValue]);
  const formattedPercent = `${Math.round(clampedValue * 100)}% tamamlandı.`;
  const formattedTotalWords =
    typeof totalWords === 'number'
      ? totalWords.toLocaleString('tr-TR')
      : undefined;

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.track}>
        <Animated.View style={[styles.fill, animatedStyle]} />
      </View>
      {formattedTotalWords ? (
        <View style={styles.metaRow}>
          <Text style={[styles.percent, styles.percentInline]}>{formattedPercent}</Text>
          <Text style={styles.totalWords}>Toplam {formattedTotalWords} kelime</Text>
        </View>
      ) : (
        <Text style={[styles.percent, styles.percentSolo]}>{formattedPercent}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    ...typography.subtitle,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  track: {
    height: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.progressTrack,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.progressFill,
  },
  metaRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  percent: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  percentSolo: {
    marginTop: 4,
  },
  percentInline: {
    marginTop: 0,
  },
  totalWords: {
    ...typography.caption,
    color: colors.textPrimary,
    opacity: 0.85,
    fontWeight: '600',
  },
});
