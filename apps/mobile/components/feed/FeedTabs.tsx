import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Sparkles, Users, TrendingUp } from 'lucide-react-native';
import { violetColors as V } from '@fashub/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';
import type { FeedFilter } from '@fashub/types';

const TABS: { key: FeedFilter; label: string; Icon: typeof Sparkles }[] = [
  { key: 'all', label: 'For You', Icon: Sparkles },
  { key: 'following', label: 'Following', Icon: Users },
  { key: 'trending', label: 'Trending', Icon: TrendingUp },
];

type Props = {
  active: FeedFilter;
  onChange: (filter: FeedFilter) => void;
};

export function FeedTabs({ active, onChange }: Props) {
  const { spacing } = useTheme();

  return (
    <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
      {TABS.map(({ key, label, Icon }) => {
        const isActive = active === key;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: isActive ? V.primary : V.line,
              backgroundColor: isActive ? V.primary : 'transparent',
            }}
          >
            <Icon size={13} color={isActive ? '#fff' : V.inkSoft} strokeWidth={2} />
            <Text style={{ fontSize: 12.5, fontWeight: '600', color: isActive ? '#fff' : V.inkSoft }}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
