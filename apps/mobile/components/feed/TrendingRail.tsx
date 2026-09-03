import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { violetColors as V } from '@fashub/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';
import type { TrendingTag } from '@fashub/types';

type Props = {
  tags: TrendingTag[];
};

export function TrendingRail({ tags }: Props) {
  const { spacing } = useTheme();

  if (tags.length === 0) return null;

  return (
    <View>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: V.primary }} />
          <Text style={{ fontWeight: '600', fontSize: 16.5, color: V.ink }}>Trending Threads</Text>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}>
        {tags.map((tag) => (
          <View
            key={tag.id}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: V.surface, borderWidth: 1, borderColor: V.line, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 }}
          >
            <Text style={{ fontSize: 10.5, fontWeight: '700', color: V.primary }}>#{tag.trend}</Text>
            <Text style={{ fontSize: 10.5, fontWeight: '500', color: V.ink }}>{tag.postCount} posts</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
