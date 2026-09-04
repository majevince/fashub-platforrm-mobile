import React from 'react';
import { View, Text } from 'react-native';
import { Star, CheckCircle2 } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import type { RatingStatsSummary } from '@fashub/types';

const COMPONENT_LABELS: { key: keyof NonNullable<RatingStatsSummary['componentRatings']>; label: string }[] = [
  { key: 'quality', label: 'Quality' },
  { key: 'service', label: 'Service' },
  { key: 'value', label: 'Value for Money' },
  { key: 'timeliness', label: 'Timeliness' },
  { key: 'communication', label: 'Communication' },
];

/** Ports web's RatingDisplay's showDetails view exactly (star distribution + category breakdown + recommendation rate), from the same GET /api/ratings/[userId] payload — the real, per-review-computed numbers, not the synthetic bell-curve web's own Insights/Stats tab generates. */
export function RatingBreakdownCard({ rating }: { rating: RatingStatsSummary }) {
  const { colors, radius } = useTheme();

  if (!rating.totalReviews || rating.totalReviews === 0) return null;

  return (
    <View style={{ backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: 16, gap: 16 }}>
      <Text style={{ fontWeight: '700', fontSize: 15, color: colors.ink }}>Rating</Text>

      <View style={{ flexDirection: 'row', gap: 16 }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 30, fontWeight: '700', color: colors.ink }}>{rating.averageRating.toFixed(1)}</Text>
          <View style={{ flexDirection: 'row', gap: 2, marginTop: 4 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} size={12} color={colors.gold} fill={i <= Math.round(rating.averageRating) ? colors.gold : 'transparent'} />
            ))}
          </View>
          <Text style={{ fontSize: 10.5, fontWeight: '400', color: colors.inkSoft, marginTop: 3 }}>
            {rating.totalReviews} {rating.totalReviews === 1 ? 'review' : 'reviews'}
          </Text>
        </View>

        {rating.distribution ? (
          <View style={{ flex: 1, gap: 5, justifyContent: 'center' }}>
            {[...rating.distribution].sort((a, b) => b.stars - a.stars).map((d) => (
              <View key={d.stars} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Text style={{ width: 9, fontSize: 10, fontWeight: '500', color: colors.inkSoft, textAlign: 'right' }}>{d.stars}</Text>
                <Star size={9} color={colors.gold} fill={colors.gold} />
                <View style={{ flex: 1, height: 5, backgroundColor: colors.line, borderRadius: 3, overflow: 'hidden' }}>
                  <View style={{ width: `${d.percentage}%`, height: '100%', backgroundColor: colors.gold, borderRadius: 3 }} />
                </View>
                <Text style={{ width: 18, fontSize: 10, fontWeight: '400', color: colors.inkSoft, textAlign: 'right' }}>{d.count}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {rating.componentRatings ? (
        <View style={{ gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line }}>
          <Text style={{ fontSize: 9.5, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', color: colors.inkSoft }}>Breakdown</Text>
          {COMPONENT_LABELS.map(({ key, label }) => {
            const value = rating.componentRatings![key];
            return (
              <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ width: 96, fontSize: 12, fontWeight: '400', color: colors.inkSoft }}>{label}</Text>
                <View style={{ flex: 1, height: 5, backgroundColor: colors.line, borderRadius: 3, overflow: 'hidden' }}>
                  <View style={{ width: `${(value / 5) * 100}%`, height: '100%', backgroundColor: colors.ink, borderRadius: 3 }} />
                </View>
                <Text style={{ width: 24, fontSize: 12, fontWeight: '700', color: colors.ink, textAlign: 'right' }}>{value.toFixed(1)}</Text>
              </View>
            );
          })}
        </View>
      ) : null}

      {rating.recommendationRate && rating.recommendationRate > 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line }}>
          <CheckCircle2 size={16} color="#22C55E" />
          <Text style={{ fontSize: 12, fontWeight: '400', color: colors.inkSoft }}>
            <Text style={{ fontWeight: '700', color: colors.ink }}>{Math.round(rating.recommendationRate)}%</Text> of clients would recommend
          </Text>
        </View>
      ) : null}
    </View>
  );
}
