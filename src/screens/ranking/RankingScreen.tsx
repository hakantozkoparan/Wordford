import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { GradientBackground } from '@/components/GradientBackground';
import { ScreenContainer } from '@/components/ScreenContainer';
import { colors, spacing, typography } from '@/theme';
import { LeaderboardEntry, fetchLeaderboard, getUserRank } from '@/services/leaderboardService';
import { useAuth } from '@/context/AuthContext';

const PLACE_ICONS: Record<number, keyof typeof Ionicons.glyphMap> = {
  1: 'trophy',
  2: 'medal-outline',
  3: 'podium-outline',
};

const PLACE_COLORS: Record<number, string> = {
  1: colors.accent,
  2: colors.primary,
  3: colors.warning,
};

const getDisplayName = (entry: LeaderboardEntry) => {
  const first = entry.firstName?.trim();
  const last = entry.lastName?.trim();
  if (first && last) {
    return `${first} ${last.slice(0, 1)}.`;
  }
  if (first) {
    return first;
  }
  return 'Anonim';
};

export const RankingScreen: React.FC = () => {
  const { firebaseUser, profile } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userRank, setUserRank] = useState<{ rank: number; totalWords: number } | null>(null);
  const [lastRefresh, setLastRefresh] = useState<number | null>(null);

  const loadData = useCallback(
    async (showLoader = false) => {
      if (showLoader) {
        setLoading(true);
      }
      setRefreshing(true);

      try {
        const [list, rankResult] = await Promise.all([
          fetchLeaderboard(100),
          firebaseUser?.uid ? getUserRank(firebaseUser.uid) : Promise.resolve(null),
        ]);

        setEntries(list);
        let resolvedRank = rankResult;

        if (firebaseUser?.uid) {
          const listIndex = list.findIndex((entry) => entry.id === firebaseUser.uid);
          if (listIndex >= 0) {
            resolvedRank = {
              rank: listIndex + 1,
              totalWords: list[listIndex].totalWords,
            };
          }
        }

        setUserRank(resolvedRank);
        setError(null);
        setLastRefresh(Date.now());
      } catch (err) {
        console.warn('Liderlik verileri alınamadı:', err);
        const message = err instanceof Error ? err.message : 'Liderlik tablosu yüklenemedi.';
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [firebaseUser?.uid],
  );

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (profile?.totalWordsLearned == null) {
      return;
    }

    setUserRank((prev) => (prev ? { ...prev, totalWords: profile.totalWordsLearned ?? prev.totalWords } : prev));
  }, [profile?.totalWordsLearned]);

  const lastRefreshLabel = useMemo(() => {
    if (!lastRefresh) {
      return 'Son güncelleme: -';
    }

    const date = new Date(lastRefresh);
    return `Son güncelleme: ${date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
  }, [lastRefresh]);

  const content = useMemo(() => {
    if (loading) {
      return (
        <View style={styles.stateContainer}>
          <ActivityIndicator color="#FFFFFF" size="large" />
          <Text style={styles.stateText}>Liderlik tablosu yükleniyor...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>{error}</Text>
        </View>
      );
    }

    if (entries.length === 0) {
      return (
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>Henüz sıralama verisi bulunmuyor.</Text>
          <Text style={styles.stateSubtext}>Kayıtlı kullanıcılar kelime öğrendikçe liste güncellenecek.</Text>
        </View>
      );
    }

    const isCurrentUser = (entry: LeaderboardEntry) => firebaseUser?.uid === entry.id;

    return (
      <View style={styles.listContainer}>
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          renderItem={({ item, index }) => {
            const rank = index + 1;
            const isUser = isCurrentUser(item);

            return (
              <View style={[styles.row, isUser && styles.currentUserRow]}>
                <View style={styles.rankSection}>
                  {rank <= 3 ? (
                    <View style={[styles.medalBadge, { backgroundColor: PLACE_COLORS[rank] }]}>
                      <Text style={styles.medalText}>{rank}</Text>
                    </View>
                  ) : (
                    <Text style={[styles.rankText, isUser && styles.currentUserText]}>{rank}</Text>
                  )}
                </View>
                <View style={styles.nameSection}>
                  <Text style={[styles.name, isUser && styles.currentUserText]} numberOfLines={1}>
                    {getDisplayName(item)}
                  </Text>
                  {isUser && (
                    <Text style={styles.youLabel}>Sen</Text>
                  )}
                </View>
                <View style={styles.scoreSection}>
                  <Text style={[styles.points, isUser && styles.currentUserText]}>
                    {item.totalWords}
                  </Text>
                  <Text style={styles.pointsLabel}>puan</Text>
                </View>
              </View>
            );
          }}
        />
        
        {/* Kullanıcı giriş yapmış ise kendi sıralamasını göster */}
        {firebaseUser && profile && (
          <View style={styles.userRankBanner}>
            <View style={styles.userRankCard}>
              <View style={styles.userRankRank}>
                <Text style={styles.userRankRankText}>
                  #{userRank?.rank && userRank.rank > 0 ? userRank.rank : '...'}
                </Text>
              </View>
              <View style={styles.userRankContent}>
                <Text style={styles.userRankLabel}>Senin sıralaman</Text>
                <Text style={styles.userRankName} numberOfLines={1}>
                  {profile.firstName}
                </Text>
              </View>
              <View style={styles.userRankScoreBox}>
                <Text style={styles.userRankScore}>{userRank?.totalWords ?? profile.totalWordsLearned ?? 0}</Text>
                <Text style={styles.userRankScoreLabel}>puan</Text>
              </View>
            </View>
          </View>
        )}
        
        {/* Misafir kullanıcılar için giriş önerisi */}
        {!firebaseUser && (
          <View style={styles.guestBanner}>
            <Text style={styles.guestBannerText}>
              Sıralamada yer almak için giriş yapmalısın
            </Text>
          </View>
        )}

        <Text style={styles.refreshHint}>{lastRefreshLabel} • Yenilemek için ekranı aşağı çek.</Text>
      </View>
    );
  }, [entries, error, loading, firebaseUser, profile, userRank, refreshing, handleRefresh, lastRefreshLabel]);

  return (
    <GradientBackground>
      <ScreenContainer style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Text style={styles.title}>Liderlik Tablosu</Text>
          <Text style={styles.subtitle}>
            Sadece kayıtlı kullanıcıların ilerlemesi gösterilir. Her doğru kelime 1 puandır.
          </Text>
        </View>
        {content}
      </ScreenContainer>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.lg,
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.sm,
    marginVertical: spacing.xs / 2,
    backgroundColor: 'rgba(25, 32, 62, 0.4)',
    borderRadius: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  currentUserRow: {
    backgroundColor: 'rgba(139, 69, 19, 0.25)',
    borderColor: colors.accent + '40',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  rankSection: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medalBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  medalText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  nameSection: {
    flex: 1,
    paddingLeft: spacing.md,
  },
  youLabel: {
    ...typography.caption,
    color: colors.accent,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  scoreSection: {
    width: 80,
    alignItems: 'flex-end',
  },
  pointsLabel: {
    ...typography.caption,
    color: colors.muted,
    fontSize: 11,
    marginTop: 1,
  },
  rankText: {
    ...typography.subtitle,
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 16,
  },
  name: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
    fontSize: 15,
  },
  currentUserText: {
    color: colors.accent,
    fontWeight: '700',
  },
  points: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 16,
  },
  // Yeni kullanıcı banner stilleri
  userRankBanner: {
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  userRankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.sm,
    backgroundColor: 'rgba(25, 32, 62, 0.58)',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  userRankRank: {
    width: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  userRankRankText: {
    ...typography.subtitle,
    color: colors.accent,
    fontWeight: '700',
    fontSize: 16,
  },
  userRankContent: {
    flex: 1,
  },
  userRankLabel: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.7)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  userRankName: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 2,
  },
  userRankInfoText: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '600',
  },
  userRankScoreBox: {
    alignItems: 'flex-end',
    marginLeft: spacing.sm,
  },
  userRankScore: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  userRankScoreLabel: {
    ...typography.caption,
    color: colors.muted,
  },
  // Misafir kullanıcılar için banner
  guestBanner: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(15, 20, 42, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  guestBannerText: {
    ...typography.body,
    color: colors.muted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  refreshHint: {
    ...typography.caption,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  // Eski footer stil (artık kullanılmıyor ama uyumluluk için)
  userRankFooter: {
    backgroundColor: 'rgba(25, 32, 62, 0.8)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  userRankText: {
    ...typography.body,
    color: colors.accent,
    textAlign: 'center',
    fontWeight: '600',
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  stateText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  stateSubtext: {
    ...typography.caption,
    color: colors.muted,
    textAlign: 'center',
  },
});
