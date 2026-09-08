import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useAuth } from '../context/AuthContext';
import { getProfileViewAnalytics, resolveMediaUrl, ApiError } from '@fashub/api-client';
import type { ProfileViewAnalytics } from '@fashub/types';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';

const CHART_HEIGHT = 120;

/**
 * Mobile's half of the "Profile View Analytics" ticket — same backend
 * endpoint as web's app/pro/profile-views/page.tsx, same numbers, laid out
 * as a single scrolling column instead of a dashboard grid. No charting
 * library added: this line chart is hand-built on react-native-svg (already
 * a dependency via lucide-react-native's icons), matching the app's
 * consistent pattern of custom-built UI over pulled-in components rather
 * than adding a new dependency for one chart. No demographics section and
 * visitor anonymization both match Vincent's explicit calls from Step 0 —
 * not defaults.
 */
function TimeSeriesChart({ points }: { points: { date: string; count: number }[] }) {
  const { colors } = useTheme();
  const width = 320;
  const max = Math.max(...points.map((p) => p.count), 1);
  const stepX = width / Math.max(points.length - 1, 1);

  const coords = points.map((p, i) => ({ x: i * stepX, y: CHART_HEIGHT - (p.count / max) * (CHART_HEIGHT - 8) - 4 }));
  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
  const areaPath = `${linePath} L ${width} ${CHART_HEIGHT} L 0 ${CHART_HEIGHT} Z`;

  return (
    <Svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 ${width} ${CHART_HEIGHT}`} preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.gold} stopOpacity={0.3} />
          <Stop offset="1" stopColor={colors.gold} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={areaPath} fill="url(#fade)" />
      <Path d={linePath} stroke={colors.gold} strokeWidth={2} fill="none" />
    </Svg>
  );
}

function BreakdownBars({ items, getLabel, getCount, total, barColor }: {
  items: { count: number }[];
  getLabel: (item: any) => string;
  getCount: (item: any) => number;
  total: number;
  barColor: string;
}) {
  const { colors } = useTheme();
  const max = Math.max(...items.map(getCount), 1);
  return (
    <View style={{ gap: 10 }}>
      {items.map((item, i) => (
        <View key={i}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ fontSize: 12, color: colors.ink }}>{getLabel(item)}</Text>
            <Text style={{ fontSize: 12, color: colors.inkSoft }}>
              {total > 0 ? `${Math.round((getCount(item) / total) * 100)}%` : '0%'}
            </Text>
          </View>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.line, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${(getCount(item) / max) * 100}%`, backgroundColor: barColor, borderRadius: 3 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function ProfileAnalyticsScreen() {
  const { colors, spacing } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<ProfileViewAnalytics | null>(null);
  const [error, setError] = useState('');

  const load = () => {
    if (!user) return;
    setError('');
    getProfileViewAnalytics(user.id)
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load your profile view analytics."));
  };

  useEffect(load, [user?.id]);

  if (!user) return null;

  const locationTotal = data?.locationBreakdown.reduce((s, l) => s + l.count, 0) ?? 0;
  const platformTotal = data?.platformBreakdown.reduce((s, p) => s + p.count, 0) ?? 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.lg, paddingBottom: spacing.sm }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={22} color={colors.ink} />
        </Pressable>
        <Text style={{ fontSize: 19, fontWeight: '700', color: colors.ink }}>Profile Views</Text>
      </View>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !data ? (
        <LoadingState />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl * 2 }}>
          <Text style={{ fontSize: 12.5, color: colors.inkSoft }}>{`Last 90 days · ${data.totalViews} total views`}</Text>

          <View style={{ backgroundColor: colors.paper, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.line }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: 10 }}>Unique visitors over time</Text>
            <TimeSeriesChart points={data.timeSeries} />
          </View>

          <View style={{ backgroundColor: colors.paper, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.line }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: 12 }}>Visitor location</Text>
            {data.locationBreakdown.length === 0 ? (
              <Text style={{ fontSize: 12, color: colors.inkSoft }}>No views yet.</Text>
            ) : (
              <BreakdownBars
                items={data.locationBreakdown}
                getLabel={(l) => l.label}
                getCount={(l) => l.count}
                total={locationTotal}
                barColor={colors.gold}
              />
            )}
          </View>

          <View style={{ backgroundColor: colors.paper, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.line }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: 12 }}>Platform split</Text>
            {data.platformBreakdown.length === 0 ? (
              <Text style={{ fontSize: 12, color: colors.inkSoft }}>No views yet.</Text>
            ) : (
              <BreakdownBars
                items={data.platformBreakdown}
                getLabel={(p) => (p.platform === 'mobile' ? 'Mobile' : 'Web')}
                getCount={(p) => p.count}
                total={platformTotal}
                barColor="#B45309"
              />
            )}
          </View>

          <View style={{ backgroundColor: colors.paper, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.line }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: 12 }}>Recent visitors</Text>
            {data.visitors.length === 0 ? (
              <Text style={{ fontSize: 12, color: colors.inkSoft }}>No views yet.</Text>
            ) : (
              <View style={{ gap: 12 }}>
                {data.visitors.map((v, i) => {
                  const avatarUri = v.anonymized ? null : resolveMediaUrl(v.avatar);
                  return (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.line, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {avatarUri ? (
                          <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                        ) : (
                          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.inkSoft }}>
                            {v.anonymized ? '?' : (v.displayName ?? '').slice(0, 2).toUpperCase()}
                          </Text>
                        )}
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.ink }} numberOfLines={1}>
                          {v.anonymized ? `A ${v.role}` : v.displayName}
                        </Text>
                        <Text style={{ fontSize: 11, color: colors.inkSoft, textTransform: 'capitalize' }}>
                          {v.anonymized ? 'Private profile' : v.role}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11, color: colors.inkSoft }}>{new Date(v.viewedAt).toLocaleDateString()}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
