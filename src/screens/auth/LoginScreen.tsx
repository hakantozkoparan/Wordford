import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { GradientBackground } from '@/components/GradientBackground';
import { ScreenContainer } from '@/components/ScreenContainer';
import { TextField } from '@/components/TextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, spacing, typography } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { AppStackParamList } from '@/navigation/types';

const schema = yup.object({
  email: yup.string().email('Geçerli bir e-posta girin').required('E-posta zorunludur'),
  password: yup.string().min(6, 'Şifre en az 6 karakter olmalı').required('Şifre zorunludur'),
});

interface FormValues {
  email: string;
  password: string;
}

type Props = NativeStackScreenProps<AppStackParamList, 'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { login, loading, error } = useAuth();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: { email: '', password: '' },
  });
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = handleSubmit(async (values) => {
    try {
      setSubmitting(true);
      await login(values);
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Tabs');
      }
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <GradientBackground>
      <ScreenContainer>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <View style={styles.header}>
            <Text style={styles.title}>Wordford</Text>
            <Text style={styles.subtitle}>Kelime hazineni güçlendir!</Text>
          </View>
          <View style={styles.form}>
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
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <PrimaryButton
              label="Giriş Yap"
              onPress={onSubmit}
              loading={submitting || loading}
            />
            <Text style={styles.registerPrompt}>
              Hesabın yok mu?
              <Text style={styles.link} onPress={() => navigation.navigate('Register')}>
                {' '}
                Kayıt Ol
              </Text>
            </Text>
          </View>
        </KeyboardAvoidingView>
      </ScreenContainer>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    marginTop: spacing.xl,
  },
  title: {
    ...typography.headline,
    color: colors.textPrimary,
    fontSize: 32,
  },
  subtitle: {
    ...typography.subtitle,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  form: {
    marginTop: spacing.xl,
  },
  registerPrompt: {
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
