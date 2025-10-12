import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useRewards } from '@/context/RewardContext';
import { colors, spacing, typography } from '@/theme';

export const CreditRewardsModal: React.FC = () => {
  const {
    isModalVisible,
    closeRewardsModal,
    watchEnergyAd,
    watchRevealAd,
    isProcessing,
    processingType,
  } = useRewards();

  const isEnergyLoading = isProcessing && processingType === 'energy';
  const isRevealLoading = isProcessing && processingType === 'reveal';

  return (
    <Modal transparent animationType="fade" visible={isModalVisible} onRequestClose={closeRewardsModal}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTouchable} onPress={closeRewardsModal} disabled={isProcessing} />
        <View style={styles.modal}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Kredi Kazan</Text>
            <Pressable
              style={styles.closeButton}
              onPress={closeRewardsModal}
              disabled={isProcessing}
              hitSlop={12}
            >
              <Text style={[styles.closeIcon, isProcessing && styles.closeIconDisabled]}>×</Text>
            </Pressable>
          </View>
          <Text style={styles.description}>
            Reklam izleyerek bonus enerji veya "cevabı göster" hakları kazanabilirsin. Kazandığın krediler bonus hesabına eklenir ve günlük sıfırlamadan etkilenmez.
          </Text>

          <View style={styles.actionGroup}>
            <Pressable
              onPress={watchEnergyAd}
              disabled={isProcessing && !isEnergyLoading}
              style={({ pressed }) => [
                styles.actionCard,
                pressed && !isEnergyLoading && styles.actionCardPressed,
                (isProcessing && !isEnergyLoading) && styles.actionCardDisabled,
              ]}
            >
              <View style={styles.actionIconWrap}>
                <Text style={styles.actionIcon}>⚡️</Text>
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={styles.actionTitle}>Bonus Enerji</Text>
                <Text style={styles.actionSubtitle}>Her reklam +3 enerji kazandırır.</Text>
              </View>
              {isEnergyLoading ? <ActivityIndicator color={colors.textPrimary} /> : <Text style={styles.actionCta}>İzle</Text>}
            </Pressable>

            <Pressable
              onPress={watchRevealAd}
              disabled={isProcessing && !isRevealLoading}
              style={({ pressed }) => [
                styles.actionCard,
                pressed && !isRevealLoading && styles.actionCardPressed,
                (isProcessing && !isRevealLoading) && styles.actionCardDisabled,
              ]}
            >
              <View style={styles.actionIconWrap}>
                <Text style={styles.actionIcon}>👁️</Text>
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={styles.actionTitle}>Cevabı Göster</Text>
                <Text style={styles.actionSubtitle}>Reklam başına +1 hak kazan.</Text>
              </View>
              {isRevealLoading ? <ActivityIndicator color={colors.textPrimary} /> : <Text style={styles.actionCta}>İzle</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  backdropTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  modal: {
    backgroundColor: colors.card,
    padding: spacing.lg,
    gap: spacing.lg,
    borderRadius: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...typography.headline,
    color: colors.textPrimary,
    fontSize: 26,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  closeIcon: {
    fontSize: 24,
    color: colors.textPrimary,
    marginTop: -2,
  },
  closeIconDisabled: {
    opacity: 0.4,
  },
  actionGroup: {
    gap: spacing.sm,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  actionCardPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionCardDisabled: {
    opacity: 0.6,
  },
  actionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(125, 95, 255, 0.2)',
  },
  actionIcon: {
    fontSize: 22,
  },
  actionTextWrap: {
    flex: 1,
    gap: 2,
  },
  actionTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  actionSubtitle: {
    ...typography.caption,
    color: colors.muted,
  },
  actionCta: {
    ...typography.subtitle,
    color: colors.accent,
  },
});
