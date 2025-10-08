import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

import { GradientBackground } from '@/components/GradientBackground';
import { ScreenContainer } from '@/components/ScreenContainer';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TabSegmentedControl } from '@/components/TabSegmentedControl';
import { colors, radius, spacing, typography } from '@/theme';
import { AppStackParamList } from '@/navigation/types';
import { fetchContactRequests, updateContactRequestStatus } from '@/services/contactService';
import { ContactRequest, ContactRequestStatus } from '@/types/models';
import { toDate } from '@/utils/datetime';

import { LinearGradient } from 'expo-linear-gradient';

type Props = NativeStackScreenProps<AppStackParamList, 'AdminContactRequests'>;

interface StatusConfig {
  label: string;
  tint: string;
  text: string;
}

const STATUS_STYLES: Record<ContactRequestStatus, StatusConfig> = {
  open: {
    label: 'Açık',
    tint: 'rgba(255, 193, 59, 0.16)',
    text: '#FFC13B',
  },
  resolved: {
    label: 'Çözüldü',
    tint: 'rgba(90, 227, 194, 0.16)',
    text: colors.accent,
  },
};

export const AdminContactRequestsScreen: React.FC<Props> = ({ navigation }) => {
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ContactRequestStatus>('open');

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const items = await fetchContactRequests({ take: 100 });
      setRequests(items);
    } catch (error) {
      const message = (error as Error).message ?? 'İstekler alınırken bir hata oluştu.';
      Alert.alert('Hata', message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadRequests();
    }, [loadRequests]),
  );

  const toggleStatus = useCallback(
    async (request: ContactRequest) => {
      const nextStatus: ContactRequestStatus = request.status === 'open' ? 'resolved' : 'open';
      const prompt =
        request.status === 'open'
          ? 'Bu talebi çözüldü olarak işaretlemek istiyor musun?'
          : 'Bu talebi tekrar açmak istiyor musun?';

      Alert.alert('Onay', prompt, [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Evet',
          style: 'destructive',
          onPress: async () => {
            setUpdatingId(request.id);
            try {
              await updateContactRequestStatus(request.id, nextStatus);
              const refreshed = await fetchContactRequests({ take: 100 });
              setRequests(refreshed);
              setActiveTab(nextStatus);
            } catch (error) {
              const message =
                (error as Error).message ?? 'Durum güncellenirken bir hata oluştu, lütfen tekrar dene.';
              Alert.alert('Hata', message);
            } finally {
              setUpdatingId(null);
            }
          },
        },
      ]);
    },
    [],
  );

  const openCount = useMemo(() => requests.filter((item) => item.status === 'open').length, [
    requests,
  ]);
  const resolvedCount = useMemo(
    () => requests.filter((item) => item.status === 'resolved').length,
    [requests],
  );

  const filteredRequests = useMemo(
    () => requests.filter((item) => item.status === activeTab),
    [requests, activeTab],
  );

  const tabOptions = useMemo(
    () => [
      { key: 'open', label: `Açık (${openCount})` },
      { key: 'resolved', label: `Kapalı (${resolvedCount})` },
    ],
    [openCount, resolvedCount],
  );

  return (
    <GradientBackground paddingTop={spacing.lg}>
      <ScreenContainer edges={['top', 'left', 'right']} style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void loadRequests()} tintColor={colors.textPrimary} />}
        >
          <View style={styles.topBar}>
            <TouchableOpacity onPress={navigation.goBack} style={styles.backButton}>
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
              <Ionicons name="mail-unread" size={38} color={colors.textPrimary} />
            </View>
            <Text style={styles.heroTitle}>İletişim Talepleri</Text>
            <Text style={styles.heroSubtitle}>
              Kullanıcılardan gelen mesajları görüntüle, durumlarını güncelle ve geri dönüşleri takip et.
            </Text>
            <View style={styles.heroBadge}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.warning} />
              <Text style={styles.heroBadgeText}>{openCount} açık talep</Text>
            </View>
          </LinearGradient>

          <TabSegmentedControl
            options={tabOptions}
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as ContactRequestStatus)}
          />

          <View style={styles.actionRow}>
            <PrimaryButton
              label="Yenile"
              onPress={() => void loadRequests()}
              loading={loading}
              disabled={loading}
              variant="ghost"
              size="compact"
              icon="refresh"
            />
          </View>

          {filteredRequests.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubble-ellipses-outline" size={42} color={colors.textSecondary} />
              <Text style={styles.emptyTitle}>
                {activeTab === 'open' ? 'Henüz açık talep yok' : 'Henüz kapalı talep yok'}
              </Text>
              <Text style={styles.emptySubtitle}>
                Kullanıcı mesajları burada görünecek. Daha sonra tekrar kontrol et.
              </Text>
            </View>
          ) : (
            filteredRequests.map((item) => {
              const statusStyles = STATUS_STYLES[item.status];
              const createdAt = toDate(item.createdAt);
              const since = createdAt
                ? formatDistanceToNow(createdAt, { addSuffix: true, locale: tr })
                : 'tarih bilgisi yok';

              return (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{item.subject}</Text>
                    <View style={[styles.statusPill, { backgroundColor: statusStyles.tint, borderColor: statusStyles.text }]}>
                      <Text style={[styles.statusText, { color: statusStyles.text }]}>{statusStyles.label}</Text>
                    </View>
                  </View>
                  {item.fullName ? <Text style={styles.cardName}>{item.fullName}</Text> : null}
                  <Text style={styles.cardEmail}>{item.email}</Text>
                  <Text style={styles.cardMessage}>{item.message}</Text>
                  <View style={styles.cardFooter}>
                    <Text style={styles.cardTimestamp}>Gönderildi: {since}</Text>
                    <TouchableOpacity
                      style={styles.footerButton}
                      onPress={() => void toggleStatus(item)}
                      disabled={updatingId === item.id}
                    >
                      <Ionicons
                        name={item.status === 'open' ? 'checkmark-done' : 'refresh'}
                        size={20}
                        color={colors.textPrimary}
                      />
                      <Text style={styles.footerButtonText}>
                        {item.status === 'open' ? 'Çözüldü' : 'Tekrar aç'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
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
  heroBadge: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: 'rgba(12, 18, 41, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  heroBadgeText: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  emptyState: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(12, 18, 41, 0.45)',
  },
  emptyTitle: {
    ...typography.title,
    color: colors.textPrimary,
  },
  emptySubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  card: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(12, 18, 41, 0.55)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    flex: 1,
  },
  statusPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  cardName: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  cardEmail: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  cardMessage: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 19,
  },
  cardFooter: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardTimestamp: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(12, 18, 41, 0.45)',
  },
  footerButtonText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
