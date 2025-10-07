import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';

import { GradientBackground } from '@/components/GradientBackground';
import { ScreenContainer } from '@/components/ScreenContainer';
import { TextField } from '@/components/TextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, radius, spacing, typography } from '@/theme';
import { useWords } from '@/context/WordContext';
import { AppStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'WordExampleEdit'>;

export const EditExampleScreen: React.FC<Props> = ({ route, navigation }) => {
  const { level, wordId } = route.params;
  const { wordsByLevel, loadLevelWords, progressMap, saveExampleSentence } = useWords();
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const words = wordsByLevel[level] ?? [];
  const word = words.find((entry) => entry.id === wordId);
  const progress = progressMap[wordId];

  useEffect(() => {
    if (!word) {
      loadLevelWords(level).catch(() => undefined);
    }
  }, [word, level, loadLevelWords]);

  useEffect(() => {
    if (progress) {
      setDraft(progress.userExampleSentence ?? '');
    }
  }, [progress]);

  const referenceExample = useMemo(() => word?.exampleSentence ?? null, [word]);
  const isSaveDisabled = saving || draft.trim().length === 0;
  const isClearDisabled = saving || (!progress?.userExampleSentence && draft.trim().length === 0);

  const handleDraftChange = (value: string) => {
    setError(null);
    setDraft(value);
  };

  const handleSave = async () => {
    if (!word) {
      setError('Kelime yüklenemedi. Lütfen tekrar dene.');
      return;
    }

    const trimmed = draft.trim();
    if (!trimmed) {
      setError('Lütfen en az bir cümle yaz.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await saveExampleSentence(word, trimmed);
      navigation.goBack();
    } catch (err) {
      setError((err as Error).message ?? 'Cümle kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!word) {
      setError('Kelime yüklenemedi. Lütfen tekrar dene.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await saveExampleSentence(word, '');
      setDraft('');
      navigation.goBack();
    } catch (err) {
      setError((err as Error).message ?? 'Cümle silinemedi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <GradientBackground paddingTop={spacing.md}>
      <ScreenContainer style={styles.container} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topBar}>
            <TouchableOpacity onPress={navigation.goBack} style={styles.backButton} accessibilityRole="button">
              <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <View style={styles.header}>
            <Text style={styles.title}>{word?.term ?? 'Örnek Cümle'}</Text>
            <Text style={styles.subtitle}>
              Kelimeyi aklında tutmak için kendi örnek cümleni yaz veya düzenle.
            </Text>
          </View>

          {referenceExample ? (
            <View style={styles.referenceCard}>
              <Text style={styles.referenceTitle}>Sözlük Cümlesi</Text>
              <Text style={styles.referenceBody}>{referenceExample}</Text>
            </View>
          ) : null}

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Senin Cümlen</Text>
            <TextField
              value={draft}
              onChangeText={handleDraftChange}
              placeholder="Örnek: Bu kelimeyi günlük konuşmamda kullanmak istiyorum."
              multiline
              numberOfLines={5}
              autoCapitalize="sentences"
              style={styles.textArea}
              containerStyle={styles.textAreaContainer}
              editable={!saving}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          <View style={styles.actions}>
            <PrimaryButton
              label="Temizle"
              onPress={handleClear}
              variant="ghost"
              size="compact"
              disabled={isClearDisabled}
              style={styles.actionButton}
            />
            <PrimaryButton
              label={saving ? 'Kaydediliyor...' : 'Kaydet'}
              onPress={handleSave}
              size="compact"
              disabled={isSaveDisabled}
              loading={saving}
              style={styles.actionButton}
            />
          </View>
        </ScrollView>
      </ScreenContainer>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 0,
  },
  content: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(12, 18, 41, 0.55)',
  },
  header: {
    gap: spacing.sm,
  },
  title: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  referenceCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: spacing.lg,
    gap: spacing.xs,
  },
  referenceTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  referenceBody: {
    ...typography.body,
    color: colors.textPrimary,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  fieldLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  textAreaContainer: {
    minHeight: 160,
  },
  textArea: {
    minHeight: 160,
    textAlignVertical: 'top',
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
});
