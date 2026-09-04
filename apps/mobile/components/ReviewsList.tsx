import React from 'react';
import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import { Star } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { resolveMediaUrl } from '@fashub/api-client';
import type { Review } from '@fashub/types';

/**
 * Extracted from ReviewsTab.tsx's inline review-item rendering so the
 * Dashboard's "Recent Reviews" preview can reuse the exact same review
 * card instead of a separate implementation — mirrors web's own
 * ReviewsList component, which both the Dashboard and profile Reviews tab
 * render (same component, different `limit`).
 */
export function ReviewsList({ reviews }: { reviews: Review[] }) {
  const { colors, typeScale } = useTheme();

  return (
    <View style={{ gap: 12 }}>
      {reviews.map((r) => (
        <View key={r.id} style={{ borderBottomWidth: 1, borderBottomColor: colors.line, paddingBottom: 12, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.inkSoft, overflow: 'hidden' }}>
              {r.reviewerAvatar ? <Image source={{ uri: resolveMediaUrl(r.reviewerAvatar) ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>{r.reviewerName}</Text>
              <View style={{ flexDirection: 'row', gap: 1 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} size={10} color={colors.gold} fill={i <= Math.round(r.overallRating) ? colors.gold : 'transparent'} />
                ))}
              </View>
            </View>
            <Text style={{ fontSize: 9.5, fontWeight: '400', color: colors.inkSoft }}>{new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
          </View>
          {r.title ? <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.ink }}>{r.title}</Text> : null}
          <Text style={{ ...typeScale.bodySmall, fontFamily: undefined, fontWeight: '400', color: colors.ink }}>{r.comment}</Text>
        </View>
      ))}
    </View>
  );
}
