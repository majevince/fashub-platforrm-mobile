import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Sparkles, ChevronRight, Lock } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * Matches web's Pro banner on the Designer/Tailor dashboard exactly — it
 * has no numeric summary/preview on the card itself (confirmed by reading
 * the source), just marketing copy plus a `View Insights →` link into
 * `/profile/{userId}?tab=stats`. Non-Pro users see an upgrade prompt
 * instead; web's version links to `/pro/upgrade` (a full subscription
 * flow), which doesn't exist on mobile and is out of this ticket's scope —
 * shown here as informational only, not a dead link.
 */
export function InsightsCard({ userId, isPro }: { userId: string; isPro: boolean }) {
  const { colors, radius } = useTheme();
  const router = useRouter();

  if (!isPro) {
    return (
      <View style={{ backgroundColor: colors.ivoryDeep, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' }}>
          <Lock size={16} color={colors.gold} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>Insights are a Pro feature</Text>
          <Text style={{ fontSize: 11, fontWeight: '400', color: colors.inkSoft, marginTop: 1 }}>Upgrade to see profile views, saves, and engagement trends.</Text>
        </View>
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => router.push(`/profile/${userId}?tab=stats`)}
      style={{ backgroundColor: colors.ink, borderRadius: radius.lg, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}
    >
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
        <Sparkles size={16} color={colors.ivory} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ivory }}>Creator Pro Active</Text>
        <Text style={{ fontSize: 11, fontWeight: '400', color: colors.ivoryDeep, marginTop: 1, opacity: 0.8 }}>Priority ranking, profile insights, custom tags, extended portfolio</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.goldSoft }}>View Insights</Text>
        <ChevronRight size={14} color={colors.goldSoft} />
      </View>
    </Pressable>
  );
}
