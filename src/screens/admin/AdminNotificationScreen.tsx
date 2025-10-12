import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { GradientBackground } from '@/components/GradientBackground';
import { ScreenContainer } from '@/components/ScreenContainer';
import { TextField } from '@/components/TextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, radius, spacing, typography } from '@/theme';
import { AppStackParamList } from '@/navigation/types';
import { sendAdminBroadcast } from '@/services/adminNotificationService';

type Props = NativeStackScreenProps<AppStackParamList, 'AdminNotifications'>;

type FormErrors = {
  title?: string;
  body?: string;
};

const MAX_TITLE_LENGTH = 64;
const MAX_BODY_LENGTH = 240;

export const AdminNotificationScreen: React.FC<Props> = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [deeplink, setDeeplink] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [lastSummary, setLastSummary] = useState<Awaited<ReturnType<typeof sendAdminBroadcast>> | null>(null);

  const previewText = useMemo(() => {
    if (!title && !body) {
      return 'Başlık ve mesaj girildiğinde burada önizleme göreceksin.';
    }
    const previewLines = [title.trim(), body.trim()].filter(Boolean);
    if (deeplink.trim()) {
      previewLines.push(`Deeplink: ${deeplink.trim()}`);
    }
    return previewLines.join('\n\n');
  }, [title, body, deeplink]);

  const resetForm = () => {
    setTitle('');
    setBody('');
    setDeeplink('');
    setErrors({});
  };

  const validate = () => {
    const nextErrors: FormErrors = {};
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();

    if (!trimmedTitle) {
      nextErrors.title = 'Başlık zorunludur.';
    } else if (trimmedTitle.length > MAX_TITLE_LENGTH) {
      nextErrors.title = `Başlık ${MAX_TITLE_LENGTH} karakteri geçemez.`;
    }

    if (!trimmedBody) {
      nextErrors.body = 'Mesaj zorunludur.';
    } else if (trimmedBody.length > MAX_BODY_LENGTH) {
      nextErrors.body = `Mesaj ${MAX_BODY_LENGTH} karakteri geçemez.`;
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSend = () => {
    if (!validate()) {
      return;
    }

    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    const trimmedDeeplink = deeplink.trim();

    Alert.alert(
      'Gönderimi Onayla',
      `"${trimmedTitle}" başlıklı bildirimi tüm kullanıcılara göndermek istiyorsun. Emin misin?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Gönder',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const summary = await sendAdminBroadcast({
                title: trimmedTitle,
                body: trimmedBody,
                deeplink: trimmedDeeplink || undefined,
              });
              setLastSummary(summary);
              resetForm();
              const detailMessage = `Hedeflenen cihaz: ${summary.targetedCount}\nBaşarılı: ${summary.successCount}\nBaşarısız: ${summary.failureCount}`;
              Alert.alert('Bildirim gönderildi', detailMessage);
            } catch (error) {
              const message = (error as Error).message ?? 'Bilinmeyen bir hata oluştu.';
              Alert.alert('Gönderim başarısız', message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <GradientBackground paddingTop={spacing.lg}>
      <ScreenContainer style={styles.container} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={navigation.goBack}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Geri dön"
            >
              <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.headerCard}>
            <View style={styles.headerIconWrapper}>
              <Ionicons name="notifications" size={32} color={colors.textPrimary} />
            </View>
            <Text style={styles.headerTitle}>Push Bildirim Yayını</Text>
            <Text style={styles.headerSubtitle}>
              Expo Push Service ile kaydolan tüm kullanıcılara toplu mesaj göndermek için formu doldur.
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Bildirim İçeriği</Text>
            <TextField
              label={`Başlık (${title.trim().length}/${MAX_TITLE_LENGTH})`}
              value={title}
              onChangeText={(text) => {
                setTitle(text);
                if (errors.title) {
                  setErrors((prev) => ({ ...prev, title: undefined }));
                }
              }}
              errorMessage={errors.title}
              maxLength={MAX_TITLE_LENGTH}
              placeholder="Wordford'da yeni etkinlik!"
            />
            <TextField
              label={`Mesaj (${body.trim().length}/${MAX_BODY_LENGTH})`}
              value={body}
              onChangeText={(text) => {
                setBody(text);
                if (errors.body) {
                  setErrors((prev) => ({ ...prev, body: undefined }));
                }
              }}
              multiline
              numberOfLines={4}
              style={styles.textArea}
              errorMessage={errors.body}
              maxLength={MAX_BODY_LENGTH}
              placeholder="Bugünkü kelime meydan okumasını kaçırma!"
            />
            <TextField
              label="Opsiyonel Deeplink"
              value={deeplink}
              onChangeText={setDeeplink}
              placeholder="wordford://levels/A2"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>Önizleme</Text>
              <Text style={styles.previewText}>{previewText}</Text>
            </View>

            <PrimaryButton
              label="Tüm kullanıcılara gönder"
              onPress={handleSend}
              loading={loading}
              disabled={loading}
              icon="rocket"
              iconColor={colors.accent}
            />

            {lastSummary ? (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Son yayın özeti</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Hedeflenen</Text>
                  <Text style={styles.summaryValue}>{lastSummary.targetedCount}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Başarılı</Text>
                  <Text style={styles.summaryValue}>{lastSummary.successCount}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Başarısız</Text>
                  <Text style={styles.summaryValue}>{lastSummary.failureCount}</Text>
                </View>
                {lastSummary.errors.length ? (
                  <View style={styles.errorList}>
                    <Text style={styles.errorListTitle}>Hata alınan cihazlar</Text>
                    {lastSummary.errors.slice(0, 3).map((item) => (
                      <Text key={`${item.token}`} style={styles.errorListItem}>
                        {item.message}
                      </Text>
                    ))}
                    {lastSummary.errors.length > 3 ? (
                      <Text style={styles.errorListFootnote}>
                        {`+${lastSummary.errors.length - 3} ek hata daha`} (Detaylar için log kayıtlarına bakın)
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            ) : null}

            <View style={styles.helperCard}>
              <Ionicons name="information-circle" size={18} color={colors.textSecondary} />
              <Text style={styles.helperText}>
                Expo Push API tek istekte 100 cihaza destek verir. Form otomatik olarak gruplara ayırır ve küçük beklemelerle gönderir.
              </Text>
            </View>
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
  headerCard: {
    gap: spacing.sm,
    backgroundColor: 'rgba(12, 18, 41, 0.55)',
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  headerIconWrapper: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(12, 18, 41, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  headerTitle: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  formCard: {
    gap: spacing.md,
    backgroundColor: 'rgba(12, 18, 41, 0.72)',
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  sectionTitle: {
    ...typography.title,
    color: colors.textPrimary,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  previewCard: {
    backgroundColor: 'rgba(26, 32, 62, 0.9)',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    gap: spacing.xs,
  },
  previewTitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  previewText: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  summaryCard: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(9, 13, 28, 0.75)',
  },
  summaryTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  summaryValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  errorList: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  errorListTitle: {
    ...typography.caption,
    color: colors.danger,
  },
  errorListItem: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  errorListFootnote: {
    ...typography.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  helperCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(9, 13, 28, 0.65)',
  },
  helperText: {
    flex: 1,
    ...typography.caption,
    color: colors.textSecondary,
  },
});
