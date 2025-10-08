import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { GradientBackground } from '@/components/GradientBackground';
import { ScreenContainer } from '@/components/ScreenContainer';
import { TextField } from '@/components/TextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { CaptchaModal } from '@/components/CaptchaModal';
import { colors, radius, spacing, typography } from '@/theme';
import { AppStackParamList } from '@/navigation/types';
import { useAuth } from '@/context/AuthContext';
import { submitContactRequest } from '@/services/contactService';
import { getOrCreateDeviceId } from '@/utils/device';

import { LinearGradient } from 'expo-linear-gradient';

type Props = NativeStackScreenProps<AppStackParamList, 'Contact'>;

type FormErrors = {
  email?: string;
  subject?: string;
  message?: string;
};

export const ContactScreen: React.FC<Props> = ({ navigation }) => {
  const { profile, firebaseUser } = useAuth();
  const [fullName, setFullName] = useState(() => {
    if (profile?.firstName || profile?.lastName) {
      return `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim();
    }
    return '';
  });
  const [email, setEmail] = useState(() => profile?.email ?? firebaseUser?.email ?? '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [captchaVisible, setCaptchaVisible] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);

  const helperText = useMemo(() => {
    if (profile?.role === 'admin') {
      return 'Admin takımımızla hızlıca iletişime geçebilirsin.';
    }
    return 'Sorularını, önerilerini veya karşılaştığın sorunları bizimle paylaş.';
  }, [profile?.role]);

  useEffect(() => {
    const defaultName = `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim();
    if (defaultName && !fullName.trim()) {
      setFullName(defaultName);
    }
  }, [profile?.firstName, profile?.lastName, fullName]);

  useEffect(() => {
    const defaultEmail = profile?.email ?? firebaseUser?.email ?? '';
    if (defaultEmail && !email.trim()) {
      setEmail(defaultEmail);
    }
  }, [profile?.email, firebaseUser?.email, email]);

  const validate = () => {
    const nextErrors: FormErrors = {};
    if (!email.trim()) {
      nextErrors.email = 'E-posta adresi zorunludur.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Geçerli bir e-posta adresi gir.';
    }

    if (!subject.trim()) {
      nextErrors.subject = 'Konu başlığı zorunludur.';
    } else if (subject.trim().length < 3) {
      nextErrors.subject = 'Konu başlığı en az 3 karakter olmalıdır.';
    }

    if (!message.trim()) {
      nextErrors.message = 'Mesajını yazman gerekiyor.';
    } else if (message.trim().length < 20) {
      nextErrors.message = 'Mesajını biraz daha detaylandır (en az 20 karakter).';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const resetForm = () => {
    setSubject('');
    setMessage('');
    setCaptchaVerified(false);
  };

  const performSubmit = async () => {
    setLoading(true);
    try {
      const deviceId = await getOrCreateDeviceId();
      await submitContactRequest({
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
        fullName: fullName.trim() ? fullName.trim() : null,
        userId: profile?.uid ?? firebaseUser?.uid ?? null,
        deviceId,
      });

      Alert.alert('Teşekkürler', 'Mesajın alındı. En kısa sürede dönüş yapacağız.', [
        {
          text: 'Tamam',
          onPress: () => {
            navigation.goBack();
          },
        },
      ]);
      resetForm();
    } catch (error) {
      const messageText = (error as Error).message ?? 'Mesajın gönderilemedi, lütfen tekrar dene.';
      Alert.alert('Hata', messageText);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!validate()) {
      return;
    }

    if (!captchaVerified) {
      setCaptchaVisible(true);
      return;
    }

    void performSubmit();
  };

  const handleCaptchaResult = (isValid: boolean) => {
    if (isValid) {
      setCaptchaVisible(false);
      setCaptchaVerified(true);
      void performSubmit();
    } else {
      setCaptchaVerified(false);
    }
  };

  return (
    <GradientBackground paddingTop={spacing.lg}>
      <ScreenContainer edges={['top', 'left', 'right']} style={styles.container}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={navigation.goBack} style={styles.backButton}>
                <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <LinearGradient
              colors={['rgba(123, 97, 255, 0.32)', 'rgba(90, 227, 194, 0.18)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <View style={styles.heroIconWrapper}>
                <Ionicons name="mail" size={34} color={colors.textPrimary} />
              </View>
              <Text style={styles.heroTitle}>İletişime Geç</Text>
              <Text style={styles.heroSubtitle}>{helperText}</Text>
            </LinearGradient>

            <View style={styles.formCard}>
              <TextField
                label="Adın"
                placeholder="Adını buraya yaz"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
              <TextField
                label="E-posta"
                placeholder="ornek@mail.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                errorMessage={errors.email}
              />
              <TextField
                label="Konu"
                placeholder="Nasıl yardımcı olabiliriz?"
                value={subject}
                onChangeText={setSubject}
                errorMessage={errors.subject}
              />
              <TextField
                label="Mesajın"
                placeholder="Mesajını detaylandır..."
                value={message}
                onChangeText={setMessage}
                multiline
                style={styles.messageInput}
                errorMessage={errors.message}
              />
              <Text style={styles.privacyHint}>
                Formu göndererek iletişime geçmek için e-posta adresinin kullanılmasına izin veriyorsun. Bilgilerin gizli tutulur.
              </Text>
              <PrimaryButton
                label={captchaVerified ? 'Gönder' : 'Doğrula ve Gönder'}
                onPress={handleSubmit}
                loading={loading}
                disabled={loading}
                icon="send"
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ScreenContainer>
      <CaptchaModal
        visible={captchaVisible}
        onClose={() => setCaptchaVisible(false)}
        onValidate={handleCaptchaResult}
      />
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    paddingBottom: 0,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  headerRow: {
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
  hero: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    gap: spacing.sm,
  },
  heroIconWrapper: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(12, 18, 41, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  heroTitle: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: 'rgba(12, 18, 41, 0.55)',
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  messageInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  privacyHint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
});
