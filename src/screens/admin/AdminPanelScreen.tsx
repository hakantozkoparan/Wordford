import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { GradientBackground } from '@/components/GradientBackground';
import { ScreenContainer } from '@/components/ScreenContainer';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, radius, spacing, typography } from '@/theme';
import { AppStackParamList } from '@/navigation/types';

import { LinearGradient } from 'expo-linear-gradient';

type Props = NativeStackScreenProps<AppStackParamList, 'AdminPanel'>;

export const AdminPanelScreen: React.FC<Props> = ({ navigation }) => (
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
      </ScrollView>
    </ScreenContainer>
  </GradientBackground>
);

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
});
