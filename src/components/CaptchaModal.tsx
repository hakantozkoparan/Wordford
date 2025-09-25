import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';
import { CaptchaChallenge } from '@/types/models';
import { generateCaptcha, validateCaptcha } from '@/utils/captcha';
import { TextField } from './TextField';
import { PrimaryButton } from './PrimaryButton';

interface Props {
  visible: boolean;
  onClose: () => void;
  onValidate: (isValid: boolean) => void;
}

export const CaptchaModal: React.FC<Props> = ({ visible, onClose, onValidate }) => {
  const [challenge, setChallenge] = useState<CaptchaChallenge>(generateCaptcha);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setChallenge(generateCaptcha());
      setAnswer('');
      setError(null);
    }
  }, [visible]);

  const handleSubmit = () => {
    const isValid = validateCaptcha(challenge, answer);
    if (!isValid) {
      setError('Cevap doğru değil, tekrar deneyin.');
      setChallenge(generateCaptcha());
      setAnswer('');
      onValidate(false);
      return;
    }
    onValidate(true);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <Text style={styles.title}>Ben robot değilim</Text>
          <Text style={styles.subtitle}>Soruyu cevaplayarak devam edin.</Text>
          <View style={styles.challengeBox}>
            <Text style={styles.challengeText}>{challenge.prompt}</Text>
          </View>
          <TextField
            value={answer}
            onChangeText={setAnswer}
            keyboardType="numeric"
            placeholder="Cevabınızı girin"
            errorMessage={error ?? undefined}
          />
          <PrimaryButton label="Doğrula" onPress={handleSubmit} />
          <Pressable onPress={() => setChallenge(generateCaptcha())} style={styles.refreshButton}>
            <Text style={styles.refreshText}>Yeni soru üret</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 10, 25, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  container: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  challengeBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  challengeText: {
    ...typography.headline,
    color: colors.accent,
  },
  refreshButton: {
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  refreshText: {
    ...typography.caption,
    color: colors.muted,
    textDecorationLine: 'underline',
  },
});
