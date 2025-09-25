import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { GradientBackground } from '@/components/GradientBackground';
import { ScreenContainer } from '@/components/ScreenContainer';
import { PrimaryButton } from '@/components/PrimaryButton';
import { CreditPill } from '@/components/CreditPill';
import { colors, spacing, typography } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { useWords } from '@/context/WordContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '@/navigation/types';

export const ProfileScreen: React.FC = () => {
  const { profile, signOut, firebaseUser } = useAuth();
  const { favorites, knownWords } = useWords();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const isAuthenticated = Boolean(firebaseUser);

  const stats = useMemo(
    () => [
      { label: 'Favori Kelimeler', value: favorites.length },
      { label: 'Bildiklerim', value: knownWords.length },
    ],
    [favorites.length, knownWords.length],
  );

  const onLogout = async () => {
    if (!isAuthenticated) return;
    await signOut();
  };

  const onAdminPress = () => {
    navigation.navigate('AdminWordManager');
  };

  const onLoginPress = () => {
    navigation.navigate('Login');
  };

  const onRegisterPress = () => {
    navigation.navigate('Register');
  };

  return (
    <GradientBackground>
      <ScreenContainer>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Profilim</Text>
          {isAuthenticated ? (
            <>
              <Text style={styles.subtitle}>
                {profile?.firstName} {profile?.lastName}
              </Text>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Hesap Bilgileri</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>E-posta</Text>
                  <Text style={styles.value}>{profile?.email ?? firebaseUser?.email}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Rol</Text>
                  <Text style={styles.value}>{profile?.role ?? 'member'}</Text>
                </View>
                <View style={styles.pillRow}>
                  <CreditPill label="Krediler" value={profile?.dailyCredits ?? 0} />
                  <CreditPill label="Yıldız" value={profile?.dailyHintTokens ?? 0} />
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>İstatistikler</Text>
                {stats.map((item) => (
                  <View style={styles.infoRow} key={item.label}>
                    <Text style={styles.label}>{item.label}</Text>
                    <Text style={styles.value}>{item.value}</Text>
                  </View>
                ))}
              </View>

              <PrimaryButton label="Çıkış Yap" onPress={onLogout} variant="danger" />

              {profile?.role === 'admin' ? (
                <PrimaryButton
                  label="Kelime Yönetimi"
                  onPress={onAdminPress}
                  variant="secondary"
                  style={styles.adminButton}
                />
              ) : null}
            </>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Misafir Modu</Text>
              <Text style={styles.guestText}>
                Giriş yapmadan seviyeleri keşfedebilirsin. İlerlemeni kaydetmek ve cihazlar arasında senkronize etmek için giriş yap veya kayıt ol.
              </Text>
              <View style={styles.authButtonGroup}>
                <PrimaryButton label="Giriş Yap" onPress={onLoginPress} />
                <PrimaryButton label="Kayıt Ol" onPress={onRegisterPress} variant="secondary" />
              </View>
            </View>
          )}
        </ScrollView>
      </ScreenContainer>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  title: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.subtitle,
    color: colors.textSecondary,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: spacing.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.title,
    color: colors.textPrimary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    ...typography.body,
    color: colors.textSecondary,
  },
  value: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  pillRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  adminButton: {
    marginTop: spacing.md,
  },
  guestText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  authButtonGroup: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
