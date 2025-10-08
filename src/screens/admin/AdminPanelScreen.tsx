import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { GradientBackground } from '@/components/GradientBackground';
import { ScreenContainer } from '@/components/ScreenContainer';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { ResourcePill } from '@/components/ResourcePill';
import { colors, radius, spacing, typography } from '@/theme';
import { AppStackParamList } from '@/navigation/types';
import { grantBonusResourcesByEmail } from '@/services/creditService';

import { LinearGradient } from 'expo-linear-gradient';

type Props = NativeStackScreenProps<AppStackParamList, 'AdminPanel'>;

interface ResourceGrantResult {
  email: string;
  bonusEnergy: number;
  bonusRevealTokens: number;
  totalEnergy: number;
  totalReveal: number;
}

export const AdminPanelScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [energyDelta, setEnergyDelta] = useState('0');
  const [revealDelta, setRevealDelta] = useState('0');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<ResourceGrantResult | null>(null);

  const handleEnergyChange = (value: string) => {
    setEnergyDelta(value.replace(/[^0-9]/g, ''));
  };

  const handleRevealChange = (value: string) => {
    setRevealDelta(value.replace(/[^0-9]/g, ''));
  };

  const handleGrantResources = async () => {
    const trimmedEmail = email.trim();
    const energyAmount = Number(energyDelta || '0');
    const revealAmount = Number(revealDelta || '0');

    if (!trimmedEmail) {
      setErrorMessage('E-posta adresi gereklidir.');
      return;
    }

    if (energyAmount <= 0 && revealAmount <= 0) {
      setErrorMessage('En az bir alana 0\'dan büyük bir değer girin.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const { profile } = await grantBonusResourcesByEmail(trimmedEmail, {
        energyDelta: energyAmount,
        revealDelta: revealAmount,
        reason: 'adminGrant',
      });

      const bonusEnergy = profile.bonusEnergy ?? 0;
      const bonusRevealTokens = profile.bonusRevealTokens ?? 0;
      const dailyEnergy = profile.dailyEnergy ?? 0;
      const dailyRevealTokens = profile.dailyRevealTokens ?? 0;

      setResult({
        email: profile.email ?? trimmedEmail,
        bonusEnergy,
        bonusRevealTokens,
        totalEnergy: dailyEnergy + bonusEnergy,
        totalReveal: dailyRevealTokens + bonusRevealTokens,
      });

      Alert.alert('Başarılı', 'Kaynaklar güncellendi.');
      setEnergyDelta('0');
      setRevealDelta('0');
    } catch (err) {
      const message = (err as Error).message ?? 'Kaynaklar güncellenemedi.';
      setErrorMessage(message);
      Alert.alert('Hata', message);
    } finally {
      setLoading(false);
    }
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
          <LinearGradient
            colors={['rgba(123, 97, 255, 0.32)', 'rgba(90, 227, 194, 0.18)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroIconWrapper}>
              <Ionicons name="shield-checkmark" size={38} color={colors.textPrimary} />
            </View>
            <Text style={styles.heroTitle}>Admin Alanı</Text>
            <Text style={styles.heroSubtitle}>
              Yönetim araçlarını buradan bulabilir ve uygulamanın içeriğini güncel tutabilirsin.
            </Text>
          </LinearGradient>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>İçerik Yönetimi</Text>
            <Text style={styles.sectionDescription}>
              Kelime listelerini güncelle, yeni kelimeler ekle veya mevcut kelimeleri düzenle.
            </Text>
            <PrimaryButton
              label="Kelime Yönetimi"
              onPress={() => navigation.navigate('AdminWordManager')}
              variant="secondary"
              size="compact"
              icon="construct"
              iconColor={colors.accent}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>İletişim Talepleri</Text>
            <Text style={styles.sectionDescription}>
              Kullanıcıların gönderdiği mesajları görüntüle, durumlarını yönet ve geri dönüşleri takip et.
            </Text>
            <PrimaryButton
              label="Destek Kutusu"
              onPress={() => navigation.navigate('AdminContactRequests')}
              variant="ghost"
              size="compact"
              icon="mail-unread"
              iconColor={colors.accent}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Enerji & Cevabı Göster Hakları</Text>
            <Text style={styles.sectionDescription}>
              Admin bonusları günlük sıfırlamalardan etkilenmez. Pozitif değerler girerek kullanıcıya ek hak tanımlayabilirsin.
            </Text>
            <TextField
              label="Kullanıcı e-postası"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View style={styles.inlineInputs}>
              <TextField
                label="Enerji (+)"
                value={energyDelta}
                onChangeText={handleEnergyChange}
                keyboardType="number-pad"
                containerStyle={styles.inlineInput}
              />
              <TextField
                label="Cevabı Göster (+)"
                value={revealDelta}
                onChangeText={handleRevealChange}
                keyboardType="number-pad"
                containerStyle={styles.inlineInput}
              />
            </View>
            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
            <PrimaryButton
              label="Kaynak Ekle"
              onPress={handleGrantResources}
              loading={loading}
              disabled={loading}
              icon="flash-outline"
              iconColor={colors.accent}
            />
            {result ? (
              <View style={styles.resultCard}>
                <Text style={styles.resultTitle}>{result.email}</Text>
                <Text style={styles.resultSubtitle}>Güncel durum</Text>
                <View style={styles.resourceRow}>
                  <ResourcePill label="Toplam Enerji" value={result.totalEnergy} />
                  <ResourcePill label="Bonus Enerji" value={result.bonusEnergy} />
                </View>
                <View style={styles.resourceRow}>
                  <ResourcePill label="Toplam Cevabı Göster" value={result.totalReveal} />
                  <ResourcePill label="Bonus Cevabı Göster" value={result.bonusRevealTokens} />
                </View>
              </View>
            ) : null}
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
  section: {
    backgroundColor: 'rgba(12, 18, 41, 0.55)',
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    gap: spacing.sm,
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
  inlineInputs: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inlineInput: {
    flex: 1,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  resultCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(12, 18, 41, 0.55)',
    gap: spacing.sm,
  },
  resultTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  resultSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  resourceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
