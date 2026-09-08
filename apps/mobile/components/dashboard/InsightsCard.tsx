import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Sparkles, ChevronRight, Lock } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * `View Insights →` now opens the dedicated Insights screen (app/insights.tsx,
 * Overview/Visitors/Projects/Portfolio tabs) rather than the profile's Stats
 * tab it linked to before — that page has no web equivalent to port (Step 0
 * of the "Insights Page" ticket confirmed no /insights route exists on web;
 * this is mobile-first, aggregating web's existing Pro-gated analytics
 * endpoints into one tabbed page). The `isPro` prop here only controls
 * whether this CARD shows its locked-banner or active state — it does not
 * gate the destination screen, which independently re-checks the live tier
 * on every visit (a stale prop here must never be trusted as the real gate).
 */
export function InsightsCard({ isPro }: { isPro: boolean }) {
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
      onPress={() => router.push('/insights')}
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
