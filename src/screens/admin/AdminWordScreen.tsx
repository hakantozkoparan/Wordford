import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { nanoid } from 'nanoid/non-secure';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

import { GradientBackground } from '@/components/GradientBackground';
import { ScreenContainer } from '@/components/ScreenContainer';
import { TextField } from '@/components/TextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { LevelCode, WordEntry } from '@/types/models';
import { spacing, typography, colors, radius, palette } from '@/theme';
import { LEVEL_CODES } from '@/constants/levels';
import { seedWordIfMissing } from '@/services/wordService';
import { useWords } from '@/context/WordContext';
import { AppStackParamList } from '@/navigation/types';

const schema = yup.object({
  level: yup.mixed<LevelCode>().oneOf(LEVEL_CODES).required('Seviye zorunludur'),
  term: yup.string().required('Kelime zorunludur'),
  meanings: yup.string().required('Anlam zorunludur'),
});

interface FormValues {
  level: LevelCode;
  term: string;
  meanings: string;
}

export const AdminWordScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const { wordsByLevel, loadLevelWords } = useWords();
  const [submitting, setSubmitting] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkSummary, setBulkSummary] = useState<string | null>(null);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: { level: 'A1', term: '', meanings: '' },
  });

  const selectedLevel = watch('level');

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const normalizedMeanings = values.meanings
        .split(',')
        .map((meaning: string) => meaning.trim())
        .filter(Boolean);

      const newWord: WordEntry = {
        id: nanoid(10),
        level: values.level,
        term: values.term.trim(),
        meanings: normalizedMeanings,
        synonyms: [],
      };

      const levelWords = wordsByLevel[values.level] ?? [];
      const exists = levelWords.some((word: WordEntry) => word.term.toLocaleLowerCase('tr-TR') === newWord.term.toLocaleLowerCase('tr-TR'));
      if (exists) {
        Alert.alert('Uyarı', 'Bu kelime zaten mevcut.');
        return;
      }

      await seedWordIfMissing(newWord);
      await loadLevelWords(values.level);
      Alert.alert('Başarılı', 'Kelime başarıyla eklendi.');
      reset({ level: values.level, term: '', meanings: '' });
    } catch (error) {
      Alert.alert('Hata', (error as Error).message ?? 'Kelime eklenemedi.');
    } finally {
      setSubmitting(false);
    }
  });

  const handleBulkAdd = async () => {
    const level = selectedLevel;
    if (!level) {
      Alert.alert('Uyarı', 'Lütfen önce bir seviye seçin.');
      return;
    }

    const lines = bulkText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      Alert.alert('Uyarı', 'Lütfen eklenecek kelimeleri girin.');
      return;
    }

    setBulkSubmitting(true);
    setBulkSummary(null);
    setBulkErrors([]);

    const currentWords = wordsByLevel[level] ?? [];
    const knownTerms = new Set(
      currentWords.map((word: WordEntry) => word.term.toLocaleLowerCase('tr-TR')),
    );

    let successCount = 0;
    const failed: string[] = [];

    for (const rawLine of lines) {
      const [termPart, ...rest] = rawLine.split('-');
      const meaningsPart = rest.join('-');
      const term = termPart?.trim() ?? '';
      const meanings = meaningsPart
        .split(',')
        .map((meaning) => meaning.trim())
        .filter(Boolean);

      if (!term || meanings.length === 0) {
        failed.push(`${rawLine} • format hatası`);
        continue;
      }

      const normalizedTerm = term.toLocaleLowerCase('tr-TR');
      if (knownTerms.has(normalizedTerm)) {
        failed.push(`${rawLine} • zaten mevcut`);
        continue;
      }

      const newWord: WordEntry = {
        id: nanoid(10),
        level,
        term,
        meanings,
        synonyms: [],
      };

      try {
        await seedWordIfMissing(newWord);
        knownTerms.add(normalizedTerm);
        successCount += 1;
      } catch (error) {
        failed.push(`${rawLine} • ${(error as Error).message ?? 'kaydedilemedi'}`);
      }
    }

    if (successCount > 0) {
      await loadLevelWords(level);
      setBulkText('');
    }

    const summaryMessage = `${successCount} kelime eklendi${failed.length ? `, ${failed.length} satır atlandı` : ''}.`;
    setBulkSummary(summaryMessage);
    setBulkErrors(failed);
    setBulkSubmitting(false);

    Alert.alert(
      failed.length ? 'Toplu ekleme tamamlandı' : 'Toplu ekleme başarılı',
      summaryMessage,
    );
  };

  return (
    <GradientBackground paddingTop={spacing.lg}>
      <ScreenContainer style={styles.container} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Geri dön"
            >
              <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <LinearGradient
            colors={['rgba(123, 97, 255, 0.32)', 'rgba(90, 227, 194, 0.18)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroIconWrapper}>
              <Ionicons name="sparkles" size={30} color={colors.textPrimary} />
            </View>
            <View style={styles.heroTextGroup}>
              <Text style={styles.title}>Kelime Yönetimi</Text>
              <Text style={styles.subtitle}>Seviyelere yeni kelimeler ekleyin ve anlamlarını yönetin.</Text>
            </View>
          </LinearGradient>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Yeni kelime ekle</Text>
            <Text style={styles.sectionDescription}>
              Kelimeyi ve anlamlarını girdikten sonra seviyeye ekleyebilirsiniz. Anlamları virgülle ayırmayı unutmayın.
            </Text>

            <View style={styles.formSection}>
              <Text style={styles.sectionLabel}>Seviye seçin</Text>
              <Controller
                control={control}
                name="level"
                render={({ field: { value, onChange } }) => (
                  <View style={styles.levelGrid}>
                    {LEVEL_CODES.map((item) => (
                      <TouchableOpacity
                        key={item}
                        style={[
                          styles.levelBox,
                          item === value && styles.levelBoxActive,
                        ]}
                        onPress={() => onChange(item)}
                      >
                        <Text
                          style={[
                            styles.levelBoxText,
                            item === value && styles.levelBoxTextActive,
                          ]}
                        >
                          {item}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              />
            </View>

            <View style={styles.inputStack}>
              <Controller
                control={control}
                name="term"
                render={({ field: { value, onChange } }) => (
                  <TextField
                    label="Kelime"
                    value={value}
                    onChangeText={onChange}
                    errorMessage={errors.term?.message}
                    containerStyle={styles.inputContainer}
                  />
                )}
              />
              <Controller
                control={control}
                name="meanings"
                render={({ field: { value, onChange } }) => (
                  <TextField
                    label="Anlamlar"
                    placeholder="Virgülle ayırın"
                    value={value}
                    onChangeText={onChange}
                    errorMessage={errors.meanings?.message}
                    containerStyle={styles.inputContainer}
                  />
                )}
              />
            </View>

            <PrimaryButton
              label="Kelimeyi Kaydet"
              onPress={onSubmit}
              loading={submitting}
            />
          </View>

          <View style={styles.bulkCard}>
            <Text style={styles.sectionTitle}>Toplu ekle</Text>
            <Text style={styles.sectionDescription}>
              Her satırı <Text style={styles.inlineCode}>kelime - anlam1, anlam2</Text> formatında yaz. Anlamları virgülle ayırabilirsin.
            </Text>

            <View style={styles.bulkExampleBox}>
              <Text style={styles.bulkExampleLabel}>Örnek</Text>
              <Text style={styles.bulkExampleLine}>kitap - book, volume</Text>
              <Text style={styles.bulkExampleLine}>hızlı - fast, quick</Text>
            </View>

            <TextField
              label="Kelime listesi"
              placeholder="kelime - anlam1, anlam2"
              value={bulkText}
              onChangeText={setBulkText}
              multiline
              numberOfLines={7}
              style={styles.bulkTextArea}
              containerStyle={styles.bulkInputContainer}
              editable={!bulkSubmitting}
            />

            {bulkSummary ? <Text style={styles.bulkSummary}>{bulkSummary}</Text> : null}

            {bulkErrors.length ? (
              <View style={styles.bulkErrorList}>
                <Text style={styles.bulkErrorsTitle}>İşlenemeyen satırlar</Text>
                {bulkErrors.slice(0, 5).map((item, index) => (
                  <Text key={`${item}-${index}`} style={styles.bulkErrorItem}>
                    {item}
                  </Text>
                ))}
                {bulkErrors.length > 5 ? (
                  <Text style={styles.bulkErrorMore}>... ve {bulkErrors.length - 5} satır daha</Text>
                ) : null}
              </View>
            ) : null}

            <PrimaryButton
              label={bulkSubmitting ? 'Ekleniyor...' : 'Toplu olarak ekle'}
              onPress={handleBulkAdd}
              loading={bulkSubmitting}
              disabled={bulkSubmitting}
              variant="secondary"
              icon="cloud-upload-outline"
              iconColor={colors.accent}
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
  scrollContent: {
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
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
  heroCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  heroIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(12, 18, 41, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextGroup: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.subtitle,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: 'rgba(12, 18, 41, 0.55)',
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    gap: spacing.lg,
  },
  sectionTitle: {
    ...typography.title,
    color: colors.textPrimary,
  },
  sectionDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  formSection: {
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  levelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  levelBox: {
    flexBasis: '31%',
    minWidth: 96,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
  },
  levelBoxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  levelBoxText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 17,
  },
  levelBoxTextActive: {
    color: palette.white,
  },
  inputStack: {
    gap: spacing.md,
  },
  inputContainer: {
    marginBottom: 0,
  },
  bulkCard: {
    backgroundColor: 'rgba(12, 18, 41, 0.45)',
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: spacing.md,
  },
  inlineCode: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm,
    color: colors.textPrimary,
  },
  bulkExampleBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  bulkExampleLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  bulkExampleLine: {
    ...typography.body,
    color: colors.textPrimary,
  },
  bulkTextArea: {
    minHeight: 160,
    textAlignVertical: 'top',
  },
  bulkInputContainer: {
    marginBottom: 0,
  },
  bulkSummary: {
    ...typography.caption,
    color: colors.accent,
  },
  bulkErrorList: {
    backgroundColor: 'rgba(255, 86, 86, 0.08)',
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 86, 86, 0.2)',
  },
  bulkErrorsTitle: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  bulkErrorItem: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  bulkErrorMore: {
    ...typography.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});
