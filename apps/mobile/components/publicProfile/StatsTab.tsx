import React from 'react';
import { View, Text } from 'react-native';
import { BarChart3 } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import type { ProfileDetail, ProfessionalProfileDetail, IndividualProfileDetail } from '@fashub/types';
import { EmptyNotice } from './PortfolioTab';

/**
 * Web's real Stats tab (ProfileStatsTab.tsx) pulls from GET /api/analytics/
 * creator — an endpoint this pass didn't investigate deeply enough to type
 * confidently (its response shape wasn't confirmed field-by-field). Rather
 * than guess at that endpoint's fields or silently drop the tab entirely,
 * this shows a real, honest summary built from data already confirmed and
 * loaded elsewhere on this screen (followers/following/rating/experience/
 * portfolio size) — flagged clearly as a simplified stand-in, not a full
 * port of the real analytics endpoint.
 */
export function StatsTab({
  profile,
  professionalDetail,
  rating,
  showStats,
}: {
  profile: ProfileDetail;
  professionalDetail: ProfessionalProfileDetail | IndividualProfileDetail | null | undefined;
  rating: { averageRating: number; totalReviews: number } | null;
  showStats: boolean;
}) {
  const { colors, radius } = useTheme();

  if (!showStats) {
    return <EmptyNotice icon={BarChart3} title="Statistics are Private" message="This user has chosen to keep their statistics private." />;
  }

  const followers = professionalDetail?.followers?.length ?? 0;
  const following = professionalDetail?.following?.length ?? 0;
  const isPro = 'yearsOfExperience' in (professionalDetail ?? {});
  const tiles: [string, string | number][] = [
    ['Followers', followers],
    ['Following', following],
    ...(rating && rating.totalReviews > 0 ? ([['Rating', rating.averageRating.toFixed(1)]] as [string, string | number][]) : []),
    ...(isPro ? ([['Years experience', (professionalDetail as ProfessionalProfileDetail).yearsOfExperience ?? '—']] as [string, string | number][]) : []),
    ...(isPro ? ([['Portfolio items', ((professionalDetail as ProfessionalProfileDetail).portfolioImages?.length ?? 0) + ((professionalDetail as ProfessionalProfileDetail).featuredImages?.length ?? 0)]] as [string, string | number][]) : []),
    ...(isPro ? ([['Completed orders', (professionalDetail as ProfessionalProfileDetail).completedOrders ?? 0]] as [string, string | number][]) : []),
  ];

  return (
    <View>
      <Text style={{ fontSize: 9.5, fontWeight: '600', letterSpacing: 0.6, color: colors.inkSoft, marginBottom: 10, textTransform: 'uppercase' }}>
        Simplified summary — not the full analytics dashboard
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
  );
}
