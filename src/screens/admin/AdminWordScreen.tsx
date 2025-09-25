import { useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { nanoid } from 'nanoid/non-secure';

import { GradientBackground } from '@/components/GradientBackground';
import { ScreenContainer } from '@/components/ScreenContainer';
import { TextField } from '@/components/TextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { LevelCode, WordEntry } from '@/types/models';
import { spacing, typography, colors } from '@/theme';
import { LEVEL_CODES } from '@/constants/levels';
import { seedWordIfMissing } from '@/services/wordService';
import { useWords } from '@/context/WordContext';

const schema = yup.object({
  level: yup.mixed<LevelCode>().oneOf(LEVEL_CODES).required('Seviye zorunludur'),
  term: yup.string().required('Kelime zorunludur'),
  meanings: yup.string().required('Anlam zorunludur'),
});

interface FormValues {
  level: LevelCode;
  term: string;
  meanings: string;
  exampleSentence?: string;
}

export const AdminWordScreen: React.FC = () => {
  const { wordsByLevel, loadLevelWords } = useWords();
  const [submitting, setSubmitting] = useState(false);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: { level: 'A1', term: '', meanings: '', exampleSentence: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const normalizedMeanings = values.meanings
        .split(',')
        .map((meaning) => meaning.trim())
        .filter(Boolean);

      const newWord: WordEntry = {
        id: nanoid(10),
        level: values.level,
        term: values.term.trim(),
        meanings: normalizedMeanings,
        exampleSentence: values.exampleSentence?.trim(),
        synonyms: [],
      };

      const levelWords = wordsByLevel[values.level] ?? [];
      const exists = levelWords.some((word) => word.term.toLocaleLowerCase('tr-TR') === newWord.term.toLocaleLowerCase('tr-TR'));
      if (exists) {
        Alert.alert('Uyarı', 'Bu kelime zaten mevcut.');
        return;
      }

      await seedWordIfMissing(newWord);
      await loadLevelWords(values.level);
      Alert.alert('Başarılı', 'Kelime başarıyla eklendi.');
      reset({ level: values.level, term: '', meanings: '', exampleSentence: '' });
    } catch (error) {
      Alert.alert('Hata', (error as Error).message ?? 'Kelime eklenemedi.');
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <GradientBackground>
      <ScreenContainer>
        <View style={styles.header}>
          <Text style={styles.title}>Kelime Yönetimi</Text>
          <Text style={styles.subtitle}>Seviyelere yeni kelimeler ekleyin.</Text>
        </View>
        <View style={styles.form}>
          <Controller
            control={control}
            name="level"
            render={({ field: { value, onChange } }) => (
              <FlatList
                data={LEVEL_CODES}
                horizontal
                contentContainerStyle={styles.levelList}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <PrimaryButton
                    label={item}
                    variant={item === value ? 'primary' : 'secondary'}
                    onPress={() => onChange(item)}
                    style={styles.levelButton}
                  />
                )}
              />
            )}
          />
          <Controller
            control={control}
            name="term"
            render={({ field: { value, onChange } }) => (
              <TextField
                label="Kelime"
                value={value}
                onChangeText={onChange}
                errorMessage={errors.term?.message}
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
              />
            )}
          />
          <Controller
            control={control}
            name="exampleSentence"
            render={({ field: { value, onChange } }) => (
              <TextField
                label="Örnek Cümle"
                value={value}
                onChangeText={onChange}
              />
            )}
          />
          <PrimaryButton label="Kelimeyi Kaydet" onPress={onSubmit} loading={submitting} />
        </View>
      </ScreenContainer>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.subtitle,
    color: colors.textSecondary,
  },
  form: {
    gap: spacing.md,
  },
  levelList: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  levelButton: {
    minWidth: 60,
  },
});
