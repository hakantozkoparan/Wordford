import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { GradientBackground } from '@/components/GradientBackground';
import { ScreenContainer } from '@/components/ScreenContainer';
import { TextField } from '@/components/TextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, radius, spacing, typography } from '@/theme';
import { useWords } from '@/context/WordContext';
import { useAuth } from '@/context/AuthContext';
import { AppStackParamList } from '@/navigation/types';
import { LevelCode, WordEntry } from '@/types/models';
import { shouldShowInterstitial, showInterstitialAd } from '@/services/adService';

interface FormValues {
  answer: string;
}

type Props = NativeStackScreenProps<AppStackParamList, 'LevelDetail'>;

export const LevelDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { level } = route.params;
  const { wordsByLevel, loadLevelWords, toggleFavoriteWord, markHintUsed, progressMap, recordAnswer } = useWords();
  const { profile, spendCredit, spendHintToken } = useAuth();
  const [index, setIndex] = useState(route.params.index ?? 0);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, reset, watch } = useForm<FormValues>({ defaultValues: { answer: '' } });

  useEffect(() => {
    loadLevelWords(level as LevelCode).catch(() => undefined);
  }, [level, loadLevelWords]);

  const words = useMemo(() => wordsByLevel[level as LevelCode] ?? [], [level, wordsByLevel]);
  const word = words[index];

  useEffect(() => {
    if (!word) return;
    const progress = progressMap[word.id];
    setFavorite(progress?.isFavorite ?? false);
    setRevealed(false);
    setFeedback(null);
    reset({ answer: '' });
  }, [word, progressMap, reset]);

  const normalizedMeanings = (current: WordEntry | undefined) =>
    current?.meanings.map((meaning) => meaning.toLocaleLowerCase('tr-TR').trim()) ?? [];

  const handleAnswer = handleSubmit(async ({ answer }) => {
    if (!word) return;
    const trimmed = answer.toLocaleLowerCase('tr-TR').trim();
    const isCorrect = normalizedMeanings(word).includes(trimmed);
    await recordAnswer(word, isCorrect);
    setFeedback(isCorrect ? 'Doğru! Harika ilerliyorsun.' : 'Yanlış cevap, tekrar dene.');
  });

  const handleReveal = async () => {
    if (!word || revealed) return;
    try {
      if ((profile?.dailyHintTokens ?? 0) > 0) {
        await spendHintToken();
      } else if ((profile?.dailyCredits ?? 0) > 0) {
        await spendCredit(1);
      } else {
        setError('Yeterli yıldız veya krediniz yok.');
        return;
      }
      await markHintUsed(word);
      setRevealed(true);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const goToNext = () => {
    if (words.length === 0) return;
    const nextIndex = (index + 1) % words.length;
    setIndex(nextIndex);
    setFeedback(null);
    setRevealed(false);
    reset({ answer: '' });
    if (shouldShowInterstitial()) {
      showInterstitialAd().catch(() => undefined);
    }
  };

  const toggleFavorite = async () => {
    if (!word) return;
    const next = !favorite;
    setFavorite(next);
    await toggleFavoriteWord(word, next);
  };

  if (!word) {
    return (
      <GradientBackground>
        <ScreenContainer style={styles.centered}>
          <Text style={styles.emptyText}>Bu seviyede kelime bulunamadı.</Text>
        </ScreenContainer>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <ScreenContainer style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <View style={styles.header}>
            <Text style={styles.levelBadge}>{level}</Text>
            <Text style={styles.wordIndex}>
              {index + 1} / {words.length}
            </Text>
          </View>
          <Animated.View entering={FadeInUp} style={styles.wordCard}>
            <Text style={styles.word}>{word.term}</Text>
            {revealed ? (
              <Text style={styles.revealText}>{word.meanings.join(', ')}</Text>
            ) : (
              <Text style={styles.prompt}>Türkçe karşılığını yaz.</Text>
            )}
          </Animated.View>
          <View style={styles.formSection}>
            <Controller
              control={control}
              name="answer"
              render={({ field: { value, onChange } }) => (
                <TextField
                  value={value}
                  onChangeText={onChange}
                  placeholder="Cevap"
                  autoCapitalize="none"
                />
              )}
            />
            {feedback ? <Text style={feedback.includes('Doğru') ? styles.success : styles.feedback}>{feedback}</Text> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton label="Cevabı Kontrol Et" onPress={handleAnswer} />
            <View style={styles.actionsRow}>
              <PrimaryButton
                label={revealed ? 'Sonraki Kelime' : 'Cevabı Göster'}
                onPress={revealed ? goToNext : handleReveal}
                variant={revealed ? 'secondary' : 'primary'}
                style={styles.flexButton}
              />
              <PrimaryButton
                label={favorite ? 'Favoriden Çıkar' : 'Favoriye Ekle'}
                variant={favorite ? 'secondary' : 'primary'}
                onPress={toggleFavorite}
                style={styles.flexButton}
              />
            </View>
            {feedback?.includes('Doğru') ? (
              <PrimaryButton label="Sıradaki" onPress={goToNext} variant="secondary" />
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </ScreenContainer>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xl,
  },
  flex: { flex: 1 },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...typography.subtitle,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  levelBadge: {
    ...typography.title,
    color: colors.accent,
  },
  wordIndex: {
    ...typography.subtitle,
    color: colors.textSecondary,
  },
  wordCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  word: {
    ...typography.headline,
    fontSize: 36,
    color: colors.textPrimary,
  },
  prompt: {
    ...typography.subtitle,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  revealText: {
    ...typography.title,
    color: colors.accent,
    marginTop: spacing.md,
  },
  formSection: {
    gap: spacing.sm,
  },
  feedback: {
    ...typography.body,
    color: colors.danger,
  },
  success: {
    ...typography.body,
    color: colors.accent,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  flexButton: {
    flex: 1,
  },
});
