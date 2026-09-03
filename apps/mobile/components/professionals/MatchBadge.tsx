import React from 'react';
import { View, Text } from 'react-native';
import { Star, TrendingUp, CheckCircle2, ShieldCheck, Banknote, GraduationCap, Smile } from 'lucide-react-native';
import { violetColors as V } from '@fashub/design-tokens';
import { BADGE_DISPLAY, type Badge } from '@fashub/types';

const BADGE_ICONS: Record<Badge, typeof Star> = {
  'best-match': Star,
  'top-rated': Star,
  trending: TrendingUp,
  'fast-delivery': CheckCircle2,
  verified: ShieldCheck,
  'budget-friendly': Banknote,
  'highly-experienced': GraduationCap,
  'high-satisfaction': Smile,
  'studio-pro': Star,
  'creator-pro': Star,
};

function resolveColor(key: string): string {
  if (key === '#fff') return '#fff';
  return (V as Record<string, string>)[key] ?? V.primary;
}

export function MatchBadge({ badge, compact }: { badge: Badge; compact?: boolean }) {
  const cfg = BADGE_DISPLAY[badge];
  const Icon = BADGE_ICONS[badge];
  const bg = resolveColor(cfg.bg);
  const fg = resolveColor(cfg.fg);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: bg,
        paddingHorizontal: compact ? 6 : 9,
        paddingVertical: compact ? 2 : 4,
        borderRadius: 999,
      }}
    >
      <Icon size={compact ? 9 : 11} color={fg} />
      <Text style={{ fontSize: compact ? 8.5 : 10.5, fontWeight: '700', color: fg }} numberOfLines={1}>
        {cfg.label}
      </Text>
    </View>
  );
}
