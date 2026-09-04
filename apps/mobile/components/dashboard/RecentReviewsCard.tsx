import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { ReviewsList } from '../ReviewsList';
import type { Review } from '@fashub/types';

/** Matches web's Dashboard "Recent Reviews" card (ReviewsList limit={3}) — reuses the same ReviewsList used on the profile Reviews tab rather than a separate implementation. */
export function RecentReviewsCard({ userId, totalReviews, reviews }: { userId: string; totalReviews: number; reviews: Review[] }) {
  const { colors, radius } = useTheme();
  const router = useRouter();

  if (reviews.length === 0) return null;

  return (
    <View style={{ backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontWeight: '700', fontSize: 15, color: colors.ink }}>Recent Reviews</Text>
        <Pressable onPress={() => router.push(`/profile/${userId}?tab=reviews`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.gold }}>{totalReviews > 0 ? `See all ${totalReviews}` : 'View'}</Text>
          <ChevronRight size={14} color={colors.gold} />
        </Pressable>
      </View>
      <ReviewsList reviews={reviews} />
    </View>
  );
}
