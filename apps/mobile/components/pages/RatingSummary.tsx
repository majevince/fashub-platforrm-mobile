import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Star } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { getPageRatingStats } from '@fashub/api-client';

/**
 * Small reusable "★ 4.8 (23 reviews)" line — the same real aggregate rating
 * app/page/[handle]/index.tsx already fetches inline for its identity
 * block, factored out so the Services tab and its Home-card preview (Book a
 * Fitting ticket) don't each re-fetch/re-render it by hand.
 */
export function RatingSummary({ pageId }: { pageId: string }) {
  const { colors } = useTheme();
  const [rating, setRating] = useState<{ averageRating: number; totalReviews: number } | null>(null);

  useEffect(() => {
    getPageRatingStats(pageId)
      .then((r) => setRating({ averageRating: r.averageRating, totalReviews: r.totalReviews }))
      .catch(() => {});
  }, [pageId]);

  if (!rating || rating.totalReviews === 0) return null;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Star size={13} color={colors.gold} fill={colors.gold} />
      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>{rating.averageRating.toFixed(1)}</Text>
      <Text style={{ fontSize: 12, color: colors.inkSoft }}>({rating.totalReviews} review{rating.totalReviews === 1 ? '' : 's'})</Text>
    </View>
  );
}
