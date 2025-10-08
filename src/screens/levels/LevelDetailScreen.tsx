import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  const hasInitialIndex = route.params.index !== undefined;
  const initialIndexRef = useRef(hasInitialIndex);
  const {
    wordsByLevel,
    loadLevelWords,
    toggleFavoriteWord,
    markHintUsed,
    progressMap,
    recordAnswer,
    saveExampleSentence,
  } = useWords();
  const { profile, spendEnergy, spendRevealToken } = useAuth();
  const [index, setIndex] = useState(route.params.index ?? 0);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualCelebration, setManualCelebration] = useState(false);
  const [exampleDraft, setExampleDraft] = useState('');
  const [savingExample, setSavingExample] = useState(false);
  const [exampleSaved, setExampleSaved] = useState(false);
  const [exampleError, setExampleError] = useState<string | null>(null);
  const { control, handleSubmit, reset } = useForm<FormValues>({ defaultValues: { answer: '' } });

  useEffect(() => {
    setManualCelebration(false);
    initialIndexRef.current = hasInitialIndex;
  }, [level]);

  useEffect(() => {
    loadLevelWords(level as LevelCode).catch(() => undefined);
  }, [level, loadLevelWords]);

  const words = useMemo(() => wordsByLevel[level as LevelCode] ?? [], [level, wordsByLevel]);
  const word = words[index];
  const progress = word ? progressMap[word.id] : undefined;
  const hasPendingWords = useMemo(
    () => words.some((entry) => progressMap[entry.id]?.status !== 'mastered'),
    [words, progressMap],
  );
  const areAllWordsMastered = words.length > 0 && !hasPendingWords;
  const shouldShowMeaning = revealed || feedback === 'correct';
  const showExampleSection = feedback === 'correct' || exampleSaved;
  const showIncorrectFeedback = feedback === 'incorrect';
  const showErrorCard = Boolean(error);
  const showFavoriteAction = feedback === 'correct';
  const showRevealAction = feedback !== 'correct';
  const totalEnergy = Math.max((profile?.dailyEnergy ?? 0) + (profile?.bonusEnergy ?? 0), 0);
  const totalRevealTokens = Math.max(
    (profile?.dailyRevealTokens ?? 0) + (profile?.bonusRevealTokens ?? 0),
    0,
  );

  useEffect(() => {
    if (words.length === 0) {
      if (index !== 0) {
        setIndex(0);
      }
      return;
    }
    if (index >= words.length) {
      setIndex(0);
    }
  }, [words, index]);

  const shouldShowCelebrationScreen =
    manualCelebration || (areAllWordsMastered && feedback !== 'correct');

  useEffect(() => {
    if (initialIndexRef.current) {
      return;
    }

    if (words.length === 0) {
      return;
    }

    const firstPendingIndex = words.findIndex((entry) => progressMap[entry.id]?.status !== 'mastered');

    if (firstPendingIndex === -1) {
      initialIndexRef.current = true;
      return;
    }

    if (firstPendingIndex !== index) {
      setIndex(firstPendingIndex);
    }

    initialIndexRef.current = true;
  }, [words, progressMap, index]);

  useEffect(() => {
    if (hasPendingWords && manualCelebration) {
      setManualCelebration(false);
    }
  }, [hasPendingWords, manualCelebration]);

  useEffect(() => {
    if (!word) return;
    const progressEntry = progressMap[word.id];
      setFavorite(progressEntry?.isFavorite ?? false);
      setRevealed(false);
      setFeedback(null);
      setManualCelebration(false);
      setError(null);
      setExampleError(null);
      setSavingExample(false);
    const initialExample = progressEntry?.userExampleSentence ?? '';
    setExampleDraft(initialExample);
    setExampleSaved(Boolean(initialExample));
    reset({ answer: '' });
  }, [word, reset]); // progressMap bağımlılığını kaldırdık - sadece kelime değiştiğinde sıfırlansın

  // Favori durumunu ayrı bir effect'te güncelleyelim ki feedback'i etkilemesin
  useEffect(() => {
    if (!word) return;
    const progressEntry = progressMap[word.id];
    setFavorite(progressEntry?.isFavorite ?? false);
    const storedExample = progressEntry?.userExampleSentence ?? '';
    setExampleDraft(storedExample);
    setExampleSaved(Boolean(storedExample));
  }, [word, progressMap]);

  const normalizedMeanings = (current: WordEntry | undefined) =>
    current?.meanings.map((meaning) => meaning.toLocaleLowerCase('tr-TR').trim()) ?? [];

  const handleAnswer = handleSubmit(async ({ answer }) => {
    if (!word) return;

    const trimmed = answer.toLocaleLowerCase('tr-TR').trim();
    const isCorrect = normalizedMeanings(word).includes(trimmed);
    const availableEnergy = (profile?.dailyEnergy ?? 0) + (profile?.bonusEnergy ?? 0);

    if (availableEnergy <= 0) {
      setFeedback(null);
      setError('Enerji hakkınız kalmadı. Cevabı kontrol edebilmek için daha fazla enerji gerekiyor.');
      return;
    }

    setError(null);

    try {
      await spendEnergy(1);
    } catch (err) {
      setFeedback(null);
      setError((err as Error).message ?? 'Enerji harcanamadı.');
      return;
    }

    setFeedback(isCorrect ? 'correct' : 'incorrect');

    try {
      await recordAnswer(word, isCorrect);
    } catch (err) {
      setFeedback(null);
      setError((err as Error).message ?? 'Cevap kaydedilemedi.');
    }
  });

  const handleReveal = async () => {
    if (!word || revealed) return;
    try {
      const availableRevealTokens =
        (profile?.dailyRevealTokens ?? 0) + (profile?.bonusRevealTokens ?? 0);
      const availableEnergy = (profile?.dailyEnergy ?? 0) + (profile?.bonusEnergy ?? 0);

      if (availableRevealTokens > 0) {
        await spendRevealToken();
      } else if (availableEnergy > 0) {
        await spendEnergy(1);
      } else {
        setError('Yeterli cevabı göster hakkınız veya enerjiniz yok.');
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

    const currentWord = words[index];
    if (!currentWord) return;
    const nextIndex = index + 1;
    const reachedEnd = nextIndex >= words.length;

    if (reachedEnd) {
      setManualCelebration(true);
    } else {
      setManualCelebration(false);
      setIndex(nextIndex);
    }
    setFeedback(null);
    setRevealed(false);
    setError(null);
    reset({ answer: '' });
    if (!reachedEnd && shouldShowInterstitial()) {
      showInterstitialAd().catch(() => undefined);
    }
  };

  const toggleFavorite = async () => {
    if (!word) return;
    const next = !favorite;
    setFavorite(next);
    await toggleFavoriteWord(word, next);
  };

  const handleSaveExample = async () => {
    if (!word) return;
    const trimmed = exampleDraft.trim();
    if (trimmed.length === 0) {
      setExampleError('Örnek cümle boş olamaz.');
      return;
    }
    setSavingExample(true);
    setExampleError(null);
    try {
      await saveExampleSentence(word, trimmed);
      setExampleSaved(true);
    } catch (err) {
      setExampleError((err as Error).message ?? 'Cümle kaydedilemedi.');
    } finally {
      setSavingExample(false);
    }
  };

  if (!word) {
    return (
      <GradientBackground>
        <ScreenContainer style={styles.centered} edges={['top', 'left', 'right']}>
          <Text style={styles.emptyText}>Bu seviyede kelime bulunamadı.</Text>
        </ScreenContainer>
      </GradientBackground>
    );
  }

  // Başarı kutlaması ekranı
  if (shouldShowCelebrationScreen) {
    return (
      <GradientBackground>
        <ScreenContainer
          style={styles.celebrationScreen}
          contentStyle={styles.celebrationScreenContent}
          edges={['top', 'left', 'right']}
        >
          <Animated.View entering={FadeIn.duration(600)} style={styles.celebrationContent}>
            <Ionicons name="trophy" size={94} color={colors.accent} />
            <Text style={styles.celebrationTitle}>Tebrikler! 🎉</Text>
            <Text style={styles.celebrationHighlight}>
              {level} seviyesindeki tüm kelimeleri tamamladın.
            </Text>
            <Text style={styles.celebrationMessage}>
              Hazırsan yeni bir seviyeye geçebilir veya kelimelerini tekrar edebilirsin.
            </Text>
            <Text style={styles.celebrationMessage}>
              Bu seviye için yeni bir kelime eklendiği zaman tekrar devam edebileceksin.
            </Text>
            <View style={styles.celebrationActions}>
              <PrimaryButton
                label="Ana Sayfaya Dön"
                onPress={() => navigation.goBack()}
                size="default"
                style={styles.celebrationButton}
                icon="home-outline"
                iconColor={colors.textPrimary}
              />
              <PrimaryButton
                label="Kelimelerime Git"
                onPress={() => navigation.navigate('Tabs', { screen: 'Words' } as never)}
                variant="secondary"
                size="default"
                style={styles.celebrationSecondaryButton}
                icon="book-outline"
                iconColor={colors.accent}
              />
            </View>
          </Animated.View>
  </ScreenContainer>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <ScreenContainer style={styles.container} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.topMeta}>
              <View style={[styles.sideSlot, styles.sideSlotLeft]}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                  <Ionicons name="arrow-back" size={20} color={colors.accent} />
                </TouchableOpacity>
              </View>
              <View style={styles.levelChipWrapper}>
                <View style={styles.levelChip}>
                  <Ionicons name="book" size={18} color={colors.accent} />
                  <Text style={styles.levelChipText}>{level} Seviye</Text>
                </View>
              </View>
              <View style={[styles.sideSlot, styles.sideSlotRight]}>
                <View style={styles.indexChip}>
                  <Ionicons name="list" size={16} color={colors.textSecondary} />
                  <Text style={styles.indexChipText}>
                    {index + 1} / {words.length}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.resourceRow}>
              <View style={[styles.resourceItem, styles.resourceItemEnergy]}>
                <Ionicons name="flash" size={18} color={colors.accent} />
                <Text style={styles.resourceValue}>{totalEnergy}</Text>
              </View>
              <View style={[styles.resourceItem, styles.resourceItemReveal]}>
                <Ionicons name="eye" size={18} color={colors.warning} />
                <Text style={styles.resourceValue}>{totalRevealTokens}</Text>
              </View>
            </View>

            <Animated.View entering={FadeInUp} style={styles.wordCardWrapper}>
              <LinearGradient
                colors={[colors.card, 'rgba(123, 97, 255, 0.25)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.wordGradient}
              >
                <Text style={styles.word}>{word.term}</Text>
                <Text style={shouldShowMeaning ? styles.revealText : styles.prompt}>
                  {shouldShowMeaning ? word.meanings.join(', ') : 'Türkçe karşılığını yaz.'}
                </Text>
                <View style={styles.cardForm}>
                  <Controller
                    control={control}
                    name="answer"
                    render={({ field: { value, onChange } }) => (
                      <TextField
                        containerStyle={styles.answerFieldContainer}
                        value={value}
                        onChangeText={onChange}
                        placeholder="Türkçe anlamını yazın"
                        autoCapitalize="none"
                        editable={feedback !== 'correct'}
                        returnKeyType="done"
                        blurOnSubmit
                        style={[
                          styles.answerInput,
                          feedback === 'correct'
                            ? styles.answerInputWithSuccess
                            : styles.answerInputDefault,
                        ]}
                      />
                    )}
                  />
                  {feedback === 'correct' && (
                    <Animated.View
                      entering={FadeInUp.duration(400)}
                      style={[styles.feedbackCard, styles.feedbackSuccess, styles.successInline]}
                    >
                      <View style={styles.feedbackContent}>
                        <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
                        <Text style={[styles.feedbackText, styles.feedbackTextSuccess]}>
                          Doğru bildin! 🎉
                        </Text>
                      </View>
                    </Animated.View>
                  )}
                  <PrimaryButton
                    label={feedback === 'correct' ? 'Sonraki Kelime →' : 'Kontrol Et'}
                    onPress={feedback === 'correct' ? goToNext : handleAnswer}
                    size="compact"
                    style={styles.controlButton}
                  />
                  <View style={styles.actionsRow}>
                    {showRevealAction && (
                      <PrimaryButton
                        label={revealed ? 'Gösterildi' : 'Cevabı Göster'}
                        onPress={handleReveal}
                        variant="ghost"
                        size="compact"
                        style={styles.flexButton}
                        disabled={revealed}
                        icon={revealed ? 'eye-off' : 'eye'}
                        iconColor={revealed ? colors.textSecondary : colors.accent}
                      />
                    )}
                    {showFavoriteAction && (
                      <PrimaryButton
                        label={favorite ? 'Favoriye Eklendi' : 'Favoriye Ekle'}
                        variant={favorite ? 'success' : 'ghost'}
                        onPress={toggleFavorite}
                        size="compact"
                        style={styles.flexButton}
                        icon={favorite ? 'star' : 'star-outline'}
                        iconColor={colors.accent}
                      />
                    )}
                  </View>
                </View>
              </LinearGradient>
            </Animated.View>

            {showIncorrectFeedback && (
              <Animated.View
                entering={FadeInUp.duration(400)}
                style={[styles.feedbackCard, styles.feedbackError]}
              >
                <View style={styles.feedbackContent}>
                  <Ionicons name="close-circle" size={24} color={colors.danger} />
                  <Text style={[styles.feedbackText, styles.feedbackTextError]}>
                    Yanlış cevap, tekrar dene!
                  </Text>
                </View>
              </Animated.View>
            )}

            {showErrorCard ? (
              <Animated.View entering={FadeInUp.duration(300)} style={styles.errorCard}>
                <Text style={styles.errorText}>{error}</Text>
              </Animated.View>
            ) : null}
            {showExampleSection && (
              <LinearGradient
                colors={["rgba(59, 226, 176, 0.24)", "rgba(24, 147, 143, 0.06)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.exampleSection}
              >
                <View style={styles.exampleHeader}>
                  <View style={styles.exampleBadge}>
                    <Ionicons name="create-outline" size={18} color={colors.accent} />
                  </View>
                  <View style={styles.exampleHeaderText}>
                    <Text style={styles.exampleTitle}>Örnek cümle ekle</Text>
                    <Text style={styles.exampleSubtitle}>
                      Doğru bildiğin kelimeyi pekiştirmek için kısa bir cümle yaz.
                    </Text>
                  </View>
                </View>
                <TextField
                  containerStyle={styles.exampleFieldContainer}
                  value={exampleDraft}
                  onChangeText={(text) => {
                    setExampleDraft(text);
                    setExampleSaved(false);
                    setExampleError(null);
                  }}
                  placeholder="Örnek: I vividly remember this word in context."
                  multiline
                  numberOfLines={4}
                  autoCapitalize="sentences"
                  style={styles.exampleInput}
                  editable={!savingExample}
                />
                {exampleError ? (
                  <View style={styles.exampleFooter}>
                    <Text style={styles.exampleError}>{exampleError}</Text>
                  </View>
                ) : null}
                <PrimaryButton
                  label={savingExample ? 'Kaydediliyor...' : 'Cümleyi Kaydet'}
                  onPress={handleSaveExample}
                  variant="secondary"
                  size="compact"
                  style={styles.exampleButton}
                  disabled={savingExample || exampleDraft.trim().length === 0}
                  loading={savingExample}
                />
                {exampleSaved && !exampleError ? (
                  <View style={styles.exampleSavedContainer}>
                    <View style={styles.exampleSavedBadge}>
                      <Ionicons name="checkmark-outline" size={14} color={colors.accent} />
                      <Text style={styles.exampleSaved}>Kaydedildi</Text>
                    </View>
                  </View>
                ) : null}
              </LinearGradient>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </ScreenContainer>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.lg,
    marginTop: -spacing.lg,
  },
  flex: { flex: 1 },
  scrollContent: {
    paddingBottom: spacing.lg,
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebrationScreen: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  celebrationScreenContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    gap: spacing.lg,
  },
  celebrationContent: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.subtitle,
    color: colors.textSecondary,
  },
  topMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  sideSlot: {
    width: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideSlotLeft: {
    alignItems: 'flex-start',
  },
  sideSlotRight: {
    alignItems: 'flex-end',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(12, 20, 40, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(59, 226, 176, 0.45)',
  },
  levelChipWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(154, 140, 255, 0.18)',
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(154, 140, 255, 0.45)',
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
    alignSelf: 'center',
    flexShrink: 0,
  },
  levelChipText: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontWeight: '700',
    letterSpacing: 0.6,
    textAlign: 'center',
    flexShrink: 0,
  },
  indexChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(94, 106, 146, 0.2)',
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  indexChipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  resourceRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(12, 20, 40, 0.6)',
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
  },
  resourceItemEnergy: {
    borderColor: 'rgba(59, 226, 176, 0.45)',
  },
  resourceItemReveal: {
    borderColor: 'rgba(255, 179, 71, 0.45)',
  },
  resourceValue: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  wordCardWrapper: {
    marginBottom: spacing.xs,
  },
  wordGradient: {
    borderRadius: radius.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(154, 140, 255, 0.25)',
    gap: spacing.sm,
    alignItems: 'stretch',
  },
  word: {
    ...typography.headline,
    fontSize: 34,
    color: colors.textPrimary,
    fontWeight: '700',
    textAlign: 'center',
  },
  prompt: {
    ...typography.subtitle,
    color: colors.textSecondary,
    marginTop: 0,
    textAlign: 'center',
    lineHeight: 18,
  },
  revealText: {
    ...typography.title,
    color: colors.accent,
    marginTop: 0,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },
  cardForm: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  answerInput: {
    minHeight: 52,
    fontSize: 16,
  },
  answerFieldContainer: {
    marginBottom: spacing.xs,
  },
  answerInputDefault: {
    marginBottom: 0,
  },
  answerInputWithSuccess: {
    marginBottom: 0,
  },
  feedbackCard: {
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  feedbackSuccess: {
    backgroundColor: 'rgba(59, 226, 176, 0.12)',
    borderColor: 'rgba(59, 226, 176, 0.45)',
  },
  successInline: {
    marginTop: 0,
    marginBottom: spacing.xs,
  },
  feedbackError: {
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
    borderColor: 'rgba(255, 107, 107, 0.45)',
    marginTop: spacing.md,
  },
  feedbackContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  feedbackText: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
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
    marginTop: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    textAlign: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButton: {
    alignSelf: 'stretch',
  },
  flexButton: {
    flex: 1,
  },
  exampleSection: {
    marginTop: spacing.xs,
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
  exampleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  exampleBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 18, 35, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(59, 226, 176, 0.45)',
  },
  exampleHeaderText: {
    flex: 1,
    gap: spacing.xs,
  },
  exampleTitle: {
    ...typography.subtitle,
    color: colors.accent,
    fontWeight: '700',
  },
  exampleSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  exampleFieldContainer: {
    marginBottom: spacing.sm,
  },
  exampleInput: {
    minHeight: 96,
    paddingTop: spacing.sm,
    textAlignVertical: 'top',
    backgroundColor: 'rgba(12, 20, 40, 0.75)',
    borderColor: 'rgba(59, 226, 176, 0.4)',
  },
  exampleFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  exampleSavedContainer: {
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  exampleError: {
    ...typography.caption,
    color: colors.danger,
  },
  exampleSaved: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '600',
  },
  exampleSavedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(12, 20, 40, 0.55)',
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(59, 226, 176, 0.35)',
  },
  exampleButton: {
    alignSelf: 'center',
  },
  // Kutlama ekranı stilleri
  celebrationTitle: {
    ...typography.headline,
    fontSize: 30,
    color: palette.white,
    fontWeight: '700',
    textAlign: 'center',
  },
  celebrationMessage: {
    ...typography.body,
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 22,
  },
  celebrationHighlight: {
    ...typography.title,
    color: colors.accent,
    textAlign: 'center',
    fontWeight: '700',
  },
  celebrationActions: {
    marginTop: spacing.sm,
    width: '100%',
    gap: spacing.sm,
    alignItems: 'stretch',
  },
  celebrationButton: {
    width: '100%',
  },
  celebrationSecondaryButton: {
    width: '100%',
  },
});
