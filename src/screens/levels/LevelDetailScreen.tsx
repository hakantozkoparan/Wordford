import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { GradientBackground } from '@/components/GradientBackground';
import { ScreenContainer } from '@/components/ScreenContainer';
import { TextField } from '@/components/TextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, radius, spacing, typography, palette } from '@/theme';
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
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const { control, handleSubmit, reset, watch } = useForm<FormValues>({ defaultValues: { answer: '' } });

  useEffect(() => {
    loadLevelWords(level as LevelCode).catch(() => undefined);
  }, [level, loadLevelWords]);

  const words = useMemo(() => wordsByLevel[level as LevelCode] ?? [], [level, wordsByLevel]);
  const word = words[index];

  // Tüm kelimelerin durumunu kontrol et
  const allWordsMastered = useMemo(() => {
    if (words.length === 0) return false;
    return words.every((w) => {
      const progress = progressMap[w.id];
      return progress?.status === 'mastered';
    });
  }, [words, progressMap]);

  useEffect(() => {
    if (!word) return;
    const progress = progressMap[word.id];
    setFavorite(progress?.isFavorite ?? false);
    setRevealed(false);
    setFeedback(null);
    setError(null);
    reset({ answer: '' });
  }, [word, progressMap, reset]);

  // Başarı kutlaması göster
  useEffect(() => {
    if (allWordsMastered && words.length > 0) {
      setShowCelebration(true);
    }
  }, [allWordsMastered, words.length]);

  const normalizedMeanings = (current: WordEntry | undefined) =>
    current?.meanings.map((meaning) => meaning.toLocaleLowerCase('tr-TR').trim()) ?? [];

  const handleAnswer = handleSubmit(async ({ answer }) => {
    if (!word) return;
    const trimmed = answer.toLocaleLowerCase('tr-TR').trim();
    const isCorrect = normalizedMeanings(word).includes(trimmed);
    await recordAnswer(word, isCorrect);
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    setError(null);
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
    setError(null);
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

  // Başarı kutlaması ekranı
  if (showCelebration) {
    return (
      <GradientBackground>
        <ScreenContainer style={styles.centered}>
          <Animated.View entering={FadeIn.duration(600)} style={styles.celebrationCard}>
            <LinearGradient
              colors={[colors.accent, colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.celebrationGradient}
            >
              <Ionicons name="trophy" size={80} color={palette.white} />
              <Text style={styles.celebrationTitle}>Tebrikler! 🎉</Text>
              <Text style={styles.celebrationMessage}>
                {level} seviyesindeki tüm kelimeleri doğru bildiniz!
              </Text>
              <PrimaryButton
                label="Ana Sayfaya Dön"
                onPress={() => navigation.goBack()}
                style={styles.celebrationButton}
              />
            </LinearGradient>
          </Animated.View>
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
                  placeholder="Türkçe anlamını yazın"
                  autoCapitalize="none"
                  editable={feedback !== 'correct'}
                />
              )}
            />
            
            {/* Feedback kartı */}
            {feedback && (
              <Animated.View entering={FadeInUp.duration(400)} style={[
                styles.feedbackCard,
                feedback === 'correct' ? styles.feedbackSuccess : styles.feedbackError
              ]}>
                <View style={styles.feedbackContent}>
                  <Ionicons
                    name={feedback === 'correct' ? 'checkmark-circle' : 'close-circle'}
                    size={24}
                    color={feedback === 'correct' ? colors.accent : colors.danger}
                  />
                  <Text style={[
                    styles.feedbackText,
                    feedback === 'correct' ? styles.feedbackTextSuccess : styles.feedbackTextError
                  ]}>
                    {feedback === 'correct' ? 'Doğru bildin! 🎉' : 'Yanlış cevap, tekrar dene!'}
                  </Text>
                </View>
              </Animated.View>
            )}

            {error ? (
              <Animated.View entering={FadeInUp.duration(300)} style={styles.errorCard}>
                <Text style={styles.errorText}>{error}</Text>
              </Animated.View>
            ) : null}

            {/* Doğru cevap verilmediğinde kontrol butonu göster */}
            {feedback !== 'correct' && (
              <PrimaryButton label="Cevabı Kontrol Et" onPress={handleAnswer} />
            )}

            {/* Doğru cevap sonrası sonraki kelimeye geç butonu */}
            {feedback === 'correct' && (
              <Animated.View entering={FadeInUp.delay(200).duration(400)}>
                <PrimaryButton
                  label="Sonraki Kelime →"
                  onPress={goToNext}
                  variant="primary"
                />
              </Animated.View>
            )}

            <View style={styles.actionsRow}>
              <PrimaryButton
                label={revealed ? '👁️ Gösterildi' : '💡 Cevabı Göster'}
                onPress={handleReveal}
                variant="secondary"
                style={styles.flexButton}
                disabled={revealed}
              />
              <PrimaryButton
                label={favorite ? '⭐ Favori' : '☆ Favoriye Ekle'}
                variant={favorite ? 'primary' : 'secondary'}
                onPress={toggleFavorite}
                style={styles.flexButton}
              />
            </View>
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
    fontSize: 20,
    fontWeight: '700',
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
    minHeight: 160,
    justifyContent: 'center',
  },
  word: {
    ...typography.headline,
    fontSize: 40,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.sm,
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
    fontSize: 20,
    fontWeight: '600',
  },
  formSection: {
    gap: spacing.md,
  },
  feedbackCard: {
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 2,
  },
  feedbackSuccess: {
    backgroundColor: 'rgba(59, 226, 176, 0.1)',
    borderColor: colors.accent,
  },
  feedbackError: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderColor: colors.danger,
  },
  feedbackContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  feedbackText: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '600',
  },
  feedbackTextSuccess: {
    color: colors.accent,
  },
  feedbackTextError: {
    color: colors.danger,
  },
  errorCard: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    textAlign: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  flexButton: {
    flex: 1,
  },
  // Kutlama ekranı stilleri
  celebrationCard: {
    width: '100%',
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  celebrationGradient: {
    padding: spacing.xl * 2,
    alignItems: 'center',
    gap: spacing.lg,
  },
  celebrationTitle: {
    ...typography.headline,
    fontSize: 32,
    color: palette.white,
    fontWeight: '700',
  },
  celebrationMessage: {
    ...typography.body,
    fontSize: 18,
    color: palette.white,
    textAlign: 'center',
    opacity: 0.95,
  },
  celebrationButton: {
    marginTop: spacing.md,
    minWidth: 200,
  },
});
