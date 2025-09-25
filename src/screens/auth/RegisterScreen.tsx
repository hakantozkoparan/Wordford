import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { GradientBackground } from '@/components/GradientBackground';
import { ScreenContainer } from '@/components/ScreenContainer';
import { TextField } from '@/components/TextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { CaptchaModal } from '@/components/CaptchaModal';
import { colors, spacing, typography } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { AppStackParamList } from '@/navigation/types';

const schema = yup.object({
  firstName: yup.string().required('İsim zorunludur'),
  lastName: yup.string().required('Soyisim zorunludur'),
  birthDate: yup
    .string()
    .matches(/\d{4}-\d{2}-\d{2}/, 'Doğum tarihi YYYY-AA-GG formatında olmalı')
    .required('Doğum tarihi zorunludur'),
  email: yup.string().email('Geçerli bir e-posta girin').required('E-posta zorunludur'),
  password: yup.string().min(6, 'Şifre en az 6 karakter olmalı').required('Şifre zorunludur'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Şifreler eşleşmiyor')
    .required('Şifre tekrar zorunludur'),
});

interface FormValues {
  firstName: string;
  lastName: string;
  birthDate: string;
  email: string;
  password: string;
  confirmPassword: string;
}

type Props = NativeStackScreenProps<AppStackParamList, 'Register'>;

export const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const { register, loading, error } = useAuth();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      birthDate: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const [showCaptcha, setShowCaptcha] = useState(false);
  const [pendingValues, setPendingValues] = useState<FormValues | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = handleSubmit((values) => {
    setPendingValues(values);
    setShowCaptcha(true);
  });

  const handleCaptchaValidation = async (isValid: boolean) => {
    if (!isValid || !pendingValues) {
      return;
    }

    try {
      setSubmitting(true);
      await register({
        firstName: pendingValues.firstName,
        lastName: pendingValues.lastName,
        birthDate: pendingValues.birthDate,
        email: pendingValues.email,
        password: pendingValues.password,
        captchaValid: true,
      });
      setShowCaptcha(false);
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Tabs');
      }
    } finally {
      setSubmitting(false);
      setPendingValues(null);
    }
  };

  return (
    <GradientBackground>
      <ScreenContainer>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Ailemize Katıl</Text>
            <Text style={styles.subtitle}>Wordford ile her gün yeni kelimeler keşfet.</Text>
            <View style={styles.form}>
              <Controller
                control={control}
                name="firstName"
                render={({ field: { value, onChange } }) => (
                  <TextField
                    label="İsim"
                    value={value}
                    onChangeText={onChange}
                    errorMessage={errors.firstName?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="lastName"
                render={({ field: { value, onChange } }) => (
                  <TextField
                    label="Soyisim"
                    value={value}
                    onChangeText={onChange}
                    errorMessage={errors.lastName?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="birthDate"
                render={({ field: { value, onChange } }) => (
                  <TextField
                    label="Doğum Tarihi"
                    placeholder="YYYY-AA-GG"
                    value={value}
                    onChangeText={onChange}
                    errorMessage={errors.birthDate?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="email"
                render={({ field: { value, onChange } }) => (
                  <TextField
                    label="E-posta"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={value}
                    onChangeText={onChange}
                    errorMessage={errors.email?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="password"
                render={({ field: { value, onChange } }) => (
                  <TextField
                    label="Şifre"
                    secureTextEntry
                    value={value}
                    onChangeText={onChange}
                    errorMessage={errors.password?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { value, onChange } }) => (
                  <TextField
                    label="Şifre Tekrar"
                    secureTextEntry
                    value={value}
                    onChangeText={onChange}
                    errorMessage={errors.confirmPassword?.message}
                  />
                )}
              />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <PrimaryButton
                label="Kayıt Ol"
                onPress={onSubmit}
                loading={submitting || loading}
              />
              <Text style={styles.loginPrompt}>
                Zaten hesabın var mı?
                <Text style={styles.link} onPress={() => navigation.navigate('Login')}>
                  {' '}
                  Giriş Yap
                </Text>
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
        <CaptchaModal
          visible={showCaptcha}
          onClose={() => setShowCaptcha(false)}
          onValidate={handleCaptchaValidation}
        />
      </ScreenContainer>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  title: {
    ...typography.headline,
    color: colors.textPrimary,
    marginTop: spacing.xl,
  },
  subtitle: {
    ...typography.subtitle,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  form: {
    gap: spacing.sm,
  },
  loginPrompt: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  link: {
    color: colors.accent,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    marginBottom: spacing.sm,
  },
});
