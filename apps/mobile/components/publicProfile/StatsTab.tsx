import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { BarChart3, Eye, Bookmark, MessageSquare, TrendingUp } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { getCreatorAnalytics, resolveMediaUrl } from '@fashub/api-client';
import type { ProfileDetail, ProfessionalProfileDetail, IndividualProfileDetail, CreatorAnalytics } from '@fashub/types';
import { EmptyNotice } from './PortfolioTab';
import { LoadingState } from '../LoadingState';

/**
 * Base tiles here are a confirmed-real, honest summary built from data
 * already loaded elsewhere on this screen (followers/rating/experience/
 * portfolio size) — not a full port of web's ProfileStatsTab.tsx, which
 * mixes real KPIs with a client-side FAKE "Rating Breakdown"
 * (generateRatingDistribution — a simulated bell curve, not real per-star
 * counts) that this deliberately does NOT replicate.
 *
 * The Pro-only "Creator Insights" section below IS a full, real port of
 * web's CreatorProInsights — same GET /api/analytics/creator endpoint,
 * confirmed to contain no mock/random data, gated the same way (owner +
 * Pro/Business tier only, 403 otherwise).
 */
export function StatsTab({
  profile,
  professionalDetail,
  rating,
  showStats,
  isOwner,
  isPro,
}: {
  profile: ProfileDetail;
  professionalDetail: ProfessionalProfileDetail | IndividualProfileDetail | null | undefined;
  rating: { averageRating: number; totalReviews: number } | null;
  showStats: boolean;
  isOwner?: boolean;
  isPro?: boolean;
}) {
  const { colors, radius } = useTheme();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<CreatorAnalytics | null>(null);
  const [analyticsError, setAnalyticsError] = useState(false);

  const isProfessionalRole = 'yearsOfExperience' in (professionalDetail ?? {});
  const showInsights = isOwner && isPro && isProfessionalRole;

  useEffect(() => {
    if (!showInsights) return;
    getCreatorAnalytics(profile.id)
      .then(setAnalytics)
      .catch(() => setAnalyticsError(true));
  }, [showInsights, profile.id]);

  if (!showStats) {
    return <EmptyNotice icon={BarChart3} title="Statistics are Private" message="This user has chosen to keep their statistics private." />;
  }

  const followers = professionalDetail?.followers?.length ?? 0;
  const following = professionalDetail?.following?.length ?? 0;
  const isPro_ = isProfessionalRole;
  const tiles: [string, string | number][] = [
    ['Followers', followers],
    ['Following', following],
    ...(rating && rating.totalReviews > 0 ? ([['Rating', rating.averageRating.toFixed(1)]] as [string, string | number][]) : []),
    ...(isPro_ ? ([['Years experience', (professionalDetail as ProfessionalProfileDetail).yearsOfExperience ?? '—']] as [string, string | number][]) : []),
    ...(isPro_ ? ([['Portfolio items', ((professionalDetail as ProfessionalProfileDetail).portfolioImages?.length ?? 0) + ((professionalDetail as ProfessionalProfileDetail).featuredImages?.length ?? 0)]] as [string, string | number][]) : []),
    ...(isPro_ ? ([['Completed orders', (professionalDetail as ProfessionalProfileDetail).completedOrders ?? 0]] as [string, string | number][]) : []),
  ];

  const last7 = analytics?.dailySeries.slice(-7) ?? [];
  const maxDaily = Math.max(1, ...last7.map((d) => d.likes + d.interests));

  return (
    <View style={{ gap: 20 }}>
      <View>
        <Text style={{ fontSize: 9.5, fontWeight: '600', letterSpacing: 0.6, color: colors.inkSoft, marginBottom: 10, textTransform: 'uppercase' }}>
          Summary
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {tiles.map(([label, value]) => (
            <View key={label} style={{ flex: 1, minWidth: '45%', backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 14 }}>
              <Text style={{ fontWeight: '700', fontSize: 20, color: colors.ink }}>{value}</Text>
              <Text style={{ fontSize: 9, fontWeight: '500', color: colors.inkSoft, textTransform: 'uppercase', marginTop: 2 }}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      {showInsights ? (
        <View style={{ gap: 14 }}>
          <Text style={{ fontSize: 9.5, fontWeight: '600', letterSpacing: 0.6, color: colors.inkSoft, textTransform: 'uppercase' }}>
            Creator Insights
          </Text>

          {analyticsError ? (
            <EmptyNotice icon={TrendingUp} title="Insights unavailable" message="Couldn't load your analytics right now." />
          ) : !analytics ? (
            <LoadingState />
          ) : (
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {[
                  { icon: Eye, label: 'Profile Views', value: analytics.overview.profileViews },
                  { icon: Bookmark, label: 'Portfolio Saves', value: analytics.overview.portfolioSaves },
                  { icon: MessageSquare, label: 'Inquiries', value: analytics.overview.inquiries },
                  { icon: TrendingUp, label: 'Engagement Rate', value: `${analytics.overview.engagementRate}%` },
                ].map(({ icon: Icon, label, value }) => (
                  <View key={label} style={{ flex: 1, minWidth: '45%', backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 14, gap: 6 }}>
                    <Icon size={15} color={colors.gold} />
                    <Text style={{ fontWeight: '700', fontSize: 18, color: colors.ink }}>{value}</Text>
                    <Text style={{ fontSize: 9, fontWeight: '500', color: colors.inkSoft, textTransform: 'uppercase' }}>{label}</Text>
                  </View>
                ))}
              </View>

              {last7.length > 0 ? (
                <View style={{ backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 14, gap: 10 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.ink }}>Last 7 Days — Likes & Interests</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 60 }}>
                    {last7.map((d) => (
                      <View key={d.date} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                        <View style={{ width: '100%', height: 44, justifyContent: 'flex-end' }}>
                          <View style={{ width: '100%', height: Math.max(3, ((d.likes + d.interests) / maxDaily) * 44), backgroundColor: colors.gold, borderRadius: 3 }} />
                        </View>
                        <Text style={{ fontSize: 8, fontWeight: '500', color: colors.inkSoft }}>{d.label.split(' ')[1] ?? d.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {analytics.topPosts.length > 0 ? (
                <View style={{ gap: 8 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.ink }}>Top Performing</Text>
                  {analytics.topPosts.slice(0, 5).map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => (item.contentType === 'post' ? router.push(`/post/${item.id}`) : null)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 10 }}
                    >
                      <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: colors.line, overflow: 'hidden' }}>
                        {item.thumbnail ? <Image source={{ uri: resolveMediaUrl(item.thumbnail) ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.ink }} numberOfLines={1}>{item.title}</Text>
                        <Text style={{ fontSize: 10, fontWeight: '400', color: colors.inkSoft, marginTop: 1 }}>{item.likes} likes · {item.interests} interests</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}
